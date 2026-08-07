/**
 * Public environment configuration — client-safe.
 *
 * Everything in this module is either a NEXT_PUBLIC_* value or derived from one,
 * so it is safe to import from a client component, the proxy or next.config.ts.
 * Server secrets, their validation and the startup gate live in
 * `src/lib/env.server.ts`, which is never reachable from a browser bundle.
 *
 * The split is deliberate: when both halves lived in one module, importing it
 * from the browser Supabase client pulled the server schema — and the names of
 * every secret — into a client chunk. Values were never exposed, but shipping
 * that surface to the browser at all is the wrong default.
 *
 * Parsing here is non-fatal by construction. Every field is optional and a
 * malformed value is dropped rather than thrown, so a misconfigured deployment
 * still renders; it fails at the point of use with a message that names the
 * variable (`requirePublicEnv`) and loudly at boot (`assertProductionConfig`).
 */

import { z } from "zod";

/** Bucket used when NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET is not configured. */
export const DEFAULT_STORAGE_BUCKET = "nexos-assets";

/**
 * Why each public variable exists, used to build the error `requirePublicEnv`
 * throws. Kept here rather than read from ENV_MANIFEST so the full manifest —
 * which describes server secrets too — stays out of client bundles.
 */
const PUBLIC_PURPOSE: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL:
    "Supabase project URL, from Project Settings › API.",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    "Supabase anon/publishable key, from Project Settings › API.",
  NEXT_PUBLIC_APP_DOMAIN: "Internal dashboard host, e.g. app.example.com.",
  NEXT_PUBLIC_PORTAL_DOMAIN: "Client portal host, e.g. portal.example.com.",
  NEXT_PUBLIC_APP_URL: "Absolute dashboard URL.",
  NEXT_PUBLIC_PORTAL_URL: "Absolute portal URL, used to build share links.",
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: "Supabase Storage bucket for uploads.",
  NEXT_PUBLIC_BUILD_NUMBER: "Build identifier surfaced by /api/health.",
};

/**
 * An unset variable and one set to the empty string mean the same thing here.
 * Deployment platforms routinely inject `KEY=""` for a variable that was
 * declared but left blank, and treating that as a present-but-invalid value is
 * what previously turned a blank NEXT_PUBLIC_SUPABASE_URL into a crash at
 * module import rather than a missing-configuration message at the point of use.
 */
const blankAsAbsent = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: blankAsAbsent(
    z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL").optional(),
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: blankAsAbsent(z.string().optional()),
  NEXT_PUBLIC_APP_DOMAIN: blankAsAbsent(z.string().optional()),
  NEXT_PUBLIC_PORTAL_DOMAIN: blankAsAbsent(z.string().optional()),
  NEXT_PUBLIC_APP_URL: blankAsAbsent(z.string().optional()),
  NEXT_PUBLIC_PORTAL_URL: blankAsAbsent(z.string().optional()),
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: blankAsAbsent(z.string().optional()),
  NEXT_PUBLIC_BUILD_NUMBER: blankAsAbsent(z.string().optional()),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type PublicEnvKey = keyof PublicEnv;

/**
 * Literal references only — Next replaces these at build time. Do not rewrite
 * as a loop over key names; the values would be `undefined` in the browser.
 */
const rawPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
  NEXT_PUBLIC_PORTAL_DOMAIN: process.env.NEXT_PUBLIC_PORTAL_DOMAIN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_PORTAL_URL: process.env.NEXT_PUBLIC_PORTAL_URL,
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
  NEXT_PUBLIC_BUILD_NUMBER: process.env.NEXT_PUBLIC_BUILD_NUMBER,
};

const parsedPublicEnv = publicSchema.safeParse(rawPublicEnv);

/**
 * Problems found in the public configuration, as readable lines.
 *
 * A malformed public value must not throw here. This module is imported by
 * client components, the proxy and next.config.ts; a throw at import time
 * replaces every page with an unrelated build/render error that names no
 * variable. Instead the offending field is dropped, the problem is recorded,
 * and it becomes fatal at the two places where that is useful: `getEnvDiagnostics()`
 * (logged at boot, served by /api/health) and `assertProductionConfig()`.
 */
export const publicEnvIssues: readonly string[] = parsedPublicEnv.success
  ? []
  : parsedPublicEnv.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );

/**
 * The validated public environment. Every field is optional, so an
 * unconfigured deployment still renders and fails at the point of use with a
 * message that names the variable (see `requirePublicEnv`).
 */
export const publicEnv: PublicEnv = parsedPublicEnv.success
  ? parsedPublicEnv.data
  : // Keep the fields that parsed; drop the ones that did not, so a bad value
    // behaves exactly like an absent one.
    (() => {
      const rejected = new Set(
        parsedPublicEnv.error.issues.map((issue) => String(issue.path[0])),
      );
      const kept: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(rawPublicEnv)) {
        kept[key] = rejected.has(key) || value === "" ? undefined : value;
      }
      return kept as PublicEnv;
    })();

/**
 * Reads a public variable that the calling code genuinely cannot work without,
 * failing with a message that names the variable and how to obtain it.
 *
 * This replaces the `process.env.X!` non-null assertions that used to be spread
 * across the Supabase clients, where a missing value surfaced as an opaque
 * third-party error ("supabaseUrl is required") with no indication of which
 * deployment setting was wrong.
 */
export function requirePublicEnv<K extends PublicEnvKey>(
  name: K,
): NonNullable<PublicEnv[K]> {
  const value = publicEnv[name];
  if (value === undefined || value === "") {
    const purpose = PUBLIC_PURPOSE[name] ?? "";
    throw new Error(
      `${name} is not set. ${purpose} Add it to .env.local for local development, or to the deployment's environment variables. See .env.example.`.replace(
        /\s+/g,
        " ",
      ),
    );
  }
  return value as NonNullable<PublicEnv[K]>;
}

/**
 * The Supabase Storage bucket backing uploads. Configuration rather than a
 * hardcoded provider default, so a deployment can point at its own bucket
 * without a code change.
 */
export function getStorageBucket(): string {
  return (
    publicEnv.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET
  );
}
