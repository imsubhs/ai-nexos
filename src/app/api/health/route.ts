import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";
import { getEnvDiagnostics, isDemoMode } from "@/lib/env.server";

/**
 * Liveness/readiness probe.
 *
 * Unauthenticated, and reachable on both domains — an uptime monitor cannot
 * hold a session. That makes it the one endpoint an anonymous scanner is
 * guaranteed to reach, so what it says matters.
 *
 * Values were never included, but *names* were: the full list of configured
 * and fallback-using variables told an outsider precisely which integrations
 * exist and which are unwired — "redis: not-configured" says rate limits are
 * per-instance, "storage: not-configured" says uploads are not real yet. That
 * is a reconnaissance map, and it is now withheld in production.
 *
 * Outside production the detail is kept, because that is where an operator
 * actually uses it, and the boot log carries the same information anyway.
 */
export async function GET() {
  const isProduction = process.env.NODE_ENV === "production";

  let diagnostics;
  try {
    diagnostics = getEnvDiagnostics();
  } catch (error) {
    // A probe that throws tells an operator nothing. Report the
    // misconfiguration as the payload instead, with a status a monitor can
    // alert on — but in production report only that it happened. The message
    // enumerates missing variables by name.
    return NextResponse.json(
      {
        status: "misconfigured",
        ...(isProduction
          ? {}
          : {
              detail: error instanceof Error ? error.message : String(error),
            }),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      status: "healthy",
      version: "1.0.0",
      buildNumber: publicEnv.NEXT_PUBLIC_BUILD_NUMBER || "local-dev",
      environment: diagnostics.nodeEnv,
      // Enough for a monitor to alert on, and nothing an attacker can plan
      // around. isDemoMode() is false in production by construction.
      ...(isProduction
        ? {}
        : {
            demoMode: isDemoMode(),
            framework: "Next.js",
            services: diagnostics.services,
            usingFallback: diagnostics.usingFallback,
          }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
