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
  IndianRupee,
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
    <div className="space-y-6 animate-page">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="gradient-text">Dashboard</span>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time business overview — {customers.length} customers tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/customers/new">
            <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20">
              <Plus className="w-4 h-4" />
              New Sale
            </Button>
          </Link>
          <Link href="/dashboard/investors/new">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Wallet className="w-4 h-4" />
              Add Investor
            </Button>
          </Link>
        </div>
      </div>

      {/* ===== Stats Grid ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Link href="/dashboard/customers" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Active Sales"
            value={String(activeInstallments)}
            description={`${customers.length} total customers →`}
            icon={Users}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10 border border-blue-500/20"
            glowClass="stat-glow-blue"
          />
        </Link>
        <Link href="/dashboard/investors" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Total Investment"
            value={formatCurrency(totalInvestment)}
            description={`${investors.length} investors →`}
            icon={Wallet}
            iconColor="text-violet-500"
            iconBg="bg-violet-500/10 border border-violet-500/20"
            glowClass="stat-glow-violet"
          />
        </Link>
        <Link href="/dashboard/recovery" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="This Month"
            value={formatCurrency(thisMonthCollected)}
            description="Recovery collected →"
            icon={IndianRupee}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10 border border-emerald-500/20"
            glowClass="stat-glow-green"
          />
        </Link>
        <Link href="/dashboard/customers" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Overdue"
            value={String(overdueCount)}
            description="Installments overdue →"
            icon={AlertTriangle}
            iconColor="text-red-500"
            iconBg="bg-red-500/10 border border-red-500/20"
            glowClass="stat-glow-red"
          />
        </Link>
        <Link href="/dashboard/customers" className="block transition-transform hover:scale-[1.02]">
          <StatsCard
            title="Due Soon"
            value={String(dueSoonCount)}
            description="Within 3 days →"
            icon={Clock}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10 border border-amber-500/20"
            glowClass="stat-glow-yellow"
          />
        </Link>
      </div>

      {/* ===== Content Grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Recent Customers</CardTitle>
                  <CardDescription className="text-xs">Latest installment sales</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/customers">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:text-primary">
                  View All
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mb-3">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No customers yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Start by adding your first sale
                </p>
                <Link href="/dashboard/customers/new">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add First Sale
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {customers.slice(0, 5).map((c) => {
                  const status = c.status === "active" ? getInstallmentStatus(c.nextDueDate) : "paid";
                  return (
                    <Link href={`/dashboard/customers/${c.id}`} key={c.id} className="block">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-blue-500/10 hover:border-blue-500/40 hover:scale-[1.01] transition-all cursor-pointer group shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-primary flex items-center justify-center font-bold text-xs border border-blue-500/10">
                            {(c.name || "C").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold group-hover:text-primary transition-colors flex items-center gap-1.5">
                              <span>{c.name || "Customer"}</span>
                              <span className="text-[10px] text-muted-foreground font-mono bg-background/60 px-1 rounded">#{c.idNumber}</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Smartphone className="w-3 h-3 text-primary" /> {c.mobileCompany} {c.mobileModel}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(c.monthlyInstallment)}/mo
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Rem: {formatCurrency(c.remainingAmount)}
                            </p>
                          </div>
                          {status === "overdue" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" title="Overdue" />
                          )}
                          {status === "due-soon" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" title="Due Soon" />
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investors Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
                  <Wallet className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Investors Overview</CardTitle>
                  <CardDescription className="text-xs">Capital & balance status</CardDescription>
                </div>
              </div>
              <Link href="/dashboard/investors">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:text-primary">
                  View All
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {investors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mb-3">
                  <Wallet className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No investors yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Add investors to track capital
                </p>
                <Link href="/dashboard/investors/new">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add Investor
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {investors.slice(0, 5).map((inv) => {
                  const totalInv = inv.totalInvestment || 0;
                  const availBal = inv.availableBalance ?? totalInv;
                  const usagePercent = totalInv > 0
                    ? Math.round(((totalInv - availBal) / totalInv) * 100)
                    : 0;
                  return (
                    <Link href="/dashboard/investors" key={inv.id} className="block">
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-violet-500/10 hover:border-violet-500/40 hover:scale-[1.01] transition-all cursor-pointer group shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs border border-violet-500/10">
                              <Wallet className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold group-hover:text-violet-500 transition-colors flex items-center gap-1">
                                {inv.fullName || "Investor"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Ratio: {inv.sharingRatio}% / {100 - inv.sharingRatio}%
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className="text-xs font-bold text-primary">
                                {formatCurrency(inv.totalInvestment)}
                              </p>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Avail: {formatCurrency(inv.availableBalance ?? inv.totalInvestment)}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={usagePercent} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground font-medium w-8 text-right">{usagePercent}%</span>
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
