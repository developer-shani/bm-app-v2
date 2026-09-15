"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Plus,
  CreditCard,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  onMenuToggle: () => void;
}

export function MobileBottomNav({ onMenuToggle }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Home",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Customers",
      href: "/dashboard/customers",
      icon: Users,
    },
    {
      title: "New Sale",
      href: "/dashboard/customers/new",
      icon: Plus,
      isAction: true,
    },
    {
      title: "Recovery",
      href: "/dashboard/recovery",
      icon: CreditCard,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      {/* Glass background with safe area */}
      <div className="bg-card/85 backdrop-blur-2xl border-t border-border/40 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-4 rounded-xl transition-all duration-200 text-[11px] font-medium min-w-[56px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-xl mb-0.5 transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className={cn("w-[18px] h-[18px]", isActive && "stroke-[2.5px]")} />
                </div>
                <span>{item.title}</span>
              </Link>
            );
          })}

          {/* Prominent Center Action Button for New Sale */}
          <Link
            href="/dashboard/customers/new"
            className="flex flex-col items-center justify-center -mt-6"
          >
            <div className="w-[52px] h-[52px] rounded-2xl gradient-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform ring-4 ring-card">
              <Plus className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <span className="text-[10px] font-semibold text-primary mt-1">New Sale</span>
          </Link>

          {/* Right Items: Recovery & Menu */}
          {navItems.slice(3).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-4 rounded-xl transition-all duration-200 text-[11px] font-medium min-w-[56px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-xl mb-0.5 transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className={cn("w-[18px] h-[18px]", isActive && "stroke-[2.5px]")} />
                </div>
                <span>{item.title}</span>
              </Link>
            );
          })}

          {/* Menu Toggle Button */}
          <button
            onClick={onMenuToggle}
            type="button"
            className="flex flex-col items-center justify-center py-1.5 px-4 rounded-xl transition-all duration-200 text-[11px] font-medium text-muted-foreground hover:text-foreground active:scale-95 min-w-[56px]"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl mb-0.5">
              <Menu className="w-[18px] h-[18px]" />
            </div>
            <span>Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
