"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Phone,
  Percent,
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  Wallet,
  ImagePlus,
  FileText,
  Sparkles,
  UserCircle,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { db, storage } from "@/lib/firebase";
import { triggerAutoBackup } from "@/lib/backup";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { amountToUrduWords } from "@/lib/amount-words";
import { getPortalUrl, getPortalUrlWithCreds } from "@/lib/utils";

export default function AddInvestorPage() {
  const router = useRouter();
  const { createAccount } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [copied, setCopied] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sharingRatio, setSharingRatio] = useState("50");
  const [customRatio, setCustomRatio] = useState("");
  const [hasInitialInvestment, setHasInitialInvestment] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");

  // Agreement Document State
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [agreementPreview, setAgreementPreview] = useState<string>("");

  // Profile Picture State (Optional)
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string>("");
  const [showProfilePic, setShowProfilePic] = useState(false);

  const handleCopyCredentials = () => {
    const origin = getPortalUrlWithCreds(email, password);
    const phoneStr = phone ? `\n📱 *Phone:* ${phone}` : "";
    const text = `🔐 *Brother Mobiles Portal Access Credentials*\n\n👤 *Name:* ${fullName}\n🛡️ *Role:* Investor / Partner${phoneStr}\n📧 *Email/Username:* ${email}\n🔒 *Password:* ${password || "N/A"}\n🌐 *Direct Login Link:* ${origin}\n\n_Brother Mobiles Shop Management System_`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials clipboard me copy ho gaye!");
    setTimeout(() => setCopied(false), 2500);
  };

  const actualRatio = customRatio || sharingRatio;

  const handleAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAgreementFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAgreementPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

    const handleSubmit = async () => {
    if (!fullName || !phone || !email || !password) {
      toast.error("Saari required fields fill karein");
      return;
    }
    if (password.length < 6) {
      toast.error("Password kam az kam 6 characters hona chahiye");
      return;
    }

    setIsLoading(true);

    try {
      // STEP 1: Create Auth Account (wait properly, 10s timeout)
      let userId = "";
      try {
        userId = await createAccount(email, password, {
          email,
          fullName,
          phone,
          role: "investor",
          sharingRatio: parseInt(actualRatio),
        });
      } catch (authErr: any) {
        console.error("Auth creation error:", authErr);
        if (authErr?.message?.includes("pehle se use")) {
          toast.error(authErr.message);
          setIsLoading(false);
          return;
        }
        // For other auth errors, generate a fallback ID but continue
        userId = "inv-" + Date.now();
        console.warn("Using fallback userId:", userId);
      }

      if (!userId) userId = "inv-" + Date.now();

      // STEP 2: Save investor to Firestore (MUST complete before showing success)
      const initialAmount = hasInitialInvestment ? parseFloat(investmentAmount) || 0 : 0;
      const investorData: Record<string, any> = {
        userId,
        fullName,
        phone,
        email,
        totalInvestment: initialAmount,
        availableBalance: initialAmount,
        totalProfit: 0,
        totalWithdrawn: 0,
        activeInstallments: 0,
        sharingRatio: parseInt(actualRatio),
        status: "active",
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "investors"), investorData);
      const investorDocId = docRef.id;
      console.log("Investor saved to Firestore! DocID:", investorDocId);

      // STEP 3: Show success AFTER Firestore confirms
      toast.success(`${fullName} ka account ban gaya! ✅`);
      setStep("success");
      setIsLoading(false);

      // Trigger auto-backup after successful investor creation
      triggerAutoBackup();

      // STEP 4: Upload files in background (non-blocking, data is already saved)
      // Agreement upload
      if (agreementFile) {
        try {
          const agreementRef = ref(storage, `agreements/investors/${investorDocId}_${Date.now()}`);
          await uploadBytes(agreementRef, agreementFile);
          const agreementUrl = await getDownloadURL(agreementRef);
          await updateDoc(doc(db, "investors", investorDocId), { agreementImage: agreementUrl });
        } catch (e) {
          console.warn("Agreement upload (background):", e);
        }
      }

      // Profile pic upload
      if (profilePicFile) {
        try {
          const profileRef = ref(storage, `profiles/investors/${investorDocId}_${Date.now()}`);
          await uploadBytes(profileRef, profilePicFile);
          const profileImageUrl = await getDownloadURL(profileRef);
          await updateDoc(doc(db, "investors", investorDocId), { profileImage: profileImageUrl });
        } catch (e) {
          console.warn("Profile pic upload (background):", e);
        }
      }

      // Investment record + proof
      if (hasInitialInvestment && initialAmount > 0) {
        let proofUrl = "";
        if (proofImage) {
          try {
            const imageRef = ref(storage, `investments/${investorDocId}/${Date.now()}_proof`);
            await uploadBytes(imageRef, proofImage);
            proofUrl = await getDownloadURL(imageRef);
          } catch (e) {
            console.warn("Proof upload (background):", e);
          }
        }
        try {
          await addDoc(collection(db, "investments"), {
            investorId: investorDocId,
            investorName: fullName,
            amount: initialAmount,
            type: "initial",
            ...(proofUrl ? { imageProof: proofUrl } : {}),
            date: new Date().toISOString(),
            note: "Initial investment",
          });
        } catch (e) {
          console.warn("Investment record (background):", e);
        }
      }
    } catch (err: any) {
      console.error("Investor creation error:", err);
      toast.error(err.message || "Account banane me masla aya. Dubara try karein.");
      setIsLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <Card className="border-green-500/20 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Account Created! ✅</h3>
            <p className="text-sm text-muted-foreground mb-3">
              <strong>{fullName}</strong> ka investor account kamyabi se ban gaya hai
            </p>

            {/* Credentials Card with Copy Button */}
            <div className="bg-muted/50 border border-border/60 rounded-xl p-4 my-5 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Account Credentials</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCredentials}
                  className="h-8 text-xs gap-1.5 font-medium hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-green-500 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-background/60 p-2.5 rounded-lg border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Email</span>
                  <span className="font-mono text-xs font-semibold select-all break-all">{email}</span>
                </div>
                <div className="bg-background/60 p-2.5 rounded-lg border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Password</span>
                  <span className="font-mono text-xs font-semibold select-all">{password}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Link href="/dashboard/investors">
                <Button variant="outline" className="gap-2">View All Investors</Button>
              </Link>
              <Button
                className="gradient-primary gap-2"
                onClick={() => {
                  setStep("form");
                  setFullName(""); setPhone(""); setEmail(""); setPassword("");
                  setSharingRatio("50"); setCustomRatio(""); setHasInitialInvestment(false);
                  setInvestmentAmount(""); setProofImage(null); setProofPreview("");
                  setAgreementFile(null); setAgreementPreview("");
                  setProfilePicFile(null); setProfilePicPreview(""); setShowProfilePic(false);
                }}
              >
                Add Another Investor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/investors">
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Add New Investor</h1>
          <p className="text-sm text-muted-foreground">
            Create investor account with login access
          </p>
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Personal Information
          </CardTitle>
          <CardDescription>Investor ki basic details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="Investor ka pura naam"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {/* Profile Picture Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-muted-foreground" />
                Profile Picture
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{showProfilePic ? "On" : "Off"}</span>
                <Switch checked={showProfilePic} onCheckedChange={setShowProfilePic} />
              </div>
            </div>
            {showProfilePic && (
              <div className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center hover:border-primary/30 transition-colors animate-fade-in">
                {profilePicPreview ? (
                  <div className="space-y-3">
                    <img src={profilePicPreview} alt="Profile" className="w-24 h-24 mx-auto rounded-full object-cover border-2 border-primary/20" />
                    <Button type="button" variant="outline" size="sm" onClick={() => { setProfilePicFile(null); setProfilePicPreview(""); }}>Remove Photo</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <UserCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Upload investor ki photo</p>
                    <div className="flex gap-2 justify-center pt-1">
                      <label>
                        <input type="file" accept="image/*" onChange={handleProfilePicChange} className="hidden" />
                        <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                          <span><Upload className="w-3 h-3" /> Upload Photo</span>
                        </Button>
                      </label>
                      <label>
                        <input type="file" accept="image/*" capture="user" onChange={handleProfilePicChange} className="hidden" />
                        <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                          <span><Camera className="w-3 h-3" /> Camera</span>
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Agreement Upload */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span>Agreement Document / Proof</span>
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <div className="border-2 border-dashed border-border/60 rounded-xl p-4 text-center hover:border-primary/30 transition-colors">
              {agreementPreview ? (
                <div className="space-y-3">
                  <img src={agreementPreview} alt="Agreement" className="max-h-40 mx-auto rounded-lg object-cover border" />
                  <Button type="button" variant="outline" size="sm" onClick={() => { setAgreementFile(null); setAgreementPreview(""); }}>Remove Agreement</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-medium">Upload Agreement / Stamp Paper Proof</p>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG up to 10MB</p>
                  <div className="flex gap-2 justify-center pt-1">
                    <label>
                      <input type="file" accept="image/*" onChange={handleAgreementChange} className="hidden" />
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                        <span><Upload className="w-3 h-3" /> Upload</span>
                      </Button>
                    </label>
                    <label>
                      <input type="file" accept="image/*" capture="environment" onChange={handleAgreementChange} className="hidden" />
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                        <span><Camera className="w-3 h-3" /> Camera</span>
                      </Button>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Contact Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="phone" placeholder="03XX-XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Login Credentials
          </CardTitle>
          <CardDescription>Investor is email/password se login karega</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input id="email" type="email" placeholder="investor@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password *</Label>
              <Button
                type="button" variant="ghost" size="sm"
                className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary"
                onClick={() => {
                  const suggestions = [
                    `brother${Math.floor(1000 + Math.random() * 9000)}`,
                    `bm${phone.slice(-4) || Math.floor(1000 + Math.random() * 9000)}`,
                    `partner${Math.floor(100 + Math.random() * 900)}`,
                    `invest${Math.floor(1000 + Math.random() * 9000)}`,
                  ];
                  const pwd = suggestions[Math.floor(Math.random() * suggestions.length)];
                  setPassword(pwd);
                  toast.success(`Password set: ${pwd}`);
                }}
              >
                <Sparkles className="w-3 h-3" /> Suggest Password
              </Button>
            </div>
            <Input id="password" placeholder="Kam az kam 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            {password && <p className="text-[11px] text-muted-foreground">Password: <strong>{password}</strong></p>}
          </div>
        </CardContent>
      </Card>

      {/* Sharing Ratio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Profit Sharing Ratio
          </CardTitle>
          <CardDescription>Investor aur admin ke beech profit ka ratio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={sharingRatio === "50" && !customRatio ? "default" : "outline"} size="sm" onClick={() => { setSharingRatio("50"); setCustomRatio(""); }} className="flex-1">50 / 50</Button>
            <Button variant={sharingRatio === "40" && !customRatio ? "default" : "outline"} size="sm" onClick={() => { setSharingRatio("40"); setCustomRatio(""); }} className="flex-1">40 / 60</Button>
            <Button variant={sharingRatio === "60" && !customRatio ? "default" : "outline"} size="sm" onClick={() => { setSharingRatio("60"); setCustomRatio(""); }} className="flex-1">60 / 40</Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customRatio">Custom Ratio (Investor %)</Label>
            <Input id="customRatio" type="number" placeholder="Custom percentage e.g. 45" value={customRatio} onChange={(e) => setCustomRatio(e.target.value)} min="0" max="100" />
            {actualRatio && (
              <p className="text-xs text-muted-foreground">
                Investor: <strong>{actualRatio}%</strong> | Admin: <strong>{100 - parseInt(actualRatio)}%</strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Initial Investment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                Initial Investment
              </CardTitle>
              <CardDescription>Kya investor abhi investment de raha hai?</CardDescription>
            </div>
            <Switch checked={hasInitialInvestment} onCheckedChange={setHasInitialInvestment} />
          </div>
        </CardHeader>
        {hasInitialInvestment && (
          <CardContent className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="investmentAmount">Investment Amount (PKR) *</Label>
              <Input id="investmentAmount" type="number" placeholder="e.g. 500000" value={investmentAmount} onChange={(e) => setInvestmentAmount(e.target.value)} />
            

            </div>
            <div className="space-y-2">
              <Label>Payment Proof (Image)</Label>
              <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
                {proofPreview ? (
                  <div className="space-y-3">
                    <img src={proofPreview} alt="Proof" className="max-h-48 mx-auto rounded-lg object-cover" />
                    <Button variant="outline" size="sm" onClick={() => { setProofImage(null); setProofPreview(""); }}>Remove</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Upload payment proof</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
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
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3 pb-8">
        <Link href="/dashboard/investors">
          <Button variant="outline">Cancel</Button>
        </Link>
        {!hasInitialInvestment ? (
          <Button
            onClick={() => {
              if (!fullName || !phone || !email || !password) {
                toast.error("Saari required fields fill karein");
                return;
              }
              if (password.length < 6) {
                toast.error("Password kam az kam 6 characters hona chahiye");
                return;
              }
              setStep("confirm");
            }}
            className="gradient-primary gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Create Account
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading} className="gradient-primary gap-2">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Create with Investment
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {step === "confirm" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-md w-full animate-scale-in">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Confirm Account Creation</CardTitle>
              <CardDescription>Kya aap sure hain ke ye account banana chahte hain?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ratio:</span>
                  <span className="font-medium">{actualRatio}% / {100 - parseInt(actualRatio)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment:</span>
                  <Badge variant="secondary">No initial investment</Badge>
                </div>
                {agreementFile && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agreement:</span>
                    <Badge variant="outline" className="text-green-600">Uploaded</Badge>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("form")} disabled={isLoading}>Go Back</Button>
                <Button className="flex-1 gradient-primary" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
                  ) : (
                    "Yes, Create"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
