import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";
import { getEnvDiagnostics, isDemoMode } from "@/lib/env.server";

/**
 * Liveness/readiness probe.
 *
 * Reports which services are wired up and which documented fallbacks are in
 * effect — names only. Values are never included: this response is scraped by
 * uptime monitors and ends up in logs.
 */
export async function GET() {
  let diagnostics;
  try {
    diagnostics = getEnvDiagnostics();
  } catch (error) {
    // A probe that throws tells an operator nothing. Report the misconfiguration
    // as the payload instead, with a status a monitor can alert on.
    return NextResponse.json(
      {
        status: "misconfigured",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: "healthy",
    demoMode: isDemoMode(),
    version: "1.0.0",
    environment: diagnostics.nodeEnv,
    buildNumber: publicEnv.NEXT_PUBLIC_BUILD_NUMBER || "local-dev",
    framework: "Next.js",
    services: diagnostics.services,
    usingFallback: diagnostics.usingFallback,
  });
}
