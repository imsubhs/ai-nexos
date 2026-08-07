/**
 * Environment validation (Phase 1 repository hardening).
 *
 * Two schemas, deliberately separated:
 *
 *   publicEnv  — NEXT_PUBLIC_* only. Safe in the browser bundle. Every value is
 *                referenced as a literal `process.env.NEXT_PUBLIC_X` so Next's
 *                build-time inlining still works (dynamic lookup would not).
 *   serverEnv  — secrets and connection strings. Validated lazily on first
 *                access and cached, so importing this module never throws in a
 *                context that only needs the public half.
 *
 * The point of this module is to turn "silently wrong in production" into a
 * loud failure. The previous behaviour — signing JWTs with a fallback constant
 * committed to the repository — is exactly what the required-secret rules below
 * exist to prevent.
 */

import { z } from "zod";

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

/** Secrets with no safe default: absent in production is a hard failure. */
const PRODUCTION_REQUIRED = ["JWT_SECRET", "SHARE_JWT_SECRET"] as const;

const serverSchemaShape = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Transaction-mode pooler connection used by the Drizzle client.
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Supabase pooler, port 6543)"),
  // Direct connection; only drizzle-kit migrations need it.
  DIRECT_DATABASE_URL: z.string().optional(),

  // Server-only Supabase key. Bypasses RLS — never expose to the browser.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  JWT_SECRET: signingSecret("JWT_SECRET"),
  SHARE_JWT_SECRET: signingSecret("SHARE_JWT_SECRET"),

  // Optional integrations; absence is a supported configuration.
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),

  // Seeds the demo data path. Read in ~190 call sites as a raw string; parsed
  // here only so an unexpected value surfaces at boot instead of silently
  // falling through to the live path.
  DEMO_MODE: z.enum(["true", "false"]).optional(),
});

/**
 * Applied after the shape parses, so the check sees the resolved NODE_ENV
 * rather than a value captured when this module happened to be imported.
 */
const serverSchema = serverSchemaShape.superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") return;
  for (const name of PRODUCTION_REQUIRED) {
    if (!env[name]) {
      ctx.addIssue({
        code: "custom",
        path: [name],
        message: `${name} is required in production. Generate one with: openssl rand -base64 48`,
      });
    }
  }
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_PORTAL_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_PORTAL_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_BUILD_NUMBER: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type PublicEnv = z.infer<typeof publicSchema>;

function formatIssues(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `  · ${path}: ${issue.message}`;
  });
  return `Invalid environment configuration:\n${lines.join("\n")}\n\nSee .env.example for the full template.`;
}

/**
 * Literal references only — Next replaces these at build time. Do not rewrite
 * as a loop over key names; the values would be `undefined` in the browser.
 */
export const publicEnv: PublicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
  NEXT_PUBLIC_PORTAL_DOMAIN: process.env.NEXT_PUBLIC_PORTAL_DOMAIN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_PORTAL_URL: process.env.NEXT_PUBLIC_PORTAL_URL,
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
  NEXT_PUBLIC_BUILD_NUMBER: process.env.NEXT_PUBLIC_BUILD_NUMBER,
});

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

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(formatIssues(parsed.error));
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Test-only: clears the memoised server env so a new process.env can be read. */
export function resetServerEnvCache(): void {
  cachedServerEnv = undefined;
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
