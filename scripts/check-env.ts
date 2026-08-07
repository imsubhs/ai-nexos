/**
 * `npm run env:check` — validate the local environment without starting the app.
 *
 * Same validation the server runs at boot (src/instrumentation.ts), reachable
 * before `npm run dev` and usable in a deploy pipeline as a pre-flight step.
 * Prints names and states, never values.
 *
 * Exit codes: 0 valid · 1 invalid.
 */

import { config as loadEnv } from "dotenv";

// Next loads .env.local natively; a standalone script does not.
// First file wins for duplicate keys, so .env.local takes precedence.
loadEnv({ path: [".env.local", ".env"], quiet: true });

// `--production` checks the stricter rules without needing a production shell.
// NODE_ENV is typed read-only, so assign through the record rather than the
// declared property.
if (process.argv.includes("--production")) {
  (process.env as Record<string, string>).NODE_ENV = "production";
}

async function main(): Promise<number> {
  const { ENV_MANIFEST, assertProductionConfig, getEnvDiagnostics } =
    await import("../src/lib/env.server");

  const mode = process.env.NODE_ENV ?? "development";
  console.log(`\nAI NEX OS — environment check (${mode})\n`);

  try {
    assertProductionConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(
      "\n✖ Invalid. The server would refuse to start with this configuration.\n",
    );
    return 1;
  }

  const diagnostics = getEnvDiagnostics();
  const configured = new Set(diagnostics.configured);

  const width = Math.max(...ENV_MANIFEST.map((spec) => spec.name.length));
  for (const spec of ENV_MANIFEST) {
    if (spec.name === "NODE_ENV") continue;
    const set = configured.has(spec.name);
    const state = set
      ? "set"
      : spec.requirement === "optional" || spec.requirement === "tooling"
        ? "using fallback"
        : spec.requirement === "development"
          ? "off"
          : "NOT SET";
    console.log(
      `  ${set ? "✓" : "·"} ${spec.name.padEnd(width)}  ${spec.requirement.padEnd(11)}  ${state}`,
    );
  }

  for (const warning of diagnostics.warnings) console.log(`\n  ! ${warning}`);

  console.log(
    `\n✓ Valid for ${mode}. Re-run with --production to check the stricter production rules.\n`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    // A throw here is the validation failing, which is the point of the script.
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\n✖ Invalid.\n");
    process.exit(1);
  },
);
