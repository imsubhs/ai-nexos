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
function getDb() {
  const existing = globalThis.__db;
  if (existing) return existing;
  const created = createDb();
  if (process.env.NODE_ENV !== "production") globalThis.__db = created;
  return created;
}

/**
 * Constructed on first property access, not at module evaluation — the same
 * lazy-and-cached contract `src/lib/env.ts` uses for `getServerEnv()`.
 *
 * Importing this module must never throw. `next build` imports every route to
 * collect page data, so an eager `createDb()` here turned a missing
 * DATABASE_URL into a *build* failure in any environment without a database —
 * CI, and DEMO_MODE installs that never touch Postgres at all.
 *
 * This defers the failure to first use; it does not remove it. A request that
 * actually reaches the database with DATABASE_URL unset still throws
 * "DATABASE_URL is not set", exactly as before.
 */
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    // Bound so drizzle's methods see the real client as `this`, not the proxy.
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has: (_target, prop) => Reflect.has(getDb(), prop),
  ownKeys: () => Reflect.ownKeys(getDb()),
  getOwnPropertyDescriptor(_target, prop) {
    const descriptor = Reflect.getOwnPropertyDescriptor(getDb(), prop);
    // The proxy target is an empty object, so every reported key must be
    // configurable or the ownKeys invariant throws.
    return descriptor && { ...descriptor, configurable: true };
  },
});

export { schema };
