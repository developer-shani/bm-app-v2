import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-page relative">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-2xl px-5 py-3 text-xs font-medium text-primary">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Dashboard sync ho raha hai...</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-xl" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="pulse-card-glow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2.5 flex-1">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-7 w-32 rounded-lg" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-11 w-11 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((col) => (
          <Card key={col}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-7 w-16 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <Skeleton className="h-3.5 w-20 rounded-md ml-auto" />
                    <Skeleton className="h-3 w-16 rounded-md ml-auto" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
