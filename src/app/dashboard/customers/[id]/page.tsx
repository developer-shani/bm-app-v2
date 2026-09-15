"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  User,
  Phone,
  Smartphone,
  Calendar,
  Fingerprint,
  Wallet,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Upload,
  Camera,
  ExternalLink,
  Ban,
  IndianRupee,
  Trash2,
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Customer, Recovery, Investor } from "@/types";
import { formatCurrency, formatDate, formatDateTime, getDaysOverdue, getInstallmentStatus } from "@/lib/utils";
import { generateSmsMessage, splitByRatio } from "@/lib/calculations";
import { toast } from "sonner";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [loading, setLoading] = useState(true);

  // Recovery Dialog
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryAmount, setRecoveryAmount] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Loss Dialog
  const [showLoss, setShowLoss] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [lossLoading, setLossLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
      const custDoc = await getDoc(doc(db, "customers", customerId));
      if (!custDoc.exists()) { router.push("/dashboard/customers"); return; }
      const custData = { id: custDoc.id, ...custDoc.data() } as Customer;
      setCustomer(custData);

      // Load recoveries
      const recSnap = await getDocs(query(collection(db, "recoveries"), where("customerId", "==", customerId)));
      const recs = recSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Recovery)).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setRecoveries(recs);

      // Load investor
      if (custData.investorId) {
        const invDoc = await getDoc(doc(db, "investors", custData.investorId));
        if (invDoc.exists()) setInvestor({ id: invDoc.id, ...invDoc.data() } as Investor);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!recoveryAmount || !customer) return;
    setRecoveryLoading(true);
    try {
      let imageUrl = "";
      if (proofImage) {
        const imageRef = ref(storage, `recoveries/${customer.id}/${Date.now()}_proof`);
        await uploadBytes(imageRef, proofImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const amount = parseFloat(recoveryAmount);
      const newTotalPaid = customer.totalPaid + amount;
      const newRemaining = customer.sellingPrice - newTotalPaid;
      const newPaidInstallments = customer.paidInstallments + 1;
      const isComplete = newRemaining <= 0;

      await addDoc(collection(db, "recoveries"), {
        customerId: customer.id, customerName: customer.name, customerIdNumber: customer.idNumber,
        amount, installmentNumber: newPaidInstallments,
        investorId: customer.investorId, investorName: customer.investorName,
        imageProof: imageUrl, date: new Date().toISOString(), collectedBy: "admin",
      });

      const nextDue = isComplete ? customer.nextDueDate
        : new Date(new Date(customer.nextDueDate).setMonth(new Date(customer.nextDueDate).getMonth() + 1)).toISOString();

      await updateDoc(doc(db, "customers", customer.id), {
        totalPaid: newTotalPaid, remainingAmount: Math.max(0, newRemaining),
        paidInstallments: newPaidInstallments, nextDueDate: nextDue,
        status: isComplete ? "completed" : "active",
      });

      if (investor) {
        await updateDoc(doc(db, "investors", customer.investorId), {
          availableBalance: investor.availableBalance + amount,
          activeInstallments: isComplete ? investor.activeInstallments - 1 : investor.activeInstallments,
          totalProfit: isComplete ? investor.totalProfit + splitByRatio(customer.profitAmount, investor.sharingRatio).investorShare : investor.totalProfit,
        });
      }

      toast.success(`Recovery of ${formatCurrency(amount)} recorded!`);
      setShowRecovery(false);
      setRecoveryAmount(""); setProofImage(null); setProofPreview("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleMarkLoss = async () => {
    if (!customer || !lossReason) return;
    setLossLoading(true);
    try {
      await updateDoc(doc(db, "customers", customer.id), {
        status: "defaulted",
        lossReason,
        lossDate: new Date().toISOString(),
        lossAmount: customer.remainingAmount,
      });

      if (investor) {
        const lossShare = splitByRatio(customer.remainingAmount, investor.sharingRatio);
        await addDoc(collection(db, "notifications"), {
          userId: investor.userId,
          type: "loss",
          title: "Loss Reported",
          message: `${customer.name} ki Rs. ${customer.remainingAmount.toLocaleString()} ki remaining amount defaulted mark ho gayi. Aapka share: Rs. ${lossShare.investorShare.toLocaleString()}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success("Customer marked as defaulted");
      setShowLoss(false);
      loadData();
    } catch (err) {
      toast.error("Error marking loss");
    } finally {
      setLossLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!customer) return;
    const daysOverdue = getDaysOverdue(customer.nextDueDate);
    const message = generateSmsMessage(
      customer.name, customer.monthlyInstallment,
      customer.paidInstallments + 1, customer.installmentMonths,
      customer.nextDueDate, daysOverdue, "Brother Mobiles"
    );
    const phone = customer.phone1.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/92${phone.startsWith("0") ? phone.slice(1) : phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (loading || !customer) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const status = customer.status === "active" ? getInstallmentStatus(customer.nextDueDate) : customer.status;
  const progress = customer.sellingPrice > 0 ? Math.round((customer.totalPaid / customer.sellingPrice) * 100) : 0;
  const daysOverdue = getDaysOverdue(customer.nextDueDate);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/customers">
          <Button variant="ghost" size="icon" className="rounded-lg"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{customer.name}</h1>
            <Badge variant="outline">#{customer.idNumber}</Badge>
            {status === "overdue" && <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />{daysOverdue} days overdue</Badge>}
            {status === "due-soon" && <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" />Due soon</Badge>}
            {status === "completed" && <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>}
            {status === "defaulted" && <Badge variant="destructive" className="gap-1"><Ban className="w-3 h-3" />Defaulted</Badge>}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {customer.status === "active" && (
        <div className="flex gap-2 flex-wrap">
          <Dialog open={showRecovery} onOpenChange={setShowRecovery}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary"><CreditCard className="w-4 h-4" /> Add Recovery</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>Monthly: {formatCurrency(customer.monthlyInstallment)} | Remaining: {formatCurrency(customer.remainingAmount)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (PKR)</Label>
                  <Input type="number" placeholder={customer.monthlyInstallment.toString()} value={recoveryAmount} onChange={(e) => setRecoveryAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Proof</Label>
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center">
                    {proofPreview ? (
                      <div className="space-y-2">
                        <img src={proofPreview} alt="Proof" className="max-h-32 mx-auto rounded-lg" />
                        <Button variant="outline" size="sm" onClick={() => { setProofImage(null); setProofPreview(""); }}>Remove</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setProofImage(f); const r = new FileReader(); r.onloadend = () => setProofPreview(r.result as string); r.readAsDataURL(f); }}} className="hidden" />
                          <Button variant="outline" size="sm" className="gap-1.5" asChild><span><Upload className="w-3.5 h-3.5" /> Upload</span></Button></label>
                        <label><input type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setProofImage(f); const r = new FileReader(); r.onloadend = () => setProofPreview(r.result as string); r.readAsDataURL(f); }}} className="hidden" />
                          <Button variant="outline" size="sm" className="gap-1.5" asChild><span><Camera className="w-3.5 h-3.5" /> Camera</span></Button></label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRecovery} disabled={recoveryLoading} className="gradient-primary gap-2">
                  {recoveryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Record
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="gap-2" onClick={handleSendMessage}>
            <MessageSquare className="w-4 h-4" /> WhatsApp Reminder
          </Button>

          <Dialog open={showLoss} onOpenChange={setShowLoss}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                <Ban className="w-4 h-4" /> Mark as Loss
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">Mark as Defaulted</DialogTitle>
                <DialogDescription>Is se investor ko notification jayegi aur remaining amount as loss record hogi</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                  <p className="text-sm font-medium text-red-500">Loss Amount: {formatCurrency(customer.remainingAmount)}</p>
                  {investor && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Investor Share: {formatCurrency(splitByRatio(customer.remainingAmount, investor.sharingRatio).investorShare)} |
                      Admin Share: {formatCurrency(splitByRatio(customer.remainingAmount, investor.sharingRatio).adminShare)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Textarea placeholder="Customer ne payment karna band kar dia..." value={lossReason} onChange={(e) => setLossReason(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLoss(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleMarkLoss} disabled={lossLoading} className="gap-2">
                  {lossLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Confirm Loss
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Customer Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Customer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customer.image && <img src={customer.image} alt={customer.name} className="w-20 h-20 rounded-xl object-cover border" />}
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{customer.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-medium">#{customer.idNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone 1</span>
              <a href={`tel:${customer.phone1}`} className="font-medium text-primary flex items-center gap-1">{customer.phone1} <ExternalLink className="w-3 h-3" /></a>
            </div>
            {customer.phone2 && <div className="flex justify-between"><span className="text-muted-foreground">Phone 2</span><span className="font-medium">{customer.phone2}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Added</span><span className="font-medium">{formatDate(customer.createdAt)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-4 h-4 text-primary" /> Mobile Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Company</span><span className="font-medium">{customer.mobileCompany}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">{customer.mobileModel}</span></div>
            {customer.imei1 && <div className="flex justify-between"><span className="text-muted-foreground">IMEI 1</span><span className="font-mono text-xs">{customer.imei1}</span></div>}
            {customer.imei2 && <div className="flex justify-between"><span className="text-muted-foreground">IMEI 2</span><span className="font-mono text-xs">{customer.imei2}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Investor</span><span className="font-medium">{customer.investorName}</span></div>
            {customer.resellerName && <div className="flex justify-between"><span className="text-muted-foreground">Referred by</span><span className="font-medium">{customer.resellerName}</span></div>}
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><IndianRupee className="w-4 h-4 text-primary" /> Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Purchase</p>
              <p className="text-lg font-bold">{formatCurrency(customer.purchasePrice)}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Selling</p>
              <p className="text-lg font-bold">{formatCurrency(customer.sellingPrice)}</p>
            </div>
            <div className="bg-green-500/5 rounded-xl p-4 text-center border border-green-500/20">
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className="text-lg font-bold text-green-500">{formatCurrency(customer.profitAmount)}</p>
            </div>
            <div className="bg-primary/5 rounded-xl p-4 text-center border border-primary/20">
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(customer.monthlyInstallment)}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Advance Payment</span>
              <span className="font-medium">{formatCurrency(customer.advancePayment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-medium text-green-500">{formatCurrency(customer.totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-bold text-primary">{formatCurrency(customer.remainingAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Installments</span>
              <span className="font-medium">{customer.paidInstallments} / {customer.installmentMonths} months</span>
            </div>
            <Progress value={progress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground text-center">{progress}% complete</p>
          </div>

          {customer.referralCommissionAmount > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Referral Commission ({customer.referralCommissionPercent}%)</span>
                <span className="font-medium">{formatCurrency(customer.referralCommissionAmount)} → {customer.resellerName}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Payment History</CardTitle>
          <CardDescription>{recoveries.length} payments recorded</CardDescription>
        </CardHeader>
        <CardContent>
          {recoveries.length === 0 ? (
            <div className="text-center py-6">
              <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Advance ke baad koi payment nahi hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Advance Payment */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div>
                  <p className="text-sm font-medium text-green-500">+ {formatCurrency(customer.advancePayment)}</p>
                  <p className="text-[10px] text-muted-foreground">Advance Payment &bull; {formatDate(customer.createdAt)}</p>
                </div>
                <Badge variant="success" className="text-[10px]">Advance</Badge>
              </div>
              {recoveries.map((rec, i) => (
                <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    {rec.imageProof && (
                      <a href={rec.imageProof} target="_blank" rel="noopener noreferrer">
                        <img src={rec.imageProof} alt="Proof" className="w-10 h-10 rounded-lg object-cover border" />
                      </a>
                    )}
                    <div>
                      <p className="text-sm font-medium">+ {formatCurrency(rec.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">Installment #{rec.installmentNumber} &bull; {formatDateTime(rec.date)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">#{rec.installmentNumber}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
