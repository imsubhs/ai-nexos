import { Skeleton } from "@/components/ui/skeleton";

export default function AttendanceHistoryLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="mb-2 h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
