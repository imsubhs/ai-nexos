import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Skeleton className="mb-2 h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="space-y-1 rounded-xl border p-4">
        {Array.from({ length: 6 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, day) => (
              <Skeleton key={day} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
