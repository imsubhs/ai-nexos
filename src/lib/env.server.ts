/**
 * Environment configuration — the single source of truth for every variable
 * this application reads.
 *
 * Three layers, deliberately separated because they fail at different times:
 *
 *   publicEnv   — NEXT_PUBLIC_* only. Safe in the browser bundle. Parsed at
 *                 import with every field optional, so importing this module can
 *                 never crash a page render. Every value is referenced as a
 *                 literal `process.env.NEXT_PUBLIC_…` so Next's build-time
 *                 inlining still works (a dynamic lookup would yield undefined).
 *   serverEnv   — secrets and connection strings. Validated lazily on first
 *                 access and cached, so importing this module never throws in a
 *                 context that only needs the public half.
 *   assertProductionConfig() — the boot gate. Called once from
 *                 src/instrumentation.ts, it turns every "silently wrong in
 *                 production" configuration into a loud startup failure.
 *
 * Classification of each variable lives in ENV_MANIFEST below and is the
 * authority for docs, .env.example and startup diagnostics.
 */

import { z } from "zod";
import { DEFAULT_STORAGE_BUCKET, publicEnv, publicEnvIssues } from "./env";

// ─────────────────────────────────────────────────────────────────────────────
// Manifest — classification, surfaced by diagnostics and mirrored in docs.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `required`     — the app cannot function without it, in any environment.
 * `production`   — required only when NODE_ENV=production; a safe substitute
 *                  exists in development (see the notes on each entry).
 * `optional`     — absence is a supported configuration; a documented fallback
 *                  is used and nothing crashes.
 * `development`  — only meaningful outside production; refused in production.
 * `tooling`      — read by scripts (drizzle-kit, seed), never by the app.
 */
export type EnvRequirement =
  "required" | "production" | "optional" | "development" | "tooling";

export type EnvExposure = "public" | "server";

export type EnvSpec = {
  readonly name: string;
  readonly requirement: EnvRequirement;
  readonly exposure: EnvExposure;
  /** One line, used verbatim in .env.example and the environment reference. */
  readonly purpose: string;
  /** What happens when it is absent. */
  readonly fallback?: string;
};

