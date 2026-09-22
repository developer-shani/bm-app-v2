"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn, appUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email aur password dono zaruri hain");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || "Login me masla aya");
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  };

  const [autoLoginDone, setAutoLoginDone] = useState(false);

  useEffect(() => {
    if (appUser) {
      if (appUser.role === "investor") {
        router.push("/investor/portal");
      } else if (appUser.role === "reseller") {
        router.push("/reseller/portal");
      } else {
        router.push("/dashboard");
      }
    }
  }, [appUser, router]);

  // Read auto-login params from URL query string
  useEffect(() => {
    if (typeof window !== "undefined" && !autoLoginDone && !appUser) {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlEmail = params.get("email") || params.get("u");
        const urlPassword = params.get("password") || params.get("p");

        if (urlEmail) {
          setAutoLoginDone(true);
          setEmail(urlEmail);
          if (urlPassword) {
            setPassword(urlPassword);
            setIsLoading(true);
            setError("");
            signIn(urlEmail, urlPassword)
              .catch((err: any) => {
                setError(err?.message || "Credentials fill ho gaye hain. Sign In button par click karein.");
              })
              .finally(() => {
                setIsLoading(false);
              });
          }
        }
      } catch (e) {
        console.warn("Auto-login URL parse error:", e);
      }
    }
  }, [appUser, autoLoginDone, signIn]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden selection:bg-emerald-500/30">
      {/* Dynamic Ambient Background Orbs & Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-teal-500/15 blur-[130px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[150px]" />
        
        {/* Subtle grid mesh */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="w-full max-w-[440px] animate-page relative z-10 space-y-6">
        {/* Logo & Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex relative items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/20">
            <Smartphone className="w-8 h-8 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-background ring-2 ring-emerald-400/40 animate-ping" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-heading mt-3">
            Brother <span className="gradient-text">Mobiles</span>
          </h1>
          <p className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1.5 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Installment Sales & Business OS
          </p>
        </div>

        {/* Login Card */}
        <Card className="glass-card border-border/50 overflow-hidden shadow-2xl backdrop-blur-2xl">
          {/* Glowing Top Ambient Line */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          
          <CardHeader className="space-y-1 pb-2 pt-6 text-center">
            <CardTitle className="text-2xl font-bold font-heading">Welcome Back</CardTitle>
            <CardDescription className="text-xs font-medium">
              Aap apne credentials enter karke login karein
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <div className="bg-destructive/15 border border-destructive/30 text-destructive text-xs rounded-xl p-3.5 animate-page font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@brothermobiles.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-muted/30 border-border/60 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-muted/30 border-border/60 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 text-xs font-bold tracking-wider uppercase gradient-primary rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all gap-2 group mt-2"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            256-Bit Encrypted
          </span>
          <span>Brother Mobiles &copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}

