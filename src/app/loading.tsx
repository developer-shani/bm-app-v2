import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/15">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Loading...</p>
        <p className="text-xs text-muted-foreground mt-1">Brother Mobiles Manager</p>
      </div>
    </div>
  );
}
