import { Skeleton } from "@/components/ui/skeleton";

export default function MyAttendanceLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-4 rounded-xl border p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
