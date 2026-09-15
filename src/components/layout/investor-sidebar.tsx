"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Wallet,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  Smartphone,
  X,
  Sparkles,
  LogOut,
  Sun,
  Moon,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const sidebarSections = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", id: "dashboard", icon: LayoutDashboard },
      { title: "My Investment", id: "investment", icon: Wallet },
      { title: "Profit Summary", id: "profit", icon: TrendingUp },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { title: "My Customers", id: "customers", icon: Users },
      { title: "Expenses", id: "expenses", icon: Receipt },
    ],
  },
  {
    label: "Transactions",
    items: [
      { title: "Add Investment", id: "add-investment", icon: ArrowDownToLine },
      { title: "Withdraw Funds", id: "withdraw", icon: ArrowUpFromLine },
      { title: "Notifications", id: "notifications", icon: Bell },
    ],
  },
];

interface InvestorSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  investorName?: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

function SidebarContent({
  activeSection,
  onSectionChange,
  investorName,
  onLinkClick,
  onSignOut,
}: {
  activeSection: string;
  onSectionChange: (s: string) => void;
  investorName?: string;
  onLinkClick?: () => void;
  onSignOut: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Brand Header */}
      <div className="flex items-center gap-3 h-[68px] px-5 border-b border-border/30 shrink-0">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 shrink-0">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight whitespace-nowrap">
            {investorName || "Investor Portal"}
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Investment Dashboard
          </p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        {sidebarSections.map((section, idx) => (
          <div key={section.label} className={cn(idx > 0 && "mt-4")}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
              {section.label}
            </p>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSectionChange(item.id);
                      onLinkClick?.();
                    }}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 w-full text-left relative",
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
                      <item.icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                    </div>
                    <span className="whitespace-nowrap">{item.title}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/30 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex-1 justify-start gap-2 h-8 text-xs rounded-lg"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

export function InvestorSidebar({
  activeSection,
  onSectionChange,
  investorName,
  mobileOpen,
  onCloseMobile,
  onSignOut,
}: InvestorSidebarProps) {
  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[260px] glass-sidebar flex-col">
        <SidebarContent
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          investorName={investorName}
          onSignOut={onSignOut}
        />
      </aside>

      {/* ===== MOBILE DRAWER ===== */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={onCloseMobile}
          />
          <aside className="fixed left-0 top-0 z-[70] h-screen w-[280px] bg-card border-r border-border/40 shadow-2xl flex flex-col md:hidden animate-slide-in-left">
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-3 z-10 w-8 h-8 rounded-xl bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent
              activeSection={activeSection}
              onSectionChange={onSectionChange}
              investorName={investorName}
              onLinkClick={onCloseMobile}
              onSignOut={onSignOut}
            />
          </aside>
        </>
      )}
    </>
  );
}
