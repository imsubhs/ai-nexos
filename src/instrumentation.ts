/**
 * Startup instrumentation (Next 16 file convention).
 *
 * `register()` runs once per server process, before the first request is
 * handled. Validating configuration here is the difference between a
 * misconfigured deployment that boots and then fails one request at a time with
 * an opaque third-party error, and one that refuses to start with every missing
 * variable named at once.
 */

export async function register(): Promise<void> {
  // The Edge runtime gets a curated subset of process.env and never touches the
  // database or signing secrets; validating the full server schema there would
  // report false failures.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // `next build` spawns prerender workers that also run this hook. Build must
  // not require runtime secrets — see docs/deployment.md ("Build vs boot").
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertProductionConfig, getEnvDiagnostics } =
    await import("@/lib/env.server");

  // Throws with every problem listed. Deliberately not caught: a process that
  // cannot be configured correctly should not accept traffic.
  assertProductionConfig();

  const diagnostics = getEnvDiagnostics();

  const services = Object.entries(diagnostics.services)
    .map(([name, state]) => `${name}=${state === "configured" ? "on" : "off"}`)
    .join(" · ");

  console.info(
    `[env] AI NEX OS · ${diagnostics.nodeEnv}${diagnostics.demoMode ? " · DEMO" : ""} · ${services}`,
  );

  if (diagnostics.usingFallback.length > 0) {
    console.info(
      `[env] using documented fallbacks for: ${diagnostics.usingFallback.join(", ")}`,
    );
  }

  for (const warning of diagnostics.warnings) {
    console.warn(`[env] ${warning}`);
  }
}
