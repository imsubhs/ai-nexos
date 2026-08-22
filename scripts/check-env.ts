/**
 * `npm run env:check` — validate an environment without starting the app.
 *
 * Same validation the server runs at boot (src/instrumentation.ts), reachable
 * before `npm run dev` and usable in a deploy pipeline as a pre-flight step.
 * Prints names and states, never values.
 *
 *   npm run env:check                                    presence only, local
 *   npm run env:check -- --environment=staging --verify  staging, connects
 *   npm run env:check -- --production --verify           production, connects
 *
 * `--verify` opens REAL connections, so it requires the target to be named.
 * Without that rule a developer checking staging would have verified
 * production instead, reported it green, and learned nothing about staging —
 * the class of failure this phase exists to remove.
 *
 * `--production` predates the `--environment` flag and is what the Vercel Build
 * Command runs (`env:check -- --production --verify && next build`,
 * docs/SPRINT-2.4.md §19). It is already an explicit statement of intent, so it
 * is honoured as one: it selects the production environment AND applies the
 * stricter production rules. The deploy gate keeps working unchanged.
 *
 * Exit codes: 0 valid · 1 invalid.
 */

import { config as loadEnv } from "dotenv";

import {
  ENVIRONMENT_FILES,
  describeTarget,
  prepareToolingTarget,
  selectEnvironment,
  type ToolingTarget,
} from "./lib/environment";
import { EnvironmentGuardError } from "./lib/project-ref";

const wantsVerify = process.argv.includes("--verify");
const selection = selectEnvironment();

let target: ToolingTarget | undefined;

if (selection) {
  // A named environment: load it, and guard it when it is staging.
  target = prepareToolingTarget("env:check");
  if (selection.environment === "production") {
    // Checking production configuration under development rules would call a
    // configuration valid that the server would refuse to boot with. NODE_ENV
    // is typed read-only, so assign through the record.
    (process.env as Record<string, string>).NODE_ENV = "production";
  }
} else if (wantsVerify) {
  throw new EnvironmentGuardError(
    `env:check --verify opens real database and storage connections, so it ` +
      `requires the environment to be named. It will not choose one, because ` +
      `the only available default is production.\n\n` +
      `  npm run env:check -- --environment=staging --verify     ` +
      `→ ${ENVIRONMENT_FILES.staging}\n` +
      `  npm run env:check -- --environment=production --verify  ` +
      `→ ${ENVIRONMENT_FILES.production}\n`,
  );
} else {
  // Presence only, opening nothing: the everyday local check. Next loads
  // .env.local natively; a standalone script does not. First file wins for
  // duplicate keys.
  loadEnv({ path: [ENVIRONMENT_FILES.production, ".env"], quiet: true });
}

async function main(): Promise<number> {
  const { ENV_MANIFEST, assertProductionConfig, getEnvDiagnostics } =
    await import("../src/lib/env.server");

  const mode = process.env.NODE_ENV ?? "development";
  console.log(`\nAI NEX OS — environment check (${mode})\n`);
  console.log(
    target
      ? `${describeTarget(target)}\n`
      : `  Environment       local presence check (no --environment given)\n` +
          `  Config source     ${ENVIRONMENT_FILES.production}\n` +
          `                    --verify requires an explicit --environment\n`,
  );

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

  if (process.argv.includes("--verify")) {
    if (!(await verifyConnectivity())) return 1;
  } else {
    console.log(
      "\n  Presence only — re-run with --verify to open real connections.",
    );
  }

  console.log(
    `\n✓ Valid for ${mode}. Re-run with --production to check the stricter production rules.\n`,
  );
  return 0;
}

/**
 * Opens real connections rather than checking that variables are non-empty.
 *
 * A syntactically valid connection string pointing at a project that does not
 * exist passes every presence check, and `next build` passes too because no
 * route is prerendered against the database. That combination reads as a fully
 * configured environment while nothing is actually reachable, so the only
 * honest check is to connect.
 */
async function verifyConnectivity(): Promise<boolean> {
  console.log("\n  Verifying connectivity\n");
  let ok = true;

  const databaseUrl =
    process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (databaseUrl) {
    const { hostname, port, username } = new URL(databaseUrl);
    try {
      const { default: postgres } = await import("postgres");
      const sql = postgres(databaseUrl, {
        max: 1,
        prepare: false,
        // Without this postgres.js negotiates no TLS, and Supabase accepts the
        // plaintext connection — which would send the database password over
        // the network in the clear just to run a health check. Matches
        // scripts/migrate.ts.
        ssl: "require",
        connect_timeout: 15,
        onnotice: () => {},
      });
      const [row] = await sql`select version() as version`;
      await sql.end();
      console.log(`  ✓ database    ${hostname}:${port}`);
      console.log(`                ${String(row.version).split(" on ")[0]}`);
    } catch (error) {
      ok = false;
      const code = (error as { code?: string }).code;
      console.log(`  ✗ database    ${hostname}:${port} as "${username}"`);
      console.log(
        `                ${
          code === "28P01"
            ? "password rejected — this is the database password from " +
              "Supabase › Project Settings › Database, a different secret " +
              "from the service-role API key. Percent-encode special " +
              "characters (@ becomes %40)."
            : code === "ENOTFOUND"
              ? "host does not resolve — check the project ref."
              : code === "ECONNREFUSED"
                ? "nothing listening on that host and port."
                : (error as Error).message || code || "unknown error"
        }`,
      );
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
      });
      if (response.ok) {
        const buckets = (await response.json()) as Array<{ name: string }>;
        console.log(
          `  ✓ storage     ${buckets.length} bucket(s): ${
            buckets.map((b) => b.name).join(", ") || "none"
          }`,
        );
      } else {
        ok = false;
        console.log(
          `  ✗ storage     service-role key rejected (HTTP ${response.status})`,
        );
      }
    } catch (error) {
      ok = false;
      console.log(
        `  ✗ storage     ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (!ok) {
    console.error("\n✖ Configuration is present but not reachable.\n");
  }
  return ok;
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