export const ENV_MANIFEST: readonly EnvSpec[] = [
  {
    name: "NODE_ENV",
    requirement: "optional",
    exposure: "server",
    purpose: "Runtime mode. Set by Next and the platform, not by hand.",
    fallback: 'Defaults to "development".',
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    requirement: "required",
    exposure: "public",
    purpose: "Supabase project URL. Also the origin allow-listed by the CSP.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    requirement: "required",
    exposure: "public",
    purpose:
      "Supabase anon/publishable key. RLS-enforced; safe in the browser.",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    requirement: "production",
    exposure: "server",
    purpose:
      "Server-only Supabase key. Bypasses RLS; used by the share-link portal service layer, background workers and seeding.",
    fallback:
      "Outside production, code paths that need it fail individually rather than at boot.",
  },
  {
    name: "DATABASE_URL",
    requirement: "required",
    exposure: "server",
    purpose:
      "Drizzle runtime connection — Supabase transaction pooler, port 6543.",
  },
  {
    name: "DIRECT_DATABASE_URL",
    requirement: "tooling",
    exposure: "server",
    purpose:
      "Direct (session-mode) connection, port 5432. drizzle-kit migrations only; the pooler breaks DDL.",
    fallback: "drizzle.config.ts falls back to DATABASE_URL with a warning.",
  },
  {
    name: "JWT_SECRET",
    requirement: "production",
    exposure: "server",
    purpose:
      "Signs external review/approval tokens. Minimum 32 characters; generate with `openssl rand -base64 48`.",
    fallback:
      "Development/test generate a random per-process key, so tokens stop verifying after a restart.",
  },
  {
    name: "SHARE_JWT_SECRET",
    requirement: "production",
    exposure: "server",
    purpose:
      "Signs client share-link session tokens, which gate unauthenticated portal access. Minimum 32 characters.",
    fallback: "Same random per-process key behaviour as JWT_SECRET.",
  },
  {
    name: "NEXT_PUBLIC_APP_DOMAIN",
    requirement: "production",
    exposure: "public",
    purpose: "Internal dashboard host, e.g. app.aicollective.agency.",
    fallback: 'Defaults to "localhost:3000".',
  },
  {
    name: "NEXT_PUBLIC_PORTAL_DOMAIN",
    requirement: "production",
    exposure: "public",
    purpose: "Client portal host, e.g. portal.aicollective.agency.",
    fallback: 'Defaults to "portal.localhost:3000".',
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    requirement: "production",
    exposure: "public",
    purpose: "Absolute dashboard URL used in emails and redirects.",
    fallback: "Derived from NEXT_PUBLIC_APP_DOMAIN over http://.",
  },
  {
    name: "NEXT_PUBLIC_PORTAL_URL",
    requirement: "production",
    exposure: "public",
    purpose: "Absolute portal URL used to build share links.",
    fallback: "Derived from NEXT_PUBLIC_PORTAL_DOMAIN over http://.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET",
    requirement: "production",
    exposure: "public",
    purpose:
      "Supabase Storage bucket backing document and asset uploads. The live bucket is `documents`.",
    fallback: `Development defaults to "${DEFAULT_STORAGE_BUCKET}"; required explicitly in production.`,
  },
  {
    name: "REDIS_URL",
    requirement: "optional",
    exposure: "server",
    purpose:
      "Redis connection for distributed rate-limiting and cache. Optional in single-instance deployments (falls back to MemoryStore); required before horizontal scaling.",
    fallback:
      "Falls back to MemoryStore (per-process in-memory rate-limiting, suitable for single-instance Antideploy).",
  },
  {
    name: "NEXT_PUBLIC_BUILD_NUMBER",
    requirement: "optional",
    exposure: "public",
    purpose: "Build identifier surfaced by /api/health.",
    fallback: 'Reported as "local-dev".',
  },
  {
    name: "TRUSTED_PROXY_HOPS",
    requirement: "optional",
    exposure: "server",
    purpose:
      "How many reverse proxies append to X-Forwarded-For before a request arrives. Decides which entry is the real client address for rate limiting.",
    fallback:
      "Defaults to 1, correct for a single platform edge. Too high and a client can spoof its address; too low and everything behind the edge shares one bucket.",
  },
  {
    name: "EGRESS_ALLOWED_HOSTS",
    requirement: "optional",
    exposure: "server",
    purpose:
      "Comma-separated hosts that server-side fetches (automation webhooks) may reach. A leading dot permits subdomains.",
    fallback:
      "Unset permits any public host; private, loopback and cloud-metadata addresses are refused either way.",
  },
  {
    name: "LOG_LEVEL",
    requirement: "optional",
    exposure: "server",
    purpose: "Minimum severity emitted by the structured logger.",
    fallback: 'Defaults to "info" ("error" under NODE_ENV=test).',
  },
  {
    name: "DEMO_MODE",
    requirement: "development",
    exposure: "server",
    purpose:
      'When "true", every server action serves the deterministic in-memory demo dataset instead of the database.',
    fallback:
      'Treated as "false". Setting it to "true" in production is fatal.',
  },
];

const MANIFEST_BY_NAME = new Map(ENV_MANIFEST.map((spec) => [spec.name, spec]));

// ─────────────────────────────────────────────────────────────────────────────
// Server schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Secrets used for signing. Optional at the field level and required in
 * production by the object-level check below — a refinement attached to an
 * optional field is not run when the value is absent, which is precisely the
 * case that matters here.
 *
 * Outside production a random per-process value is generated instead (see
 * `getSigningSecret`), so a well-known constant can never sign a real token.
 */
const signingSecret = (name: string) =>
  z
    .string()
    .min(
      32,
      `${name} must be at least 32 characters. Generate one with: openssl rand -base64 48`,
    )
    .optional();

/** Server secrets with no safe default: absent in production is a hard failure. */
const PRODUCTION_REQUIRED = [
  "JWT_SECRET",
  "SHARE_JWT_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/**
 * Public values with no safe default in production. Checked at boot, not at
 * import.
 *
 * The last three were declared `production` in `ENV_MANIFEST` from the start
 * but were never listed here, so the classification described an enforcement
 * that did not exist. Each has a development fallback that is actively wrong in
 * production:
 *
 *   · NEXT_PUBLIC_APP_URL     — derives `http://<app domain>`; it is the
 *     redirect target for the auth callback, magic links and OAuth, so an
 *     http:// value drops the `secure` session cookie on the hop that matters.
 *   · NEXT_PUBLIC_PORTAL_URL  — derives `http://<portal domain>`; share links
 *     are built from it, and a share token is an unauthenticated credential.
 *   · NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET — see `DEFAULT_STORAGE_BUCKET`.
 */
const PRODUCTION_REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_DOMAIN",
  "NEXT_PUBLIC_PORTAL_DOMAIN",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_PORTAL_URL",
  "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET",
] as const;

