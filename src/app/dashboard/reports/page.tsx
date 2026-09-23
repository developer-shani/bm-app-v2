"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Receipt,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Users,
  Smartphone,
  CalendarDays,
  Filter,
  Banknote,
  ShieldCheck,
  Layers,
  ChevronRight,
  CircleDollarSign,
  HandCoins,
  Minus,
  Target,
  Zap,
  Package,
  UserCheck,
  RotateCcw
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Customer, Investor, Reseller, Recovery } from "@/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

/* ================================================================
   TYPES
================================================================ */
type TimeFilter = "all" | "this-month" | "last-month" | "last-3-months" | "last-6-months" | "this-year";
type InvestorFilter = "all" | string;

/* ================================================================
   SKELETON
================================================================ */
function ReportsSkeleton() {
  return (
    <div className="space-y-6 animate-page">
      <Skeleton className="h-10 w-64" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
================================================================ */
export default function ReportsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [recoveries, setRecoveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);

  // Filters
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [investorFilter, setInvestorFilter] = useState<InvestorFilter>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  useEffect(() => {
    const qCust = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsubCust = onSnapshot(qCust, (snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
      setLoadedCount((p) => p + 1);
    });

    const qInv = query(collection(db, "investors"), orderBy("createdAt", "desc"));
    const unsubInv = onSnapshot(qInv, (snap) => {
      setInvestors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Investor)));
      setLoadedCount((p) => p + 1);
    });

    const qRes = query(collection(db, "resellers"), orderBy("createdAt", "desc"));
    const unsubRes = onSnapshot(qRes, (snap) => {
      setResellers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reseller)));
      setLoadedCount((p) => p + 1);
    });

    const qRec = query(collection(db, "recoveries"), orderBy("date", "desc"));
    const unsubRec = onSnapshot(qRec, (snap) => {
      setRecoveries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadedCount((p) => p + 1);
    });

    return () => { unsubCust(); unsubInv(); unsubRes(); unsubRec(); };
  }, []);

  useEffect(() => {
    if (loadedCount >= 4) setLoading(false);
  }, [loadedCount]);

  /* ──── Date filter helper ──── */
  const getDateRange = (filter: TimeFilter): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;
    switch (filter) {
      case "this-month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last-month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).getTime());
        break;
      case "last-3-months":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "last-6-months":
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case "this-year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(2000, 0, 1);
    }
    return { start, end };
  };

  const isInRange = (dateStr: string | undefined, range: { start: Date; end: Date }): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= range.start && d <= range.end;
  };

  /* ──── Filtered Data ──── */
  const analytics = useMemo(() => {
    const range = getDateRange(timeFilter);

    // Filter customers by date + investor + plan duration
    const filteredCustomers = customers.filter((c) => {
      const inRange = isInRange(c.createdAt, range);
      const invMatch = investorFilter === "all" || c.investorId === investorFilter;
      const planMatch = planFilter === "all" || (Number(planFilter) > 0 && c.installmentMonths === Number(planFilter));
      return inRange && invMatch && planMatch;
    });

    // Filter recoveries by date + investor
    const filteredRecoveries = recoveries.filter((r) => {
      const inRange = isInRange(r.date, range);
      const invMatch = investorFilter === "all" || r.investorId === investorFilter;
      return inRange && invMatch;
    });

    // ── Profit Calculation ──
    const grossProfit = filteredCustomers.reduce((sum, c) => sum + (c.profitAmount || 0), 0);

    // ── Expense Calculation ──
    const totalExpenses = filteredCustomers.reduce((sum, c) => {
      const custExpenses = (c.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      return sum + custExpenses;
    }, 0);

    const adminExpenseShare = filteredCustomers.reduce((sum, c) => {
      const custAdminShare = (c.expenses || []).reduce((s, e) => s + (e.adminShare || 0), 0);
      return sum + custAdminShare;
    }, 0);

    const investorExpenseShare = filteredCustomers.reduce((sum, c) => {
      const custInvShare = (c.expenses || []).reduce((s, e) => s + (e.investorShare || 0), 0);
      return sum + custInvShare;
    }, 0);

    // ── Referral Commissions ──
    const totalCommissions = filteredCustomers.reduce((sum, c) => sum + (c.referralCommissionAmount || 0), 0);

    // ── Net Profit ──
    const netProfit = grossProfit - totalExpenses - totalCommissions;

    // ── Collection ──
    const totalCollected = filteredRecoveries.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalAdvance = filteredCustomers.reduce((sum, c) => sum + (c.advancePayment || 0), 0);
    const totalRemaining = filteredCustomers
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

    // ── Sales & Status Breakdown ──
    const totalSales = filteredCustomers.length;
    const activeSales = filteredCustomers.filter((c) => c.status === "active").length;
    const completedSales = filteredCustomers.filter((c) => c.status === "completed").length;
    const defaultedSales = filteredCustomers.filter((c) => c.status === "defaulted").length;
    const returnedSales = filteredCustomers.filter((c) => c.status === "returned").length;
    const returnedCapitalRestored = filteredCustomers
      .filter((c) => c.status === "returned")
      .reduce((s, c) => s + (c.returnedCapitalRestored || 0), 0);
    const returnedRefundTotal = filteredCustomers
      .filter((c) => c.status === "returned")
      .reduce((s, c) => s + (c.refundAmount || 0), 0);

    // ── Per-sale breakdown ──
    const perSaleBreakdown = filteredCustomers.map((c) => {
      const custExpense = (c.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      const custCommission = c.referralCommissionAmount || 0;
      const custNetProfit = (c.profitAmount || 0) - custExpense - custCommission;
      return {
        id: c.id,
        idNumber: c.idNumber,
        name: c.name,
        phone: c.mobileCompany + " " + c.mobileModel,
        investorName: c.investorName,
        resellerName: c.resellerName || "—",
        sellingPrice: c.sellingPrice,
        purchasePrice: c.purchasePrice,
        grossProfit: c.profitAmount || 0,
        expense: custExpense,
        commission: custCommission,
        netProfit: custNetProfit,
        status: c.status,
        createdAt: c.createdAt,
      };
    }).sort((a, b) => b.netProfit - a.netProfit);

    // ── Expense breakdown list ──
    const expenseList: { description: string; amount: number; customerName: string; adminShare: number; investorShare: number }[] = [];
    filteredCustomers.forEach((c) => {
      (c.expenses || []).forEach((e) => {
        expenseList.push({
          description: e.description,
          amount: e.amount,
          customerName: c.name,
          adminShare: e.adminShare,
          investorShare: e.investorShare,
        });
      });
    });

    // ── Monthly breakdown for mini chart ──
    const monthlyMap = new Map<string, { profit: number; expense: number; collection: number }>();
    filteredCustomers.forEach((c) => {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) || { profit: 0, expense: 0, collection: 0 };
      existing.profit += c.profitAmount || 0;
      existing.expense += (c.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      monthlyMap.set(key, existing);
    });
    filteredRecoveries.forEach((r) => {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) || { profit: 0, expense: 0, collection: 0 };
      existing.collection += r.amount || 0;
      monthlyMap.set(key, existing);
    });
    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      grossProfit,
      totalExpenses,
      adminExpenseShare,
      investorExpenseShare,
      totalCommissions,
      netProfit,
      totalCollected,
      totalAdvance,
      totalRemaining,
      totalSales,
      activeSales,
      completedSales,
      defaultedSales,
      returnedSales,
      returnedCapitalRestored,
      returnedRefundTotal,
      perSaleBreakdown,
      expenseList,
      monthlyBreakdown,
    };
  }, [customers, recoveries, timeFilter, investorFilter, planFilter]);

  if (loading) return <ReportsSkeleton />;

  const timeFilterLabels: Record<TimeFilter, string> = {
    "all": "All Time",
    "this-month": "This Month",
    "last-month": "Last Month",
    "last-3-months": "Last 3 Months",
    "last-6-months": "Last 6 Months",
    "this-year": "This Year",
  };

  const profitMargin = analytics.grossProfit > 0
    ? Math.round((analytics.netProfit / analytics.grossProfit) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-page">

      {/* ═══════════════════════════════════════════════
          PAGE HEADER
      ═══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-amber-500" />
            </div>
            Profit & Expense <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Analytics</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-[52px]">Track your business profitability, expenses, commissions & net earnings</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          FILTERS BAR
      ═══════════════════════════════════════════════ */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
            </div>
            <div className="h-6 w-px bg-border/60" />

            {/* Time Filter */}
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="w-[180px] h-9 rounded-xl text-xs font-semibold border-border/60 bg-muted/20">
                <CalendarDays className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(timeFilterLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs font-medium rounded-lg">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Installment Plan Duration Filter */}
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px] h-9 rounded-xl text-xs font-semibold border-border/60 bg-muted/20">
                <CalendarDays className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                <SelectValue placeholder="Plan Duration" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-medium rounded-lg">All Plans (1-12 Mo)</SelectItem>
                <SelectItem value="3" className="text-xs font-medium rounded-lg">3 Months Plan</SelectItem>
                <SelectItem value="6" className="text-xs font-medium rounded-lg">6 Months Plan</SelectItem>
                <SelectItem value="9" className="text-xs font-medium rounded-lg">9 Months Plan</SelectItem>
                <SelectItem value="12" className="text-xs font-medium rounded-lg">12 Months Plan</SelectItem>
              </SelectContent>
            </Select>

            {/* Investor Filter */}
            <Select value={investorFilter} onValueChange={setInvestorFilter}>
              <SelectTrigger className="w-[200px] h-9 rounded-xl text-xs font-semibold border-border/60 bg-muted/20">
                <HandCoins className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Investors" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-medium rounded-lg">All Investors</SelectItem>
                {investors.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id} className="text-xs font-medium rounded-lg">
                    {inv.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active filter badges */}
            {(timeFilter !== "all" || investorFilter !== "all" || planFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setTimeFilter("all"); setInvestorFilter("all"); setPlanFilter("all"); }}
                className="text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl h-8"
              >
                Clear Filters
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-bold rounded-lg px-2.5 py-1 bg-muted/30">
                {analytics.totalSales} Sales Found
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          TOP METRICS — 4 Hero Cards
      ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Gross Profit */}
        <Card className="relative overflow-hidden border-border/60 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-green-500/15 border border-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 rounded-lg px-2">
                Gross
              </Badge>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Gross Profit</p>
            <p className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">{formatCurrency(analytics.grossProfit)}</p>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">Before expenses & commissions</p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="relative overflow-hidden border-border/60 hover:border-red-500/40 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500/15 to-rose-500/15 border border-red-500/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-red-500" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/20 rounded-lg px-2">
                Deducted
              </Badge>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Expenses</p>
            <p className="text-2xl font-extrabold tracking-tight text-red-600 dark:text-red-400">{formatCurrency(analytics.totalExpenses)}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-muted-foreground font-medium">Admin: {formatCurrency(analytics.adminExpenseShare)}</span>
              <span className="text-[10px] text-muted-foreground font-medium">Investor: {formatCurrency(analytics.investorExpenseShare)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Commissions */}
        <Card className="relative overflow-hidden border-border/60 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 border border-violet-500/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-violet-500" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20 rounded-lg px-2">
                Referral
              </Badge>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Commissions</p>
            <p className="text-2xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">{formatCurrency(analytics.totalCommissions)}</p>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">Reseller referral fees</p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className={cn(
          "relative overflow-hidden border-2 transition-all duration-300 hover:-translate-y-1",
          analytics.netProfit >= 0
            ? "border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 bg-emerald-500/[0.02]"
            : "border-red-500/30 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/10 bg-red-500/[0.02]"
        )}>
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4",
            analytics.netProfit >= 0 ? "bg-emerald-500/8" : "bg-red-500/8"
          )} />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className={cn(
                "w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center border",
                analytics.netProfit >= 0
                  ? "from-emerald-500/20 to-green-500/20 border-emerald-500/25"
                  : "from-red-500/20 to-rose-500/20 border-red-500/25"
              )}>
                <Target className={cn("w-5 h-5", analytics.netProfit >= 0 ? "text-emerald-500" : "text-red-500")} />
              </div>
              <Badge className={cn(
                "text-[10px] font-bold rounded-lg px-2.5",
                analytics.netProfit >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25"
              )}>
                {profitMargin}% Margin
              </Badge>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Net Profit</p>
            <p className={cn(
              "text-2xl font-extrabold tracking-tight",
              analytics.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {formatCurrency(analytics.netProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">After all deductions</p>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════
          PROFIT FORMULA BAR
      ═══════════════════════════════════════════════ */}
      <Card className="border-border/60 bg-muted/10">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/8 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Gross Profit</p>
                <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{formatCurrency(analytics.grossProfit)}</p>
              </div>
            </div>
            <Minus className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/8 border border-red-500/20">
              <Receipt className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Expenses</p>
                <p className="text-sm font-extrabold text-red-600 dark:text-red-400">{formatCurrency(analytics.totalExpenses)}</p>
              </div>
            </div>
            <Minus className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-violet-500/8 border border-violet-500/20">
              <UserCheck className="w-4 h-4 text-violet-500" />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Commissions</p>
                <p className="text-sm font-extrabold text-violet-600 dark:text-violet-400">{formatCurrency(analytics.totalCommissions)}</p>
              </div>
            </div>
            <span className="text-xl font-extrabold text-muted-foreground">=</span>
            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2",
              analytics.netProfit >= 0
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10 border-red-500/30"
            )}>
              <Target className={cn("w-4 h-4", analytics.netProfit >= 0 ? "text-emerald-500" : "text-red-500")} />
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Net Profit</p>
                <p className={cn(
                  "text-sm font-extrabold",
                  analytics.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>{formatCurrency(analytics.netProfit)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════
          COLLECTION & SALES OVERVIEW
      ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Banknote className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Total Collected</p>
            <p className="text-lg font-extrabold">{formatCurrency(analytics.totalCollected)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Advance Received</p>
            <p className="text-lg font-extrabold">{formatCurrency(analytics.totalAdvance)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Layers className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Still Receivable</p>
            <p className="text-lg font-extrabold">{formatCurrency(analytics.totalRemaining)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <Package className="w-5 h-5 text-violet-500 mx-auto mb-2" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Total Sales</p>
            <p className="text-lg font-extrabold">{analytics.totalSales}</p>
            <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5">
              <span className="text-[9px] font-bold text-blue-500 bg-blue-500/8 px-1.5 py-0.5 rounded">{analytics.activeSales} Active</span>
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/8 px-1.5 py-0.5 rounded">{analytics.completedSales} Done</span>
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/8 px-1.5 py-0.5 rounded">{analytics.returnedSales} Returned</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════
          DETAILED TABLES — Per-Sale Profit + Expense List
      ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Per-Sale Profit Breakdown */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/15 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Per-Sale Profit Breakdown</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Sorted by highest net profit</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold rounded-lg px-2 bg-muted/30">
                {analytics.perSaleBreakdown.length} Sales
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {analytics.perSaleBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <BarChart3 className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-bold">No sales data found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Customer</th>
                      <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] hidden md:table-cell">Phone</th>
                      <th className="text-right py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Gross</th>
                      <th className="text-right py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Expense</th>
                      <th className="text-right py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] hidden sm:table-cell">Commission</th>
                      <th className="text-right py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {analytics.perSaleBreakdown.slice(0, 15).map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/dashboard/customers/${sale.id}`} className="hover:text-primary transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                                {sale.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-xs truncate max-w-[120px]">{sale.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">#{sale.idNumber}</p>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                          <span className="truncate block max-w-[140px]">{sale.phone}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sale.grossProfit)}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-500">{sale.expense > 0 ? formatCurrency(sale.expense) : "—"}</td>
                        <td className="py-3 px-4 text-right font-bold text-violet-500 hidden sm:table-cell">{sale.commission > 0 ? formatCurrency(sale.commission) : "—"}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "font-extrabold",
                            sale.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"
                          )}>
                            {formatCurrency(sale.netProfit)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border/60 bg-muted/30">
                      <td className="py-3 px-4 font-extrabold text-xs" colSpan={2}>TOTAL</td>
                      <td className="py-3 px-4 text-right font-extrabold text-xs text-emerald-600 dark:text-emerald-400">{formatCurrency(analytics.grossProfit)}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-xs text-red-500">{formatCurrency(analytics.totalExpenses)}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-xs text-violet-500 hidden sm:table-cell">{formatCurrency(analytics.totalCommissions)}</td>
                      <td className={cn(
                        "py-3 px-4 text-right font-extrabold text-xs",
                        analytics.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"
                      )}>{formatCurrency(analytics.netProfit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/15 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-red-500" />
                </div>
                <CardTitle className="text-sm font-bold">Expense Log</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold rounded-lg px-2 bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/20">
                {analytics.expenseList.length} Items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {analytics.expenseList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                  <Receipt className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-xs font-bold">No expenses recorded</p>
                <p className="text-[11px] text-muted-foreground mt-1">Expenses will appear here when added to sales</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
                {analytics.expenseList.map((exp, idx) => (
                  <div key={idx} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold truncate max-w-[160px]">{exp.description}</p>
                      <p className="text-xs font-extrabold text-red-600 dark:text-red-400">{formatCurrency(exp.amount)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                        {exp.customerName}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-blue-500 bg-blue-500/8 px-1.5 py-0.5 rounded">Admin: {formatCurrency(exp.adminShare)}</span>
                        <span className="text-[9px] font-bold text-violet-500 bg-violet-500/8 px-1.5 py-0.5 rounded">Inv: {formatCurrency(exp.investorShare)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════
          MONTHLY BREAKDOWN
      ═══════════════════════════════════════════════ */}
      {analytics.monthlyBreakdown.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/15 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Monthly Breakdown</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">Profit, expenses & collections by month</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="text-left py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Month</th>
                    <th className="text-right py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Profit</th>
                    <th className="text-right py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Expenses</th>
                    <th className="text-right py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Net</th>
                    <th className="text-right py-3 px-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Collections</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {analytics.monthlyBreakdown.map((m) => {
                    const net = m.profit - m.expense;
                    const [year, month] = m.month.split("-");
                    const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "short", year: "numeric" });
                    return (
                      <tr key={m.month} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-bold">{monthLabel}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(m.profit)}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-500">{m.expense > 0 ? formatCurrency(m.expense) : "—"}</td>
                        <td className={cn(
                          "py-3 px-4 text-right font-extrabold",
                          net >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"
                        )}>{formatCurrency(net)}</td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(m.collection)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════
          FOOTER STATUS
      ═══════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-muted/30 border border-border/40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[11px] font-semibold text-muted-foreground">
            Analytics computed from <span className="text-foreground font-bold">{customers.length}</span> customers & <span className="text-foreground font-bold">{recoveries.length}</span> recovery records
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Live Data</span>
        </div>
      </div>
    </div>
  );
}
