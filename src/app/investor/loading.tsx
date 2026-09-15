import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function InvestorLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar skeleton */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="pulse-card-glow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="w-10 h-10 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-40 mb-4" />
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3 p-3 rounded-xl border border-border/30">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
