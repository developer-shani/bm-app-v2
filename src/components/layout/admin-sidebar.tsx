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
  Zap,
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
  { title: "New Sale", href: "/dashboard/customers/new", icon: Plus, color: "text-emerald-500 bg-emerald-500/10" },
  { title: "Add Recovery", href: "/dashboard/recovery", icon: CreditCard, color: "text-teal-500 bg-teal-500/10" },
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
      <div className="flex items-center gap-3.5 h-[72px] px-5 border-b border-border/40 shrink-0">
        <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 shadow-lg shadow-emerald-500/30 shrink-0">
          <Smartphone className="w-5 h-5 text-white" />
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-card ring-2 ring-emerald-400/40 animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-extrabold tracking-tight whitespace-nowrap flex items-center gap-1.5 font-heading">
            Brother <span className="gradient-text">Mobiles</span>
          </h2>
          <p className="text-[11px] text-muted-foreground font-semibold whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            POS & Sales OS
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pt-4 pb-2 space-y-2 shrink-0">
        <div className="flex items-center justify-between px-1 mb-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quick Actions</p>
          <Zap className="w-3 h-3 text-emerald-400 animate-bounce" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} onClick={onLinkClick}>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-1.5 h-9 text-[11px] font-bold border-border/60 bg-card/60 backdrop-blur-md hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/40 rounded-xl shadow-xs transition-all"
              >
                <action.icon className="w-3.5 h-3.5" />
                {action.title}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 py-1 shrink-0">
        <Separator className="opacity-40" />
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-3 py-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">Main Menu</p>
        <nav className="space-y-1">
          {sidebarLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname?.startsWith(link.href));

            return (
              <Link key={link.href} href={link.href} onClick={onLinkClick}>
                <div
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-200 relative",
                    isActive
                      ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-500 dark:text-emerald-400 shadow-sm border border-emerald-500/25"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground border border-transparent"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500" />
                  )}
                  <div className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-lg transition-transform group-hover:scale-110",
                    isActive ? "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400" : "bg-muted/50 group-hover:bg-accent"
                  )}>
                    <link.icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                  </div>
                  <span className="whitespace-nowrap">{link.title}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer System Status */}
      <div className="px-4 py-3 border-t border-border/30 shrink-0">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Live System Sync</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-600/80 dark:text-emerald-400/80 bg-emerald-500/15 px-1.5 py-0.5 rounded font-bold">ONLINE</span>
        </div>
      </div>
    </>
  );
}


export function AdminSidebar({ mobileOpen, onCloseMobile }: AdminSidebarProps) {
  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[265px] glass-sidebar flex-col">
        <SidebarContent />
      </aside>

      {/* ===== MOBILE DRAWER ===== */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md md:hidden"
            onClick={onCloseMobile}
          />
          {/* Drawer */}
          <aside className="fixed left-0 top-0 z-[70] h-screen w-[285px] bg-card/95 backdrop-blur-2xl border-r border-border/50 shadow-2xl flex flex-col md:hidden animate-slide-in-left">
            {/* Close button */}
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-3 z-10 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
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

