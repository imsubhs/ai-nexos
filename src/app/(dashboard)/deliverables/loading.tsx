import { Skeleton } from "@/components/ui/skeleton";

export default function DeliverablesLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-full max-w-96" />
      </div>
      <div className="rounded-xl border p-4 space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
