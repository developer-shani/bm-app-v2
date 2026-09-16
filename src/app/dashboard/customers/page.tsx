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
import {
  Users,
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
  RotateCcw,
  Edit,
  History,
  Loader2,
  Sparkles,
  ShieldAlert
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, setDoc } from "firebase/firestore";
import { Customer, DeletedRecord } from "@/types";
import { formatCurrency, formatDate, getDaysOverdue, getInstallmentStatus } from "@/lib/utils";
import { generateSmsMessage } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deletedCustomers, setDeletedCustomers] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

    // Active customers snapshot
    const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));
    const unsubscribeCustomers = onSnapshot(
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

    // Deleted records snapshot for customers
    const unsubscribeDeleted = onSnapshot(
      collection(db, "deleted_records"),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as DeletedRecord))
          .filter((rec) => rec.type === "customers");
        list.sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());
        setDeletedCustomers(list);
      },
      (err) => {
        console.warn("Deleted customers sync error:", err);
      }
    );

    return () => {
      unsubscribeCustomers();
      unsubscribeDeleted();
    };
  }, []);

  const handleSoftDeleteCustomer = async (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Kya aap "${customer.name}" ko soft-delete karna chahte hain? Yahan Trash tab me recover kiya ja sakega.`)) {
      return;
    }
    setDeletingId(customer.id);
    try {
      await addDoc(collection(db, "deleted_records"), {
        originalId: customer.id,
        type: "customers",
        data: { ...customer },
        deletedAt: new Date().toISOString(),
        deletedBy: "Admin",
      });
      await deleteDoc(doc(db, "customers", customer.id));
      toast.success(`${customer.name} soft delete ho gaya! Tab "Deleted / Trash" se restore kar sakte hain.`);
    } catch (err: any) {
      toast.error(err.message || "Delete karne me masla aya");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreCustomer = async (rec: DeletedRecord) => {
    setRestoringId(rec.id);
    try {
      if (rec.originalId) {
        const restoreData = { ...rec.data, status: "active", restoredAt: new Date().toISOString() };
        await setDoc(doc(db, "customers", rec.originalId), restoreData, { merge: true });
      }
      await deleteDoc(doc(db, "deleted_records", rec.id));
      toast.success(`${rec.data?.name || "Customer"} kamyabi se restore ho gaya!`);
    } catch (err: any) {
      toast.error(err.message || "Restore me masla aya");
    } finally {
      setRestoringId(null);
    }
  };

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

  const filteredCustomers = customers
    .filter((c) => {
      const matchesSearch =
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.idNumber?.includes(searchQuery) ||
        c.phone1?.includes(searchQuery) ||
        c.mobileModel?.toLowerCase().includes(searchQuery.toLowerCase());

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
        return (b.remainingAmount || 0) - (a.remainingAmount || 0);
      }
      return 0;
    });

  const filteredDeleted = deletedCustomers.filter((rec) => {
    const name = (rec.data?.name || rec.data?.fullName || "").toLowerCase();
    const phone = (rec.data?.phone1 || rec.data?.phone || "").toLowerCase();
    const idNum = (rec.data?.idNumber || "").toLowerCase();
    const model = (rec.data?.mobileModel || "").toLowerCase();
    return (
      !searchQuery ||
      name.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery.toLowerCase()) ||
      idNum.includes(searchQuery.toLowerCase()) ||
      model.includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {customers.length} active/completed customers • {deletedCustomers.length} in trash
          </p>
        </div>
        <Link href="/dashboard/customers/new">
          <Button className="gap-2 gradient-primary">
            <Plus className="w-4 h-4" />
            New Sale
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-muted/40 p-1.5 rounded-xl border">
        <Button
          variant={filterStatus === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("all")}
          className="text-xs h-8 gap-1.5"
        >
          All ({customers.length})
        </Button>
        <Button
          variant={filterStatus === "active" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("active")}
          className="text-xs h-8 gap-1.5"
        >
          Active ({customers.filter((c) => c.status === "active").length})
        </Button>
        <Button
          variant={filterStatus === "overdue" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("overdue")}
          className="text-xs h-8 gap-1.5 text-red-500 hover:text-red-600"
        >
          Overdue ({customers.filter((c) => c.status === "active" && getInstallmentStatus(c.nextDueDate) === "overdue").length})
        </Button>
        <Button
          variant={filterStatus === "completed" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("completed")}
          className="text-xs h-8 gap-1.5"
        >
          Completed ({customers.filter((c) => c.status === "completed").length})
        </Button>
        <Button
          variant={filterStatus === "deleted" ? "destructive" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("deleted")}
          className={cn(
            "text-xs h-8 gap-1.5 border border-destructive/20",
            filterStatus === "deleted" ? "bg-destructive text-destructive-foreground" : "text-destructive hover:bg-destructive/10"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Deleted / Trash ({deletedCustomers.length})
        </Button>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, ID, phone, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
        {filterStatus !== "deleted" && (
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-10 text-xs">
              <SortAsc className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overdue">Overdue First</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="amount">Highest Amount</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* DELETED / TRASH VIEW */}
      {filterStatus === "deleted" ? (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredDeleted.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Trash2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-semibold mb-1">Koi Deleted Customer Nahi Hai</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Search query se koi deleted customer match nahi hua" : "Jab aap kisi customer ko soft delete karenge to wo yahan show hoga"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDeleted.map((rec) => {
              const c = rec.data || {};
              return (
                <Card key={rec.id} className="border-destructive/20 bg-destructive/5 hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0 font-bold text-sm border border-destructive/20">
                          {c.name ? c.name.slice(0, 2).toUpperCase() : "CU"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-sm line-clamp-1">{c.name || "Unknown Customer"}</h3>
                            {c.idNumber && (
                              <Badge variant="outline" className="text-[10px]">
                                #{c.idNumber}
                              </Badge>
                            )}
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <Trash2 className="w-2.5 h-2.5" /> Soft Deleted
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                            {c.mobileModel && (
                              <span className="flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-muted-foreground" />
                                {c.mobileCompany} {c.mobileModel}
                              </span>
                            )}
                            {c.phone1 && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {c.phone1}
                              </span>
                            )}
                            {c.sellingPrice && (
                              <span className="font-semibold text-foreground">
                                Total: {formatCurrency(c.sellingPrice)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground/80">
                            <span>Deleted on: {rec.deletedAt ? new Date(rec.deletedAt).toLocaleDateString("en-PK") : "N/A"}</span>
                            <span>•</span>
                            <span>Deleted by: {rec.deletedBy || "Admin"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreCustomer(rec)}
                          disabled={restoringId === rec.id}
                          className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-medium"
                        >
                          {restoringId === rec.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Restore Customer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* ACTIVE / COMPLETED CUSTOMER LIST */
        loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
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
                <Card
                  key={customer.id}
                  className={cn(
                    "transition-all duration-200 hover:shadow-md group",
                    status === "overdue" && "status-overdue",
                    status === "due-soon" && "status-due-soon",
                    customer.status === "completed" && "status-paid"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Link href={`/dashboard/customers/${customer.id}`} className="shrink-0">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border group-hover:border-primary transition-colors">
                          {customer.image ? (
                            <img src={customer.image} alt="" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-muted-foreground">
                              {customer.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/customers/${customer.id}`} className="hover:underline">
                            <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
                          </Link>
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

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
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

                        <div className="flex gap-1 justify-end items-center pt-1">
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1">
                              <Edit className="w-3 h-3" /> Edit
                            </Button>
                          </Link>

                          {customer.status === "active" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px] gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.location.href = "/dashboard/recovery";
                                }}
                              >
                                <CreditCard className="w-3 h-3" /> Recovery
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSendMessage(customer);
                                }}
                              >
                                <MessageSquare className="w-3 h-3" /> Msg
                              </Button>
                            </>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => handleSoftDeleteCustomer(e, customer)}
                            disabled={deletingId === customer.id}
                            title="Soft Delete to Trash"
                          >
                            {deletingId === customer.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
