"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users,
  Plus,
  Search,
  Phone,
  Smartphone,
  Calendar,
  MessageSquare,
  Filter,
  SortAsc,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CreditCard,
  Trash2,
  Sparkles
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, onSnapshot , doc, deleteDoc, addDoc } from "firebase/firestore";
import { Customer } from "@/types";
import { formatCurrency, formatDate, getDaysOverdue, getInstallmentStatus } from "@/lib/utils";
import { generateSmsMessage } from "@/lib/calculations";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("bm_cached_customers");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomers(parsed);
            setLoading(false);
          }
        } catch (e) {}
      }
    }

    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(data);
        setLoading(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("bm_cached_customers", JSON.stringify(data));
        }
      },
      (err) => {
        console.warn("Realtime customers sync error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredCustomers = customers
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.idNumber?.includes(searchQuery) ||
        c.phone1.includes(searchQuery) ||
        c.mobileModel.toLowerCase().includes(searchQuery.toLowerCase());

      if (filterStatus === "all") return matchesSearch;
      if (filterStatus === "overdue") return matchesSearch && getInstallmentStatus(c.nextDueDate) === "overdue";
      if (filterStatus === "due-soon") return matchesSearch && getInstallmentStatus(c.nextDueDate) === "due-soon";
      if (filterStatus === "active") return matchesSearch && c.status === "active";
      if (filterStatus === "completed") return matchesSearch && c.status === "completed";
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "overdue") {
        return getDaysOverdue(b.nextDueDate) - getDaysOverdue(a.nextDueDate);
      }
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "amount") {
        return b.remainingAmount - a.remainingAmount;
      }
      return 0;
    });

  const handleSendMessage = (customer: Customer) => {
    const daysOverdue = getDaysOverdue(customer.nextDueDate);
    const message = generateSmsMessage(
      customer.name,
      customer.monthlyInstallment,
      customer.paidInstallments + 1,
      customer.installmentMonths,
      customer.nextDueDate,
      daysOverdue,
      "Brother Mobiles"
    );
    const encoded = encodeURIComponent(message);
    const phone = customer.phone1.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/92${phone.startsWith("0") ? phone.slice(1) : phone}?text=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} total customers
          </p>
        </div>
        <Link href="/dashboard/customers/new">
          <Button className="gap-2 gradient-primary">
            <Plus className="w-4 h-4" />
            New Sale
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, ID, phone, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="due-soon">Due Soon</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overdue">Overdue First</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="amount">Highest Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Customers Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Search se koi match nahi mila" : "Pehla sale add karein"}
            </p>
            {!searchQuery && (
              <Link href="/dashboard/customers/new">
                <Button className="gap-2 gradient-primary">
                  <Plus className="w-4 h-4" />
                  Add First Sale
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer) => {
            const status = customer.status === "active" ? getInstallmentStatus(customer.nextDueDate) : "paid";
            const daysOverdue = getDaysOverdue(customer.nextDueDate);
            const progress = customer.sellingPrice > 0
              ? Math.round((customer.totalPaid / customer.sellingPrice) * 100)
              : 0;
  return (
              <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}>
              <Card
                className={cn(
                  "transition-all duration-200 hover:shadow-md cursor-pointer",
                  status === "overdue" && "status-overdue",
                  status === "due-soon" && "status-due-soon",
                  customer.status === "completed" && "status-paid"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Customer Avatar */}
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 border">
                      {customer.image ? (
                        <img src={customer.image} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {customer.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          #{customer.idNumber}
                        </Badge>
                        {status === "overdue" && (
                          <Badge variant="destructive" className="text-[10px] shrink-0 gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {daysOverdue} days overdue
                          </Badge>
                        )}
                        {status === "due-soon" && (
                          <Badge variant="warning" className="text-[10px] shrink-0 gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Due soon
                          </Badge>
                        )}
                        {customer.status === "completed" && (
                          <Badge variant="success" className="text-[10px] shrink-0 gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {customer.mobileCompany} {customer.mobileModel}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone1}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {customer.paidInstallments}/{customer.installmentMonths} months
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="flex items-center gap-3 mt-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground shrink-0">{progress}%</span>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-sm font-bold">{formatCurrency(customer.remainingAmount)}</p>
                      <p className="text-[10px] text-muted-foreground">remaining</p>
                      {customer.status === "active" && (
                        <div className="flex gap-1 justify-end">
                          <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = "/dashboard/recovery"; }}
                            >
                              <CreditCard className="w-3 h-3" />
                              Recovery
                            </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendMessage(customer); }}
                          >
                            <MessageSquare className="w-3 h-3" />
                            Msg
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

