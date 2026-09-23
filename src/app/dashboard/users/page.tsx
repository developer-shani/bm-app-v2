"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Handshake,
  Search,
  Plus,
  Phone,
  CreditCard,
  Percent,
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  ImagePlus,
  ShieldCheck,
  User,
  Mail,
  Lock,
  ArrowRight,
  Filter,
  Copy,
  Share2,
  Key,
  Sparkles,
  Edit,
  Trash2,
  UserCog,
} from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, cn, getPortalUrl, getPortalUrlWithCreds } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "investor" | "reseller";
  cnic?: string;
  password?: string;
  sharingRatio?: number;
  totalInvestment?: number;
  totalCommission?: number;
  createdAt: string;
  status: string;
}

export default function UsersPage() {
  const { createAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "add-investor" | "add-reseller">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "investor" | "reseller" | "admin">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Share Credentials Modal State
  const [shareCredsUser, setShareCredsUser] = useState<{
    name: string;
    email: string;
    password?: string;
    role: string;
    phone?: string;
  } | null>(null);



  // Edit User Modal State
  const [editUser, setEditUser] = useState<SystemUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "investor" | "reseller">("investor");
  const [editStatus, setEditStatus] = useState("active");
  const [editRatio, setEditRatio] = useState("50");
    const [editPassword, setEditPassword] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openEditUser = (user: SystemUser) => {
    setEditUser(user);
    setEditName(user.name);
    setEditPhone(user.phone);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditRatio(String(user.sharingRatio || 50));
      setEditPassword(user.password || "");
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      const collectionName = editUser.role === "investor" ? "investors" : editUser.role === "reseller" ? "resellers" : "users";
      const updateData: any = { fullName: editName, phone: editPhone, email: editEmail, status: editStatus, password: editPassword };
      if (editUser.role === "investor") updateData.sharingRatio = parseFloat(editRatio) || 50;
      
      await updateDoc(doc(db, collectionName, editUser.id), updateData).catch(() => {});
      
      // Also update users collection if exists
      if (editUser.id) {
        await updateDoc(doc(db, "users", editUser.id), { fullName: editName, name: editName, phone: editPhone, email: editEmail, status: editStatus, role: editRole, password: editPassword }).catch(() => {});
      }

      // Update local state
      setUsersList(prev => prev.map(u => u.id === editUser.id ? { ...u, name: editName, phone: editPhone, email: editEmail, role: editRole, status: editStatus, password: editPassword, sharingRatio: parseFloat(editRatio) || 50 } : u));
      toast.success(editName + " ki details update ho gayi!");
      setEditUser(null);
    } catch (e: any) {
      toast.error(e.message || "Update me masla aya");
    } finally {
      setEditSaving(false);
    }
  };

  const handleSoftDelete = async (user: SystemUser) => {
    if (user.role === "admin") {
      toast.error("Admin ko delete nahi kar sakte");
      return;
    }
    setDeletingId(user.id);
    try {
      const collectionName = user.role === "investor" ? "investors" : "resellers";
      // Save to deleted_records
      await addDoc(collection(db, "deleted_records"), {
        originalId: user.id,
        type: collectionName,
        data: { name: user.name, fullName: user.name, email: user.email, phone: user.phone, role: user.role, sharingRatio: user.sharingRatio, totalInvestment: user.totalInvestment, totalCommission: user.totalCommission, status: user.status },
        deletedAt: new Date().toISOString(),
        deletedBy: "admin",
      });
      // Delete from original collection
      await deleteDoc(doc(db, collectionName, user.id)).catch(() => {});
      toast.success(user.name + " delete ho gaya! (Trash me jayen restore karne ke liye)");
    } catch (e: any) {
      toast.error(e.message || "Delete me masla aya");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyCredentials = (user: { name: string; email: string; password?: string; role: string; phone?: string }) => {
    const roleTitle = user.role === "investor" ? "Investor / Partner" : user.role === "reseller" ? "Reseller / Member" : "Admin";
    const pwdDisplay = user.password || "As set during account creation";
    const phoneStr = user.phone ? `\n📱 *Phone:* ${user.phone}` : "";
    const portalUrl = getPortalUrlWithCreds(user.email, user.password || pwdDisplay);
    const text = `🔐 *Brother Mobiles Portal Access Credentials*\n\n👤 *Name:* ${user.name}${phoneStr}\n💼 *Role:* ${roleTitle}\n📧 *Email/Username:* ${user.email}\n🔑 *Password:* ${pwdDisplay}\n🌐 *Direct Login Link:* ${portalUrl}\n\n_Brother Mobiles Shop Management System_`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials clipboard par copy ho gaye!");
  };

  const handleShareWhatsApp = (user: { name: string; email: string; password?: string; role: string; phone?: string }) => {
    const roleTitle = user.role === "investor" ? "Investor / Partner" : user.role === "reseller" ? "Reseller / Member" : "Admin";
    const pwdDisplay = user.password || "As set during account creation";
    const phoneStr = user.phone ? `\n📱 *Phone:* ${user.phone}` : "";
    const portalUrl = getPortalUrlWithCreds(user.email, user.password || pwdDisplay);
    const text = `🔐 *Brother Mobiles Portal Access Credentials*\n\n👤 *Name:* ${user.name}${phoneStr}\n💼 *Role:* ${roleTitle}\n📧 *Email/Username:* ${user.email}\n🔑 *Password:* ${pwdDisplay}\n🌐 *Direct Login Link:* ${portalUrl}\n\n_Brother Mobiles Shop Management System_`;
    const cleanPhone = (user.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };
  const [invLoading, setInvLoading] = useState(false);
  const [invName, setInvName] = useState("");
  const [invCnic, setInvCnic] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invPassword, setInvPassword] = useState("");
  const [invRatio, setInvRatio] = useState("50");
  const [invCustomRatio, setInvCustomRatio] = useState("");
  const [invHasInitial, setInvHasInitial] = useState(false);
  const [invAmount, setInvAmount] = useState("");
  const [invProofImage, setInvProofImage] = useState<File | null>(null);
  const [invProofPreview, setInvProofPreview] = useState("");

  // Form State: Add Reseller
  const [resLoading, setResLoading] = useState(false);
  const [resName, setResName] = useState("");
  const [resPhone, setResPhone] = useState("");
  const [resEmail, setResEmail] = useState("");
  const [resPassword, setResPassword] = useState("");
  const [resShopName, setResShopName] = useState("");
  const [resCommissionRate, setResCommissionRate] = useState("5");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("bm_cached_users");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUsersList(parsed);
            setLoading(false);
          }
        } catch (e) {}
      }
    }

    let invList: SystemUser[] = [];
    let resList: SystemUser[] = [];

    const updateFullList = () => {
      const combined = [...invList, ...resList];
      setUsersList(combined);
      setLoading(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("bm_cached_users", JSON.stringify(combined));
      }
    };

    const unsubInv = onSnapshot(collection(db, "investors"), (snap) => {
      invList = snap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.fullName || data.name || "Investor",
          email: data.email || "",
          phone: data.phone || "",
          role: "investor",
          cnic: data.cnic || "",
          password: data.password || "",
          sharingRatio: data.sharingRatio || 50,
          totalInvestment: data.totalInvestment || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || "active",
        };
      });
      updateFullList();
    });

    const unsubRes = onSnapshot(collection(db, "resellers"), (snap) => {
      resList = snap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.fullName || data.name || "Reseller",
          email: data.email || "",
          phone: data.phone || "",
          role: "reseller",
          password: data.password || "",
          totalCommission: data.totalCommission || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          status: data.status || "active",
        };
      });
      updateFullList();
    });

    return () => {
      unsubInv();
      unsubRes();
    };
  }, []);

  // Image handler for investor proof
  const handleInvImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setInvProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Submit Investor (Partner)
  const handleAddInvestor = async () => {
    if (!invName || !invPhone || !invEmail || !invPassword) {
      toast.error("Saari required fields (Name, Phone, Email, Password) fill karein");
      return;
    }

    setInvLoading(true);
    const actualRatio = parseInt(invCustomRatio || invRatio) || 50;

    try {
      let userId = "inv-" + Date.now();
      try {
        userId = await createAccount(invEmail, invPassword, {
          email: invEmail,
          fullName: invName,
          cnic: invCnic,
          phone: invPhone,
          role: "investor",
          sharingRatio: actualRatio,
        });
      } catch (authErr: any) {
        console.warn("Auth creation warning:", authErr);
      }

      const initialAmount = invHasInitial ? parseFloat(invAmount) || 0 : 0;
      const investorData = {
        userId,
        fullName: invName,
        cnic: invCnic || "",
        phone: invPhone,
        email: invEmail,
        password: invPassword,
        totalInvestment: initialAmount,
        availableBalance: initialAmount,
        totalProfit: 0,
        totalWithdrawn: 0,
        activeInstallments: 0,
        sharingRatio: actualRatio,
        status: "active",
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

      if (invHasInitial && invProofImage) {
        try {
          const imageRef = ref(storage, `investments/${investorDocId}/${Date.now()}_proof`);
          await uploadBytes(imageRef, invProofImage);
          const imageUrl = await getDownloadURL(imageRef);
          await addDoc(collection(db, "investments"), {
            investorId: investorDocId,
            investorName: invName,
            amount: initialAmount,
            type: "initial",
            imageProof: imageUrl,
            date: new Date().toISOString(),
            note: "Initial investment",
          });
        } catch (imgErr: any) {
          console.warn("Storage upload warning:", imgErr);
        }
      }

      const newInvUser: SystemUser = {
        id: investorDocId,
        name: invName,
        email: invEmail,
        phone: invPhone,
        role: "investor",
        cnic: invCnic,
        sharingRatio: actualRatio,
        totalInvestment: initialAmount,
        createdAt: new Date().toISOString(),
        status: "active",
      };

      setUsersList((prev) => [newInvUser, ...prev.filter((u) => u.id !== newInvUser.id)]);

      if (typeof window !== "undefined") {
        const currentCachedUsers = localStorage.getItem("bm_cached_users");
        let list = [newInvUser];
        if (currentCachedUsers) {
          try {
            const parsed = JSON.parse(currentCachedUsers);
            if (Array.isArray(parsed)) list = [newInvUser, ...parsed.filter((u: any) => u.id !== newInvUser.id)];
          } catch (e) {}
        }
        localStorage.setItem("bm_cached_users", JSON.stringify(list));
      }

      toast.success(`Investor Partner (${invName}) add ho gaya!`);

      const createdInv = { name: invName, email: invEmail, password: invPassword, role: "investor", phone: invPhone };
      
      setInvName(""); setInvCnic(""); setInvPhone(""); setInvEmail(""); setInvPassword("");
      setInvHasInitial(false); setInvAmount(""); setInvProofImage(null); setInvProofPreview("");
      setActiveTab("all");
      setShareCredsUser(createdInv);
    } catch (err: any) {
      toast.error(err.message || "Investor account add nahi ho saka");
    } finally {
      setInvLoading(false);
    }
  };

  // Submit Reseller (Member)
  const handleAddReseller = async () => {
    if (!resName || !resPhone) {
      toast.error("Reseller ka naam aur phone zaruri hai");
      return;
    }

    setResLoading(true);
    try {
      let userId = "res-" + Date.now();
      if (resEmail && resPassword) {
        try {
          userId = await createAccount(resEmail, resPassword, {
            email: resEmail,
            fullName: resName,
            phone: resPhone,
            role: "reseller",
          });
        } catch (authErr: any) {
          console.warn("Auth creation warning:", authErr);
        }
      }

      const finalPassword = resPassword || ("BM" + Math.floor(100000 + Math.random() * 900000));
      const finalEmail = resEmail || (resPhone.replace(/[^0-9]/g, "") + "@brother.com");
      const resellerData = {
        userId,
        fullName: resName,
        phone: resPhone,
        email: finalEmail,
        password: finalPassword,
        shopName: resShopName || "",
        commissionRate: parseFloat(resCommissionRate) || 5,
        totalCommission: 0,
        pendingCommission: 0,
        totalReferrals: 0,
        status: "active",
        createdAt: new Date().toISOString(),
      };

      let resellerDocId = userId;
      try {
        const addPromise = addDoc(collection(db, "resellers"), resellerData);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 3000)
        );
        const docRef: any = await Promise.race([addPromise, timeoutPromise]);
        if (docRef?.id) resellerDocId = docRef.id;
      } catch (fsErr) {
        console.warn("Firestore save timeout/fallback:", fsErr);
      }

      const newResUser: SystemUser = {
        id: resellerDocId,
        name: resName,
        email: resEmail || resPhone,
        phone: resPhone,
        role: "reseller",
        totalCommission: 0,
        createdAt: new Date().toISOString(),
        status: "active",
      };

      setUsersList((prev) => [newResUser, ...prev.filter((u) => u.id !== newResUser.id)]);

      if (typeof window !== "undefined") {
        const currentCachedUsers = localStorage.getItem("bm_cached_users");
        let list = [newResUser];
        if (currentCachedUsers) {
          try {
            const parsed = JSON.parse(currentCachedUsers);
            if (Array.isArray(parsed)) list = [newResUser, ...parsed.filter((u: any) => u.id !== newResUser.id)];
          } catch (e) {}
        }
        localStorage.setItem("bm_cached_users", JSON.stringify(list));
      }

      toast.success(`Reseller Member (${resName}) add ho gaya!`);
      const createdRes = { name: resName, email: finalEmail, password: finalPassword, role: "reseller", phone: resPhone };

      setResName(""); setResPhone(""); setResEmail(""); setResPassword(""); setResShopName("");
      setActiveTab("all");
      setShareCredsUser(createdRes);
    } catch (err: any) {
      toast.error(err.message || "Reseller add nahi ho saka");
    } finally {
      setResLoading(false);
    }
  };

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    return matchesRole && matchesSearch;
  });


  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-7 w-48 mb-2" /><Skeleton className="h-4 w-64" /></div>
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid gap-3">{[1,2,3,4,5].map(i => <Card key={i}><CardContent className="p-4"><div className="flex items-center gap-4"><Skeleton className="w-10 h-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-5 w-16 rounded-full" /></div></CardContent></Card>)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Users & Partners Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Investors (Partners), Resellers & Staff Members in one place
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap overflow-x-auto bg-muted/60 p-1 rounded-xl border border-border/50 w-full sm:w-auto gap-1">
          <Button
            variant={activeTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("all")}
            className="gap-1.5 text-xs font-semibold flex-1 sm:flex-none justify-center"
          >
            <Users className="w-3.5 h-3.5" />
            All Members ({usersList.length})
          </Button>
          <Button
            variant={activeTab === "add-investor" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("add-investor")}
            className="gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex-1 sm:flex-none justify-center"
          >
            <Wallet className="w-3.5 h-3.5" />
            + Add Investor (Partner)
          </Button>
          <Button
            variant={activeTab === "add-reseller" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("add-reseller")}
            className="gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 flex-1 sm:flex-none justify-center"
          >
            <Handshake className="w-3.5 h-3.5" />
            + Add Reseller
          </Button>
        </div>
      </div>

      {/* TAB 1: ALL USERS LIST */}
      {activeTab === "all" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs w-full"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap overflow-x-auto bg-muted/40 p-1 rounded-xl border w-full sm:w-auto gap-1">
              <Button
                variant={roleFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setRoleFilter("all")}
                className="text-xs h-8 flex-1 sm:flex-none"
              >
                All Roles
              </Button>
              <Button
                variant={roleFilter === "investor" ? "default" : "ghost"}
                size="sm"
                onClick={() => setRoleFilter("investor")}
                className="text-xs h-8 text-emerald-600 dark:text-emerald-400 flex-1 sm:flex-none"
              >
                Investors ({usersList.filter((u) => u.role === "investor").length})
              </Button>
              <Button
                variant={roleFilter === "reseller" ? "default" : "ghost"}
                size="sm"
                onClick={() => setRoleFilter("reseller")}
                className="text-xs h-8 text-blue-600 dark:text-blue-400 flex-1 sm:flex-none"
              >
                Resellers ({usersList.filter((u) => u.role === "reseller").length})
              </Button>
              <Button
                variant={roleFilter === "admin" ? "default" : "ghost"}
                size="sm"
                onClick={() => setRoleFilter("admin")}
                className="text-xs h-8 flex-1 sm:flex-none"
              >
                Admins ({usersList.filter((u) => u.role === "admin").length})
              </Button>
            </div>
          </div>

          {/* Members List */}
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading members...</div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-3">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <h3 className="text-base font-semibold">No Members Found</h3>
                <p className="text-xs text-muted-foreground">
                  Naye Investor Partner ya Reseller add karne ke liye upar button click karein.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} onClick={() => handleEditUser(user)} className="hover:shadow-lg transition-all border-border/60 hover:border-primary/40 hover:scale-[1.01] cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border shrink-0",
                            user.role === "admin" && "bg-primary/10 border-primary/20 text-primary",
                            user.role === "investor" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                            user.role === "reseller" && "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {user.role === "admin" ? (
                            <ShieldCheck className="w-5 h-5" />
                          ) : user.role === "investor" ? (
                            <Wallet className="w-5 h-5" />
                          ) : (
                            <Handshake className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm">{user.name}</h3>
                            <Badge
                              variant={
                                user.role === "admin"
                                  ? "default"
                                  : user.role === "investor"
                                  ? "success"
                                  : "secondary"
                              }
                              className="text-[10px] capitalize"
                            >
                              {user.role === "investor" ? "Partner (Investor)" : user.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {user.phone || "No Phone"} &bull; {user.email || "No Email"}
                          </p>
                          {user.cnic && (
                            <p className="text-[11px] text-muted-foreground">CNIC: {user.cnic}</p>
                          )}
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                        {user.status}
                      </Badge>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {user.role === "investor" ? (
                          <>
                            <span className="text-muted-foreground">Profit Sharing:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {user.sharingRatio}% / {100 - (user.sharingRatio || 50)}%
                            </span>
                          </>
                        ) : user.role === "reseller" ? (
                          <>
                            <span className="text-muted-foreground">Commission:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(user.totalCommission || 0)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-muted-foreground">Access Role:</span>
                            <span className="font-semibold text-primary">Full Shop Owner</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCredentials(user)}
                          className="h-7 px-2 text-[11px] gap-1"
                          title="Copy login credentials"
                        >
                          <Copy className="w-3 h-3" /> Copy Info
                        </Button>
                        {user.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShareWhatsApp(user)}
                            className="h-7 px-2 text-[11px] gap-1 text-green-600 border-green-500/30 hover:bg-green-500/10"
                            title="Send via WhatsApp"
                          >
                            <Phone className="w-3 h-3" /> Send WA
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADD INVESTOR (PARTNER) */}
      {activeTab === "add-investor" && (
        <Card className="animate-fade-in max-w-2xl mx-auto border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
              Add Investor (Partner)
            </CardTitle>
            <CardDescription>
              New investor account banana jiss ke capital se mobile installment par buy honge
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input
                  placeholder="Investor ka pura naam"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CNIC / ID Number <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input
                  placeholder="35201-1234567-1"
                  value={invCnic}
                  onChange={(e) => setInvCnic(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number *</Label>
                <Input
                  placeholder="03XX-XXXXXXX"
                  value={invPhone}
                  onChange={(e) => setInvPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address *</Label>
                <Input
                  type="email"
                  placeholder="investor@email.com"
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Login Password *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary"
                  onClick={() => {
                    const suggestions = [
                      `brother${Math.floor(1000 + Math.random() * 9000)}`,
                      `bm${invPhone.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`,
                      `partner${Math.floor(100 + Math.random() * 900)}`,
                      `invest${Math.floor(1000 + Math.random() * 9000)}`,
                    ];
                    const pwd = suggestions[Math.floor(Math.random() * suggestions.length)];
                    setInvPassword(pwd);
                    toast.success(`Password set: ${pwd}`);
                  }}
                >
                  <Sparkles className="w-3 h-3" /> Suggest Password
                </Button>
              </div>
              <Input
                placeholder="Minimum 6 characters"
                value={invPassword}
                onChange={(e) => setInvPassword(e.target.value)}
              />
              {invPassword && (
                <p className="text-[11px] text-muted-foreground">Password: <strong>{invPassword}</strong></p>
              )}
            </div>

            <Separator />

            {/* Profit Sharing Ratio */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Profit Sharing Ratio (%)</Label>
              <div className="flex gap-2">
                {["50", "40", "60"].map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={invRatio === r && !invCustomRatio ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setInvRatio(r);
                      setInvCustomRatio("");
                    }}
                    className="flex-1 text-xs"
                  >
                    {r} / {100 - parseInt(r)}
                  </Button>
                ))}
              </div>

              <Input
                type="number"
                placeholder="Custom Investor % (e.g. 45)"
                value={invCustomRatio}
                onChange={(e) => setInvCustomRatio(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Ratio: <strong>{invCustomRatio || invRatio}% Investor</strong> &bull; <strong>{100 - parseInt(invCustomRatio || invRatio)}% Shop Owner</strong>
              </p>
            </div>

            <Separator />

            {/* Initial Investment Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
              <div>
                <p className="text-xs font-semibold">Initial Investment</p>
                <p className="text-[11px] text-muted-foreground">Kya investor abhi investment de raha hai?</p>
              </div>
              <Switch checked={invHasInitial} onCheckedChange={setInvHasInitial} />
            </div>

            {invHasInitial && (
              <div className="space-y-3 p-3 rounded-xl bg-accent/30 border border-emerald-500/20 animate-fade-in">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Investment Amount (PKR) *</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 500000"
                    value={invAmount}
                    onChange={(e) => setInvAmount(e.target.value)}
                  />
                </div>

                {/* Proof Image */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Slip Proof</Label>
                  <div className="border border-dashed border-border rounded-xl p-3 text-center">
                    {invProofPreview ? (
                      <div className="flex items-center justify-between gap-3">
                        <img src={invProofPreview} alt="Proof" className="w-12 h-12 rounded-lg object-cover border" />
                        <span className="text-xs truncate">{invProofImage?.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => { setInvProofImage(null); setInvProofPreview(""); }}>Remove</Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer text-xs text-primary font-medium hover:underline inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <input type="file" accept="image/*" onChange={handleInvImageChange} className="hidden" />
                        Upload Slip Proof Image
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleAddInvestor}
              disabled={invLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold h-11"
            >
              {invLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Create Investor Partner Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: ADD RESELLER (MEMBER) */}
      {activeTab === "add-reseller" && (
        <Card className="animate-fade-in max-w-2xl mx-auto border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Handshake className="w-5 h-5" />
              Add Reseller / Shop Member
            </CardTitle>
            <CardDescription>
              Reseller account banana jo aap ke phones aage refer/sell kar sakan
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reseller Name *</Label>
                <Input
                  placeholder="Reseller ka naam"
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number *</Label>
                <Input
                  placeholder="03XX-XXXXXXX"
                  value={resPhone}
                  onChange={(e) => setResPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Shop / Business Name (Optional)</Label>
                <Input
                  placeholder="e.g. Al-Madina Mobiles"
                  value={resShopName}
                  onChange={(e) => setResShopName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Commission Rate (%)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={resCommissionRate}
                  onChange={(e) => setResCommissionRate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Optional Portal Login Access */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Portal Login Credentials (Optional)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Login Email</Label>
                  <Input
                    type="email"
                    placeholder="reseller@email.com"
                    value={resEmail}
                    onChange={(e) => setResEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Password</Label>
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={resPassword}
                    onChange={(e) => setResPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleAddReseller}
              disabled={resLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold h-11"
            >
              {resLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Create Reseller Account
            </Button>
          </CardContent>
        </Card>
      )}
      {/* EDIT USER DIALOG */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Edit className="w-5 h-5" /> Edit Member Details
            </DialogTitle>
            <DialogDescription>Member ki details yahan se update karein</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full Name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <div className="flex gap-2">
                  <Button variant={editStatus === "active" ? "default" : "outline"} size="sm" onClick={() => setEditStatus("active")} className="text-xs flex-1">Active</Button>
                  <Button variant={editStatus === "inactive" ? "default" : "outline"} size="sm" onClick={() => setEditStatus("inactive")} className="text-xs flex-1">Inactive</Button>
                </div>
              </div>
              {editUser.role === "investor" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Sharing Ratio (%)</Label>
                  <Input type="number" value={editRatio} onChange={(e) => setEditRatio(e.target.value)} placeholder="50" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={editSaving} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHARE CREDENTIALS MODAL */}
      <Dialog open={!!shareCredsUser} onOpenChange={() => setShareCredsUser(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Share2 className="w-5 h-5" />
              Member Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Aap naye member ke login credentials niche se copy ya WhatsApp kar sakte hain.
            </DialogDescription>
          </DialogHeader>

          {shareCredsUser && (
            <div className="space-y-3 py-2 bg-muted/40 p-4 rounded-xl border">
              <div className="flex justify-between items-center text-xs border-b pb-2">
                <span className="text-muted-foreground font-semibold">Member Name:</span>
                <span className="font-bold text-foreground">{shareCredsUser.name}</span>
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
                <span className="font-mono text-[11px] text-primary font-medium truncate max-w-[220px]">
                  {getPortalUrlWithCreds(shareCredsUser.email, shareCredsUser.password)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => shareCredsUser && handleCopyCredentials(shareCredsUser)}
              className="gap-2 flex-1"
            >
              <Copy className="w-4 h-4" /> Copy Credentials
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
