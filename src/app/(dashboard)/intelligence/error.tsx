"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ExecutiveIntelligenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors safely
    console.error("Executive Intelligence Console Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <Card className="bg-surface-1/80 border-border-subtle max-w-md shadow-md">
        <CardContent className="space-y-4 p-6">
          <div className="bg-destructive/10 text-destructive border-destructive/20 mx-auto flex size-12 items-center justify-center rounded-full border">
            <AlertCircle className="size-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-foreground-heading text-base font-semibold">
              Unable to Load Executive Intelligence
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              An error occurred while compiling organizational metrics.
              Operational data remains intact.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              onClick={() => reset()}
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" />
              <span>Retry Calculation</span>
            </Button>
            <Button
              render={<Link href="/dashboard" />}
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
            >
              <Home className="size-3.5" />
              <span>Mission Control</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
