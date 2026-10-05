import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ExecutiveIntelligenceLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8 pb-12">
      {/* Top Header Bar Skeleton */}
      <div className="border-border-subtle flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Pulse 12-Card Grid Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-48 rounded" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="bg-surface-1/40 border-border-subtle">
              <CardContent className="space-y-2 p-3.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Queue Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-56 rounded" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="bg-surface-1/40 border-border-subtle h-36">
              <CardContent className="space-y-2.5 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Health Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-52 rounded" />
        <Card className="bg-surface-1/40 border-border-subtle h-24">
          <CardContent className="flex items-center justify-between p-4">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-surface-1/40 border-border-subtle h-40">
              <CardContent className="space-y-2 p-3.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
