"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardGroupError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        An unexpected error occurred while loading this page. You can try again;
        if the problem persists, contact your workspace administrator.
        {error.digest && (
          <span className="mt-2 block font-mono text-xs">
            Ref: {error.digest}
          </span>
        )}
      </p>
      <Button onClick={() => unstable_retry()}>Try again</Button>
    </div>
  );
}
