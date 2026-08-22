import { defineConfig } from "drizzle-kit";

import {
  describeTarget,
  prepareToolingTarget,
} from "./scripts/lib/environment";

/**
 * drizzle-kit's entry point into the environment contract.
 *
 * This file used to open with `loadEnv({ path: [".env.local", ".env"] })`,
 * which made PRODUCTION the implicit target of every drizzle-kit command —
 * including `drizzle-kit studio`, which opens a live session against it, and
 * `drizzle-kit migrate`, which applies DDL. A developer intending to inspect
 * staging would have been connected to the live database with no indication
 * that anything had been chosen on their behalf.
 *
 * drizzle-kit does not forward `--environment` to its config, so the selection
 * comes through `TOOL_ENV`:
 *
 *   TOOL_ENV=staging npm run db:studio
 *   TOOL_ENV=staging npm run db:generate
 *   TOOL_ENV=production npm run db:migrate:kit
 *
 * Unnamed is refused. `db:generate` never connects and is inconvenienced by
 * that, which is a real cost — but the alternative is a config that silently
 * resolves production credentials, and `studio` and `migrate:kit` read the
 * exact same config object. One resolution path, explicitly named, is worth
 * more than the convenience.
 *
 * `npm run db:migrate` does not use this file at all; it selects its own
 * environment from `--environment` (see scripts/migrate.ts).
 */
const target = prepareToolingTarget("drizzle-kit");

// Migrations must run over the direct (session-mode) connection — the
// transaction pooler breaks DDL. Fall back to DATABASE_URL only with a loud
// warning so CI-style environments still work.
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "No database connection string: set DIRECT_DATABASE_URL (preferred for " +
      `migrations) or DATABASE_URL in the ${target.environment} environment ` +
      `(${target.file ?? "process environment"})`,
  );
}
if (!process.env.DIRECT_DATABASE_URL) {
  console.warn(
    "⚠ DIRECT_DATABASE_URL is not set — falling back to DATABASE_URL. " +
      "If that is the transaction pooler (port 6543), migrations may fail; " +
      "use the direct connection (port 5432).",
  );
}

// Safe metadata only: environment, truncated project reference, bare hostname.
console.log(`\n${describeTarget(target)}\n`);

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./database/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
