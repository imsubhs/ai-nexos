/**
 * Supabase project-reference derivation — the shared primitives behind every
 * environment guard in this repository.
 *
 * These were written for the integration suite (`tests/integration/guard.ts`)
 * and are now needed by the destructive CLI tooling too: migrate, seed and
 * storage-setup all have to be able to name the project they are about to write
 * to, and they must do it with the SAME logic the test guard uses. Two
 * implementations of "which project is this?" would eventually disagree, and
 * the disagreement would be discovered by one of them permitting something the
 * other refuses.
 *
 * So the logic lives here once and `tests/integration/guard.ts` re-exports it.
 * Nothing in this module performs I/O, opens a socket, or reads ambient
 * `process.env`; everything arrives as an argument. That is what lets both the
 * test guard and the tooling guard be proved offline.
 *
 * No message produced here ever contains a secret. Errors name variables,
 * hostnames and project references — never a password, key or full connection
 * string.
 */

/** Raised for every refusal, so callers can distinguish a guard verdict. */
export class EnvironmentGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentGuardError";
  }
}

/**
 * The reference used for a Supabase running on this machine (`supabase start`).
 * A local stack has no project ref of its own, but it still has to be named in
 * an allow-list to be used — nothing is granted implicitly, not even loopback.
 */
export const LOCAL_PROJECT_REF = "local";

const LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

/** Hosted Supabase serves projects as `<ref>.supabase.co`. */
const SUPABASE_HOST = /^([a-z0-9]{8,})\.supabase\.(co|in)$/;

/** The direct database host, `db.<ref>.supabase.co`. */
const SUPABASE_DB_HOST = /^db\.([a-z0-9]{8,})\.supabase\.(co|in)$/;

/** The pooler username, `postgres.<ref>`. */
const POOLER_USERNAME = /^postgres\.([a-z0-9]{8,})$/;

/** Splits a comma/whitespace separated list, normalised and de-duplicated. */
export function parseRefList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,]+/)) {
    const ref = part.trim().toLowerCase();
    if (ref) seen.add(ref);
  }
  return [...seen];
}

/**
 * Shortens a project reference for display. The reference is not a secret — it
 * is part of the public API hostname — but printing it in full in an operator
 * log adds nothing a truncated form does not, so the truncated form is the
 * default everywhere output is produced.
 */
export function redactRef(ref: string): string {
  if (ref === LOCAL_PROJECT_REF) return ref;
  if (ref.length <= 8) return `${ref.slice(0, 2)}…`;
  return `${ref.slice(0, 4)}…${ref.slice(-4)}`;
}

/**
 * The project reference behind a Supabase API URL.
 *
 * Throws rather than returning undefined: a URL whose project cannot be named
 * is a refusal, not a soft unknown. A custom domain in front of Supabase lands
 * here too, and that is intentional — a guard would otherwise have no way to
 * tell which project it fronts.
 */
export function projectRefFromSupabaseUrl(
  raw: string | undefined,
  variableName = "NEXT_PUBLIC_SUPABASE_URL",
): string {
  if (!raw || !raw.trim()) {
    throw new EnvironmentGuardError(`${variableName} is not set.`);
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new EnvironmentGuardError(
      `${variableName} is not a valid URL. It must look like ` +
        `https://<project-ref>.supabase.co (value not shown).`,
    );
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new EnvironmentGuardError(
      `${variableName} must use http:// or https:// — got "${url.protocol}".`,
    );
  }

  const host = url.hostname.toLowerCase();

  if (LOCAL_HOSTNAMES.has(host)) return LOCAL_PROJECT_REF;

  const match = SUPABASE_HOST.exec(host);
  if (!match) {
    throw new EnvironmentGuardError(
      `Cannot determine a Supabase project reference from ${variableName} ` +
        `(host "${host}"). The guard refuses a target it cannot name: expected ` +
        `<project-ref>.supabase.co, or a loopback host for a local stack.`,
    );
  }

  // Plain http:// against a hosted project would carry the service-role key
  // over the wire in clear text.
  if (url.protocol !== "https:") {
    throw new EnvironmentGuardError(
      `${variableName} must use https:// for the hosted project "${match[1]}".`,
    );
  }

  return match[1];
}

/**
 * The project reference behind a PostgreSQL connection string.
 *
 * This is the half a URL-only check would miss. `NEXT_PUBLIC_SUPABASE_URL` and
 * `DATABASE_URL` are independent variables, so a file naming one project's API
 * host and another's database is internally consistent to every check except
 * this one — and the destructive writes follow the database.
 *
 * The connection string carries a password, so nothing derived from it is ever
 * echoed apart from the hostname and the reference itself.
 */
export function projectRefFromDatabaseUrl(
  raw: string | undefined,
  variableName: string,
): string {
  if (!raw || !raw.trim()) {
    throw new EnvironmentGuardError(`${variableName} is not set.`);
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new EnvironmentGuardError(
      `${variableName} is not a parseable connection string (value not shown). ` +
        `Special characters in the password must be percent-encoded.`,
    );
  }

  const host = url.hostname.toLowerCase();
  if (LOCAL_HOSTNAMES.has(host)) return LOCAL_PROJECT_REF;

  // Supavisor requires the tenant in the username: `postgres.<ref>`.
  let username = "";
  try {
    username = decodeURIComponent(url.username).toLowerCase();
  } catch {
    throw new EnvironmentGuardError(
      `${variableName} has a malformed percent-encoded username.`,
    );
  }

  const pooled = POOLER_USERNAME.exec(username);
  if (pooled) return pooled[1];

  // The direct host carries the reference instead, with a bare `postgres` user.
  const direct = SUPABASE_DB_HOST.exec(host);
  if (direct) return direct[1];

  throw new EnvironmentGuardError(
    `Cannot determine a Supabase project reference from ${variableName} ` +
      `(host "${host}"). Expected the pooler form postgres.<project-ref>@` +
      `aws-0-<region>.pooler.supabase.com, db.<project-ref>.supabase.co, or a ` +
      `loopback host. The guard refuses a database it cannot name.`,
  );
}

/** The hostname of a connection string, for display. Never the credentials. */
export function databaseHostFromUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return "(unparseable)";
  }
}

/** Non-throwing form, for deriving deny-list entries from files that may be anything. */
export function tryProjectRef(derive: () => string): string | undefined {
  try {
    return derive();
  } catch {
    return undefined;
  }
}
