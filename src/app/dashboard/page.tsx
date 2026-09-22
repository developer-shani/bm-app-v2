"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Wallet,
  Handshake,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  CreditCard,
  Plus,
  Banknote,
  Phone,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Customer, Investor, Reseller } from "@/types";
import { formatCurrency, formatDate, getInstallmentStatus, cn } from "@/lib/utils";

function SkeletonStatsCard() {
  return (
    <Card className="pulse-card-glow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="w-11 h-11 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  glowClass?: string;
}

function StatsCard({ title, value, description, icon: Icon, iconColor, iconBg, glowClass }: StatCardProps) {
  return (
    <Card className={cn("hover-lift group", glowClass)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground font-medium">{description}</p>
          </div>
          <div className={cn(
            "flex items-center justify-center w-11 h-11 rounded-xl transition-transform group-hover:scale-110",
            iconBg
          )}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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

  // Dynamic Calculations
  const activeInstallments = customers.filter((c) => c.status === "active").length;
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

  if (loading) {
    return (
      <div className="space-y-6 animate-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-page">
      {/* ===== Hero Header Banner ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-cyan-600/10 border border-emerald-500/25 p-6 sm:p-8 backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-500 dark:text-emerald-400 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-Time Sales Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
              Executive <span className="gradient-text">Overview</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Live tracking for {customers.length} active customer accounts, {investors.length} investment portfolios & recovery pipelines.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/dashboard/customers/new">
              <Button size="lg" className="gap-2 font-bold text-xs uppercase tracking-wider gradient-primary rounded-xl shadow-lg shadow-emerald-500/25">
                <Plus className="w-4 h-4" />
                New Sale
              </Button>
            </Link>
            <Link href="/dashboard/investors">
              <Button variant="outline" size="lg" className="gap-2 font-bold text-xs border-border/60 bg-card/70 backdrop-blur-md rounded-xl hover:bg-accent">
                <Wallet className="w-4 h-4 text-emerald-500" />
                Capital
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Stats Grid ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Link href="/dashboard/customers" className="block">
          <StatsCard
            title="Active Sales"
            value={String(activeInstallments)}
            description={`${customers.length} Total Registered →`}
            icon={Users}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10 border border-blue-500/25"
            glowClass="stat-glow-blue"
          />
        </Link>
        <Link href="/dashboard/investors" className="block">
          <StatsCard
            title="Total Investment"
            value={formatCurrency(totalInvestment)}
            description={`${investors.length} Active Partners →`}
            icon={Wallet}
            iconColor="text-violet-500"
            iconBg="bg-violet-500/10 border border-violet-500/25"
            glowClass="stat-glow-violet"
          />
        </Link>
        <Link href="/dashboard/recovery" className="block">
          <StatsCard
            title="This Month"
            value={formatCurrency(thisMonthCollected)}
            description="Total Recovered →"
            icon={Banknote}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10 border border-emerald-500/25"
            glowClass="stat-glow-green"
          />
        </Link>
        <Link href="/dashboard/customers" className="block">
          <StatsCard
            title="Overdue Accounts"
            value={String(overdueCount)}
            description="Requires Followup →"
            icon={AlertTriangle}
            iconColor="text-red-500"
            iconBg="bg-red-500/10 border border-red-500/25"
            glowClass="stat-glow-red"
          />
        </Link>
        <Link href="/dashboard/customers" className="block">
          <StatsCard
            title="Due Soon"
            value={String(dueSoonCount)}
            description="Within 3 Days →"
            icon={Clock}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10 border border-amber-500/25"
            glowClass="stat-glow-yellow"
          />
        </Link>
      </div>

      {/* ===== Content Grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers Card */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold font-heading">Recent Customers</CardTitle>
                  <CardDescription className="text-xs">Latest installment contracts</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/customers">
                <Button variant="ghost" size="sm" className="text-xs font-bold gap-1 text-primary hover:bg-primary/10 rounded-xl">
                  View All
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">No customers found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Create your first mobile installment contract
                </p>
                <Link href="/dashboard/customers/new">
                  <Button variant="outline" size="sm" className="gap-1.5 font-semibold rounded-xl">
                    <Plus className="w-4 h-4" />
                    Add First Sale
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {customers.slice(0, 5).map((c) => {
                  const status = c.status === "active" ? getInstallmentStatus(c.nextDueDate) : "paid";
                  return (
                    <Link href={`/dashboard/customers/${c.id}`} key={c.id} className="block">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/40 hover:bg-blue-500/10 hover:border-blue-500/30 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-violet-500/20 text-primary flex items-center justify-center font-extrabold text-sm border border-blue-500/20 shrink-0">
                            {(c.name || "C").charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold group-hover:text-primary transition-colors flex items-center gap-2">
                              <span>{c.name || "Customer"}</span>
                              <span className="text-[10px] text-muted-foreground font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border/50">#{c.idNumber}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5 text-primary" /> {c.mobileCompany} {c.mobileModel}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(c.monthlyInstallment)}/mo
                            </p>
                            <p className="text-[10px] font-medium text-muted-foreground">
                              Rem: {formatCurrency(c.remainingAmount)}
                            </p>
                          </div>
                          {status === "overdue" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20 animate-pulse" title="Overdue" />
                          )}
                          {status === "due-soon" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" title="Due Soon" />
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investors Overview Card */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Wallet className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold font-heading">Investors Overview</CardTitle>
                  <CardDescription className="text-xs">Capital deployment status</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/investors">
                <Button variant="ghost" size="sm" className="text-xs font-bold gap-1 text-violet-500 hover:bg-violet-500/10 rounded-xl">
                  View All
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {investors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <Wallet className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">No investors found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Add partners to track business capital
                </p>
                <Link href="/dashboard/investors/new">
                  <Button variant="outline" size="sm" className="gap-1.5 font-semibold rounded-xl">
                    <Plus className="w-4 h-4" />
                    Add Investor
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {investors.slice(0, 5).map((inv) => {
                  const totalInv = inv.totalInvestment || 0;
                  const availBal = inv.availableBalance ?? totalInv;
                  const usagePercent = totalInv > 0
                    ? Math.round(((totalInv - availBal) / totalInv) * 100)
                    : 0;
                  return (
                    <Link href="/dashboard/investors" key={inv.id} className="block">
                      <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 hover:bg-violet-500/10 hover:border-violet-500/30 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-500 flex items-center justify-center font-bold text-xs border border-violet-500/20 shrink-0">
                              <Wallet className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold group-hover:text-violet-500 transition-colors flex items-center gap-1">
                                {inv.fullName || "Investor"}
                              </p>
                              <p className="text-[11px] font-medium text-muted-foreground">
                                Profit Ratio: {inv.sharingRatio}% / {100 - inv.sharingRatio}%
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className="text-xs font-extrabold text-primary">
                                {formatCurrency(inv.totalInvestment)}
                              </p>
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Avail: {formatCurrency(inv.availableBalance ?? inv.totalInvestment)}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Progress value={usagePercent} className="h-2 flex-1 rounded-full bg-muted/50" />
                          <span className="text-[10px] text-muted-foreground font-extrabold w-8 text-right font-mono">{usagePercent}%</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

