"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  Clock,
  Image as ImageIcon,
  ArrowUpFromLine,
  Wallet,
  Upload,
  FileCheck,
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, onSnapshot, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  changes: Record<string, { old: string; new: string }>;
  newProfileImage?: string;
  status: string;
  submittedAt: string;
  collectionName?: string;
  docId?: string;
}

interface WithdrawalItem {
  id: string;
  investorId: string;
  investorName: string;
  amount: number;
  bankDetails?: string;
  status: string;
  createdAt?: string;
  requestedAt?: string;
}

export default function ApprovalsPage() {
  const [profileRequests, setProfileRequests] = useState<ProfileChangeRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Withdrawal Approval Modal State
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalItem | null>(null);
  const [proofImageFile, setProofImageFile] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string>("");
  const [transactionRef, setTransactionRef] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rejection Modal State
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<WithdrawalItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    // 1. Profile change requests
    const unsubProfile = onSnapshot(collection(db, "pending_approvals"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as ProfileChangeRequest))
        .filter((r) => r.status === "pending");
      list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      setProfileRequests(list);
    }, () => {});

    // 2. Withdrawal requests
    const unsubWith = onSnapshot(collection(db, "withdrawals"), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as WithdrawalItem))
        .filter((w) => w.status === "pending");
      list.sort((a, b) => new Date(b.createdAt || b.requestedAt || 0).getTime() - new Date(a.createdAt || a.requestedAt || 0).getTime());
      setWithdrawals(list);
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      unsubProfile();
      unsubWith();
    };
  }, []);

  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleOpenApproveWithdrawal = (w: WithdrawalItem) => {
    setSelectedWithdrawal(w);
    setProofImageFile(null);
    setProofImagePreview("");
    setTransactionRef("");
    setAdminNote("Payment completed via bank/easypaisa");
  };

  const handleConfirmApproveWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    setIsSubmitting(true);
    try {
      // Upload proof image to Firebase Storage if provided
      let proofUrl = "";
      if (proofImageFile) {
        try {
          const proofRef = ref(storage, `withdrawals/${selectedWithdrawal.investorId}/${Date.now()}_approval_proof`);
          await uploadBytes(proofRef, proofImageFile);
          proofUrl = await getDownloadURL(proofRef);
        } catch (e) {
          console.warn("Proof upload error:", e);
        }
      }

      // 1. Deduct investor balance & update totalWithdrawn
      if (selectedWithdrawal.investorId) {
        const invRef = doc(db, "investors", selectedWithdrawal.investorId);
        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          const invData = invSnap.data();
          const currentBal = invData.availableBalance || 0;
          const currentWithdrawn = invData.totalWithdrawn || 0;
          await updateDoc(invRef, {
            availableBalance: Math.max(0, currentBal - selectedWithdrawal.amount),
            totalWithdrawn: currentWithdrawn + selectedWithdrawal.amount,
          });
        }
      }

      // 2. Update withdrawal request in Firestore
      await updateDoc(doc(db, "withdrawals", selectedWithdrawal.id), {
        status: "approved",
        proofImage: proofUrl || "",
        transactionRef: transactionRef || "",
        adminNote: adminNote || "",
        approvedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      });

      // 3. Create notification for investor
      try {
        await addDoc(collection(db, "notifications"), {
          userId: selectedWithdrawal.investorId,
          type: "withdrawal",
          title: "Nikasi Approve Ho Gayi! 💰",
          message: `Rs. ${selectedWithdrawal.amount.toLocaleString()} ki nikasi request approve ho gayi hai. Proof dekh sakte hain.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (nErr) {}

      toast.success(`Rs. ${selectedWithdrawal.amount.toLocaleString()} nikasi approved — ${selectedWithdrawal.investorName}!`);
      setSelectedWithdrawal(null);
    } catch (err: any) {
      toast.error(err.message || "Approval mein masla aya");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRejectWithdrawal = async () => {
    if (!rejectingWithdrawal) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "withdrawals", rejectingWithdrawal.id), {
        status: "rejected",
        rejectReason: rejectReason || "Request cancelled by admin",
        processedAt: new Date().toISOString(),
      });
      toast.info(`Withdrawal request for ${rejectingWithdrawal.investorName} rejected.`);
      setRejectingWithdrawal(null);
    } catch (err: any) {
      toast.error(err.message || "Rejection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Profile Change Approvals
  const handleApproveProfile = async (req: ProfileChangeRequest) => {
    setProcessingId(req.id);
    try {
      const updateData: Record<string, any> = {};
      if (req.changes) {
        Object.entries(req.changes).forEach(([key, val]) => {
          updateData[key] = val.new;
        });
      }
      if (req.newProfileImage) {
        updateData.profileImage = req.newProfileImage;
      }
      if (req.userId) {
        await updateDoc(doc(db, "users", req.userId), updateData).catch(() => {});
      }
      if (req.collectionName && req.docId) {
        await updateDoc(doc(db, req.collectionName, req.docId), updateData).catch(() => {});
      }
      await updateDoc(doc(db, "pending_approvals", req.id), {
        status: "approved",
        processedAt: new Date().toISOString(),
      });
      toast.success(req.userName + " ki profile changes approve ho gayi!");
    } catch (e: any) {
      toast.error(e.message || "Approve me masla aya");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectProfile = async (req: ProfileChangeRequest) => {
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, "pending_approvals", req.id), {
        status: "rejected",
        processedAt: new Date().toISOString(),
      });
      toast.success(req.userName + " ki request reject ho gayi.");
    } catch (e: any) {
      toast.error(e.message || "Reject me masla aya");
    } finally {
      setProcessingId(null);
    }
  };

  const totalPendingCount = withdrawals.length + profileRequests.length;

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <UserCheck className="w-6 h-6 text-amber-500" />
            Approvals & Requests Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Investor Nikasi aur User Profile updates approve ya reject karein ({totalPendingCount} pending)
          </p>
        </div>
      </div>

      <Tabs defaultValue="withdrawals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="withdrawals" className="gap-2">
            <ArrowUpFromLine className="w-4 h-4" />
            Nikasi Requests ({withdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <UserCheck className="w-4 h-4" />
            Profile Edits ({profileRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: WITHDRAWALS */}
        <TabsContent value="withdrawals" className="mt-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : withdrawals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Koi Pending Nikasi Request Nahi</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Jab partners nikasi request karenge to yahan show hogi</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <Card key={w.id} className="border-amber-500/30 hover:shadow-md transition-all">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                            Pending Nikasi
                          </Badge>
                          <h3 className="font-bold text-base">{w.investorName}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Requested Date: {formatDate(w.createdAt || w.requestedAt || new Date().toISOString())}
                        </p>
                        {w.bankDetails && (
                          <p className="text-xs bg-muted/40 rounded-md p-2 border font-mono mt-2">
                            <strong>Bank / Payment Account:</strong> {w.bankDetails}
                          </p>
                        )}
                      </div>

                      <div className="text-left md:text-right space-y-1">
                        <p className="text-2xl font-extrabold text-emerald-500">{formatCurrency(w.amount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Nikasi Amount</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex flex-wrap gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs gap-1"
                        onClick={() => {
                          setRejectingWithdrawal(w);
                          setRejectReason("");
                        }}
                      >
                        <XCircle className="w-4 h-4" /> Reject Karein
                      </Button>

                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold px-4 shadow-md shadow-emerald-600/20"
                        onClick={() => handleOpenApproveWithdrawal(w)}
                      >
                        <FileCheck className="w-4 h-4" /> Approve & Proof Lagayein
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PROFILE EDITS */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          {profileRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">No Pending Profile Requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {profileRequests.map((req) => (
                <Card key={req.id} className="border-amber-500/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">{req.userRole}</Badge>
                        <span className="text-sm font-semibold">{req.userName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(req.submittedAt)}</span>
                    </div>

                    {req.changes && (
                      <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-xs">
                        {Object.entries(req.changes).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="font-semibold capitalize w-20 text-muted-foreground">{key}:</span>
                            <span className="line-through text-destructive/60">{val.old || "N/A"}</span>
                            <span>&#8594;</span>
                            <span className="font-bold text-emerald-500">{val.new}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processingId === req.id}
                        onClick={() => handleRejectProfile(req)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={processingId === req.id}
                        onClick={() => handleApproveProfile(req)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve Profile"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Withdrawal & Attach Proof Modal */}
      <Dialog open={!!selectedWithdrawal} onOpenChange={(open) => !open && setSelectedWithdrawal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <Wallet className="w-5 h-5" /> Approve Withdrawal & Payment Proof
            </DialogTitle>
            <DialogDescription>
              {selectedWithdrawal?.investorName} ki Rs. {selectedWithdrawal?.amount.toLocaleString()} withdrawal request approve karein:
            </DialogDescription>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4 my-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investor:</span>
                  <span className="font-bold">{selectedWithdrawal.investorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Withdrawal Amount:</span>
                  <span className="font-bold text-emerald-500">{formatCurrency(selectedWithdrawal.amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Payment Proof Image (Screenshot / Receipt)</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/*" onChange={handleProofImageChange} className="text-xs cursor-pointer" />
                </div>
                {proofImagePreview && (
                  <div className="mt-2 relative rounded-lg overflow-hidden border max-h-40">
                    <img src={proofImagePreview} alt="Proof" className="w-full h-36 object-contain bg-black/40" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Transaction ID / Reference #</Label>
                <Input
                  placeholder="e.g. TRX-9821739812"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Admin Note / Remarks</Label>
                <Input
                  placeholder="e.g. Sent via EasyPaisa / Bank Transfer"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedWithdrawal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApproveWithdrawal}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve & Submit Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Withdrawal Dialog */}
      <Dialog open={!!rejectingWithdrawal} onOpenChange={(open) => !open && setRejectingWithdrawal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Reject Withdrawal Request
            </DialogTitle>
            <DialogDescription>
              {rejectingWithdrawal?.investorName} ki Rs. {rejectingWithdrawal?.amount.toLocaleString()} request cancel karein:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <Label className="text-xs font-semibold">Rejection Reason</Label>
            <Input
              placeholder="e.g. Account details mismatch / Insufficient funds"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectingWithdrawal(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRejectWithdrawal}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
