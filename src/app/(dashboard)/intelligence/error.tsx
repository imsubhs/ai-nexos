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
      <Card className="max-w-md bg-surface-1/80 border-border-subtle shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mx-auto border border-destructive/20">
            <AlertCircle className="size-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground-heading">
              Unable to Load Executive Intelligence
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              An error occurred while compiling organizational metrics. Operational data remains intact.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button onClick={() => reset()} size="sm" variant="default" className="gap-1.5 h-8 text-xs">
              <RotateCcw className="size-3.5" />
              <span>Retry Calculation</span>
            </Button>
            <Button render={<Link href="/dashboard" />} size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
              <Home className="size-3.5" />
              <span>Mission Control</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
