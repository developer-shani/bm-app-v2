"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Phone,
  Plus,
  Minus,
  Smartphone,
  Hash,
  Percent,
  Calculator,
  Calendar,
  Wallet,
  Users as UsersIcon,
  Camera,
  Upload,
  ImagePlus,
  Loader2,
  CheckCircle2,
  Trash2,
  Banknote,
  Fingerprint,
  Copy,
  Share2,
  Key,
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { triggerAutoBackup } from "@/lib/backup";
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/hooks/use-auth";
import { Investor, Reseller, MobileCompany } from "@/types";
import { formatCurrency, generateCustomerId, getPortalUrl, getPortalUrlWithCreds } from "@/lib/utils";
import {
  calculateSellingPrice,
  calculateProfit,
  calculateMonthlyInstallment,
  calculateInvestmentUsed,
  calculateReferralCommission,
  splitByRatio,
} from "@/lib/calculations";
import { toast } from "sonner";
import { amountToUrduWords } from "@/lib/amount-words";

const DEFAULT_COMPANIES = [
  "iPhone", "Samsung", "Vivo", "OPPO", "Realme", "Infinix",
  "Tecno", "Xiaomi", "Nokia", "Huawei", "OnePlus", "Google Pixel",
];

export default function NewSalePage() {
  const router = useRouter();
  const { createAccount } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [companies, setCompanies] = useState<string[]>(DEFAULT_COMPANIES);

  // Modal State: Add Investor / Partner Inline
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false);
  const [modalInvLoading, setModalInvLoading] = useState(false);
  const [modalInvName, setModalInvName] = useState("");
  const [modalInvCnic, setModalInvCnic] = useState("");
  const [modalInvPhone, setModalInvPhone] = useState("");
  const [modalInvEmail, setModalInvEmail] = useState("");
  const [modalInvPassword, setModalInvPassword] = useState("");
  const [modalInvRatio, setModalInvRatio] = useState("50");
  const [modalInvAmount, setModalInvAmount] = useState("");

  // Modal State: Share Credentials
  const [shareCredsUser, setShareCredsUser] = useState<{
    name: string;
    email: string;
    password?: string;
    role: string;
    phone?: string;
  } | null>(null);

  // Customer Info
  const [customerName, setCustomerName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [showPhone2, setShowPhone2] = useState(false);
  const [customerImage, setCustomerImage] = useState<File | null>(null);
  const [customerImagePreview, setCustomerImagePreview] = useState("");

  // Mobile Info
  const [mobileCompany, setMobileCompany] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [mobileModel, setMobileModel] = useState("");

  // IMEI
  const [showImei, setShowImei] = useState(false);
  const [imei1, setImei1] = useState("");
  const [imei2, setImei2] = useState("");
  const [showImei2, setShowImei2] = useState(false);

  // Pricing
  const [purchasePrice, setPurchasePrice] = useState("");
  const [markupPercent, setMarkupPercent] = useState("40");
  const [advancePayment, setAdvancePayment] = useState("");
  const [installmentMonths, setInstallmentMonths] = useState("");

  // Investor
  const [selectedInvestorId, setSelectedInvestorId] = useState("");

  // Referral
  const [hasReferral, setHasReferral] = useState(false);
  const [selectedResellerId, setSelectedResellerId] = useState("");
  const [referralCommission, setReferralCommission] = useState("2");
  const [showAddReseller, setShowAddReseller] = useState(false);
  const [newResellerName, setNewResellerName] = useState("");
  const [newResellerPhone, setNewResellerPhone] = useState("");

  // Expenses
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenses, setExpenses] = useState([{ description: "Processing Fee", amount: "2000" }]);

  // Load investors & resellers
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedInv = localStorage.getItem("bm_cached_investors");
      const cachedRes = localStorage.getItem("bm_cached_resellers");
      if (cachedInv) {
        try { setInvestors(JSON.parse(cachedInv)); } catch (e) {}
      }
      if (cachedRes) {
        try { setResellers(JSON.parse(cachedRes)); } catch (e) {}
      }
    }

    const loadData = async () => {
      try {
        const fetchPromise = Promise.all([
          getDocs(query(collection(db, "investors"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "resellers"), orderBy("createdAt", "desc"))),
          getDocs(collection(db, "mobileCompanies")),
        ]);
        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject("timeout"), 10000));
        const [invSnapshot, resSnapshot, compSnapshot]: any = await Promise.race([fetchPromise, timeoutPromise]).catch(() => [null, null, null]);

        if (invSnapshot && resSnapshot && compSnapshot) {
          const invList = invSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Investor));
          const resList = resSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Reseller));
          setInvestors(invList);
          setResellers(resList);
          const customCompanies = compSnapshot.docs.map((d: any) => d.data().name as string);
          setCompanies([...new Set([...DEFAULT_COMPANIES, ...customCompanies])]);

          if (typeof window !== "undefined") {
            localStorage.setItem("bm_cached_investors", JSON.stringify(invList));
            localStorage.setItem("bm_cached_resellers", JSON.stringify(resList));
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
    };
    loadData();
  }, []);

  // Real-time calculations
  const calculations = useMemo(() => {
    const purchase = parseFloat(purchasePrice) || 0;
    const markup = parseFloat(markupPercent) || 0;
    const advance = parseFloat(advancePayment) || 0;
    const months = parseInt(installmentMonths) || 0;
    const commissionPct = parseFloat(referralCommission) || 0;

    const sellingPrice = calculateSellingPrice(purchase, markup);
    const profit = calculateProfit(purchase, sellingPrice);
    const investmentUsed = calculateInvestmentUsed(purchase, advance);
    const monthlyInstallment = calculateMonthlyInstallment(sellingPrice, advance, months);
    const referralAmount = hasReferral ? calculateReferralCommission(profit, commissionPct) : 0;

    const selectedInvestor = investors.find((i) => i.id === selectedInvestorId);
    const investorRatio = selectedInvestor?.sharingRatio || 50;

    const totalExpenseAmount = showExpenses
      ? expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
      : 0;
    const expenseSplit = splitByRatio(totalExpenseAmount, investorRatio);

    return {
      sellingPrice,
      profit,
      investmentUsed,
      monthlyInstallment,
      referralAmount,
      totalExpenseAmount,
      expenseSplit,
      remaining: sellingPrice - advance,
      selectedInvestor,
      investorRatio,
    };
  }, [purchasePrice, markupPercent, advancePayment, installmentMonths, selectedInvestorId, investors, hasReferral, referralCommission, showExpenses, expenses]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setCustomerImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addExpense = () => {
    setExpenses([...expenses, { description: "", amount: "" }]);
  };

  const removeExpense = (index: number) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((_, i) => i !== index));
    }
  };

  const handleCopyCredentials = (user: { name: string; email: string; password?: string; role: string; phone?: string }) => {
    const roleTitle = user.role === "investor" ? "Investor / Partner" : user.role === "reseller" ? "Reseller / Member" : "Admin";
    const pwd = (user.password && user.password !== "N/A") ? user.password : "As set during account creation";
    const phoneStr = user.phone ? `\n📱 *Phone:* ${user.phone}` : "";
    const portalUrl = getPortalUrlWithCreds(user.email, pwd);
    const text = `🔐 *Brother Mobiles Portal Access Credentials*\n\n👤 *Name:* ${user.name}${phoneStr}\n💼 *Role:* ${roleTitle}\n📧 *Email/Username:* ${user.email}\n🔑 *Password:* ${pwd}\n🌐 *Direct Login Link:* ${portalUrl}\n\n_Brother Mobiles Shop Management System_`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials clipboard par copy ho gaye!");
  };

  const handleShareWhatsApp = (user: { name: string; email: string; password?: string; role: string; phone?: string }) => {
    const roleTitle = user.role === "investor" ? "Investor / Partner" : user.role === "reseller" ? "Reseller / Member" : "Admin";
    const pwd = (user.password && user.password !== "N/A") ? user.password : "As set during account creation";
    const phoneStr = user.phone ? `\n📱 *Phone:* ${user.phone}` : "";
    const portalUrl = getPortalUrlWithCreds(user.email, pwd);
    const text = `🔐 *Brother Mobiles Portal Access Credentials*\n\n👤 *Name:* ${user.name}${phoneStr}\n💼 *Role:* ${roleTitle}\n📧 *Email/Username:* ${user.email}\n🔑 *Password:* ${pwd}\n🌐 *Direct Login Link:* ${portalUrl}\n\n_Brother Mobiles Shop Management System_`;
    const cleanPhone = (user.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleAddInvestorModalSubmit = async () => {
    if (!modalInvName || !modalInvPhone || !modalInvEmail || !modalInvPassword) {
      toast.error("Required fields (Name, Phone, Email, Password) fill karein!");
      return;
    }

    setModalInvLoading(true);
    try {
      let userId = "inv-" + Date.now();
      try {
        userId = await createAccount(modalInvEmail, modalInvPassword, {
          email: modalInvEmail,
          fullName: modalInvName,
          cnic: modalInvCnic,
          phone: modalInvPhone,
          role: "investor",
          sharingRatio: parseInt(modalInvRatio) || 50,
        });
      } catch (authErr: any) {
        console.warn("Auth creation fallback:", authErr);
        toast.warning(authErr?.message || "Login account nahi bana, lekin data save ho raha hai");
      }

      const initialAmount = parseFloat(modalInvAmount) || 0;
      const investorData = {
        userId,
        fullName: modalInvName,
        cnic: modalInvCnic || "",
        phone: modalInvPhone,
        email: modalInvEmail,
        totalInvestment: initialAmount,
        availableBalance: initialAmount,
        totalProfit: 0,
        totalWithdrawn: 0,
        activeInstallments: 0,
        sharingRatio: parseInt(modalInvRatio) || 50,
        status: "active" as const,
        createdAt: new Date().toISOString(),
      };

      let investorDocId = userId;
      try {
        const addPromise = addDoc(collection(db, "investors"), investorData);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        );
        const docRef: any = await Promise.race([addPromise, timeoutPromise]);
        if (docRef?.id) investorDocId = docRef.id;
      } catch (fsErr) {
        console.warn("Firestore save timeout/fallback:", fsErr);
      }

      const newInvestorObj: Investor = {
        id: investorDocId,
        ...investorData,
      };

      setInvestors((prev) => [newInvestorObj, ...prev.filter((i) => i.id !== newInvestorObj.id)]);
      setSelectedInvestorId(investorDocId);
      
      if (typeof window !== "undefined") {
        const currentInv = localStorage.getItem("bm_cached_investors");
        let list = [newInvestorObj];
        if (currentInv) {
          try {
            const parsed = JSON.parse(currentInv);
            if (Array.isArray(parsed)) list = [newInvestorObj, ...parsed.filter((i: any) => i.id !== newInvestorObj.id)];
          } catch (e) {}
        }
        localStorage.setItem("bm_cached_investors", JSON.stringify(list));
      }
      setShowAddInvestorModal(false);

      toast.success(`Partner (${modalInvName}) add aur select ho gaya!`);

      // Trigger Credentials Share Modal
      setShareCredsUser({
        name: modalInvName,
        email: modalInvEmail,
        password: modalInvPassword,
        role: "investor",
        phone: modalInvPhone,
      });

      // Reset Modal Form
      setModalInvName("");
      setModalInvCnic("");
      setModalInvPhone("");
      setModalInvEmail("");
      setModalInvPassword("");
      setModalInvAmount("");
      setModalInvRatio("50");
    } catch (err: any) {
      toast.error(err.message || "Partner add nahi ho saka");
    } finally {
      setModalInvLoading(false);
    }
  };

  const handleAddReseller = async () => {
    if (!newResellerName || !newResellerPhone) {
      toast.error("Reseller ka naam aur phone number zaruri hai");
      return;
    }
    try {
      const resellerRef = await addDoc(collection(db, "resellers"), {
        userId: "",
        fullName: newResellerName,
        phone: newResellerPhone,
        email: "",
        totalCommission: 0,
        pendingCommission: 0,
        totalReferrals: 0,
        status: "active",
        createdAt: new Date().toISOString(),
      });
      const newReseller = {
        id: resellerRef.id,
        userId: "",
        fullName: newResellerName,
        phone: newResellerPhone,
        email: "",
        totalCommission: 0,
        pendingCommission: 0,
        totalReferrals: 0,
        status: "active" as const,
        createdAt: new Date().toISOString(),
      };
      setResellers([newReseller, ...resellers]);
      setSelectedResellerId(resellerRef.id);
      setShowAddReseller(false);
      setNewResellerName("");
      setNewResellerPhone("");
      toast.success("Reseller add hogaya!");
    } catch (err) {
      toast.error("Reseller add nahi ho saka");
    }
  };

  const handleAddCustomCompany = async () => {
    if (!customCompany) return;
    try {
      await addDoc(collection(db, "mobileCompanies"), {
        name: customCompany,
        salesCount: 0,
        addedBy: "admin",
      });
      setCompanies([...companies, customCompany]);
      setMobileCompany(customCompany);
      setCustomCompany("");
      toast.success(`${customCompany} company list me add hogayi!`);
    } catch (err) {
      toast.error("Company add nahi ho saki");
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!customerName || !phone1 || !mobileCompany || !mobileModel || !purchasePrice || !advancePayment || !installmentMonths || !selectedInvestorId) {
      toast.error("Saari required fields fill karein");
      return;
    }

    if (calculations.investmentUsed > (calculations.selectedInvestor?.availableBalance || 0)) {
      toast.error("Investor ka balance kafi nahi hai!");
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = "";
      if (customerImage) {
        const imageRef = ref(storage, `customers/${Date.now()}_${customerName}`);
        await uploadBytes(imageRef, customerImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const idNumber = generateCustomerId();
      const reseller = resellers.find((r) => r.id === selectedResellerId);

      const customerData = {
        idNumber,
        name: customerName,
        phone1,
        phone2: phone2 || "",
        image: imageUrl,
        mobileCompany,
        mobileModel,
        imei1: imei1 || "",
        imei2: imei2 || "",
        purchasePrice: parseFloat(purchasePrice),
        markupPercent: parseFloat(markupPercent) || 0,
        sellingPrice: calculations.sellingPrice,
        profitAmount: calculations.profit,
        advancePayment: parseFloat(advancePayment),
        investmentUsed: calculations.investmentUsed,
        installmentMonths: parseInt(installmentMonths),
        monthlyInstallment: calculations.monthlyInstallment,
        investorId: selectedInvestorId,
        investorName: calculations.selectedInvestor?.fullName || "",
        resellerId: selectedResellerId || "",
        resellerName: reseller?.fullName || "",
        referralCommissionPercent: hasReferral ? parseFloat(referralCommission) : 0,
        referralCommissionAmount: calculations.referralAmount,
        totalPaid: parseFloat(advancePayment),
        remainingAmount: calculations.remaining,
        paidInstallments: 0,
        nextDueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        expenses: showExpenses
          ? expenses.map((exp, i) => ({
              id: `exp_${i}`,
              description: exp.description,
              amount: parseFloat(exp.amount) || 0,
              ...splitByRatio(parseFloat(exp.amount) || 0, calculations.investorRatio),
            }))
          : [{
              id: "exp_default",
              description: "Processing Fee",
              amount: 2000,
              ...splitByRatio(2000, calculations.investorRatio),
            }],
        status: "active",
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "customers"), customerData);

      // Update investor balance
      if (calculations.selectedInvestor) {
        const investorRef = doc(db, "investors", selectedInvestorId);
        const curAvail = typeof calculations.selectedInvestor.availableBalance === 'number' ? calculations.selectedInvestor.availableBalance : (calculations.selectedInvestor.totalInvestment || 0);
        const curActive = calculations.selectedInvestor.activeInstallments || 0;
        await updateDoc(investorRef, {
          availableBalance: Math.max(0, curAvail - calculations.investmentUsed),
          activeInstallments: curActive + 1,
        });
      }

      // Update reseller referral count
      if (selectedResellerId && reseller) {
        const resellerRef = doc(db, "resellers", selectedResellerId);
        await updateDoc(resellerRef, {
          totalReferrals: reseller.totalReferrals + 1,
          pendingCommission: reseller.pendingCommission + calculations.referralAmount,
        });
      }

      // Trigger auto-backup after successful sale creation
      triggerAutoBackup();

      toast.success(`Sale successfully create hogayi! Customer ID: #${idNumber}`);
      router.push("/dashboard/customers");
    } catch (err: any) {
      toast.error(err.message || "Sale create nahi ho saki");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/customers">
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Sale Entry</h1>
          <p className="text-sm text-muted-foreground">
            Create a new installment sale record
          </p>
        </div>
      </div>

      {/* ===== SECTION 1: Customer Info ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Customer Name *</Label>
            <Input placeholder="Customer ka naam" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Contact Number 1 *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="03XX-XXXXXXX" value={phone1} onChange={(e) => setPhone1(e.target.value)} className="pl-10" />
            </div>
          </div>

          {showPhone2 ? (
            <div className="space-y-2 animate-fade-in">
              <Label>Contact Number 2</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="2nd number" value={phone2} onChange={(e) => setPhone2(e.target.value)} className="pl-10" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowPhone2(false); setPhone2(""); }}>
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 border-dashed" onClick={() => setShowPhone2(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add 2nd Number
            </Button>
          )}

          {/* Customer Image */}
          <div className="space-y-2">
            <Label>Customer Photo</Label>
            <div className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
              {customerImagePreview ? (
                <div className="flex items-center gap-4">
                  <img src={customerImagePreview} alt="Customer" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{customerImage?.name}</p>
                    <p className="text-xs text-muted-foreground">{(customerImage?.size || 0 / 1024).toFixed(0)} KB</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setCustomerImage(null); setCustomerImagePreview(""); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 justify-center">
                  <label>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <Button variant="outline" size="sm" className="gap-1.5" asChild><span><Upload className="w-3.5 h-3.5" /> Upload</span></Button>
                  </label>
                  <label>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                    <Button variant="outline" size="sm" className="gap-1.5" asChild><span><Camera className="w-3.5 h-3.5" /> Camera</span></Button>
                  </label>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== SECTION 2: Mobile Info ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            Mobile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mobile Company *</Label>
            <Select value={mobileCompany} onValueChange={setMobileCompany}>
              <SelectTrigger><SelectValue placeholder="Company select karein" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                <SelectItem value="__custom__">+ Add New Company</SelectItem>
              </SelectContent>
            </Select>
            {mobileCompany === "__custom__" && (
              <div className="flex gap-2 animate-fade-in">
                <Input placeholder="New company name" value={customCompany} onChange={(e) => setCustomCompany(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={handleAddCustomCompany}>Add</Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mobile Model *</Label>
            <Input placeholder="e.g. iPhone 15 Pro Max" value={mobileModel} onChange={(e) => setMobileModel(e.target.value)} />
          </div>

          {/* IMEI Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-muted-foreground" />
                IMEI Number
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">Optional - add IMEI tracking</p>
            </div>
            <Switch checked={showImei} onCheckedChange={setShowImei} />
          </div>

          {showImei && (
            <div className="space-y-3 animate-fade-in">
              <div className="space-y-2">
                <Label>IMEI 1</Label>
                <Input placeholder="15-digit IMEI number" value={imei1} onChange={(e) => setImei1(e.target.value)} maxLength={15} />
              </div>
              {showImei2 ? (
                <div className="space-y-2 animate-fade-in">
                  <Label>IMEI 2 (Dual SIM)</Label>
                  <div className="flex gap-2">
                    <Input placeholder="2nd IMEI number" value={imei2} onChange={(e) => setImei2(e.target.value)} maxLength={15} className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => { setShowImei2(false); setImei2(""); }}>
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5 border-dashed" onClick={() => setShowImei2(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add 2nd IMEI (Dual SIM)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 3: Pricing & Calculations ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            Pricing & Installment Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Purchase Price (PKR) *</Label>
              <Input type="number" placeholder="e.g. 70000" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Markup % *</Label>
              <Input type="number" placeholder="e.g. 40" value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} />
            </div>
          </div>

          {/* Live Calculations Display */}
          {(purchasePrice || markupPercent) && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-2 animate-fade-in border border-border/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selling Price</span>
                <span className="font-bold text-primary">{formatCurrency(calculations.sellingPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit</span>
                <span className="font-semibold text-green-500">{formatCurrency(calculations.profit)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label>Advance Payment (PKR) *</Label>
              <Input type="number" placeholder="e.g. 30000" value={advancePayment} onChange={(e) => setAdvancePayment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Installment Months *</Label>
              <Select value={installmentMonths} onValueChange={setInstallmentMonths}>
                <SelectTrigger><SelectValue placeholder="Months" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                    <SelectItem key={m} value={m.toString()}>{m} {m === 1 ? "Month" : "Months"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Full Calculation Summary */}
          {purchasePrice && advancePayment && installmentMonths && (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 space-y-3 animate-fade-in border border-primary/20">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" />
                Installment Breakdown
              </h4>
              <Separator />
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Selling Price:</span>
                <span className="font-semibold text-right">{formatCurrency(calculations.sellingPrice)}</span>
                <span className="text-muted-foreground">Advance Payment:</span>
                <span className="font-semibold text-right text-green-500">- {formatCurrency(parseFloat(advancePayment) || 0)}</span>
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-semibold text-right">{formatCurrency(calculations.remaining)}</span>
                <Separator className="col-span-2 my-1" />
                <span className="text-muted-foreground">Monthly Installment:</span>
                <span className="font-bold text-right text-primary text-lg">{formatCurrency(calculations.monthlyInstallment)}</span>
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-semibold text-right">{installmentMonths} months</span>
                <span className="text-muted-foreground">Investment Used:</span>
                <span className="font-semibold text-right">{formatCurrency(calculations.investmentUsed)}</span>
                <span className="text-muted-foreground">Profit:</span>
                <span className="font-semibold text-right text-green-500">{formatCurrency(calculations.profit)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 4: Select Investor ===== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Select Investor (Partner) *
            </CardTitle>
            <CardDescription>Kis investor ke capital se ye mobile purchase hoga?</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddInvestorModal(true)}
            className="gap-1.5 border-dashed border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <Plus className="w-3.5 h-3.5" /> + Add Partner
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {investors.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">Koi investor nahi mila. Form data loss hone ke baghair naya partner add karein:</p>
              <Button type="button" onClick={() => setShowAddInvestorModal(true)} variant="outline" size="sm" className="gap-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                <Plus className="w-3.5 h-3.5" /> Add Partner (Investor)
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {investors.map((investor) => {
                const isSelected = selectedInvestorId === investor.id;
                const isLowBalance = investor.availableBalance < calculations.investmentUsed;
                const hasBalance = investor.availableBalance > 0;

                return (
                  <div
                    key={investor.id}
                    onClick={() => !isLowBalance && setSelectedInvestorId(investor.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : isLowBalance
                        ? "border-border/30 bg-muted/30 opacity-60 cursor-not-allowed"
                        : "border-border/50 hover:border-primary/30 hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isSelected ? "bg-primary" : "bg-border"}`} />
                        <div>
                          <p className="font-semibold text-sm">{investor.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            Ratio: {investor.sharingRatio}/{100 - investor.sharingRatio}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${hasBalance ? (isLowBalance ? "text-red-500" : "text-green-500") : "text-red-500"}`}>
                          {formatCurrency(investor.availableBalance)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ({investor.activeInstallments} active sets)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== SECTION 5: Referral ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-primary" />
                Referral (Optional)
              </CardTitle>
              <CardDescription>Kya kisi ne ye customer refer kia hai?</CardDescription>
            </div>
            <Switch checked={hasReferral} onCheckedChange={setHasReferral} />
          </div>
        </CardHeader>
        {hasReferral && (
          <CardContent className="space-y-4 animate-fade-in">
            {resellers.length > 0 && !showAddReseller ? (
              <div className="space-y-2">
                <Label>Select Reseller</Label>
                <Select value={selectedResellerId} onValueChange={setSelectedResellerId}>
                  <SelectTrigger><SelectValue placeholder="Reseller select karein" /></SelectTrigger>
                  <SelectContent>
                    {resellers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.fullName} - {r.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="gap-1.5 border-dashed w-full" onClick={() => setShowAddReseller(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add New Reseller
                </Button>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <p className="text-sm font-medium">Add New Reseller</p>
                <Input placeholder="Reseller ka naam" value={newResellerName} onChange={(e) => setNewResellerName(e.target.value)} />
                <Input placeholder="Phone number" value={newResellerPhone} onChange={(e) => setNewResellerPhone(e.target.value)} />
                <div className="flex gap-2">
                  {resellers.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddReseller(false)}>Cancel</Button>
                  )}
                  <Button size="sm" onClick={handleAddReseller} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Reseller
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Referral Commission (%)</Label>
              <Input type="number" placeholder="2" value={referralCommission} onChange={(e) => setReferralCommission(e.target.value)} />
              {calculations.referralAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Commission: <strong className="text-primary">{formatCurrency(calculations.referralAmount)}</strong>
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ===== SECTION 6: Expenses ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" />
                Expenses
              </CardTitle>
              <CardDescription>Default: Rs. 2,000 (split by ratio)</CardDescription>
            </div>
            <Switch checked={showExpenses} onCheckedChange={setShowExpenses} />
          </div>
        </CardHeader>
        {showExpenses && (
          <CardContent className="space-y-3 animate-fade-in">
            {expenses.map((exp, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={exp.description}
                    onChange={(e) => {
                      const updated = [...expenses];
                      updated[i].description = e.target.value;
                      setExpenses(updated);
                    }}
                    placeholder="Expense type"
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    value={exp.amount}
                    onChange={(e) => {
                      const updated = [...expenses];
                      updated[i].amount = e.target.value;
                      setExpenses(updated);
                    }}
                    placeholder="0"
                  />
                </div>
                {expenses.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeExpense(i)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5 border-dashed" onClick={addExpense}>
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </Button>
            {calculations.totalExpenseAmount > 0 && calculations.selectedInvestor && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                <p>Total: <strong>{formatCurrency(calculations.totalExpenseAmount)}</strong></p>
                <p>Investor Share ({calculations.investorRatio}%): <strong>{formatCurrency(calculations.expenseSplit.investorShare)}</strong></p>
                <p>Admin Share ({100 - calculations.investorRatio}%): <strong>{formatCurrency(calculations.expenseSplit.adminShare)}</strong></p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ===== SUBMIT ===== */}
      <div className="flex justify-end gap-3">
        <Link href="/dashboard/customers">
          <Button variant="outline" size="lg">Cancel</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          size="lg"
          className="gradient-primary gap-2 min-w-[180px]"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Create Sale
        </Button>
      </div>
      {/* ===== MODAL 1: INLINE ADD INVESTOR / PARTNER ===== */}
      <Dialog open={showAddInvestorModal} onOpenChange={setShowAddInvestorModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
              Add Partner (Investor)
            </DialogTitle>
            <DialogDescription>
              New partner add karein â€” Aap ka form me bhara hua data 100% safe rahega!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input placeholder="Partner ka pura naam" value={modalInvName} onChange={(e) => setModalInvName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number *</Label>
                <Input placeholder="0300-1234567" value={modalInvPhone} onChange={(e) => setModalInvPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CNIC / ID</Label>
                <Input placeholder="35201-1234567-1" value={modalInvCnic} onChange={(e) => setModalInvCnic(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Portal Email *</Label>
                <Input type="email" placeholder="partner@gmail.com" value={modalInvEmail} onChange={(e) => setModalInvEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Password *</Label>
                <Input type="password" placeholder="Pass123" value={modalInvPassword} onChange={(e) => setModalInvPassword(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Profit Ratio % (Investor)</Label>
                <Input type="number" placeholder="50" value={modalInvRatio} onChange={(e) => setModalInvRatio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Initial Balance (PKR)</Label>
                <Input type="number" placeholder="e.g. 500000" value={modalInvAmount} onChange={(e) => setModalInvAmount(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddInvestorModal(false)}>Cancel</Button>
            <Button onClick={handleAddInvestorModalSubmit} disabled={modalInvLoading} className="gradient-primary gap-2">
              {modalInvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save & Select Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL 2: SHARE CREDENTIALS ===== */}
      <Dialog open={!!shareCredsUser} onOpenChange={() => setShareCredsUser(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Share2 className="w-5 h-5" />
              Credentials Created!
            </DialogTitle>
            <DialogDescription>
              New member ke login credentials copy karein ya WhatsApp par share karein.
            </DialogDescription>
          </DialogHeader>

          {shareCredsUser && (
            <div className="space-y-3 py-2 bg-muted/40 p-4 rounded-xl border">
              <div className="flex justify-between items-center text-xs border-b pb-2">
                <span className="text-muted-foreground font-semibold">Member Name:</span>
                <span className="font-bold text-foreground">{shareCredsUser.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b pb-2">
                <span className="text-muted-foreground font-semibold">Role:</span>
                <Badge variant="secondary" className="capitalize text-[10px]">{shareCredsUser.role}</Badge>
              </div>
              <div className="flex justify-between items-center text-xs border-b pb-2">
                <span className="text-muted-foreground font-semibold">Email / Username:</span>
                <span className="font-mono text-primary font-bold">{shareCredsUser.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b pb-2">
                <span className="text-muted-foreground font-semibold">Password:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{shareCredsUser.password || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold">Direct Login URL:</span>
                <span className="font-mono text-[11px] text-primary font-medium truncate max-w-[220px]">{getPortalUrlWithCreds(shareCredsUser.email, shareCredsUser.password)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => shareCredsUser && handleCopyCredentials(shareCredsUser)}
              className="gap-2 flex-1"
            >
              <Copy className="w-4 h-4" /> Copy Info
            </Button>
            <Button
              onClick={() => shareCredsUser && handleShareWhatsApp(shareCredsUser)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1"
            >
              <Phone className="w-4 h-4" /> Send WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

