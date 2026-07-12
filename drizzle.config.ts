import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js loads .env.local natively, but drizzle-kit does not — load both,
// with .env.local taking precedence (first file wins for duplicate keys).
loadEnv({ path: [".env.local", ".env"] });

// Migrations must run over the direct (session-mode) connection — the
// transaction pooler breaks DDL. Fall back to DATABASE_URL only with a
// loud warning so CI-style environments still work.
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "No database connection string: set DIRECT_DATABASE_URL (preferred for migrations) or DATABASE_URL in .env.local",
  );
}
if (!process.env.DIRECT_DATABASE_URL) {
  console.warn(
    "⚠ DIRECT_DATABASE_URL is not set — falling back to DATABASE_URL. " +
      "If that is the transaction pooler (port 6543), migrations may fail; " +
      "use the direct connection (port 5432).",
  );
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./database/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
