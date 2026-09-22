"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  TrendingUp,
  Users,
  Smartphone,
  Bell,
  LogOut,
  Sun,
  Moon,
  Info,
  Banknote,
  UserCog,
  User,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, addDoc, onSnapshot } from "firebase/firestore";
import { Reseller, Customer } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ResellerPortalPage() {
  const { appUser, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);


  useEffect(() => {
    if (!appUser) {
      router.push("/");
      return;
    }

    const qRes = query(collection(db, "resellers"), where("userId", "==", appUser.uid));
    const unsubRes = onSnapshot(qRes, (snap) => {
      if (!snap.empty) {
        const res = { id: snap.docs[0].id, ...snap.docs[0].data() } as Reseller;
        setReseller(res);

        onSnapshot(query(collection(db, "customers"), where("resellerId", "==", res.id)), (cSnap) => {
          setCustomers(cSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
        });
      }
      setLoading(false);
    }, (err) => {
      console.warn("Reseller portal realtime sync error:", err);
      setLoading(false);
    });

    if (appUser && !appUser.guideSeen) setShowGuide(true);

    return () => unsubRes();
  }, [appUser, router]);


  const handleProfileSubmit = async () => {
    if (!appUser) return;
    setProfileLoading(true);
    try {
      await addDoc(collection(db, "pending_approvals"), {
        userId: appUser.uid,
        userName: editName || reseller?.fullName || appUser.fullName,
        userRole: "reseller",
        changes: {
          ...(editName && editName !== (reseller?.fullName || appUser.fullName) ? { fullName: { old: reseller?.fullName || "", new: editName } } : {}),
          ...(editPhone && editPhone !== reseller?.phone ? { phone: { old: reseller?.phone || "", new: editPhone } } : {}),
        },
        newProfileImage: editPhotoUrl || "",
        status: "pending",
        submittedAt: new Date().toISOString(),
        collectionName: "resellers",
        docId: reseller?.id || "",
      });
      toast.success("Profile update request submitted for admin approval!");
      setShowProfileEdit(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setProfileLoading(false);
    }
  };

  const totalCommission = customers.reduce((sum, c) => sum + c.referralCommissionAmount, 0);
  const expectedCommission = customers
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + c.referralCommissionAmount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Reseller Portal</h1>
              <p className="text-xs text-muted-foreground">{reseller?.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditName(reseller?.fullName || appUser?.fullName || "");
                setEditPhone(reseller?.phone || appUser?.phone || "");
                setEditPhotoUrl(appUser?.profileImage || "");
                setShowProfileEdit(true);
              }}
            >
              <UserCog className="w-4 h-4" /> Edit Profile
            </Button>

            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowGuide(true)}>
              <Info className="w-4 h-4" />
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

      <main className="max-w-5xl mx-auto p-4 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Referrals</p>
                  <p className="text-2xl font-bold mt-1">{customers.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Commission</p>
                  <p className="text-2xl font-bold mt-1 text-green-500">{formatCurrency(totalCommission)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Expected Earning</p>
                  <p className="text-2xl font-bold mt-1 text-blue-500">{formatCurrency(expectedCommission)}</p>
                  <p className="text-[10px] text-muted-foreground">from active sales</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referred Customers - LIMITED VIEW */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> My Referred Customers
            </CardTitle>
            <CardDescription>Aapne jo customers refer kiye hain unki list</CardDescription>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Abhi tak koi referral nahi hai</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customers.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{c.mobileCompany}</Badge>
                          <span className="text-xs text-muted-foreground">{c.mobileModel}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold text-sm">{formatCurrency(c.sellingPrice)}</p>
                        <div className="mt-1">
                          <p className="text-[10px] text-muted-foreground">My Commission</p>
                          <p className="font-bold text-sm text-green-500">{formatCurrency(c.referralCommissionAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Get Started Guide */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome to Reseller Portal!</DialogTitle>
            <DialogDescription>Ye guide aapko samjhayegi ke portal kaise kaam karta hai</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-semibold mb-2">Total Referrals</h4>
              <p className="text-muted-foreground">Jitne customers aapne refer kiye hain unki total count yahan dikhti hai.</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <h4 className="font-semibold mb-2">Commission</h4>
              <p className="text-muted-foreground">Har sale pe aapko commission milta hai (default 2%). Customer ke details mein aapko customer ka naam, phone company, model, amount, aur aapki commission dikhti hai.</p>
            </div>
            <div className="p-4 rounded-xl bg-muted border">
              <h4 className="font-semibold mb-2">Expected Earning</h4>
              <p className="text-muted-foreground">Jo sales abhi active hain unse aapki expected earning kya hogi ye yahan dikhta hai.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowGuide(false)} className="w-full gradient-primary">Samajh Gaya!</Button>
          </DialogFooter>
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