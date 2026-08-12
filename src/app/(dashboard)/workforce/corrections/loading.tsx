import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="mb-2 h-8 w-52" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="space-y-3 rounded-xl border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
