"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, User, Phone, Loader2, CheckCircle2, Copy, Share2, Key } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { getPortalUrl, getPortalUrlWithCreds } from "@/lib/utils";

export default function AddResellerPage() {
  const router = useRouter();
  const { createAccount } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [commissionRate, setCommissionRate] = useState("5");

  // Modal state for sharing credentials
  const [shareCredsUser, setShareCredsUser] = useState<{
    name: string;
    email: string;
    password?: string;
    phone?: string;
  } | null>(null);

  const handleCopyCredentials = (u: typeof shareCredsUser) => {
    if (!u) return;
    const pwd = (u.password && u.password !== "N/A") ? u.password : "As set during account creation";
    const origin = getPortalUrlWithCreds(u.email, pwd);
    const phoneStr = u.phone ? `\n📱 *Phone:* ${u.phone}` : "";
    const text = `🔐 *Brother Mobiles Portal Access Credentials*\n\n👤 *Name:* ${u.name}${phoneStr}\n💼 *Role:* Reseller / Member\n📧 *Email/Username:* ${u.email}\n🔑 *Password:* ${pwd}\n🌐 *Direct Login Link:* ${origin}\n\n_Brother Mobiles Shop Management System_`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials clipboard par copy ho gaye!");
  };

  const handleShareWhatsApp = (u: typeof shareCredsUser) => {
    if (!u) return;
    const pwd = (u.password && u.password !== "N/A") ? u.password : "As set during account creation";
    const origin = getPortalUrlWithCreds(u.email, pwd);
    const phoneStr = u.phone ? `\n📱 *Phone:* ${u.phone}` : "";
    const text = `🔐 *Brother Mobiles Portal Access Credentials*\n\n👤 *Name:* ${u.name}${phoneStr}\n💼 *Role:* Reseller / Member\n📧 *Email/Username:* ${u.email}\n🔑 *Password:* ${pwd}\n🌐 *Direct Login Link:* ${origin}\n\n_Brother Mobiles Shop Management System_`;
    const cleanPhone = (u.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
    window.open("https://wa.me/" + formattedPhone + "?text=" + encodeURIComponent(text), "_blank");
  };

  const handleSubmit = async () => {
    if (!fullName || !phone) {
      toast.error("Naam aur phone zaruri hai");
      return;
    }
    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const autoEmail = email || (cleanPhone ? cleanPhone + "@brother.com" : "reseller" + Date.now() + "@brother.com");
      const autoPassword = password || ("BM" + Math.floor(100000 + Math.random() * 900000));

      let userId = "res-" + Date.now();
      try {
        userId = await createAccount(autoEmail, autoPassword, {
          email: autoEmail,
          fullName: fullName,
          phone: phone,
          role: "reseller",
        });
      } catch (authErr: any) {
        console.warn("Auth creation fallback:", authErr);
      }

      const resellerData = {
        userId,
        fullName,
        phone,
        email: autoEmail,
        totalCommission: 0,
        pendingCommission: 0,
        totalReferrals: 0,
        status: "active" as const,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "resellers"), resellerData);

      setShareCredsUser({
        name: fullName,
        email: autoEmail,
        password: autoPassword,
        role: "reseller",
        phone: phone,
      });

      toast.success("Reseller account create ho gaya!");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/resellers">
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Add New Reseller</h1>
          <p className="text-sm text-muted-foreground">Create reseller/referrer account</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Reseller Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              placeholder="Reseller ka naam"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="03XX-XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email (Optional - Auto-generated if blank)</Label>
            <Input
              type="email"
              placeholder="e.g. reseller@brother.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Password (Optional - Auto-generated if blank)</Label>
            <Input
              type="text"
              placeholder="Custom password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full gradient-primary gap-2"
            size="lg"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{" "}
            Add Reseller
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!shareCredsUser} onOpenChange={(open) => {
        if (!open) {
          setShareCredsUser(null);
          router.push("/dashboard/resellers");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Key className="w-5 h-5" />
              Credentials Created!
            </DialogTitle>
            <DialogDescription>
              Reseller account ban chuka hai. Yeh login details reseller ke sath share karein:
            </DialogDescription>
          </DialogHeader>

          {shareCredsUser && (
            <div className="bg-accent/40 p-4 rounded-xl space-y-2.5 border text-sm font-mono my-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-bold">{shareCredsUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-bold">{shareCredsUser.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email/Login:</span>
                <span className="font-bold text-primary">{shareCredsUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Password:</span>
                <span className="font-bold text-emerald-500">{shareCredsUser.password || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-semibold uppercase text-xs">Reseller</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => handleCopyCredentials(shareCredsUser)}
            >
              <Copy className="w-4 h-4" /> Copy Credentials
            </Button>
            <Button
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleShareWhatsApp(shareCredsUser)}
            >
              <Share2 className="w-4 h-4" /> Share via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