/**
 * Absolute URLs that must be reachable over TLS in production.
 *
 * Presence is not enough for these two. Both are consumed as the base of a
 * redirect that has just set, or is about to be presented with, a `secure`
 * cookie — so an `http://` origin is not a downgrade in theory, it is a session
 * that silently does not work. `localhost` is refused for the same reason it is
 * never right in production: it names the deployment's own loopback, not the
 * user's browser.
 */
const PRODUCTION_HTTPS_URLS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_PORTAL_URL",
] as const;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

/** Production-only URL rules. Returns one readable line per problem. */
function insecureUrlIssues(): string[] {
  const issues: string[] = [];

  for (const name of PRODUCTION_HTTPS_URLS) {
    const value = publicEnv[name];
    // Absence is already reported by the PRODUCTION_REQUIRED_PUBLIC check, and
    // a malformed value was dropped at parse time and recorded in
    // publicEnvIssues. Neither should be reported twice.
    if (value === undefined) continue;

    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue;
    }

    if (url.protocol !== "https:") {
      issues.push(
        `${name}: must use https:// in production — it is the base of a redirect that carries a secure cookie.`,
      );
    }
    if (LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) {
      issues.push(`${name}: must not point at ${url.hostname} in production.`);
    }
  }

  return issues;
}

const serverSchemaShape = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Transaction-mode pooler connection used by the Drizzle client.
  // `error` rather than only `.min(1, …)`: the min message is not used when the
  // value is absent, which is the common failure and the one an operator reads.
  DATABASE_URL: z
    .string({
      error:
        "DATABASE_URL is required — the Supabase transaction pooler connection string (port 6543).",
    })
    .min(
      1,
      "DATABASE_URL is required — the Supabase transaction pooler connection string (port 6543).",
    ),
  // Direct connection; only drizzle-kit migrations need it.
  DIRECT_DATABASE_URL: z.string().optional(),

  // Server-only Supabase key. Bypasses RLS — never expose to the browser.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  JWT_SECRET: signingSecret("JWT_SECRET"),
  SHARE_JWT_SECRET: signingSecret("SHARE_JWT_SECRET"),

  // Optional integration; absence is a supported configuration.
  REDIS_URL: z.string().optional(),

  // Length of the trusted reverse-proxy chain. Bounded rather than free-form:
  // a mistyped large value would make every request look like it came from the
  // first, attacker-controlled X-Forwarded-For entry.
  TRUSTED_PROXY_HOPS: z.coerce
    .number()
    .int("TRUSTED_PROXY_HOPS must be a whole number.")
    .min(0)
    .max(10, "TRUSTED_PROXY_HOPS above 10 is a configuration error.")
    .optional(),

  // Server-side fetch allow-list for automation webhooks.
  EGRESS_ALLOWED_HOSTS: z.string().optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),

  // Selects the demo data path. Read through isDemoMode() everywhere; parsed
  // here so an unexpected value surfaces at boot instead of silently falling
  // through to the live path.
  DEMO_MODE: z.enum(["true", "false"]).optional(),
});

/**
 * Production-only rules, evaluated against the raw environment rather than as a
 * refinement on the schema above.
 *
 * A `superRefine` does not run when the object shape itself fails to parse, so
 * attaching these there hid them behind the first shape error: an operator with
 * three missing variables would fix one, redeploy, and discover the next. These
 * checks need no parsed value, so they run independently and their issues are
 * merged into a single report.
 */
function productionIssues(env: NodeJS.ProcessEnv): string[] {
  if (env.NODE_ENV !== "production") return [];

  const issues: string[] = [];

  for (const name of PRODUCTION_REQUIRED) {
    const value = env[name];
    if (value === undefined || value === "") {
      const hint =
        name === "SUPABASE_SERVICE_ROLE_KEY"
          ? "Copy it from Supabase › Project Settings › API. Never prefix it with NEXT_PUBLIC_."
          : "Generate one with: openssl rand -base64 48";
      issues.push(`${name}: ${name} is required in production. ${hint}`);
    }
  }

  if (env.REDIS_URL && !env.REDIS_URL.startsWith("rediss://")) {
    issues.push("REDIS_URL: must use rediss:// (TLS) in production.");
  }

  // Demo mode serves fabricated data and bypasses the database entirely.
  // Reaching production with it enabled would silently replace real records.
  if (env.DEMO_MODE === "true") {
    issues.push(
      'DEMO_MODE: DEMO_MODE must not be "true" in production — it serves the in-memory demo dataset instead of the database. Unset it or set it to "false".',
    );
  }

  return issues;
}

