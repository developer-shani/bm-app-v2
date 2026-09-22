import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "glow" | "gold";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variants: Record<string, string> = {
    default: "border-transparent bg-primary/15 text-primary ring-1 ring-primary/25 shadow-sm",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive/15 text-destructive ring-1 ring-destructive/30 shadow-sm",
    outline: "border-border/60 text-foreground bg-background/50 backdrop-blur-sm",
    success: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25",
    warning: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25",
    glow: "border-transparent bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]",
    gold: "border-transparent bg-amber-400/15 text-amber-500 ring-1 ring-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.25)]",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };

