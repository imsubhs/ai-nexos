import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Server-only Drizzle client over the Supabase connection pooler.
 * Uses DATABASE_URL (transaction-mode pooler) — `prepare: false` is required
 * because PgBouncer transaction mode does not support prepared statements.
 *
 * NOTE: this connection runs as the postgres role and BYPASSES RLS.
 * It must only be used inside service-layer code that has already passed
 * permission validation (src/features/permissions). Never expose it to
 * client components or unvalidated request handlers.
 */
declare global {
  var __db: ReturnType<typeof createDb> | undefined;
}

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema, casing: "snake_case" });
}

/** Reuse the pool across hot reloads in development. */
export const db = globalThis.__db ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__db = db;

export { schema };
