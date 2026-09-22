"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Smartphone,
  Plus,
  Banknote,
  ChevronRight,
  Activity,
  Target,
  Zap,
  BarChart3,
  CircleDollarSign,
  ShieldCheck,
  ArrowRight,
  Layers,
  PieChart,
  Receipt,
  UserPlus,
  HandCoins,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Customer, Investor, Reseller } from "@/types";
import { formatCurrency, getInstallmentStatus, cn } from "@/lib/utils";

/* ================================================================
   SKELETON LOADER
================================================================ */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-page">
      {/* Hero skeleton */}
      <div className="rounded-3xl overflow-hidden">
        <Skeleton className="h-44 w-full" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

/* ================================================================
   ANIMATED NUMBER
================================================================ */
function AnimatedValue({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}</>;
}

/* ================================================================
   MAIN DASHBOARD
================================================================ */
export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [recoveries, setRecoveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    const qCust = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsubCust = onSnapshot(qCust, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer));
      setCustomers(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("bm_cached_customers", JSON.stringify(data));
      }
      setLoading(false);
    }, (err) => console.warn("Cust realtime sync warn:", err));

    const qInv = query(collection(db, "investors"), orderBy("createdAt", "desc"));
    const unsubInv = onSnapshot(qInv, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Investor));
      setInvestors(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("bm_cached_investors", JSON.stringify(data));
      }
      setLoadedCount(prev => prev + 1);
    }, (err) => console.warn("Inv realtime sync warn:", err));

    const qRes = query(collection(db, "resellers"), orderBy("createdAt", "desc"));
    const unsubRes = onSnapshot(qRes, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reseller));
      setResellers(data);
      if (typeof window !== "undefined") {
        localStorage.setItem("bm_cached_resellers", JSON.stringify(data));
      }
      setLoadedCount(prev => prev + 1);
    }, (err) => console.warn("Res realtime sync warn:", err));

    const qRec = query(collection(db, "recoveries"), orderBy("date", "desc"));
    const unsubRec = onSnapshot(qRec, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecoveries(data);
      setLoadedCount(prev => prev + 1);
    }, (err) => console.warn("Rec realtime sync warn:", err));

    return () => {
      unsubCust();
      unsubInv();
      unsubRes();
      unsubRec();
    };
  }, []);

  useEffect(() => {
    if (loadedCount >= 4) {
      setLoading(false);
    }
  }, [loadedCount]);

  // ──── Computations ────
  const stats = useMemo(() => {
    const activeInstallments = customers.filter((c) => c.status === "active").length;
    const completedCount = customers.filter((c) => c.status === "completed").length;
    const totalInvestment = investors.reduce((sum, inv) => sum + (inv.totalInvestment || 0), 0);
    const totalProfit = customers.reduce((sum, c) => sum + (c.profitAmount || 0), 0);
    const overdueCount = customers.filter(
      (c) => c.status === "active" && getInstallmentStatus(c.nextDueDate) === "overdue"
    ).length;
    const dueSoonCount = customers.filter(
      (c) => c.status === "active" && getInstallmentStatus(c.nextDueDate) === "due-soon"
    ).length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthCollected = recoveries
      .filter((r) => {
        const d = new Date(r.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalCollected = recoveries.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalRemainingAmount = customers
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

    return {
      activeInstallments,
      completedCount,
      totalInvestment,
      totalProfit,
      overdueCount,
      dueSoonCount,
      thisMonthCollected,
      totalCollected,
      totalRemainingAmount,
    };
  }, [customers, investors, recoveries]);

  if (loading) return <DashboardSkeleton />;

  const collectionRate = stats.totalRemainingAmount + stats.totalCollected > 0
    ? Math.round((stats.totalCollected / (stats.totalRemainingAmount + stats.totalCollected)) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-page">

      {/* ═══════════════════════════════════════════════
          HERO SECTION — Premium gradient card
      ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-600/20 dark:border-emerald-500/15">
        {/* Dynamic background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4YzEuMTA1IDAgMi0uODk1IDItMnMtLjg5NS0yLTItMi0yIC44OTUtMiAyIC44OTUgMiAyIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-60" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/8 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/6 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-300 tracking-wide uppercase">Live Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Business <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-green-300">Command Center</span>
              </h1>
              <p className="text-sm text-emerald-200/70 font-medium leading-relaxed max-w-md">
                Real-time analytics across {customers.length} customer accounts, {investors.length} investment portfolios & {resellers.length} reseller channels.
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/customers/new">
                <Button size="lg" className="gap-2.5 font-semibold text-sm bg-white text-emerald-950 hover:bg-emerald-50 rounded-2xl shadow-2xl shadow-black/20 px-6 h-12 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Plus className="w-4.5 h-4.5" />
                  New Sale
                </Button>
              </Link>
              <Link href="/dashboard/investors">
                <Button variant="outline" size="lg" className="gap-2.5 font-semibold text-sm border-emerald-500/30 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl backdrop-blur-md px-6 h-12 transition-all hover:scale-[1.02]">
                  <Wallet className="w-4.5 h-4.5" />
                  Capital
                </Button>
              </Link>
              <Link href="/dashboard/recovery">
                <Button variant="outline" size="lg" className="gap-2.5 font-semibold text-sm border-emerald-500/30 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-2xl backdrop-blur-md px-6 h-12 transition-all hover:scale-[1.02]">
                  <Receipt className="w-4.5 h-4.5" />
                  Recovery
                </Button>
              </Link>
            </div>
          </div>

          {/* ──── Mini Stats Row inside hero ──── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { label: "Collection Rate", value: `${collectionRate}%`, icon: Target, accent: "from-emerald-400 to-teal-400" },
              { label: "Active Sales", value: String(stats.activeInstallments), icon: Activity, accent: "from-blue-400 to-indigo-400" },
              { label: "Overdue", value: String(stats.overdueCount), icon: AlertTriangle, accent: stats.overdueCount > 0 ? "from-red-400 to-rose-400" : "from-emerald-400 to-green-400" },
              { label: "Due Soon", value: String(stats.dueSoonCount), icon: Clock, accent: stats.dueSoonCount > 0 ? "from-amber-400 to-orange-400" : "from-emerald-400 to-green-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-2xl p-3.5 backdrop-blur-sm hover:bg-white/8 transition-all">
                <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", item.accent)}>
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-none">{item.value}</p>
                  <p className="text-[10px] font-medium text-emerald-300/60 mt-0.5 uppercase tracking-wider">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          STATS BENTO GRID — 4 premium metric cards
      ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Investment */}
        <Link href="/dashboard/investors" className="group block">
          <Card className="relative overflow-hidden border-border/60 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300 hover:-translate-y-1 h-full">
            <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:bg-violet-500/10 transition-all" />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CircleDollarSign className="w-5 h-5 text-violet-500" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20 rounded-lg px-2">
                  {investors.length} Partners
                </Badge>
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Investment</p>
              <p className="text-2xl font-extrabold tracking-tight">{formatCurrency(stats.totalInvestment)}</p>
              <div className="flex items-center gap-1.5 mt-2 text-violet-500">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">View Portfolios</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* This Month Collection */}
        <Link href="/dashboard/recovery" className="group block">
          <Card className="relative overflow-hidden border-border/60 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1 h-full">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:bg-emerald-500/10 transition-all" />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 rounded-lg px-2">
                  {new Date().toLocaleString("default", { month: "short" })}
                </Badge>
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Month Collection</p>
              <p className="text-2xl font-extrabold tracking-tight">{formatCurrency(stats.thisMonthCollected)}</p>
              <div className="flex items-center gap-1.5 mt-2 text-emerald-500">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Recovery Pipeline</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Total Profit */}
        <Link href="/dashboard/customers" className="group block">
          <Card className="relative overflow-hidden border-border/60 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 hover:-translate-y-1 h-full">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:bg-amber-500/10 transition-all" />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 text-amber-500" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20 rounded-lg px-2">
                  Profit
                </Badge>
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Earnings</p>
              <p className="text-2xl font-extrabold tracking-tight">{formatCurrency(stats.totalProfit)}</p>
              <div className="flex items-center gap-1.5 mt-2 text-amber-500">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">{stats.completedCount} Completed Sales</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Amount */}
        <Link href="/dashboard/customers" className="group block">
          <Card className="relative overflow-hidden border-border/60 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1 h-full">
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:bg-blue-500/10 transition-all" />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5 text-blue-500" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20 rounded-lg px-2">
                  {stats.activeInstallments} Active
                </Badge>
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Receivable</p>
              <p className="text-2xl font-extrabold tracking-tight">{formatCurrency(stats.totalRemainingAmount)}</p>
              <div className="w-full mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">Collected</span>
                  <span className="text-[10px] font-extrabold text-blue-500">{collectionRate}%</span>
                </div>
                <Progress value={collectionRate} className="h-1.5 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════
          CONTENT SECTION — Recent + Investors + Quick Actions
      ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ──── Recent Customers (Wider Column) ──── */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Recent Sales</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Latest installment contracts</p>
                </div>
              </div>
              <Link href="/dashboard/customers">
                <Button variant="ghost" size="sm" className="text-xs font-bold gap-1.5 text-primary hover:bg-primary/5 rounded-xl h-8">
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center mb-4 border border-border/50">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">No customers yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-5 max-w-xs">
                  Create your first mobile installment sale to get started
                </p>
                <Link href="/dashboard/customers/new">
                  <Button size="sm" className="gap-1.5 font-semibold rounded-xl gradient-primary text-xs">
                    <Plus className="w-4 h-4" />
                    New Sale
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {customers.slice(0, 6).map((c, idx) => {
                  const status = c.status === "active" ? getInstallmentStatus(c.nextDueDate) : c.status === "completed" ? "paid" : "defaulted";
                  const statusConfig = {
                    overdue: { dot: "bg-red-500", ring: "ring-red-500/20", label: "Overdue", labelColor: "text-red-500 bg-red-500/8 border-red-500/15" },
                    "due-soon": { dot: "bg-amber-500", ring: "ring-amber-500/20", label: "Due Soon", labelColor: "text-amber-600 bg-amber-500/8 border-amber-500/15" },
                    paid: { dot: "bg-emerald-500", ring: "ring-emerald-500/20", label: "Completed", labelColor: "text-emerald-600 bg-emerald-500/8 border-emerald-500/15" },
                    active: { dot: "bg-blue-500", ring: "ring-blue-500/20", label: "On Track", labelColor: "text-blue-600 bg-blue-500/8 border-blue-500/15" },
                    defaulted: { dot: "bg-slate-500", ring: "ring-slate-500/20", label: "Defaulted", labelColor: "text-slate-600 bg-slate-500/8 border-slate-500/15" },
                  };
                  const sc = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
                  return (
                    <Link href={`/dashboard/customers/${c.id}`} key={c.id} className="block">
                      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3.5">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-primary/15 text-primary flex items-center justify-center font-bold text-sm border border-primary/15 shrink-0 group-hover:scale-105 transition-transform">
                              {(c.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card", sc.dot)} />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{c.name || "Customer"}</p>
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/40 shrink-0">#{c.idNumber}</span>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                              <Smartphone className="w-3 h-3 text-muted-foreground/70" />
                              <span className="truncate">{c.mobileCompany} {c.mobileModel}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-extrabold text-primary">{formatCurrency(c.monthlyInstallment)}<span className="text-[10px] font-semibold text-muted-foreground">/mo</span></p>
                            <p className="text-[10px] font-medium text-muted-foreground">Rem: {formatCurrency(c.remainingAmount)}</p>
                          </div>
                          <Badge variant="outline" className={cn("text-[9px] font-bold rounded-md px-1.5 py-0.5 border hidden lg:inline-flex", sc.labelColor)}>
                            {sc.label}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ──── Right Column — Investors + Quick Actions ──── */}
        <div className="space-y-5">
          {/* Investors Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/15 flex items-center justify-center">
                    <HandCoins className="w-4 h-4 text-violet-500" />
                  </div>
                  <CardTitle className="text-sm font-bold">Investors</CardTitle>
                </div>
                <Link href="/dashboard/investors">
                  <Button variant="ghost" size="sm" className="text-[11px] font-bold gap-1 text-violet-500 hover:bg-violet-500/5 rounded-lg h-7 px-2">
                    All
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {investors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                    <Wallet className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-bold">No investors yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1 mb-3">Add business partners</p>
                  <Link href="/dashboard/investors/new">
                    <Button variant="outline" size="sm" className="gap-1 font-semibold rounded-xl text-xs h-7">
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {investors.slice(0, 4).map((inv) => {
                    const totalInv = inv.totalInvestment || 0;
                    const availBal = inv.availableBalance ?? totalInv;
                    const usagePercent = totalInv > 0 ? Math.round(((totalInv - availBal) / totalInv) * 100) : 0;
                    return (
                      <Link href="/dashboard/investors" key={inv.id} className="block">
                        <div className="px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer group">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/15 to-purple-500/15 text-violet-500 flex items-center justify-center font-bold text-[11px] border border-violet-500/15 shrink-0">
                                {(inv.fullName || "I").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold group-hover:text-violet-500 transition-colors truncate">{inv.fullName}</p>
                                <p className="text-[10px] text-muted-foreground">{inv.sharingRatio}% / {100 - inv.sharingRatio}%</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-extrabold">{formatCurrency(totalInv)}</p>
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Avl: {formatCurrency(availBal)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={usagePercent} className="h-1 flex-1 rounded-full" />
                            <span className="text-[9px] text-muted-foreground font-bold w-7 text-right font-mono">{usagePercent}%</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { href: "/dashboard/customers/new", icon: UserPlus, label: "New Sale", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/8 hover:bg-emerald-500/15 border-emerald-500/15" },
                  { href: "/dashboard/recovery", icon: Receipt, label: "Recovery", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/8 hover:bg-blue-500/15 border-blue-500/15" },
                  { href: "/dashboard/investors/new", icon: HandCoins, label: "Add Investor", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/8 hover:bg-violet-500/15 border-violet-500/15" },
                  { href: "/dashboard/losses", icon: PieChart, label: "Losses", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/8 hover:bg-rose-500/15 border-rose-500/15" },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-sm",
                      action.bg
                    )}>
                      <action.icon className={cn("w-5 h-5", action.color)} />
                      <span className={cn("text-[11px] font-bold", action.color)}>{action.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          BOTTOM BAR — System Status
      ═══════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-muted/30 border border-border/40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[11px] font-semibold text-muted-foreground">System Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">All Services Operational</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-muted-foreground font-medium">
            {customers.length} Customers • {investors.length} Investors • {resellers.length} Resellers
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
