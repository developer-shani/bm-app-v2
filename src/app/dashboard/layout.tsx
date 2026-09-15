"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appUser, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!appUser) {
        router.push("/");
      } else if (appUser.role === "investor") {
        router.push("/investor/portal");
      } else if (appUser.role === "reseller") {
        router.push("/reseller/portal");
      }
    }
  }, [appUser, loading, router]);

  if (loading || !appUser || appUser.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">Verifying permissions...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Desktop sidebar */}
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main content area */}
      <div className="pl-0 md:pl-[260px] min-h-screen flex flex-col pb-[80px] md:pb-0">
        <AdminHeader onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav onMenuToggle={() => setMobileOpen(!mobileOpen)} />
    </div>
  );
}
