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
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, getDocs, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDoc } from "firebase/firestore";
import { Investor } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { amountToUrduWords } from "@/lib/amount-words";
import { toast } from "sonner";

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

    const q = query(collection(db, "investors"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
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
      unsubscribe();
      unsubWithdrawals();
    };
  }, []);

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

      // 1. Update investor balance
      const invRef = doc(db, "investors", withdrawInvestor.id);
      const invSnap = await getDoc(invRef);
      if (invSnap.exists()) {
        const invData = invSnap.data();
        await updateDoc(invRef, {
          availableBalance: Math.max(0, (invData.availableBalance || 0) - amount),
          totalWithdrawn: (invData.totalWithdrawn || 0) + amount,
        });
      }

      // 2. Create withdrawal record (directly approved)
      await addDoc(collection(db, "withdrawals"), {
        investorId: withdrawInvestor.id,
        investorName: withdrawInvestor.fullName,
        amount,
        status: "approved",
        adminNote: withdrawNote || "Admin ne direct nikasi ki",
        proofImage: proofUrl || "",
        requestedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      });

      // 3. Notify investor
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
    if (!confirm(`Kya aap ${inv.fullName} ko trash me bhejna chahte hain?`)) return;
    try {
      await addDoc(collection(db, "deleted_records"), {
        originalId: inv.id,
        type: "investors",
        data: inv,
        deletedAt: new Date().toISOString(),
        deletedBy: "admin",
      });
      await deleteDoc(doc(db, "investors", inv.id));
      toast.success(`${inv.fullName} trash me chala gaya.`);
    } catch (e: any) {
      toast.error(e.message || "Delete karne me masla aya");
    }
  };

  const filteredInvestors = investors.filter(
    (inv) =>
      inv.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Investors</h1>
          <p className="text-sm text-muted-foreground">
            Manage investor accounts & track investments
          </p>
        </div>
        <Link href="/dashboard/investors/new">
          <Button className="gap-2 gradient-primary shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Add Investor
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Investor Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent key={i} className="p-6 space-y-4">
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
            const isLowBalance = investor.availableBalance < 10000;
            const investorPendingW = pendingWithdrawals[investor.id] || [];
  return (
              <Card
                key={investor.id}
                className="hover:shadow-lg transition-all duration-300 hover:border-primary/20 group"
              >
                <CardContent className="p-6 space-y-4">
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

                  {/* Investor Name & Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      {investor.profileImage && (
                        <img src={investor.profileImage} alt={investor.fullName} className="w-8 h-8 rounded-full object-cover border border-border/50 mb-1" />
                      )}
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                        {investor.fullName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{investor.phone}</span>
                      </div>
                    </div>
                    <Badge variant={investor.status === "active" ? "success" : "secondary"}>
                      {investor.status}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Balance & Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Available Balance</span>
                      <span className={`text-sm font-bold ${isLowBalance ? "text-red-500" : "text-green-500"}`}>
                        {formatCurrency(investor.availableBalance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Investment</span>
                      <span className="text-sm font-medium">{formatCurrency(investor.totalInvestment)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Profit</span>
                      <span className="text-sm font-medium text-green-500">{formatCurrency(investor.totalProfit)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Active Sets</span>
                      <Badge variant="outline" className="text-xs">
                        {investor.activeInstallments} mobiles
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Agreement Proof</span>
                      {investor.agreementImage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 text-primary border-primary/30"
                          onClick={() => setViewAgreementUrl(investor.agreementImage!)}
                        >
                          <Eye className="w-3 h-3" /> View Agreement
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No agreement</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Sharing Ratio</span>
                      <div className="flex items-center gap-1">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          {investor.sharingRatio} / {100 - investor.sharingRatio}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Card Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold h-8"
                      onClick={() => {
                        setBalanceInvestor(investor);
                        setAddAmount("");
                        setAddNote("");
                        setBalanceProofFile(null);
                        setBalanceProofPreview("");
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Balance Add
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs font-semibold h-8"
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => handleSoftDelete(investor)}
                      title="Trash mein bhejein"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
                      onClick={() => { setBalanceProofFile(null); setBalanceProofPreview(""); }}
                      className="h-7 text-xs"
                    >
                      Remove Proof
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
            <Button variant="outline" onClick={() => setBalanceInvestor(null)}>Cancel</Button>
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
              {/* Current Balance Info */}
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