export type ServerEnv = z.infer<typeof serverSchemaShape>;

/** One report, every problem, in the order they were found. */
function formatIssues(lines: readonly string[]): string {
  const body = lines.map((line) => `  · ${line}`).join("\n");
  return `Invalid environment configuration:\n${body}\n\nSee .env.example for the full template.`;
}

function zodIssueLines(error: z.ZodError): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
}

let cachedServerEnv: ServerEnv | undefined;

/**
 * Validates and returns the server environment. Throws on the first access if
 * configuration is invalid — call it from a server entry point to fail fast.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  if (typeof window !== "undefined") {
    throw new Error(
      "getServerEnv() was called in the browser. Server environment variables are not available client-side; use publicEnv instead.",
    );
  }

  const parsed = serverSchemaShape.safeParse(process.env);
  const issues = [
    ...(parsed.success ? [] : zodIssueLines(parsed.error)),
    ...productionIssues(process.env),
  ];
  if (issues.length > 0) {
    throw new Error(formatIssues(issues));
  }
  // Unreachable unless parsing succeeded: an unsuccessful parse always yields
  // at least one issue, and the throw above covers it.
  if (!parsed.success) throw new Error(formatIssues(["(root): unknown error"]));

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Test-only: clears the memoised server env so a new process.env can be read. */
export function resetServerEnvCache(): void {
  cachedServerEnv = undefined;
}

/**
 * True when the deterministic in-memory demo dataset should be served instead
 * of the database.
 *
 * The single reader of DEMO_MODE. It is intentionally cheap and independent of
 * `getServerEnv()`: it is called on nearly every server action, and a demo
 * walkthrough must not require a database connection string to be present.
 * The literal `process.env.DEMO_MODE` reference is also what lets Next inline
 * the value into the Edge/proxy bundle.
 *
 * The NODE_ENV test is the important half, and it is not redundant with the
 * boot gate above. Demo mode is not a data-source toggle — it is an
 * authentication bypass: `mock-actions.signInWithPassword` accepts any
 * credentials and `DEMO_ADMIN_USER` carries owner permissions on every module.
 * `productionIssues()` refuses to start a process configured that way, but it
 * only runs where the boot hook runs, and `src/instrumentation.ts` skips both
 * the Edge runtime and the build phase. A single code path that reached this
 * function with DEMO_MODE=true in production — an Edge-rendered route, a
 * prerendered page, a worker started outside the Next lifecycle — would grant
 * an unauthenticated visitor an owner session.
 *
 * So the answer is false in production, unconditionally, and the boot gate
 * remains as the loud signal that the deployment is misconfigured.
 */
export function isDemoMode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.DEMO_MODE === "true";
}

/**
 * Whether a Redis connection is configured.
 *
 * Like `isDemoMode()`, this reads the variable directly rather than going
 * through `getServerEnv()`: it is consulted at module scope when the portal
 * picks a cache strategy, and an optional service must never turn an import
 * into a validation failure.
 */
export function hasRedis(): boolean {
  const url = process.env.REDIS_URL;
  return url !== undefined && url !== "";
}

const ephemeralSecrets = new Map<string, Uint8Array>();

/**
 * Returns the signing key for `name` as bytes.
 *
 * Production: the configured secret, or a hard failure. There is no fallback —
 * a predictable signing key means forgeable approval and share-link tokens.
 * Development/test: a random per-process key, so nothing constant is ever used.
 */
