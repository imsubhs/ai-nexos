"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthError({
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Sign-in is unavailable</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        An unexpected error occurred. Please try again in a moment.
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
