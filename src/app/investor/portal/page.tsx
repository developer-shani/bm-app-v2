"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Wallet,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Smartphone,
  Calendar,
  Bell,
  LogOut,
  Sun,
  Moon,
  Loader2,
  CheckCircle2,
  AlertTriangle, Ban,
  ImagePlus,
  Upload,
  Camera,
  Info,
  CreditCard,
  DollarSign,
  PieChart,
  UserCog,
  User,
  Eye,
  Fingerprint,
  UserCheck,
  BadgePercent,
  Clock,
  Receipt,
  Sparkles,
  Image as ImageIcon,
  RotateCcw
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Investor, Customer, Investment, Notification as NotifType, Recovery } from "@/types";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { calculateWithdrawalImpact } from "@/lib/calculations";
import { toast } from "sonner";
import { amountToUrduWords } from "@/lib/amount-words";

export default function InvestorPortalPage() {
  const { appUser, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [investor, setInvestor] = useState<Investor | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [notifications, setNotifications] = useState<NotifType[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Investment Dialog
  const [showAddInvestment, setShowAddInvestment] = useState(false);
  const [investAmount, setInvestAmount] = useState("");
  const [investProof, setInvestProof] = useState<File | null>(null);
  const [investProofPreview, setInvestProofPreview] = useState("");
  const [investLoading, setInvestLoading] = useState(false);

  // Withdrawal Dialog
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Guide
  const [showGuide, setShowGuide] = useState(false);
  // Profile Edit Dialog
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [profileEditLoading, setProfileEditLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<{ image: string; title: string; ref?: string; note?: string } | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [planFilter, setPlanFilter] = useState<string>("all");

  useEffect(() => {
    if (!appUser) {
      router.push("/");
      return;
    }

    const qInv = query(collection(db, "investors"), where("userId", "==", appUser.uid));
    const unsubInv = onSnapshot(qInv, (snap) => {
      if (!snap.empty) {
        const inv = { id: snap.docs[0].id, ...snap.docs[0].data() } as Investor;
        setInvestor(inv);

        // Set up nested real-time listeners for this investor
        const unsubCust = onSnapshot(query(collection(db, "customers"), where("investorId", "==", inv.id)), (cSnap) => {
          setCustomers(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
        });

        const unsubHist = onSnapshot(query(collection(db, "investments"), where("investorId", "==", inv.id)), (hSnap) => {
        let list = hSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Investment));

        // Ensure initial investment record is displayed if missing
        const hasInitial = list.some((i) => i.type === "initial");
        if (!hasInitial && inv.totalInvestment > 0) {
          const sumOfAdditional = list.filter((i) => i.type === "additional").reduce((s, i) => s + (i.amount || 0), 0);
          const initialAmount = Math.max(0, inv.totalInvestment - sumOfAdditional);
          if (initialAmount > 0) {
            list.unshift({
              id: "initial-" + inv.id,
              investorId: inv.id,
              investorName: inv.fullName,
              amount: initialAmount,
              type: "initial",
              date: inv.createdAt || new Date().toISOString(),
            } as Investment);
          }
        }

        list = list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setInvestments(list);
      });

        const unsubRec = onSnapshot(query(collection(db, "recoveries"), where("investorId", "==", inv.id)), (rSnap) => {
        const list = rSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Recovery)).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setRecoveries(list);
      });

        // Withdrawal requests real-time listener
        const unsubWith = onSnapshot(query(collection(db, "withdrawals"), where("investorId", "==", inv.id)), (wSnap) => {
          const wList = wSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt || b.requestedAt || 0).getTime() - new Date(a.createdAt || a.requestedAt || 0).getTime());
          setWithdrawalsList(wList);
        });

        const unsubNotif = onSnapshot(query(collection(db, "notifications"), where("userId", "==", appUser.uid), orderBy("createdAt", "desc")), (nSnap) => {
          setNotifications(nSnap.docs.map((d) => ({ id: d.id, ...d.data() } as NotifType)));
        });
      }
      setLoading(false);
    }, (err) => {
      console.warn("Investor portal realtime sync error:", err);
      setLoading(false);
    });

    if (appUser && !appUser.guideSeen) {
      setShowGuide(true);
    }

    return () => unsubInv();
  }, [appUser, router]);

  const handleAddInvestment = async () => {
    if (!investAmount || !investor) return;
    setInvestLoading(true);
    try {
      let imageUrl = "";
      if (investProof) {
        const imageRef = ref(storage, `investments/${investor.id}/${Date.now()}_proof`);
        await uploadBytes(imageRef, investProof);
        imageUrl = await getDownloadURL(imageRef);
      }
      await addDoc(collection(db, "investments"), {
        investorId: investor.id,
        investorName: investor.fullName,
        amount: parseFloat(investAmount),
        type: "additional",
        imageProof: imageUrl,
        date: new Date().toISOString(),
        note: "Additional investment from portal",
      });
      // Notification for admin
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        type: "investment",
        title: "New Investment Added",
        message: `${investor.fullName} ne Rs. ${parseFloat(investAmount).toLocaleString()} ki nayi investment add ki hai.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      toast.success("Investment add ho gayi! Admin ko notify kar dia gaya hai.");
      setShowAddInvestment(false);
      setInvestAmount("");
      setInvestProof(null);
      setInvestProofPreview("");
      loadData();
    } catch (err) {
      toast.error("Investment add nahi ho saki");
    } finally {
      setInvestLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawAmount || !investor) return;
    const amount = parseFloat(withdrawAmount);
    if (amount > investor.availableBalance) {
      toast.error("Balance se zyada withdraw nahi ho sakta");
      return;
    }
    setWithdrawLoading(true);
    try {
      await addDoc(collection(db, "withdrawals"), {
        investorId: investor.id,
        investorName: investor.fullName,
        amount,
        status: "pending",
        requestedAt: new Date().toISOString(),
      });
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        type: "withdrawal",
        title: "Withdrawal Request",
        message: `${investor.fullName} ne Rs. ${amount.toLocaleString()} withdraw karne ki request ki hai.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      toast.success("Withdrawal request bhej di gayi! Admin approve karega.");
      setShowWithdrawal(false);
      setWithdrawAmount("");
    } catch (err) {
      toast.error("Request nahi bhej saki");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const withdrawalImpact = investor && withdrawAmount
    ? calculateWithdrawalImpact(
        investor.availableBalance,
        parseFloat(withdrawAmount) || 0,
        investor.activeInstallments,
        investor.totalProfit / Math.max(1, investments.length)
      )
    : null;


  const handleProfileSubmit = async () => {
    if (!appUser) return;
    setProfileLoading(true);
    try {
      await addDoc(collection(db, "pending_approvals"), {
        userId: appUser.uid,
        userName: editName || investor?.fullName || appUser.fullName,
        userRole: "investor",
        changes: {
          ...(editName && editName !== (investor?.fullName || appUser.fullName) ? { fullName: { old: investor?.fullName || "", new: editName } } : {}),
          ...(editPhone && editPhone !== investor?.phone ? { phone: { old: investor?.phone || "", new: editPhone } } : {}),
        },
        newProfileImage: editPhotoUrl || "",
        status: "pending",
        submittedAt: new Date().toISOString(),
        collectionName: "investors",
        docId: investor?.id || "",
      });
      toast.success("Profile update request submitted for admin approval!");
      setShowProfileEdit(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvestProof(file);
      const reader = new FileReader();
      reader.onloadend = () => setInvestProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Investor Portal</h1>
              <p className="text-xs text-muted-foreground">{investor?.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditName(investor?.fullName || appUser?.fullName || "");
                setEditPhone(investor?.phone || appUser?.phone || "");
                setEditPhotoUrl(appUser?.profileImage || "");
                setShowProfileEdit(true);
              }}
            >
              <UserCog className="w-4 h-4" /> Edit Profile
            </Button>

            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowGuide(true)}>
              <Info className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="w-4 h-4" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => { signOut(); router.push("/"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Investment</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(investor?.totalInvestment || 0)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Available Balance</p>
                  <p className={`text-xl font-bold mt-1 ${(investor?.availableBalance || 0) > 10000 ? "text-green-500" : "text-red-500"}`}>
                    {formatCurrency(investor?.availableBalance || 0)}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${(investor?.availableBalance || 0) > 10000 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <Wallet className={`w-5 h-5 ${(investor?.availableBalance || 0) > 10000 ? "text-green-500" : "text-red-500"}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Profit</p>
                  <p className="text-xl font-bold mt-1 text-green-500">{formatCurrency(investor?.totalProfit || 0)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Active Sets</p>
                  <p className="text-xl font-bold mt-1">{investor?.activeInstallments || 0}</p>
                  <p className="text-[10px] text-muted-foreground">mobiles on installment</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Dialog open={showAddInvestment} onOpenChange={setShowAddInvestment}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary"><ArrowDownToLine className="w-4 h-4" /> Add Investment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Investment</DialogTitle>
                <DialogDescription>Nayi investment amount add karein</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (PKR)</Label>
                  <Input type="number" placeholder="e.g. 100000" value={investAmount} onChange={(e) => setInvestAmount(e.target.value)} />
                

            </div>
                <div className="space-y-2">
                  <Label>Payment Proof</Label>
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center">
                    {investProofPreview ? (
                      <div className="space-y-2">
                        <img src={investProofPreview} alt="Proof" className="max-h-32 mx-auto rounded-lg" />
                        <Button variant="outline" size="sm" onClick={() => { setInvestProof(null); setInvestProofPreview(""); }}>Remove</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <label><input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                          <Button variant="outline" size="sm" className="gap-1.5" asChild><span><Upload className="w-3.5 h-3.5" /> Upload</span></Button></label>
                        <label><input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                          <Button variant="outline" size="sm" className="gap-1.5" asChild><span><Camera className="w-3.5 h-3.5" /> Camera</span></Button></label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {investAmount && parseFloat(investAmount) > 0 && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-primary font-semibold">
                  <span className="text-muted-foreground">Amount in Words:</span>
                  <span className="font-bold">💰 {amountToUrduWords(investAmount)} Rupees</span>
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleAddInvestment} disabled={investLoading} className="gradient-primary gap-2">
                  {investLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showWithdrawal} onOpenChange={setShowWithdrawal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><ArrowUpFromLine className="w-4 h-4" /> Withdrawal Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Withdrawal Request</DialogTitle>
                <DialogDescription>Available: {formatCurrency(investor?.availableBalance || 0)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Withdrawal Amount (PKR)</Label>
                  <Input type="number" placeholder="Amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                

            </div>
                {withdrawalImpact && (
                  <div className={`rounded-lg p-4 text-sm space-y-2 ${withdrawalImpact.canWithdraw ? "bg-muted/50" : "bg-red-500/10"}`}>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining Balance:</span>
                      <span className={`font-bold ${withdrawalImpact.remainingBalance > 10000 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(withdrawalImpact.remainingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Monthly Earning:</span>
                      <span className="font-medium">{formatCurrency(withdrawalImpact.expectedMonthlyEarning)}</span>
                    </div>
                    {withdrawalImpact.warningMessage && (
                      <div className="flex items-start gap-2 text-yellow-600 dark:text-yellow-400 pt-1">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="text-xs">{withdrawalImpact.warningMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleWithdrawal} disabled={withdrawLoading || !withdrawalImpact?.canWithdraw} className="gap-2">
                  {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>


        {/* Profit & Expenses Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  {(() => {
                    const totalProfitAll = customers.reduce((sum, c) => sum + ((c.sellingPrice || 0) - (c.purchasePrice || c.investmentUsed || 0)), 0);
                    const partnerProfitShare = Math.round(totalProfitAll * ((investor?.sharingRatio || 50) / 100));
                    return (
                      <div>
                        <p className="text-xs text-muted-foreground">Expected Total Profit</p>
                        <p className="text-lg font-bold text-green-500">{formatCurrency(totalProfitAll)}</p>
                        <p className="text-[11px] font-semibold text-emerald-400 mt-0.5">Your Share ({investor?.sharingRatio || 50}%): {formatCurrency(partnerProfitShare)}</p>
                        <p className="text-[10px] text-muted-foreground">from {customers.length} active sales</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Capital Deployed</p>
                  <p className="text-lg font-bold text-blue-500">
                    {formatCurrency(customers.reduce((sum, c) => sum + (c.purchasePrice || c.investmentUsed || 0), 0))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">in active installments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Recovered</p>
                  <p className="text-lg font-bold text-amber-500">
                    {formatCurrency(recoveries.reduce((sum, r) => sum + (r.amount || 0), 0))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{recoveries.length} recoveries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Requests & History Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-primary" />
              Withdrawal Requests & Payment Proofs
            </CardTitle>
            <CardDescription>Aapki bheji gayi withdrawal requests aur unka payment proof</CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawalsList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Abhi koi withdrawal request nahi hai</p>
            ) : (
              <div className="space-y-3">
                {withdrawalsList.map((w) => (
                  <div key={w.id} className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{formatCurrency(w.amount)}</span>
                        <Badge
                          variant="outline"
                          className={
                            w.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : w.status === "rejected"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }
                        >
                          {w.status === "approved" ? "Approved ✓" : w.status === "rejected" ? "Rejected ✕" : "Pending ⏳"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Date: {formatDate(w.createdAt || w.requestedAt || new Date().toISOString())}
                      </p>
                      {w.transactionRef && (
                        <p className="text-xs font-mono text-muted-foreground">
                          Ref: {w.transactionRef}
                        </p>
                      )}
                      {w.rejectReason && (
                        <p className="text-xs text-red-400">
                          Reason: {w.rejectReason}
                        </p>
                      )}
                    </div>

                    {w.status === "approved" && w.proofImage && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => setSelectedProof({ image: w.proofImage, title: `Withdrawal Payment Proof (${formatCurrency(w.amount)})`, ref: w.transactionRef, note: w.adminNote })}
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> View Payment Proof
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Defaulted & 50/50 Loss Sharing Section */}
        {customers.some((cust) => cust.status === "defaulted") && (() => {
          const defaultedCusts = customers.filter((cust) => cust.status === "defaulted");
          const totalDefaultedLoss = defaultedCusts.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);
          const totalShopLoss = Math.round(totalDefaultedLoss * 0.5);
          const totalInvestorLoss = totalDefaultedLoss - totalShopLoss;

          return (
            <Card className="border-red-500/40 bg-red-500/5 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2 text-red-500 font-bold">
                      <Ban className="w-5 h-5 text-red-500" />
                      Loss Management & 50/50 Loss Share
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Aapke capital par defaulted sets aur 50/50 loss sharing ka hisaab
                    </CardDescription>
                  </div>
                  <Badge variant="destructive" className="self-start sm:self-auto text-xs px-2.5 py-1">
                    {defaultedCusts.length} Defaulted Case{defaultedCusts.length > 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Top Summary Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Total Defaulted Loss</span>
                    <span className="font-bold text-red-500 text-sm">{formatCurrency(totalDefaultedLoss)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Shop Share (50%)</span>
                    <span className="font-bold text-amber-500 text-sm">{formatCurrency(totalShopLoss)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Your Share (50%)</span>
                    <span className="font-bold text-purple-400 text-sm">{formatCurrency(totalInvestorLoss)}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {defaultedCusts.map((cust) => {
                  const shopLossShare = Math.round(cust.remainingAmount * 0.5);
                  const investorLossShare = cust.remainingAmount - shopLossShare;

                  return (
                    <div key={cust.id} className="p-4 rounded-xl border border-red-500/30 bg-background/80 hover:border-red-500/50 transition-all space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">{cust.name}</p>
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{cust.idNumber}</span>
                            <Badge variant="destructive" className="text-[10px]">Defaulted</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>📞 {cust.phone1}</span>
                            {cust.phone2 && <span>• {cust.phone2}</span>}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-muted-foreground block">Total Case Loss</span>
                          <span className="text-base font-extrabold text-red-500">{formatCurrency(cust.remainingAmount)}</span>
                        </div>
                      </div>

                      {/* Mobile Details & Reason */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-red-400" />
                            {cust.mobileCompany} {cust.mobileModel}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            IMEI 1: {cust.imei1 || "N/A"} {cust.imei2 ? `| IMEI 2: ${cust.imei2}` : ""}
                          </p>
                        </div>
                        <div className="md:text-right space-y-0.5">
                          <p className="text-[11px] text-muted-foreground">
                            Sale Date: <span className="text-foreground">{formatDate(cust.createdAt)}</span>
                          </p>
                          {cust.lossReason && (
                            <p className="text-[11px] text-red-400 font-medium italic">
                              Reason: {cust.lossReason}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 50/50 Share Badges */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                        <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-center">
                          <span className="text-muted-foreground block text-[10px]">Shop Share (50%):</span>
                          <span className="font-bold text-amber-500">{formatCurrency(shopLossShare)}</span>
                        </div>
                        <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 text-center">
                          <span className="text-muted-foreground block text-[10px]">Your Loss Share (50%):</span>
                          <span className="font-bold text-purple-400">{formatCurrency(investorLossShare)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

        {/* Customers on this investor's capital */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Customers on Your Capital
                </CardTitle>
                <CardDescription>{customers.length} total customers funded</CardDescription>
              </div>

              {/* Installment Plan Duration Filter */}
              <div className="flex flex-wrap gap-1 bg-muted/40 p-1 rounded-xl border border-border/50">
                <Button
                  variant={planFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPlanFilter("all")}
                  className="text-[11px] h-7 px-2.5"
                >
                  All Plans
                </Button>
                <Button
                  variant={planFilter === "3" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPlanFilter("3")}
                  className="text-[11px] h-7 px-2.5"
                >
                  3 Months ({customers.filter((c) => c.installmentMonths === 3).length})
                </Button>
                <Button
                  variant={planFilter === "6" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPlanFilter("6")}
                  className="text-[11px] h-7 px-2.5"
                >
                  6 Months ({customers.filter((c) => c.installmentMonths === 6).length})
                </Button>
                <Button
                  variant={planFilter === "9" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPlanFilter("9")}
                  className="text-[11px] h-7 px-2.5"
                >
                  9 Months ({customers.filter((c) => c.installmentMonths === 9).length})
                </Button>
                <Button
                  variant={planFilter === "12" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPlanFilter("12")}
                  className="text-[11px] h-7 px-2.5"
                >
                  12 Months ({customers.filter((c) => c.installmentMonths === 12).length})
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {customers.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Abhi koi customer nahi hai</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customers
                  .filter((c) => planFilter === "all" || (Number(planFilter) > 0 && c.installmentMonths === Number(planFilter)))
                  .map((c) => {
                  const progress = c.sellingPrice > 0 ? Math.round((c.totalPaid / c.sellingPrice) * 100) : 0;
                  const isCompleted = c.status === 'completed' || c.remainingAmount <= 0 || progress >= 100;
                  return (
                    <div key={c.id} className={cn("p-4 rounded-xl border transition-all space-y-3", isCompleted ? "border-emerald-500/50 bg-emerald-500/5 shadow-md shadow-emerald-500/10" : c.status === "returned" ? "border-amber-500/30 bg-amber-500/5" : "border-border/50 bg-card/60 hover:border-primary/40")}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Customer Info */}
                        <div className="flex items-center gap-3">
                          {c.image ? (
                            <img src={c.image} alt={c.name} className="w-11 h-11 rounded-full object-cover border border-border/60 shadow-sm" />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-sm">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-foreground">{c.name}</p>
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{c.idNumber}</span>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>📞 {c.phone1}</span>
                              {c.phone2 && <span className="opacity-70">• {c.phone2}</span>}
                            </p>
                          </div>
                        </div>

                        {/* Status & Detail Trigger */}
                        <div className="flex items-center gap-2 sm:self-start">
                          <Badge variant={c.status === "completed" ? "success" : c.status === "defaulted" ? "destructive" : c.status === "returned" ? "warning" : "outline"} className="text-[10px] capitalize">
                            {c.status === "completed" ? "Completed" : c.status === "defaulted" ? "Defaulted" : c.status === "returned" ? "Returned Handset" : `${c.paidInstallments}/${c.installmentMonths} months`}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs border-primary/30 hover:bg-primary/10 hover:text-primary"
                            onClick={() => setSelectedCustomerDetail(c)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Full Details
                          </Button>
                        </div>
                      </div>

                      {/* Sale Expenses Sub-card if expenses exist */}
                      {c.expenses && c.expenses.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Sale Expenses ({c.expenses.length}):</span>
                            <span className="text-foreground">{c.expenses.map((e) => e.description).join(", ")}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-muted-foreground">Your Share: </span>
                            <span className="font-semibold text-amber-500">
                              {formatCurrency(c.expenses.reduce((s, e) => s + (e.investorShare ?? Math.round((e.amount || 0) * 0.5)), 0))}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Celebration Banner for Completed Customer */}
                      {isCompleted && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-teal-500/20 border border-emerald-500/40 flex items-center justify-between text-xs font-semibold text-emerald-400 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-emerald-300">🎉 Tamam Kistein Poori Ho Gayi Hain!</p>
                              <p className="text-[10px] text-emerald-400/80 font-normal">Is customer ne apne mobile ({c.mobileCompany} {c.mobileModel}) ki saari installments 100% pay kar di hain.</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] shrink-0">
                            100% Cleared 🏆
                          </Badge>
                        </div>
                      )}

                      {/* Celebration Banner for Completed Customer */}
                      {isCompleted && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-teal-500/20 border border-emerald-500/40 flex items-center justify-between text-xs font-semibold text-emerald-400 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-emerald-300">🎉 Tamam Kistein Poori Ho Gayi Hain!</p>
                              <p className="text-[10px] text-emerald-400/80 font-normal">Is customer ne apne mobile ({c.mobileCompany} {c.mobileModel}) ki saari installments 100% pay kar di hain.</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] shrink-0">
                            100% Cleared 🏆
                          </Badge>
                        </div>
                      )}

                      {/* Mobile & Referral Sub-card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-muted/40 border border-border/30">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-primary" />
                            {c.mobileCompany} {c.mobileModel}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            IMEI 1: <span className="text-foreground">{c.imei1 || "N/A"}</span>
                            {c.imei2 ? <span> | IMEI 2: <span className="text-foreground">{c.imei2}</span></span> : null}
                          </p>
                        </div>
                        <div className="space-y-1 md:text-right">
                          <p className="text-[11px] text-muted-foreground">
                            Referred By: <span className="font-medium text-foreground">{c.resellerName || "Direct / Shop"}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Sale Date: <span className="text-foreground">{formatDate(c.createdAt)}</span>
                            {c.nextDueDate && c.status === "active" ? (
                              <span className="ml-2 text-amber-500 font-medium">Next Due: {formatDate(c.nextDueDate)}</span>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar & Financial Breakdown */}
                      <div>
                        <div className="flex justify-between items-center text-[11px] text-muted-foreground mb-1">
                          <span>Progress ({progress}%)</span>
                          <span className="font-semibold text-foreground">{formatCurrency(c.remainingAmount)} left</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] text-muted-foreground text-center bg-background/40 p-1.5 rounded-md border border-border/20">
                          <div>
                            <span className="block text-[9px] text-muted-foreground">Invested</span>
                            <span className="font-semibold text-foreground">{formatCurrency(c.investmentUsed)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-muted-foreground">Advance</span>
                            <span className="font-semibold text-foreground">{formatCurrency(c.advancePayment)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-muted-foreground">Paid</span>
                            <span className="font-semibold text-green-500">{formatCurrency(c.totalPaid)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-muted-foreground">Total Price</span>
                            <span className="font-semibold text-foreground">{formatCurrency(c.sellingPrice)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investment History, Recoveries & Expense History */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-primary" /> Investment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {investments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No investments yet</p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {investments.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                        <div>
                          <p className="text-sm font-medium text-green-500">+ {formatCurrency(inv.amount)}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(inv.date)}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{inv.type}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Recent Recoveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recoveries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recoveries yet</p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {recoveries.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                        <div>
                          <p className="text-sm font-medium">+ {formatCurrency(rec.amount)}</p>
                          <p className="text-[10px] text-muted-foreground">{rec.customerName} &bull; #{rec.installmentNumber}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{formatDate(rec.date)}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {notifications.slice(0, 20).map((n) => (
                    <div key={n.id} className={`p-3 rounded-lg border transition-all ${n.read ? "bg-transparent border-border/30" : "bg-primary/5 border-primary/20"}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground shrink-0">{formatDate(n.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Get Started Guide Dialog */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome to Investor Portal!</DialogTitle>
            <DialogDescription>Ye guide aapko portal samjhane ke liye hai</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-semibold flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-blue-500" /> Total Investment</h4>
              <p className="text-muted-foreground">Ye aapki total investment dikhata hai jo aapne abhi tak di hai. Jab bhi aap nayi investment add karenge, ye amount update hoga.</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <h4 className="font-semibold flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-green-500" /> Available Balance</h4>
              <p className="text-muted-foreground">Ye aapka current available balance hai. Jab koi mobile bechta hai aapke capital se, to ye kam hota hai. Jab installment aati hai, to ye wapas barhta hai. Green matlab acha balance, Red matlab kam balance.</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <h4 className="font-semibold flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-500" /> Total Profit</h4>
              <p className="text-muted-foreground">Ye aapka share ka profit hai. Jab customer apni installments complete karta hai, to profit ratio ke hisab se aapko milta hai.</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <h4 className="font-semibold flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4 text-purple-500" /> Active Sets</h4>
              <p className="text-muted-foreground">Kitne mobile phones abhi installment pe chal rahe hain aapke capital se. Ye count dikhata hai ke aapke paise kitne deals mein lage hain.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted border">
              <h4 className="font-semibold flex items-center gap-2 mb-2"><ArrowDownToLine className="w-4 h-4" /> Add Investment</h4>
              <p className="text-muted-foreground">Is button se aap nayi investment add kar sakte hain. Proof image upload karein aur amount likhen - admin ko automatic notification jayegi.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted border">
              <h4 className="font-semibold flex items-center gap-2 mb-2"><ArrowUpFromLine className="w-4 h-4" /> Withdrawal</h4>
              <p className="text-muted-foreground">Agar aap paise nikalna chahte hain, to withdrawal request bhejein. System aapko batayega ke withdrawal ke baad aapki expected earning kitni hogi.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowGuide(false)} className="w-full gradient-primary">Samajh Gaya - Let&apos;s Go!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Customer Details Dialog Modal */}
      <Dialog open={!!selectedCustomerDetail} onOpenChange={(open) => !open && setSelectedCustomerDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border/50 bg-background/95 backdrop-blur-xl">
          {selectedCustomerDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {selectedCustomerDetail.image ? (
                    <img src={selectedCustomerDetail.image} alt={selectedCustomerDetail.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/30 shadow-md" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-xl shadow-md">
                      {selectedCustomerDetail.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      {selectedCustomerDetail.name}
                      <Badge variant={selectedCustomerDetail.status === "completed" ? "success" : selectedCustomerDetail.status === "defaulted" ? "destructive" : "outline"} className="text-xs">
                        {selectedCustomerDetail.status === "completed" ? "Completed" : selectedCustomerDetail.status === "defaulted" ? "Defaulted" : "Active"}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-0.5 flex items-center gap-2">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{selectedCustomerDetail.idNumber}</span>
                      <span>• Phone: {selectedCustomerDetail.phone1}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Mobile & Device Information */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Device & Mobile Details
                  </h4>
                  {(() => {
                        const totalSaleProfit = selectedCustomerDetail.profitAmount || ((selectedCustomerDetail.sellingPrice || 0) - (selectedCustomerDetail.purchasePrice || selectedCustomerDetail.investmentUsed || 0));
                        const totalSaleExpenses = selectedCustomerDetail.expenses ? selectedCustomerDetail.expenses.reduce((s, e) => s + (e.amount || 0), 0) : 0;
                        const netSaleProfit = Math.max(0, totalSaleProfit - totalSaleExpenses);
                        const partnerRatio = investor?.sharingRatio || 50;
                        const partnerProfitShare = Math.round(netSaleProfit * (partnerRatio / 100));

                        return (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center text-xs mb-3">
                            <div>
                              <span className="text-[11px] text-emerald-400 font-semibold block">Your Expected Profit ({partnerRatio}% share)</span>
                              <span className="text-[10px] text-muted-foreground">Total deal profit: {formatCurrency(netSaleProfit)}</span>
                            </div>
                            <span className="font-extrabold text-emerald-400 text-base">{formatCurrency(partnerProfitShare)}</span>
                          </div>
                        );
                      })()}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Brand / Company</span>
                      <span className="font-medium text-foreground">{selectedCustomerDetail.mobileCompany}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Model Name</span>
                      <span className="font-medium text-foreground">{selectedCustomerDetail.mobileModel}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Sale Date</span>
                      <span className="font-medium text-foreground">{formatDate(selectedCustomerDetail.createdAt)}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-3 bg-background/60 p-2.5 rounded-lg border border-border/30 space-y-1 font-mono text-[11px]">
                      <p className="flex justify-between">
                        <span className="text-muted-foreground">IMEI Number 1:</span>
                        <span className="font-semibold text-primary">{selectedCustomerDetail.imei1 || "N/A"}</span>
                      </p>
                      {selectedCustomerDetail.imei2 && (
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">IMEI Number 2:</span>
                          <span className="font-semibold text-primary">{selectedCustomerDetail.imei2}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sale Expenses & Deductions Section */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4" /> Sale Expenses & Capital Deductions
                    </span>
                    {selectedCustomerDetail.expenses && selectedCustomerDetail.expenses.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        Total: {formatCurrency(selectedCustomerDetail.expenses.reduce((s, e) => s + (e.amount || 0), 0))}
                      </Badge>
                    )}
                  </h4>

                  {selectedCustomerDetail.expenses && selectedCustomerDetail.expenses.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedCustomerDetail.expenses.map((exp, idx) => {
                          const invShare = exp.investorShare ?? Math.round((exp.amount || 0) * 0.5);
                          const shopShare = exp.adminShare ?? Math.round((exp.amount || 0) * 0.5);
                          return (
                            <div key={exp.id || idx} className="p-2.5 rounded-lg bg-background/60 border border-border/30 space-y-1 text-xs">
                              <div className="flex justify-between font-semibold">
                                <span className="text-foreground">{exp.description || "Expense"}</span>
                                <span className="text-amber-500">{formatCurrency(exp.amount || 0)}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/20">
                                <span>Your Share (50%): <strong className="text-primary">{formatCurrency(invShare)}</strong></span>
                                <span>Shop Share: <strong>{formatCurrency(shopShare)}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex justify-between items-center text-xs">
                        <span className="font-medium text-foreground">Total Deducted from Your Capital:</span>
                        <span className="font-bold text-primary text-sm">
                          {formatCurrency(selectedCustomerDetail.expenses.reduce((s, e) => s + (e.investorShare ?? Math.round((e.amount || 0) * 0.5)), 0))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No additional expenses added for this sale</p>
                  )}
                </div>

                {/* Customer & Referral Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-2">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" /> Customer Contacts
                    </h4>
                    <div className="space-y-1 text-xs">
                      <p><span className="text-muted-foreground">Primary Phone:</span> <span className="font-medium text-foreground">{selectedCustomerDetail.phone1}</span></p>
                      {selectedCustomerDetail.phone2 && (
                        <p><span className="text-muted-foreground">Secondary Phone:</span> <span className="font-medium text-foreground">{selectedCustomerDetail.phone2}</span></p>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-2">
                    <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <BadgePercent className="w-3.5 h-3.5" /> Referral Details
                    </h4>
                    <div className="space-y-1 text-xs">
                      <p><span className="text-muted-foreground">Referred By:</span> <span className="font-medium text-foreground">{selectedCustomerDetail.resellerName || "Direct / Shop"}</span></p>
                      {selectedCustomerDetail.referralCommissionAmount ? (
                        <p><span className="text-muted-foreground">Commission:</span> <span className="font-medium text-green-500">{formatCurrency(selectedCustomerDetail.referralCommissionAmount)} ({selectedCustomerDetail.referralCommissionPercent}%)</span></p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" /> Financial Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/20">
                      <span className="text-[11px] text-muted-foreground block">Capital Invested</span>
                      <span className="font-semibold text-blue-500">{formatCurrency(selectedCustomerDetail.investmentUsed)}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/20">
                      <span className="text-[11px] text-muted-foreground block">Advance Payment</span>
                      <span className="font-semibold text-foreground">{formatCurrency(selectedCustomerDetail.advancePayment)}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/20">
                      <span className="text-[11px] text-muted-foreground block">Monthly Installment</span>
                      <span className="font-semibold text-foreground">{formatCurrency(selectedCustomerDetail.monthlyInstallment)} / mo</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/20">
                      <span className="text-[11px] text-muted-foreground block">Total Selling Price</span>
                      <span className="font-semibold text-foreground">{formatCurrency(selectedCustomerDetail.sellingPrice)}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/20">
                      <span className="text-[11px] text-muted-foreground block">Total Paid So Far</span>
                      <span className="font-semibold text-green-500">{formatCurrency(selectedCustomerDetail.totalPaid)}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background/50 border border-border/20">
                      <span className="text-[11px] text-muted-foreground block">Remaining Balance</span>
                      <span className="font-semibold text-amber-500">{formatCurrency(selectedCustomerDetail.remainingAmount)}</span>
                    </div>
                  </div>

                  {/* Installment Plan Status */}
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Installments: <strong className="text-foreground">{selectedCustomerDetail.paidInstallments} of {selectedCustomerDetail.installmentMonths}</strong> months paid</span>
                    </div>
                    {selectedCustomerDetail.nextDueDate && selectedCustomerDetail.status === "active" && (
                      <div className="text-amber-500 font-medium">
                        Next Due: {formatDate(selectedCustomerDetail.nextDueDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedCustomerDetail(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Payment Proof Viewer Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={(open) => !open && setSelectedProof(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <ImageIcon className="w-5 h-5" /> {selectedProof?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedProof && (
            <div className="space-y-3 my-2 text-center">
              <div className="rounded-xl overflow-hidden border bg-black/50 p-2">
                <img src={selectedProof.image} alt="Payment Proof" className="max-h-72 mx-auto rounded-lg object-contain" />
              </div>
              {selectedProof.ref && (
                <p className="text-xs font-mono text-muted-foreground">
                  Transaction Reference: <strong>{selectedProof.ref}</strong>
                </p>
              )}
              {selectedProof.note && (
                <p className="text-xs text-muted-foreground">
                  Note: {selectedProof.note}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" /> Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update your profile details. Admin approval is required for changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="0300 1234567"
              />
            </div>
            <div className="space-y-2">
              <Label>Profile Picture URL (DP)</Label>
              <Input
                value={editPhotoUrl}
                onChange={(e) => setEditPhotoUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
              {editPhotoUrl && (
                <div className="flex items-center gap-3 pt-2">
                  <img src={editPhotoUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border" />
                  <span className="text-xs text-muted-foreground">Avatar Preview</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileEdit(false)}>Cancel</Button>
            <Button onClick={handleProfileSubmit} disabled={profileLoading}>
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}