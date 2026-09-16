"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Handshake,
  Plus,
  Search,
  Phone,
  Trash2,
  Loader2,
  Edit,
  RotateCcw,
  History,
  Mail,
  UserCheck,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Reseller, DeletedRecord, ResellerEditHistoryItem } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";

export default function ResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [deletedResellers, setDeletedResellers] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "deleted">("all");

  const [deletingResId, setDeletingResId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Edit Reseller Modal
  const [editReseller, setEditReseller] = useState<Reseller | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editSaving, setEditSaving] = useState(false);

  // Edit History Modal
  const [viewHistoryReseller, setViewHistoryReseller] = useState<Reseller | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("bm_cached_resellers");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setResellers(parsed);
            setLoading(false);
          }
        } catch (e) {}
      }
    }

    // Resellers snapshot
    const q = query(collection(db, "resellers"), orderBy("createdAt", "desc"));
    const unsubscribeResellers = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Reseller));
        setResellers(data);
        setLoading(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("bm_cached_resellers", JSON.stringify(data));
        }
      },
      (err) => {
        console.warn("Resellers realtime sync error:", err);
        setLoading(false);
      }
    );

    // Deleted resellers snapshot
    const unsubscribeDeleted = onSnapshot(
      collection(db, "deleted_records"),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as DeletedRecord))
          .filter((rec) => rec.type === "resellers");
        list.sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());
        setDeletedResellers(list);
      },
      (err) => {
        console.warn("Deleted resellers sync error:", err);
      }
    );

    return () => {
      unsubscribeResellers();
      unsubscribeDeleted();
    };
  }, []);

  const openEditModal = (r: Reseller) => {
    setEditReseller(r);
    setEditName(r.fullName || "");
    setEditPhone(r.phone || "");
    setEditEmail(r.email || "");
    setEditStatus(r.status || "active");
  };

  const handleSaveEdit = async () => {
    if (!editReseller) return;
    if (!editName.trim()) {
      toast.error("Pura naam likhna zaroori hai");
      return;
    }
    setEditSaving(true);
    try {
      const changes: Record<string, { old: any; new: any }> = {};
      if (editReseller.fullName !== editName) changes.fullName = { old: editReseller.fullName || "", new: editName };
      if (editReseller.phone !== editPhone) changes.phone = { old: editReseller.phone || "", new: editPhone };
      if (editReseller.email !== editEmail) changes.email = { old: editReseller.email || "", new: editEmail };
      if (editReseller.status !== editStatus) changes.status = { old: editReseller.status || "active", new: editStatus };

      const editHistoryEntry: ResellerEditHistoryItem = {
        id: "ed_" + Date.now(),
        editedAt: new Date().toISOString(),
        editedBy: "Admin",
        changes: Object.keys(changes).length > 0 ? changes : { info: { old: "Previous Version", new: "Updated profile details" } }
      };

      const updatedHistory = [editHistoryEntry, ...(editReseller.editHistory || [])];

      const updateData = {
        fullName: editName,
        phone: editPhone,
        email: editEmail,
        status: editStatus,
        editHistory: updatedHistory,
      };

      await updateDoc(doc(db, "resellers", editReseller.id), updateData);

      // Also update users collection if exists
      if (editReseller.userId) {
        await updateDoc(doc(db, "users", editReseller.userId), {
          fullName: editName,
          name: editName,
          phone: editPhone,
          email: editEmail,
          status: editStatus,
        }).catch(() => {});
      }

      toast.success(editName + " ki details edit & update ho gayi!");
      setEditReseller(null);
    } catch (e: any) {
      toast.error(e.message || "Update karne me masla aya");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteReseller = async (reseller: Reseller) => {
    if (!confirm(`Kya aap "${reseller.fullName}" ko soft-delete karna chahte hain? Yahan Deleted tab me 1-click restore kar sakte hain.`)) {
      return;
    }
    setDeletingResId(reseller.id);
    try {
      await addDoc(collection(db, "deleted_records"), {
        originalId: reseller.id,
        type: "resellers",
        data: { ...reseller },
        deletedAt: new Date().toISOString(),
        deletedBy: "Admin",
      });
      await deleteDoc(doc(db, "resellers", reseller.id));
      toast.success(reseller.fullName + " Trash me shift ho gaya!");
    } catch (e: any) {
      toast.error(e.message || "Delete me masla aya");
    } finally {
      setDeletingResId(null);
    }
  };

  const handleRestoreReseller = async (rec: DeletedRecord) => {
    setRestoringId(rec.id);
    try {
      if (rec.originalId) {
        const restoreData = { ...rec.data, status: "active", restoredAt: new Date().toISOString() };
        await setDoc(doc(db, "resellers", rec.originalId), restoreData, { merge: true });
      }
      await deleteDoc(doc(db, "deleted_records", rec.id));
      toast.success((rec.data?.fullName || rec.data?.name || "Reseller") + " restore ho gaya!");
    } catch (e: any) {
      toast.error(e.message || "Restore me masla aya");
    } finally {
      setRestoringId(null);
    }
  };

  const filtered = resellers.filter((r) => {
    const matchesSearch =
      r.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone?.includes(searchQuery) ||
      r.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && r.status === "active";
    return matchesSearch;
  });

  const filteredDeleted = deletedResellers.filter((rec) => {
    const name = (rec.data?.fullName || rec.data?.name || "").toLowerCase();
    const phone = (rec.data?.phone || "").toLowerCase();
    const email = (rec.data?.email || "").toLowerCase();
    return (
      !searchQuery ||
      name.includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery.toLowerCase()) ||
      email.includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Handshake className="w-6 h-6 text-purple-600" /> All Resellers (Members)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {resellers.length} total resellers • {deletedResellers.length} in trash
          </p>
        </div>
        <Link href="/dashboard/resellers/new">
          <Button className="gap-2 gradient-primary">
            <Plus className="w-4 h-4" /> Add Reseller
          </Button>
        </Link>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 bg-muted/40 p-1.5 rounded-xl border">
        <Button
          variant={activeTab === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("all")}
          className="text-xs h-8 gap-1.5"
        >
          All ({resellers.length})
        </Button>
        <Button
          variant={activeTab === "active" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("active")}
          className="text-xs h-8 gap-1.5"
        >
          Active ({resellers.filter((r) => r.status === "active").length})
        </Button>
        <Button
          variant={activeTab === "deleted" ? "destructive" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("deleted")}
          className={cn(
            "text-xs h-8 gap-1.5 border border-destructive/20",
            activeTab === "deleted" ? "bg-destructive text-destructive-foreground" : "text-destructive hover:bg-destructive/10"
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Deleted / Trash ({deletedResellers.length})
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search reseller name, phone, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 text-xs"
        />
      </div>

      {/* DELETED RESELLERS TAB */}
      {activeTab === "deleted" ? (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : filteredDeleted.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Trash2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-semibold mb-1">Koi Deleted Reseller Nahi Hai</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Search se match nahi mila" : "Jab aap kisi reseller ko soft-delete karenge to wo yahan show hoga"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDeleted.map((rec) => {
              const r = rec.data || {};
              return (
                <Card key={rec.id} className="border-purple-500/20 bg-purple-500/5 hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 font-bold text-sm border border-purple-500/20">
                          <Handshake className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm truncate">{r.fullName || r.name || "Unknown Reseller"}</h3>
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <Trash2 className="w-2.5 h-2.5" /> Soft Deleted
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            {r.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {r.phone}
                              </span>
                            )}
                            {r.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {r.email}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground/80">
                            <span>Deleted: {rec.deletedAt ? new Date(rec.deletedAt).toLocaleDateString("en-PK") : "N/A"}</span>
                            <span>•</span>
                            <span>Deleted By: {rec.deletedBy || "Admin"}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreReseller(rec)}
                        disabled={restoringId === rec.id}
                        className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 shrink-0"
                      >
                        {restoringId === rec.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore Reseller
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* ACTIVE / ALL RESELLERS GRID */
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Handshake className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Resellers Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? "Search se match nahi mila" : "Pehla reseller add karein"}
              </p>
              <Link href="/dashboard/resellers/new">
                <Button className="gap-2 gradient-primary">
                  <Plus className="w-4 h-4" /> Add Reseller
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <Card key={r.id} className="hover:shadow-lg transition-all border border-border group relative">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                        {r.fullName}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                        <Phone className="w-3 h-3 text-muted-foreground shrink-0" /> {r.phone}
                      </p>
                      {r.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                          <Mail className="w-3 h-3 text-muted-foreground shrink-0" /> {r.email}
                        </p>
                      )}
                    </div>
                    <Badge variant={r.status === "active" ? "success" : "secondary"} className="capitalize shrink-0">
                      {r.status || "active"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-muted/50 rounded-lg p-2 text-center border">
                      <p className="text-[10px] text-muted-foreground">Total Referrals</p>
                      <p className="font-bold text-sm text-foreground">{r.totalReferrals || 0}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center border">
                      <p className="text-[10px] text-muted-foreground">Total Commission</p>
                      <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(r.totalCommission || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t mt-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(r)}
                        className="h-7 px-2.5 text-xs gap-1"
                      >
                        <Edit className="w-3 h-3 text-primary" /> Edit
                      </Button>

                      {r.editHistory && r.editHistory.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewHistoryReseller(r)}
                          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          title="View Edit History Log"
                        >
                          <History className="w-3 h-3" /> Log ({r.editHistory.length})
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReseller(r)}
                      disabled={deletingResId === r.id}
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Soft Delete to Trash"
                    >
                      {deletingResId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* EDIT RESELLER DIALOG */}
      <Dialog open={!!editReseller} onOpenChange={() => setEditReseller(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" /> Reseller Details Edit Karein
            </DialogTitle>
            <DialogDescription>
              Aap jo bhi edit karenge uski Old vs New version log save ho jayegi.
            </DialogDescription>
          </DialogHeader>

          {editReseller && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold">Reseller Name *</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full Name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold">Phone Number</label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="03001234567"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold">Email Address</label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="reseller@gmail.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold">Account Status</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={editStatus === "active" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditStatus("active")}
                    className="flex-1 text-xs h-8"
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    variant={editStatus === "inactive" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setEditStatus("inactive")}
                    className="flex-1 text-xs h-8"
                  >
                    Inactive
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReseller(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving} className="gap-2 gradient-primary">
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save & Log Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT HISTORY LOG DIALOG */}
      <Dialog open={!!viewHistoryReseller} onOpenChange={() => setViewHistoryReseller(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Edit & Version History Log
            </DialogTitle>
            <DialogDescription>
              {viewHistoryReseller?.fullName} ke purane edit records:
            </DialogDescription>
          </DialogHeader>

          {viewHistoryReseller && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 py-2">
              {(!viewHistoryReseller.editHistory || viewHistoryReseller.editHistory.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-6">Abhi koi past edit history nahi hai</p>
              ) : (
                viewHistoryReseller.editHistory.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 rounded-xl border bg-muted/30 text-xs space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground border-b pb-1">
                      <span className="font-semibold text-foreground">Edited by {item.editedBy || "Admin"}</span>
                      <span>{item.editedAt ? new Date(item.editedAt).toLocaleString("en-PK") : "N/A"}</span>
                    </div>

                    <div className="space-y-1">
                      {Object.entries(item.changes || {}).map(([field, val]: [string, any]) => (
                        <div key={field} className="grid grid-cols-3 gap-1 bg-background p-1.5 rounded-lg border text-[11px]">
                          <span className="font-medium capitalize text-muted-foreground">{field}:</span>
                          <span className="text-red-500 truncate line-through">{String(val.old || "None")}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate">{String(val.new || "None")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewHistoryReseller(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
