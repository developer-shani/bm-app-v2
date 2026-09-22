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
  Banknote,
  Trash2,
  Edit,
  History
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Customer, Recovery, Investor, CustomerEditHistoryItem } from "@/types";
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

  
  // Edit Customer Dialog State
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone1, setEditPhone1] = useState("");
  const [editPhone2, setEditPhone2] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editImei1, setEditImei1] = useState("");
  const [editImei2, setEditImei2] = useState("");
  const [editPurchase, setEditPurchase] = useState("");
  const [editSelling, setEditSelling] = useState("");
  const [editMonthly, setEditMonthly] = useState("");
  const [editRemaining, setEditRemaining] = useState("");
  const [editAdvance, setEditAdvance] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Soft Delete State
  const [showDeleteCustomer, setShowDeleteCustomer] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openEditModal = () => {
    if (!customer) return;
    setEditName(customer.name || "");
    setEditPhone1(customer.phone1 || "");
    setEditPhone2(customer.phone2 || "");
    setEditCompany(customer.mobileCompany || "");
    setEditModel(customer.mobileModel || "");
    setEditImei1(customer.imei1 || "");
    setEditImei2(customer.imei2 || "");
    setEditPurchase(String(customer.purchasePrice || ""));
    setEditSelling(String(customer.sellingPrice || ""));
    setEditMonthly(String(customer.monthlyInstallment || ""));
    setEditRemaining(String(customer.remainingAmount || ""));
    setEditAdvance(String(customer.advancePayment || ""));
    setEditImage(customer.image || "");
    setShowEditCustomer(true);
  };

  const handleSaveCustomerEdit = async () => {
    if (!customer) return;
    setEditSaving(true);
    try {
      const changes: Record<string, { old: any; new: any }> = {};

      if (editName.trim() !== (customer.name || "").trim()) changes["Name"] = { old: customer.name || "N/A", new: editName.trim() };
      if (editPhone1.trim() !== (customer.phone1 || "").trim()) changes["Phone 1"] = { old: customer.phone1 || "N/A", new: editPhone1.trim() };
      if (editPhone2.trim() !== (customer.phone2 || "").trim()) changes["Phone 2"] = { old: customer.phone2 || "None", new: editPhone2.trim() || "None" };
      if (editCompany.trim() !== (customer.mobileCompany || "").trim()) changes["Mobile Company"] = { old: customer.mobileCompany || "N/A", new: editCompany.trim() };
      if (editModel.trim() !== (customer.mobileModel || "").trim()) changes["Mobile Model"] = { old: customer.mobileModel || "N/A", new: editModel.trim() };
      if (editImei1.trim() !== (customer.imei1 || "").trim()) changes["IMEI 1"] = { old: customer.imei1 || "None", new: editImei1.trim() || "None" };
      if (editImei2.trim() !== (customer.imei2 || "").trim()) changes["IMEI 2"] = { old: customer.imei2 || "None", new: editImei2.trim() || "None" };
      
      const newPurch = parseFloat(editPurchase) || customer.purchasePrice;
      if (newPurch !== customer.purchasePrice) changes["Purchase Price"] = { old: formatCurrency(customer.purchasePrice), new: formatCurrency(newPurch) };
      
      const newSell = parseFloat(editSelling) || customer.sellingPrice;
      if (newSell !== customer.sellingPrice) changes["Selling Price"] = { old: formatCurrency(customer.sellingPrice), new: formatCurrency(newSell) };
      
      const newMonth = parseFloat(editMonthly) || customer.monthlyInstallment;
      if (newMonth !== customer.monthlyInstallment) changes["Monthly Installment"] = { old: formatCurrency(customer.monthlyInstallment), new: formatCurrency(newMonth) };
      
      const newRem = parseFloat(editRemaining) ?? customer.remainingAmount;
      if (newRem !== customer.remainingAmount) changes["Remaining Amount"] = { old: formatCurrency(customer.remainingAmount), new: formatCurrency(newRem) };

      const newAdv = parseFloat(editAdvance) ?? customer.advancePayment;
      if (newAdv !== customer.advancePayment) changes["Advance Payment"] = { old: formatCurrency(customer.advancePayment), new: formatCurrency(newAdv) };

      if (editImage.trim() !== (customer.image || "").trim()) changes["Photo URL"] = { old: customer.image ? "Previous Image" : "None", new: editImage.trim() ? "New Image URL" : "None" };

      if (Object.keys(changes).length === 0) {
        toast.info("Koi change nahi hua!");
        setShowEditCustomer(false);
        return;
      }

      const historyItem: CustomerEditHistoryItem = {
        id: `hist_${Date.now()}`,
        editedAt: new Date().toISOString(),
        editedBy: "Shop Admin",
        changes,
      };

      const existingHistory = customer.editHistory || [];
      const updatedHistory = [historyItem, ...existingHistory];

      const updateData: any = {
        name: editName.trim(),
        phone1: editPhone1.trim(),
        phone2: editPhone2.trim(),
        mobileCompany: editCompany.trim(),
        mobileModel: editModel.trim(),
        imei1: editImei1.trim(),
        imei2: editImei2.trim(),
        purchasePrice: newPurch,
        sellingPrice: newSell,
        monthlyInstallment: newMonth,
        remainingAmount: newRem,
        advancePayment: newAdv,
        image: editImage.trim(),
        editHistory: updatedHistory,
      };

      await updateDoc(doc(db, "customers", customer.id), updateData);

      toast.success("Customer details update ho gayi hain! Purana version history me save ho gaya.");
      setShowEditCustomer(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Edit fail hua");
    } finally {
      setEditSaving(false);
    }
  };

  const handleSoftDeleteCustomer = async () => {
    if (!customer) return;
    setDeleteLoading(true);
    try {
      await addDoc(collection(db, "deleted_records"), {
        originalId: customer.id,
        type: "customers",
        data: customer,
        deletedAt: new Date().toISOString(),
        deletedBy: "admin",
      });

      await deleteDoc(doc(db, "customers", customer.id));

      toast.success("Customer trash me move ho gaya hai! (Trash se restore kar sakte hain)");
      router.push("/dashboard/customers");
    } catch (e: any) {
      toast.error(e.message || "Delete fail hua");
    } finally {
      setDeleteLoading(false);
    }
  };

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

          <Button variant="outline" className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10" onClick={openEditModal}>
            <Edit className="w-4 h-4" /> Edit Details
          </Button>

          <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowDeleteCustomer(true)}>
            <Trash2 className="w-4 h-4" /> Move to Trash
          </Button>

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
          <CardTitle className="text-base flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" /> Financial Summary</CardTitle>
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
    
      {/* Edit Customer Dialog */}
      <Dialog open={showEditCustomer} onOpenChange={setShowEditCustomer}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Edit className="w-5 h-5" /> Edit Customer Details
            </DialogTitle>
            <DialogDescription>
              Detail update karne par purani details &quot;Edit History&quot; me automatically save ho jayengi.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Customer Full Name *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full Name" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phone Number 1 *</Label>
              <Input value={editPhone1} onChange={(e) => setEditPhone1(e.target.value)} placeholder="0300-1234567" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phone Number 2 (Optional)</Label>
              <Input value={editPhone2} onChange={(e) => setEditPhone2(e.target.value)} placeholder="0300-7654321" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Company *</Label>
              <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Infinix, OPPO, Samsung..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Model *</Label>
              <Input value={editModel} onChange={(e) => setEditModel(e.target.value)} placeholder="Hot 30i, Y400..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">IMEI Number 1</Label>
              <Input value={editImei1} onChange={(e) => setEditImei1(e.target.value)} placeholder="352011..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">IMEI Number 2</Label>
              <Input value={editImei2} onChange={(e) => setEditImei2(e.target.value)} placeholder="352012..." />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Purchase Price (PKR)</Label>
              <Input type="number" value={editPurchase} onChange={(e) => setEditPurchase(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Selling Price (PKR)</Label>
              <Input type="number" value={editSelling} onChange={(e) => setEditSelling(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Monthly Installment (PKR)</Label>
              <Input type="number" value={editMonthly} onChange={(e) => setEditMonthly(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remaining Amount (PKR)</Label>
              <Input type="number" value={editRemaining} onChange={(e) => setEditRemaining(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Advance Payment (PKR)</Label>
              <Input type="number" value={editAdvance} onChange={(e) => setEditAdvance(e.target.value)} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Customer Photo URL</Label>
              <Input value={editImage} onChange={(e) => setEditImage(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditCustomer(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomerEdit} disabled={editSaving} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />} Save & Record Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteCustomer} onOpenChange={setShowDeleteCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Customer to Trash
            </DialogTitle>
            <DialogDescription>
              Kya aap <strong>{customer.name}</strong> ko Trash me move karna chahte hain? Aap Trash section se is record ko kabhi bhi 1-click se restore kar sakte hain.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteCustomer(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSoftDeleteCustomer} disabled={deleteLoading} className="gap-2">
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm Soft Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Change History (Version Logs) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" /> Edit & Change History (Version Log)
          </CardTitle>
          <CardDescription>
            Agar koi detail galat ho jaye aur update ki jaye, to purani detail yahan version history me preserve rehti hai.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!customer.editHistory || customer.editHistory.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border border-dashed rounded-xl p-4">
              <History className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-medium">Koi edit history nahi hai</p>
              <p className="text-xs text-muted-foreground mt-0.5">Customer ke original initial details hi active hain</p>
            </div>
          ) : (
            <div className="space-y-4">
              {customer.editHistory.map((item, idx) => (
                <div key={item.id || idx} className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                        Version #{customer.editHistory!.length - idx}
                      </Badge>
                      <span className="text-xs font-semibold">{item.editedBy || "Shop Admin"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatDateTime(item.editedAt)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(item.changes || {}).map(([field, diff]: [string, any]) => (
                      <div key={field} className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs p-2 rounded-lg bg-background/80 border border-border/40">
                        <span className="font-semibold text-muted-foreground self-center">{field}:</span>
                        <div className="text-amber-600 dark:text-amber-400 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                          <span className="text-[10px] uppercase font-bold block text-muted-foreground">Purana (Old):</span>
                          <span>{String(diff.old ?? "N/A")}</span>
                        </div>
                        <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20">
                          <span className="text-[10px] uppercase font-bold block text-muted-foreground">Naya (New):</span>
                          <span>{String(diff.new ?? "N/A")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}