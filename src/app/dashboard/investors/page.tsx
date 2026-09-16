"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  Plus,
  FileText,
  Eye,
  Search,
  ArrowUpRight,
  Phone,
  CreditCard,
  Percent,
  MoreVertical,
  Upload,
  Camera,
  ImagePlus,
  Loader2,
  Trash2,
  ArrowUpFromLine,
  Clock,
  CheckCircle2,
  Edit,
  RotateCcw,
  History,
  Mail,
  UserCheck,
  Sparkles
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, getDocs, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDoc, setDoc } from "firebase/firestore";
import { Investor, DeletedRecord, InvestorEditHistoryItem } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { amountToUrduWords } from "@/lib/amount-words";
import { toast } from "sonner";

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [deletedInvestors, setDeletedInvestors] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "deleted">("all");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Agreement image modal state
  const [viewAgreementUrl, setViewAgreementUrl] = useState<string | null>(null);

  // Add Balance Dialog State
  const [balanceInvestor, setBalanceInvestor] = useState<Investor | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");
  const [balanceProofFile, setBalanceProofFile] = useState<File | null>(null);
  const [balanceProofPreview, setBalanceProofPreview] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Withdrawal Dialog State
  const [withdrawInvestor, setWithdrawInvestor] = useState<Investor | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawProofFile, setWithdrawProofFile] = useState<File | null>(null);
  const [withdrawProofPreview, setWithdrawProofPreview] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Edit Investor Dialog State
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRatio, setEditRatio] = useState("50");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editSaving, setEditSaving] = useState(false);

  // View Edit History Log Dialog State
  const [viewHistoryInvestor, setViewHistoryInvestor] = useState<Investor | null>(null);

  // Pending withdrawals data
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("bm_cached_investors");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInvestors(parsed);
            setLoading(false);
          }
        } catch (e) {}
      }
    }

    // Active investors snapshot
    const q = query(collection(db, "investors"), orderBy("createdAt", "desc"));
    const unsubscribeInvestors = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Investor));
        setInvestors(data);
        setLoading(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("bm_cached_investors", JSON.stringify(data));
        }
      },
      (err) => {
        console.warn("Investors realtime sync error:", err);
        setLoading(false);
      }
    );

    // Deleted investors snapshot
    const unsubscribeDeleted = onSnapshot(
      collection(db, "deleted_records"),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as DeletedRecord))
          .filter((rec) => rec.type === "investors");
        list.sort((a, b) => new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime());
        setDeletedInvestors(list);
      },
      (err) => {
        console.warn("Deleted investors sync error:", err);
      }
    );

    // Load pending withdrawal requests
    const unsubWithdrawals = onSnapshot(
      collection(db, "withdrawals"),
      (snap) => {
        const grouped: Record<string, any[]> = {};
        snap.docs.forEach((d) => {
          const w = { id: d.id, ...d.data() };
          if ((w as any).status === "pending") {
            const invId = (w as any).investorId;
            if (!grouped[invId]) grouped[invId] = [];
            grouped[invId].push(w);
          }
        });
        setPendingWithdrawals(grouped);
      },
      () => {}
    );

    return () => {
      unsubscribeInvestors();
      unsubscribeDeleted();
      unsubWithdrawals();
    };
  }, []);

  const openEditModal = (inv: Investor) => {
    setEditInvestor(inv);
    setEditName(inv.fullName || "");
    setEditPhone(inv.phone || "");
    setEditEmail(inv.email || "");
    setEditRatio(String(inv.sharingRatio || 50));
    setEditStatus(inv.status || "active");
  };

  const handleSaveEdit = async () => {
    if (!editInvestor) return;
    if (!editName.trim()) {
      toast.error("Pura naam likhna zaroori hai");
      return;
    }
    setEditSaving(true);
    try {
      const ratioNum = parseFloat(editRatio) || 50;
      const changes: Record<string, { old: any; new: any }> = {};

      if (editInvestor.fullName !== editName) changes.fullName = { old: editInvestor.fullName || "", new: editName };
      if (editInvestor.phone !== editPhone) changes.phone = { old: editInvestor.phone || "", new: editPhone };
      if (editInvestor.email !== editEmail) changes.email = { old: editInvestor.email || "", new: editEmail };
      if (editInvestor.sharingRatio !== ratioNum) changes.sharingRatio = { old: editInvestor.sharingRatio || 50, new: ratioNum };
      if (editInvestor.status !== editStatus) changes.status = { old: editInvestor.status || "active", new: editStatus };

      const editHistoryEntry: InvestorEditHistoryItem = {
        id: "ed_" + Date.now(),
        editedAt: new Date().toISOString(),
        editedBy: "Admin",
        changes: Object.keys(changes).length > 0 ? changes : { info: { old: "Previous details", new: "Profile updated" } }
      };

      const updatedHistory = [editHistoryEntry, ...(editInvestor.editHistory || [])];

      const updateData = {
        fullName: editName,
        phone: editPhone,
        email: editEmail,
        sharingRatio: ratioNum,
        status: editStatus,
        editHistory: updatedHistory,
      };

      await updateDoc(doc(db, "investors", editInvestor.id), updateData);

      // Also update users collection if exists
      if (editInvestor.userId) {
        await updateDoc(doc(db, "users", editInvestor.userId), {
          fullName: editName,
          name: editName,
          phone: editPhone,
          email: editEmail,
          sharingRatio: ratioNum,
          status: editStatus,
        }).catch(() => {});
      }

      toast.success(editName + " ki details edit ho gayi (Version history log update ho gaya)!");
      setEditInvestor(null);
    } catch (e: any) {
      toast.error(e.message || "Update karne me masla aya");
    } finally {
      setEditSaving(false);
    }
  };

  const handleBalanceProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBalanceProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBalanceProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleWithdrawProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWithdrawProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setWithdrawProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDirectWithdrawal = async () => {
    if (!withdrawInvestor || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Meharbani karke valid amount enter karein");
      return;
    }
    const amount = parseFloat(withdrawAmount);
    if (amount > withdrawInvestor.availableBalance) {
      toast.error("Balance se zyada nikasi nahi ho sakti");
      return;
    }
    setWithdrawLoading(true);
    try {
      let proofUrl = "";
      if (withdrawProofFile) {
        try {
          const proofRef = ref(storage, `withdrawals/${withdrawInvestor.id}/${Date.now()}_proof`);
          await uploadBytes(proofRef, withdrawProofFile);
          proofUrl = await getDownloadURL(proofRef);
        } catch (e) {
          console.warn("Withdrawal proof upload error:", e);
        }
      }

      // Update investor balance
      const invRef = doc(db, "investors", withdrawInvestor.id);
      const invSnap = await getDoc(invRef);
      if (invSnap.exists()) {
        const invData = invSnap.data();
        await updateDoc(invRef, {
          availableBalance: Math.max(0, (invData.availableBalance || 0) - amount),
          totalWithdrawn: (invData.totalWithdrawn || 0) + amount,
        });
      }

      // Record withdrawal transaction
      await addDoc(collection(db, "withdrawals"), {
        investorId: withdrawInvestor.id,
        investorName: withdrawInvestor.fullName,
        amount,
        status: "approved",
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        adminNote: withdrawNote || "Admin ne direct nikasi kar di",
        ...(proofUrl ? { proofImage: proofUrl } : {}),
      });

      // Notification
      try {
        await addDoc(collection(db, "notifications"), {
          userId: withdrawInvestor.userId,
          type: "withdrawal",
          title: "Nikasi Successful! 💰",
          message: `Rs. ${amount.toLocaleString()} ki nikasi admin ne process kar di hai.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (nErr) {}

      toast.success(`Rs. ${amount.toLocaleString()} nikasi successful — ${withdrawInvestor.fullName}!`);
      setWithdrawInvestor(null);
      setWithdrawAmount("");
      setWithdrawNote("");
      setWithdrawProofFile(null);
      setWithdrawProofPreview("");
    } catch (err: any) {
      toast.error(err.message || "Nikasi mein masla aya");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleAddBalanceSubmit = async () => {
    if (!balanceInvestor || !addAmount || parseFloat(addAmount) <= 0) {
      toast.error("Meharbani karke valid amount enter karein");
      return;
    }
    setBalanceLoading(true);
    try {
      const amount = parseFloat(addAmount);
      let proofUrl = "";

      if (balanceProofFile) {
        try {
          const proofRef = ref(storage, `investments/${balanceInvestor.id}/${Date.now()}_add_proof`);
          await uploadBytes(proofRef, balanceProofFile);
          proofUrl = await getDownloadURL(proofRef);
        } catch (e) {
          console.warn("Balance proof upload error:", e);
        }
      }

      // Add record to investments history
      await addDoc(collection(db, "investments"), {
        investorId: balanceInvestor.id,
        investorName: balanceInvestor.fullName,
        amount,
        type: "additional",
        ...(proofUrl ? { imageProof: proofUrl } : {}),
        date: new Date().toISOString(),
        note: addNote || "Admin ne additional balance add kiya",
      });

      // Update investor's available balance and total investment
      const newAvail = (balanceInvestor.availableBalance || 0) + amount;
      const newTotal = (balanceInvestor.totalInvestment || 0) + amount;
      await updateDoc(doc(db, "investors", balanceInvestor.id), {
        availableBalance: newAvail,
        totalInvestment: newTotal,
      });

      toast.success(`Rs. ${amount.toLocaleString()} balance successfully add hogaya!`);
      setBalanceInvestor(null);
      setAddAmount("");
      setAddNote("");
      setBalanceProofFile(null);
      setBalanceProofPreview("");
    } catch (err: any) {
      toast.error(err.message || "Balance add karne me masla aya");
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleSoftDelete = async (inv: Investor) => {
    if (!confirm(`Kya aap "${inv.fullName}" ko Trash me bhejna chahte hain? Yahan Deleted tab se recover ho sakay ga.`)) return;
    setDeletingId(inv.id);
    try {
      await addDoc(collection(db, "deleted_records"), {
        originalId: inv.id,
        type: "investors",
        data: inv,
        deletedAt: new Date().toISOString(),
        deletedBy: "Admin",
      });
      await deleteDoc(doc(db, "investors", inv.id));
      toast.success(`${inv.fullName} Trash tab me move hogaya.`);
    } catch (e: any) {
      toast.error(e.message || "Delete karne me masla aya");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestoreInvestor = async (rec: DeletedRecord) => {
    setRestoringId(rec.id);
    try {
      if (rec.originalId) {
        const restoreData = { ...rec.data, status: "active", restoredAt: new Date().toISOString() };
        await setDoc(doc(db, "investors", rec.originalId), restoreData, { merge: true });
      }
      await deleteDoc(doc(db, "deleted_records", rec.id));
      toast.success((rec.data?.fullName || rec.data?.name || "Partner") + " restore ho gaya!");
    } catch (e: any) {
      toast.error(e.message || "Restore me masla aya");
    } finally {
      setRestoringId(null);
    }
  };

  const filteredInvestors = investors.filter((inv) => {
    const matchesSearch =
      inv.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.phone?.includes(searchQuery) ||
      inv.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && inv.status === "active";
    return matchesSearch;
  });

  const filteredDeleted = deletedInvestors.filter((rec) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" /> All Investors / Partners
          </h1>
          <p className="text-sm text-muted-foreground">
            {investors.length} active partners • {deletedInvestors.length} in trash
          </p>
        </div>
        <Link href="/dashboard/investors/new">
          <Button className="gap-2 gradient-primary shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Add Investor
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
          All ({investors.length})
        </Button>
        <Button
          variant={activeTab === "active" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("active")}
          className="text-xs h-8 gap-1.5"
        >
          Active ({investors.filter((i) => i.status === "active").length})
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
          Deleted / Trash ({deletedInvestors.length})
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search partner name, phone, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 text-xs"
        />
      </div>

      {/* DELETED INVESTORS / TRASH VIEW */}
      {activeTab === "deleted" ? (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : filteredDeleted.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Trash2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-semibold mb-1">Koi Deleted Partner Nahi Hai</h3>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "Search se match nahi mila" : "Jab aap kisi partner ko soft-delete karenge to wo yahan show hoga"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDeleted.map((rec) => {
              const inv = rec.data || {};
              return (
                <Card key={rec.id} className="border-emerald-500/20 bg-emerald-500/5 hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-sm border border-emerald-500/20">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm truncate">{inv.fullName || inv.name || "Unknown Investor"}</h3>
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <Trash2 className="w-2.5 h-2.5" /> Soft Deleted
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            {inv.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {inv.phone}
                              </span>
                            )}
                            {inv.totalInvestment && (
                              <span className="font-semibold text-foreground">
                                Investment: {formatCurrency(inv.totalInvestment)}
                              </span>
                            )}
                            {inv.sharingRatio && (
                              <span>Ratio: {inv.sharingRatio}%</span>
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
                        onClick={() => handleRestoreInvestor(rec)}
                        disabled={restoringId === rec.id}
                        className="gap-1.5 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 shrink-0"
                      >
                        {restoringId === rec.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore Partner
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* ACTIVE / ALL INVESTORS GRID */
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredInvestors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Investors Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Koi investor is search se match nahi karta"
                  : "Abhi tak koi investor add nahi hua"}
              </p>
              {!searchQuery && (
                <Link href="/dashboard/investors/new">
                  <Button className="gap-2 gradient-primary">
                    <Plus className="w-4 h-4" />
                    Add First Investor
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvestors.map((investor) => {
              const isLowBalance = (investor.availableBalance || 0) < 10000;
              const investorPendingW = pendingWithdrawals[investor.id] || [];
              return (
                <Card
                  key={investor.id}
                  className="hover:shadow-lg transition-all duration-300 hover:border-primary/20 group border border-border flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-4 flex-1">
                    {/* Pending Withdrawal Alert */}
                    {investorPendingW.length > 0 && (
                      <Link href="/dashboard/approvals" className="block">
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer">
                          <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              ⏳ Nikasi Request Pending
                            </p>
                            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 truncate">
                              {investorPendingW.map((w: any) => `Rs. ${w.amount?.toLocaleString()}`).join(" + ")} — Approve karein →
                            </p>
                          </div>
                        </div>
                      </Link>
                    )}

                    {/* Investor Header & Edit options */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {investor.profileImage && (
                          <img
                            src={investor.profileImage}
                            alt={investor.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-border/50 mb-1"
                          />
                        )}
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                          {investor.fullName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{investor.phone}</span>
                        </div>
                        {investor.email && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{investor.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant={investor.status === "active" ? "success" : "secondary"}>
                          {investor.status || "active"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(investor)}
                          className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Balance & Stats */}
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Available Balance</span>
                        <span className={`font-bold text-sm ${isLowBalance ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {formatCurrency(investor.availableBalance || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Investment</span>
                        <span className="font-medium text-foreground">{formatCurrency(investor.totalInvestment || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Profit</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(investor.totalProfit || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Active Sets</span>
                        <Badge variant="outline" className="text-[10px]">
                          {investor.activeInstallments || 0} mobiles
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Agreement Proof</span>
                        {investor.agreementImage ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] px-2 gap-1 text-primary border-primary/30"
                            onClick={() => setViewAgreementUrl(investor.agreementImage!)}
                          >
                            <Eye className="w-3 h-3" /> Agreement
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">No agreement</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Profit Sharing</span>
                        <div className="flex items-center gap-1">
                          <Percent className="w-3 h-3 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            {investor.sharingRatio || 50}% / {100 - (investor.sharingRatio || 50)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Card Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs font-semibold h-8"
                        onClick={() => {
                          setBalanceInvestor(investor);
                          setAddAmount("");
                          setAddNote("");
                          setBalanceProofFile(null);
                          setBalanceProofPreview("");
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" /> + Balance
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white gap-1 text-xs font-semibold h-8"
                        onClick={() => {
                          setWithdrawInvestor(investor);
                          setWithdrawAmount("");
                          setWithdrawNote("");
                          setWithdrawProofFile(null);
                          setWithdrawProofPreview("");
                        }}
                      >
                        <ArrowUpFromLine className="w-3.5 h-3.5" /> Nikasi
                      </Button>

                      {investor.editHistory && investor.editHistory.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewHistoryInvestor(investor)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="View Version Log"
                        >
                          <History className="w-3.5 h-3.5" /> ({investor.editHistory.length})
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleSoftDelete(investor)}
                        disabled={deletingId === investor.id}
                        title="Soft Delete to Trash"
                      >
                        {deletingId === investor.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* EDIT INVESTOR DIALOG */}
      <Dialog open={!!editInvestor} onOpenChange={() => setEditInvestor(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" /> Investor / Partner Edit Karein
            </DialogTitle>
            <DialogDescription>
              Details change karne par Old vs New version history log mein save hoga.
            </DialogDescription>
          </DialogHeader>

          {editInvestor && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold">Full Name *</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Investor Full Name"
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
                  placeholder="investor@gmail.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold">Profit Sharing Ratio (%)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editRatio}
                    onChange={(e) => setEditRatio(e.target.value)}
                    placeholder="e.g. 50"
                  />
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    Investor {editRatio || 50}% / Shop {100 - (parseFloat(editRatio) || 50)}%
                  </span>
                </div>
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
            <Button variant="outline" onClick={() => setEditInvestor(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving} className="gap-2 gradient-primary">
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save & Log Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT HISTORY LOG DIALOG */}
      <Dialog open={!!viewHistoryInvestor} onOpenChange={() => setViewHistoryInvestor(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Investor Edit & Version History
            </DialogTitle>
            <DialogDescription>
              {viewHistoryInvestor?.fullName} ke purane edit records:
            </DialogDescription>
          </DialogHeader>

          {viewHistoryInvestor && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 py-2">
              {(!viewHistoryInvestor.editHistory || viewHistoryInvestor.editHistory.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-6">Abhi koi past edit history nahi hai</p>
              ) : (
                viewHistoryInvestor.editHistory.map((item, idx) => (
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
            <Button variant="outline" onClick={() => setViewHistoryInvestor(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Balance / Investment Dialog */}
      <Dialog open={!!balanceInvestor} onOpenChange={() => setBalanceInvestor(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Wallet className="w-5 h-5" /> Add Balance / Investment
            </DialogTitle>
            <DialogDescription>
              {balanceInvestor?.fullName} ke account me naya balance add karein
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Amount (PKR) *</label>
              <Input
                type="number"
                placeholder="e.g. 100000"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
              />
              {addAmount && parseFloat(addAmount) > 0 && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg font-medium">
                  {amountToUrduWords(parseFloat(addAmount))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Note / Remarks (Optional)</label>
              <Input
                placeholder="e.g. Cash payment / Bank transfer"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
              />
            </div>

            {/* Payment Proof Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Payment Proof Image (Optional)</label>
              <div className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center hover:border-emerald-500/30 transition-colors">
                {balanceProofPreview ? (
                  <div className="space-y-2">
                    <img
                      src={balanceProofPreview}
                      alt="Payment Proof"
                      className="max-h-32 mx-auto rounded-lg object-cover border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBalanceProofFile(null);
                        setBalanceProofPreview("");
                      }}
                      className="h-7 text-xs"
                    >
                      Proof Hatayein
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Slip / Receipt / Bank Screenshot upload karein</p>
                    <div className="flex gap-2 justify-center pt-1">
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBalanceProofChange}
                          className="hidden"
                        />
                        <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" asChild>
                          <span>
                            <Upload className="w-3 h-3" />
                            Upload Proof
                          </span>
                        </Button>
                      </label>
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleBalanceProofChange}
                          className="hidden"
                        />
                        <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" asChild>
                          <span>
                            <Camera className="w-3 h-3" />
                            Camera
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceInvestor(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddBalanceSubmit}
              disabled={balanceLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {balanceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Add Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Agreement Image Dialog */}
      <Dialog open={!!viewAgreementUrl} onOpenChange={() => setViewAgreementUrl(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-[600px] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Investor Agreement Document
            </DialogTitle>
          </DialogHeader>
          {viewAgreementUrl && (
            <div className="py-4 text-center space-y-4">
              <img
                src={viewAgreementUrl}
                alt="Agreement Document Proof"
                className="max-h-[70vh] w-auto mx-auto rounded-lg object-contain border shadow-sm"
              />
              <div className="flex justify-end gap-2">
                <a href={viewAgreementUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">Open Full Image</Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Direct Withdrawal Dialog */}
      <Dialog open={!!withdrawInvestor} onOpenChange={() => setWithdrawInvestor(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <ArrowUpFromLine className="w-5 h-5" /> Nikasi / Withdrawal
            </DialogTitle>
            <DialogDescription>
              {withdrawInvestor?.fullName} ke account se paisa nikaalein
            </DialogDescription>
          </DialogHeader>

          {withdrawInvestor && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Balance:</span>
                  <span className="font-bold text-emerald-500">{formatCurrency(withdrawInvestor.availableBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Withdrawn:</span>
                  <span className="font-medium">{formatCurrency(withdrawInvestor.totalWithdrawn || 0)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Nikasi Amount (PKR) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                  <div className={`text-xs p-2 rounded-lg ${parseFloat(withdrawAmount) > withdrawInvestor.availableBalance ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                    {parseFloat(withdrawAmount) > withdrawInvestor.availableBalance 
                      ? `⚠️ Balance se zyada! Available: ${formatCurrency(withdrawInvestor.availableBalance)}` 
                      : `✅ Nikasi ke baad balance: ${formatCurrency(withdrawInvestor.availableBalance - parseFloat(withdrawAmount))}`}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Note / Wajah (Optional)</label>
                <Input
                  placeholder="e.g. Cash di / Bank transfer kiya"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                />
              </div>

              {/* Payment Proof Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Payment Proof Image (Optional)</label>
                <div className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center hover:border-orange-500/30 transition-colors">
                  {withdrawProofPreview ? (
                    <div className="space-y-2">
                      <img
                        src={withdrawProofPreview}
                        alt="Payment Proof"
                        className="max-h-32 mx-auto rounded-lg object-cover border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setWithdrawProofFile(null); setWithdrawProofPreview(""); }}
                        className="h-7 text-xs"
                      >
                        Proof Hatayein
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Slip / Receipt / Bank Screenshot upload karein</p>
                      <div className="flex gap-2 justify-center pt-1">
                        <label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleWithdrawProofChange}
                            className="hidden"
                          />
                          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" asChild>
                            <span>
                              <Upload className="w-3 h-3" />
                              Upload Proof
                            </span>
                          </Button>
                        </label>
                        <label>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleWithdrawProofChange}
                            className="hidden"
                          />
                          <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" asChild>
                            <span>
                              <Camera className="w-3 h-3" />
                              Camera
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawInvestor(null)}>Cancel</Button>
            <Button
              onClick={handleDirectWithdrawal}
              disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || (withdrawInvestor ? parseFloat(withdrawAmount) > withdrawInvestor.availableBalance : true)}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            >
              {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Nikasi Confirm Karein
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
