import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InternalNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center">
      <h2 className="text-xl font-semibold">Not found</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      <Button variant="outline" render={<Link href="/dashboard" />}>
        Back to dashboard
      </Button>
    </div>
  );
}
