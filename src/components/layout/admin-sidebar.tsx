"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Handshake,
  CreditCard,
  BarChart3,
  Settings,
  Smartphone,
  Plus,
  Bell,
  AlertTriangle,
  UserCheck,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";

const sidebarLinks = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "All Customers", href: "/dashboard/customers", icon: Users },
  { title: "All Investors", href: "/dashboard/investors", icon: Wallet },
  { title: "All Resellers", href: "/dashboard/resellers", icon: Handshake },
  { title: "Users & Partners", href: "/dashboard/users", icon: UserCheck },
  { title: "Recovery", href: "/dashboard/recovery", icon: CreditCard },
  { title: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { title: "Approvals", href: "/dashboard/approvals", icon: UserCheck },
  { title: "Losses", href: "/dashboard/losses", icon: AlertTriangle },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { title: "Delete History", href: "/dashboard/trash", icon: Trash2 },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const quickActions = [
  { title: "New Sale", href: "/dashboard/customers/new", icon: Plus },
  { title: "Add Recovery", href: "/dashboard/recovery", icon: CreditCard },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Brand Header */}
      <div className="flex items-center gap-3 h-[68px] px-5 border-b border-border/30 shrink-0">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 shrink-0">
          <Smartphone className="w-5 h-5 text-white" />
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-card" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight whitespace-nowrap">Brother Mobiles</h2>
          <p className="text-[10px] text-muted-foreground font-medium whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Sales Manager
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pt-4 pb-2 space-y-1.5 shrink-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">Quick Actions</p>
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} onClick={onLinkClick}>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2.5 h-9 text-xs border-dashed border-primary/25 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/40 rounded-xl"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/10">
                <action.icon className="w-3 h-3" />
              </div>
              {action.title}
            </Button>
          </Link>
        ))}
      </div>

      <div className="px-4 shrink-0">
        <Separator className="opacity-50" />
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-3 py-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Navigation</p>
        <nav className="space-y-0.5">
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname?.startsWith(link.href));

            return (
              <Link key={link.href} href={link.href} onClick={onLinkClick}>
                <div
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 relative",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                  )}
                  <div className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                    isActive ? "bg-primary/15" : "bg-transparent group-hover:bg-accent"
                  )}>
                    <link.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                  </div>
                  <span className="whitespace-nowrap">{link.title}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 shrink-0">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-medium">System Online</span>
        </div>
      </div>
    </>
  );
}

export function AdminSidebar({ mobileOpen, onCloseMobile }: AdminSidebarProps) {
  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[260px] glass-sidebar flex-col">
        <SidebarContent />
      </aside>

      {/* ===== MOBILE DRAWER ===== */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onCloseMobile}
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 z-[70] h-screen w-[280px] bg-card border-r border-border/40 shadow-2xl flex flex-col md:hidden animate-slide-in-left">
            {/* Close button */}
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-3 z-10 w-8 h-8 rounded-xl bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent onLinkClick={onCloseMobile} />
          </aside>
        </>
      )}
    </>
  );
}
