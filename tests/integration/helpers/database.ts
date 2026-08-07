import postgres, { type Sql } from "postgres";

/**
 * Connection helpers for the integration suite.
 *
 * These specs assert facts about a real database. If the database is
 * unreachable the suite FAILS — it does not skip. A silently skipped
 * integration suite reports green while verifying nothing, which is the
 * failure mode this harness exists to eliminate.
 */

let pooled: Sql | undefined;

function connectionString(): string {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No database connection string. Set DIRECT_DATABASE_URL (preferred) or " +
        "DATABASE_URL in .env.local before running the integration suite.",
    );
  }
  return url;
}

/** Superuser-equivalent connection (migration role) — bypasses RLS. */
export function db(): Sql {
  pooled ??= postgres(connectionString(), {
    max: 4,
    prepare: false,
    connect_timeout: 15,
    onnotice: () => {},
  });
  return pooled;
}

/**
 * Opens a connection whose role and JWT claims match a specific caller, so RLS
 * policies are evaluated exactly as they would be for that caller in
 * production. `role` is the Postgres role Supabase maps the caller to:
 * `anon` for unauthenticated, `authenticated` for a signed-in user.
 *
 * The claims are set with `set_config(..., is_local => true)` inside a
 * transaction, mirroring how PostgREST scopes them per request.
 */
export async function asRole<T>(
  role: "anon" | "authenticated",
  claims: { sub?: string; organizationId?: string },
  fn: (sql: Sql) => Promise<T>,
): Promise<T> {
  const sql = db();
  // postgres.js unwraps promise-like results inside begin(); the callback's
  // return type is opaque to that transform, so the cast restores T.
  return sql.begin(async (tx) => {
    await tx`select set_config('role', ${role}, true)`;
    const jwt = JSON.stringify({
      sub: claims.sub ?? null,
      role,
      organization_id: claims.organizationId ?? null,
    });
    await tx`select set_config('request.jwt.claims', ${jwt}, true)`;
    if (claims.sub) {
      await tx`select set_config('request.jwt.claim.sub', ${claims.sub}, true)`;
    }
    await tx`set local role ${tx.unsafe(role)}`;
    return fn(tx as unknown as Sql);
  }) as Promise<T>;
}

/**
 * Verifies the configured database is actually reachable, turning the raw
 * driver error into a diagnosis that names the likely cause. Called once from
 * a global setup hook so every spec file does not repeat the check.
 */
export async function assertDatabaseReachable(): Promise<void> {
  const url = new URL(connectionString());
  try {
    const probe = postgres(connectionString(), {
      max: 1,
      prepare: false,
      connect_timeout: 15,
      onnotice: () => {},
    });
    await probe`select 1`;
    await probe.end();
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    const detail =
      code === "28P01"
        ? "The host is correct and the server responded, but the password was rejected. " +
          "This is the database password (Supabase › Project Settings › Database), " +
          "which is NOT the same secret as the service-role API key. Special " +
          "characters must be percent-encoded in the URL (@ becomes %40)."
        : code === "ENOTFOUND"
          ? "The host does not resolve — check the project ref in the connection string."
          : code === "ECONNREFUSED"
            ? "Nothing is listening on that host and port."
            : `Driver reported: ${(error as Error).message || code || "unknown error"}`;

    throw new Error(
      `Integration suite cannot reach the database at ${url.hostname}:${url.port} ` +
        `as user "${url.username}".\n\n${detail}\n\n` +
        `Verify with: npm run env:check -- --verify`,
    );
  }
}

export async function closeDatabase(): Promise<void> {
  await pooled?.end();
  pooled = undefined;
}
