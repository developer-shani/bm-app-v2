"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, Moon, Sun, User, Settings, Menu, Shield, Search, Command, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const { appUser, signOut } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const initials = appUser?.fullName
    ? appUser.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 sm:px-6 shadow-xs">
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="md:hidden h-9 w-9 rounded-xl border border-border/40"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </Button>
        )}

        <div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 font-heading">
            {appUser?.fullName ? `Welcome, ${appUser.fullName.split(" ")[0]}` : "Dashboard"}
            <span className="hidden sm:inline-flex text-[10px] bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/25">
              <Shield className="w-2.5 h-2.5 mr-1 text-emerald-500" />
              Admin Access
            </span>
          </h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
            {new Date().toLocaleDateString("en-PK", {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Quick Search Input preview */}
      <div className="hidden lg:flex items-center relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search customer, IMEI, phone..."
          className="pl-9 pr-12 h-9 bg-muted/30 border-border/50 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/60">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick Reset Data Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/settings")}
          className="hidden sm:flex items-center gap-1.5 text-xs h-9 px-2.5 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-semibold rounded-xl"
          title="Reset Test Data (PIN: 8208)"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Test Data</span>
        </Button>
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 rounded-xl border border-border/40 hover:bg-accent/80 transition-all"
          title="Toggle Theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-emerald-400" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border/40 relative hover:bg-accent/80 transition-all">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-background animate-pulse" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1 p-0 focus-visible:ring-2 focus-visible:ring-primary/30">
              <Avatar className="h-9 w-9 ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-background transition-transform hover:scale-105">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-2xl p-2 glass-card" align="end" forceMount>
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold">{appUser?.fullName || "Admin"}</p>
                <p className="text-xs text-muted-foreground font-mono">{appUser?.email || ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 opacity-50" />
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")} className="rounded-xl cursor-pointer text-xs font-medium py-2">
              <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />
              Settings & Preferences
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")} className="rounded-xl cursor-pointer text-xs font-medium py-2 text-red-600 dark:text-red-400">
              <Shield className="mr-2.5 h-4 w-4 text-red-500" />
              Reset Test Data (PIN: 8208)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard")} className="rounded-xl cursor-pointer text-xs font-medium py-2">
              <User className="mr-2.5 h-4 w-4 text-muted-foreground" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 opacity-50" />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive rounded-xl cursor-pointer text-xs font-semibold py-2">
              <LogOut className="mr-2.5 h-4 w-4" />
              Logout System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