export function getSigningSecret(
  name: "JWT_SECRET" | "SHARE_JWT_SECRET",
): Uint8Array {
  const env = getServerEnv();
  const configured = env[name];
  if (configured) return new TextEncoder().encode(configured);

  // getServerEnv() already rejects a missing secret in production; this guard
  // keeps the invariant explicit and local to where the key is handed out.
  if (env.NODE_ENV === "production") {
    throw new Error(`${name} is required in production.`);
  }

  const existing = ephemeralSecrets.get(name);
  if (existing) return existing;

  const generated = crypto.getRandomValues(new Uint8Array(48));
  ephemeralSecrets.set(name, generated);
  console.warn(
    `[env] ${name} is not set. Using a random key for this process — tokens will not verify after a restart. Set ${name} in .env.local to make them stable.`,
  );
  return generated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Startup diagnostics
// ─────────────────────────────────────────────────────────────────────────────

export type EnvDiagnostics = {
  nodeEnv: ServerEnv["NODE_ENV"];
  demoMode: boolean;
  /** Names of configured variables. Values are never included. */
  configured: string[];
  /** Absent variables whose documented fallback is in effect. */
  usingFallback: string[];
  /** Non-fatal configuration notes worth printing at boot. */
  warnings: string[];
  /** Optional services and whether they are wired up. */
  services: Record<string, "configured" | "not-configured">;
};

/**
 * A redacted, human-readable view of the resolved configuration.
 *
 * Deliberately reports names, never values: the output is printed at boot and
 * served (in reduced form) by /api/health, both of which end up in logs.
 */
export function getEnvDiagnostics(): EnvDiagnostics {
  const env = getServerEnv();
  const isSet = (name: string) => {
    const value = process.env[name];
    return value !== undefined && value !== "";
  };

  const configured: string[] = [];
  const usingFallback: string[] = [];
  const warnings: string[] = [];

  for (const spec of ENV_MANIFEST) {
    if (spec.name === "NODE_ENV") continue;
    if (isSet(spec.name)) configured.push(spec.name);
    else if (spec.requirement !== "development") usingFallback.push(spec.name);
  }

  if (env.NODE_ENV !== "production") {
    for (const name of ["JWT_SECRET", "SHARE_JWT_SECRET"] as const) {
      if (!isSet(name)) {
        warnings.push(
          `${name} is unset — a random per-process key is in use; tokens will not verify across restarts.`,
        );
      }
    }
    if (!isSet("REDIS_URL")) {
      warnings.push(
        "REDIS_URL is unset — rate-limiting runs on the in-memory store (MemoryStore). This is standard for single-instance Antideploy; distributed Redis is required if horizontal scaling is enabled.",
      );
    }
  }

  if (env.NODE_ENV === "production" && !isSet("EGRESS_ALLOWED_HOSTS")) {
    warnings.push(
      "EGRESS_ALLOWED_HOSTS is unset — automation webhooks may reach any public host. Private, loopback and metadata addresses are still refused.",
    );
  }

  if (env.DEMO_MODE === "true") {
    warnings.push(
      "DEMO_MODE is enabled — server actions serve the in-memory demo dataset; the database is not read.",
    );
  }

  for (const issue of publicEnvIssues) {
    warnings.push(`${issue} — the value is being ignored.`);
  }

  if (!isSet("DIRECT_DATABASE_URL")) {
    warnings.push(
      "DIRECT_DATABASE_URL is unset — drizzle-kit migrations will fall back to DATABASE_URL, which fails if that is the transaction pooler.",
    );
  }

  return {
    nodeEnv: env.NODE_ENV,
    demoMode: env.DEMO_MODE === "true",
    configured,
    usingFallback,
    warnings,
    services: {
      supabase: isSet("NEXT_PUBLIC_SUPABASE_URL")
        ? "configured"
        : "not-configured",
      database: isSet("DATABASE_URL") ? "configured" : "not-configured",
      redis: isSet("REDIS_URL") ? "configured" : "not-configured",
      storage: isSet("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET")
        ? "configured"
        : "not-configured",
    },
  };
}

/**
 * The boot gate, called once from src/instrumentation.ts.
 *
 * Validates the server environment (throwing with every problem listed at
 * once), then applies the production-only checks that cannot live in the public
 * schema — those fields must stay optional there so importing this module never
 * breaks a browser bundle, which means production enforcement has to happen
 * somewhere that only ever runs on the server.
 */
export function assertProductionConfig(): void {
  const env = getServerEnv();
  if (env.NODE_ENV !== "production") return;

  const missing = PRODUCTION_REQUIRED_PUBLIC.filter(
    (name) => publicEnv[name] === undefined,
  );
  const insecure = insecureUrlIssues();

  if (missing.length > 0 || publicEnvIssues.length > 0 || insecure.length > 0) {
    const lines = [
      ...missing.map((name) => {
        const spec = MANIFEST_BY_NAME.get(name);
        return `  · ${name}: ${spec?.purpose ?? "required in production"}`;
      }),
      // A malformed value is tolerated at import so pages still render; in
      // production it is a deployment defect, not a degraded mode.
      ...publicEnvIssues.map((issue) => `  · ${issue}`),
      ...insecure.map((issue) => `  · ${issue}`),
    ];
    throw new Error(
      `Invalid environment configuration:\n${lines.join("\n")}\n\nThese are required in production. See .env.example for the full template.`,
    );
  }
}
