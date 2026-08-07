/**
 * `npm run db:migrate` — apply pending migrations, with diagnosis.
 *
 * Replaces `drizzle-kit migrate`, which spins "applying migrations..."
 * indefinitely when the database refuses the connection: the CLI never
 * surfaces the driver's rejection, so an unreachable database is
 * indistinguishable from a slow one and the process must be killed.
 *
 * The underlying drizzle-orm migrator rejects in about a second. This script
 * uses that migrator directly — so migration bookkeeping stays byte-compatible
 * with drizzle-kit — and adds the reporting the CLI omits: which connection was
 * selected and why, a preflight that fails fast with a named cause, per-
 * statement tracing, and a post-run inventory of what was applied.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_FOLDER = "./database/migrations";

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
}

function readJournal(): JournalEntry[] {
  const path = join(process.cwd(), MIGRATIONS_FOLDER, "meta", "_journal.json");
  return (JSON.parse(readFileSync(path, "utf8")) as { entries: JournalEntry[] })
    .entries;
}

/**
 * Migrations must run over the direct/session connection. The transaction
 * pooler multiplexes statements across backends, which breaks DDL, so
 * DIRECT_DATABASE_URL wins whenever it is set and the fallback is reported
 * rather than silent.
 */
function selectConnection(): { url: string; reason: string } {
  const direct = process.env.DIRECT_DATABASE_URL;
  if (direct) {
    return {
      url: direct,
      reason: "DIRECT_DATABASE_URL is set — session mode, required for DDL",
    };
  }
  const pooled = process.env.DATABASE_URL;
  if (pooled) {
    return {
      url: pooled,
      reason:
        "DIRECT_DATABASE_URL is unset — falling back to DATABASE_URL. If that " +
        "is the transaction pooler (port 6543), DDL may fail.",
    };
  }
  throw new Error(
    "No database connection string: set DIRECT_DATABASE_URL (preferred for " +
      "migrations) or DATABASE_URL in .env.local",
  );
}

function describe(url: string): void {
  const u = new URL(url);
  const isPooler = u.hostname.includes("pooler.supabase.com");
  const pgbouncer = u.searchParams.get("pgbouncer") === "true";
  console.log(`  host        ${u.hostname}`);
  console.log(
    `  port        ${u.port}${u.port === "6543" ? "  (transaction mode)" : u.port === "5432" ? "  (session mode)" : ""}`,
  );
  console.log(`  database    ${u.pathname.slice(1)}`);
  console.log(`  user        ${decodeURIComponent(u.username)}`);
  console.log(
    `  password    <redacted, ${decodeURIComponent(u.password).length} chars>`,
  );
  console.log(`  ssl         require`);
  console.log(
    `  pooler      ${isPooler ? "yes (Supavisor)" : "no (direct host)"}`,
  );
  console.log(`  pgbouncer   ${pgbouncer ? "true" : "false"}`);

  if (isPooler && u.port === "6543") {
    console.warn(
      "\n  ! Transaction mode (6543) does not support DDL. Point " +
        "DIRECT_DATABASE_URL at port 5432.",
    );
  }
}

/**
 * Opens one connection before the migrator runs, so an unreachable database
 * produces a named cause in about a second instead of an unbounded spinner.
 */
async function preflight(url: string): Promise<void> {
  const u = new URL(url);
  const probe = postgres(url, {
    max: 1,
    prepare: false,
    ssl: "require",
    connect_timeout: 15,
    onnotice: () => {},
  });
  try {
    const [row] = await probe`select version() as version`;
    console.log(`  ✓ connected — ${String(row.version).split(" on ")[0]}`);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    const cause =
      code === "28P01"
        ? `PostgreSQL rejected the credentials for user "${decodeURIComponent(u.username)}". ` +
          `Everything beneath authentication succeeded, so the password in .env.local ` +
          `does not match the one this project holds. Note it is a different secret ` +
          `from the service-role API key.`
        : code === "ENOTFOUND"
          ? `The host ${u.hostname} does not resolve — check the project ref.`
          : code === "ECONNREFUSED"
            ? `Nothing is listening on ${u.hostname}:${u.port}. If this is ` +
              `db.<ref>.supabase.co, that host is IPv6-only; use the pooler.`
            : `${code ?? ""} ${(error as Error).message}`.trim();
    throw new Error(`Cannot reach the database.\n\n  ${cause}`);
  } finally {
    await probe.end({ timeout: 5 });
  }
}

async function main(): Promise<void> {
  const { url, reason } = selectConnection();

  console.log("\nAI NEX OS — database migration\n");
  console.log(
    `  selected    ${process.env.DIRECT_DATABASE_URL ? "DIRECT_DATABASE_URL" : "DATABASE_URL"}`,
  );
  console.log(`  because     ${reason}\n`);
  describe(url);

  console.log("\n  Preflight");
  await preflight(url);

  const journal = readJournal();
  console.log(`\n  ${journal.length} migration(s) in the journal\n`);

  const verbose = process.argv.includes("--verbose");
  const client = postgres(url, {
    max: 1,
    prepare: false,
    ssl: "require",
    connect_timeout: 15,
    onnotice: (notice) => console.log(`    notice: ${notice.message}`),
    debug: verbose
      ? (_conn, query) => {
          const text = String(query).replace(/\s+/g, " ").trim();
          if (text) console.log(`    sql> ${text.slice(0, 120)}`);
        }
      : undefined,
  });

  const startedAt = Date.now();
  try {
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
    console.log(`  ✓ migrator finished in ${Date.now() - startedAt}ms\n`);

    const applied = await client<{ hash: string; created_at: string }[]>`
      select hash, created_at from drizzle.__drizzle_migrations order by created_at
    `;
    console.log(`  Applied migrations (${applied.length}):\n`);
    const width = Math.max(...journal.map((e) => e.tag.length));
    journal.forEach((entry, i) => {
      const row = applied[i];
      console.log(
        `    ${String(entry.idx).padStart(4, "0")}  ${entry.tag.padEnd(width)}  ${
          row ? "applied" : "NOT RECORDED"
        }`,
      );
    });

    if (applied.length !== journal.length) {
      throw new Error(
        `Journal lists ${journal.length} migration(s) but the database recorded ` +
          `${applied.length}. The migration state is inconsistent.`,
      );
    }
    console.log("\n✓ Database is up to date.\n");
  } catch (error: unknown) {
    // The migrator wraps driver errors; the cause carries the failing statement.
    const cause = (error as { cause?: Record<string, unknown> }).cause ?? error;
    console.error(`\n✖ Migration failed after ${Date.now() - startedAt}ms\n`);
    console.error(`  ${(error as Error).message.split("\n")[0]}`);
    if ((cause as { code?: string }).code) {
      console.error(`  postgres code: ${(cause as { code: string }).code}`);
    }
    throw error;
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(
      `\n✖ ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  },
);
