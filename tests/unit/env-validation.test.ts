// @vitest-environment node
// Server env validation refuses to run where `window` exists, so this suite
// opts out of the project-wide jsdom environment.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  JWT_SECRET: "a".repeat(48),
  SHARE_JWT_SECRET: "b".repeat(48),
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_APP_DOMAIN: "app.example.com",
  NEXT_PUBLIC_PORTAL_DOMAIN: "portal.example.com",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  NEXT_PUBLIC_PORTAL_URL: "https://portal.example.com",
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: "documents",
};

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
  vi.resetModules();
});

afterEach(() => {
  process.env = originalEnv;
  vi.unstubAllEnvs();
});

/** Loads a fresh copy of the module against the given environment. */
async function loadEnv(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
  // The public and server halves are separate modules (see src/lib/env.ts).
  // Tests exercise both, so hand back the union.
  const [publicHalf, serverHalf] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/env.server"),
  ]);
  return { ...publicHalf, ...serverHalf };
}

describe("server env validation", () => {
  it("accepts a fully configured production environment", async () => {
    const { getServerEnv } = await loadEnv(BASE_ENV);
    const env = getServerEnv();
    expect(env.DATABASE_URL).toBe(BASE_ENV.DATABASE_URL);
    expect(env.NODE_ENV).toBe("production");
  });

  it("fails when DATABASE_URL is missing", async () => {
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      DATABASE_URL: undefined,
    });
    expect(() => getServerEnv()).toThrow(/DATABASE_URL/);
  });

  it("fails in production when JWT_SECRET is missing", async () => {
    // This is the regression guard for the hardcoded fallback that previously
    // signed external review tokens with a constant committed to the repo.
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      JWT_SECRET: undefined,
    });
    expect(() => getServerEnv()).toThrow(
      /JWT_SECRET is required in production/,
    );
  });

  it("fails in production when SHARE_JWT_SECRET is missing", async () => {
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      SHARE_JWT_SECRET: undefined,
    });
    expect(() => getServerEnv()).toThrow(
      /SHARE_JWT_SECRET is required in production/,
    );
  });

  it("rejects a signing secret that is too short to be meaningful", async () => {
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      JWT_SECRET: "short",
    });
    expect(() => getServerEnv()).toThrow(/at least 32 characters/);
  });

  it("rejects an unrecognised DEMO_MODE value", async () => {
    const { getServerEnv } = await loadEnv({ ...BASE_ENV, DEMO_MODE: "yes" });
    expect(() => getServerEnv()).toThrow(/DEMO_MODE/);
  });

  it("treats optional integrations as genuinely optional", async () => {
    // The storage bucket was removed from this list in Sprint 2.4: it is
    // production-required now, because its development default names the only
    // bucket that exists rather than a safe placeholder.
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      REDIS_URL: undefined,
      NEXT_PUBLIC_BUILD_NUMBER: undefined,
    });
    expect(() => getServerEnv()).not.toThrow();
  });

  it("fails in production when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    // The service-role client has no anon-key fallback by design: silently
    // degrading would make the share-link portal read nothing rather than fail.
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });
    expect(() => getServerEnv()).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY is required in production/,
    );
  });

  it("refuses to run the demo dataset in production", async () => {
    const { getServerEnv } = await loadEnv({ ...BASE_ENV, DEMO_MODE: "true" });
    expect(() => getServerEnv()).toThrow(
      /DEMO_MODE must not be "true" in production/,
    );
  });

  it("reports every problem at once rather than the first", async () => {
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      DATABASE_URL: undefined,
      JWT_SECRET: undefined,
      SHARE_JWT_SECRET: undefined,
    });
    let message = "";
    try {
      getServerEnv();
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/DATABASE_URL/);
    expect(message).toMatch(/JWT_SECRET/);
    expect(message).toMatch(/SHARE_JWT_SECRET/);
  });

  it("does not require signing secrets outside production", async () => {
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      NODE_ENV: "development",
      JWT_SECRET: undefined,
      SHARE_JWT_SECRET: undefined,
    });
    expect(() => getServerEnv()).not.toThrow();
  });
});

describe("getSigningSecret", () => {
  it("returns the configured secret as bytes", async () => {
    const { getSigningSecret } = await loadEnv(BASE_ENV);
    expect(getSigningSecret("JWT_SECRET")).toEqual(
      new TextEncoder().encode(BASE_ENV.JWT_SECRET),
    );
  });

  it("issues a stable random key per process in development", async () => {
    const { getSigningSecret } = await loadEnv({
      ...BASE_ENV,
      NODE_ENV: "development",
      JWT_SECRET: undefined,
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const first = getSigningSecret("JWT_SECRET");
    const second = getSigningSecret("JWT_SECRET");

    // Stable within the process, so tokens verify across calls...
    expect(second).toEqual(first);
    expect(first).toHaveLength(48);
    // ...and never the old committed constant.
    expect(new TextDecoder().decode(first)).not.toContain("default_");
  });

  it("keeps the two signing keys independent", async () => {
    const { getSigningSecret } = await loadEnv({
      ...BASE_ENV,
      NODE_ENV: "development",
      JWT_SECRET: undefined,
      SHARE_JWT_SECRET: undefined,
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getSigningSecret("JWT_SECRET")).not.toEqual(
      getSigningSecret("SHARE_JWT_SECRET"),
    );
  });
});

describe("isDemoMode", () => {
  it('is true only for the exact string "true"', async () => {
    for (const [value, expected] of [
      ["true", true],
      ["false", false],
      ["TRUE", false],
      [undefined, false],
    ] as const) {
      const { isDemoMode } = await loadEnv({
        ...BASE_ENV,
        NODE_ENV: "development",
        DEMO_MODE: value,
      });
      expect(isDemoMode()).toBe(expected);
    }
  });
});

describe("requirePublicEnv", () => {
  it("returns a configured value", async () => {
    const { requirePublicEnv } = await loadEnv(BASE_ENV);
    expect(requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL")).toBe(
      "https://project.supabase.co",
    );
  });

  it("names the missing variable instead of failing inside a third-party client", async () => {
    const { requirePublicEnv } = await loadEnv({
      ...BASE_ENV,
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    });
    expect(() => requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY is not set/,
    );
  });

  it("treats an empty string as unset", async () => {
    const { requirePublicEnv } = await loadEnv({
      ...BASE_ENV,
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "",
    });
    expect(() => requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL")).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL is not set/,
    );
  });
});

describe("getStorageBucket", () => {
  it("falls back to the default bucket", async () => {
    const { getStorageBucket, DEFAULT_STORAGE_BUCKET } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: undefined,
    });
    expect(getStorageBucket()).toBe(DEFAULT_STORAGE_BUCKET);
  });

  it("defaults to the bucket that actually exists", async () => {
    // Sprint 2.3 verified `documents` live. The previous default was
    // `nexos-assets`, which has never existed in this project — so an unset
    // variable produced an app that booted green and failed every transfer.
    const { getStorageBucket, DEFAULT_STORAGE_BUCKET } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: undefined,
    });
    expect(DEFAULT_STORAGE_BUCKET).toBe("documents");
    expect(getStorageBucket()).toBe("documents");
  });

  it("prefers the configured bucket", async () => {
    const { getStorageBucket } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: "documents",
    });
    expect(getStorageBucket()).toBe("documents");
  });
});

describe("assertProductionConfig", () => {
  it("passes for a fully configured production environment", async () => {
    const { assertProductionConfig } = await loadEnv(BASE_ENV);
    expect(() => assertProductionConfig()).not.toThrow();
  });

  it("fails when a production-required public variable is absent", async () => {
    // These stay optional in the public schema so importing the module never
    // breaks a browser bundle; production enforcement happens here instead.
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_PORTAL_DOMAIN: undefined,
    });
    expect(() => assertProductionConfig()).toThrow(/NEXT_PUBLIC_PORTAL_DOMAIN/);
  });

  it("is a no-op outside production", async () => {
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_APP_DOMAIN: undefined,
      NEXT_PUBLIC_PORTAL_DOMAIN: undefined,
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_PORTAL_URL: undefined,
      NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: undefined,
    });
    expect(() => assertProductionConfig()).not.toThrow();
  });
});

/**
 * Sprint 2.4, gate G2.4-1.
 *
 * These three were declared `production` (or, for the bucket, `optional` with a
 * default naming a bucket that does not exist) and enforced nowhere. Each has a
 * development fallback that is silently wrong in production, so absence
 * produced a deployment that booted green and failed at the first login, share
 * link or upload.
 */
describe("assertProductionConfig — Sprint 2.4 enforcement", () => {
  it("fails in production when NEXT_PUBLIC_APP_URL is missing", async () => {
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_APP_URL: undefined,
    });
    expect(() => assertProductionConfig()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("fails in production when NEXT_PUBLIC_PORTAL_URL is missing", async () => {
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_PORTAL_URL: undefined,
    });
    expect(() => assertProductionConfig()).toThrow(/NEXT_PUBLIC_PORTAL_URL/);
  });

  it("fails in production when NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET is missing", async () => {
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: undefined,
    });
    expect(() => assertProductionConfig()).toThrow(
      /NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET/,
    );
  });

  it("reports all three in a single failure", async () => {
    // One redeploy per missing variable is the failure mode this whole module
    // exists to avoid.
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_PORTAL_URL: undefined,
      NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: undefined,
    });

    let message = "";
    try {
      assertProductionConfig();
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/NEXT_PUBLIC_APP_URL/);
    expect(message).toMatch(/NEXT_PUBLIC_PORTAL_URL/);
    expect(message).toMatch(/NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET/);
  });

  it("rejects a malformed NEXT_PUBLIC_APP_URL", async () => {
    // A bare host parsed fine as a string and then failed at request time
    // inside the auth callback, where `new URL(path, base)` needs an origin.
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_APP_URL: "app.example.com",
    });
    expect(() => assertProductionConfig()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejects a malformed NEXT_PUBLIC_PORTAL_URL", async () => {
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_PORTAL_URL: "not a url",
    });
    expect(() => assertProductionConfig()).toThrow(/NEXT_PUBLIC_PORTAL_URL/);
  });

  it("rejects an http:// application URL in production", async () => {
    // This is the exact value the old fallback produced.
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_APP_URL: "http://app.example.com",
    });
    expect(() => assertProductionConfig()).toThrow(/https/);
  });

  it("rejects an http:// portal URL in production", async () => {
    // Share links are built from this value and carry an unauthenticated
    // credential, so an unencrypted origin is a disclosure, not a downgrade.
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_PORTAL_URL: "http://portal.example.com",
    });
    expect(() => assertProductionConfig()).toThrow(/https/);
  });

  it("rejects a loopback URL in production", async () => {
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NEXT_PUBLIC_APP_URL: "https://localhost:3000",
    });
    expect(() => assertProductionConfig()).toThrow(/localhost/);
  });

  it("still accepts a correctly configured production environment", async () => {
    const { assertProductionConfig } = await loadEnv(BASE_ENV);
    expect(() => assertProductionConfig()).not.toThrow();
  });

  it("leaves development free to use the http fallbacks", async () => {
    // Local development runs on http://localhost:3000 and
    // http://portal.localhost:3000. Enforcement is production-only by design.
    const { assertProductionConfig } = await loadEnv({
      ...BASE_ENV,
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_PORTAL_URL: "http://portal.localhost:3000",
    });
    expect(() => assertProductionConfig()).not.toThrow();
  });
});

describe("getEnvDiagnostics", () => {
  it("reports names and never values", async () => {
    const { getEnvDiagnostics } = await loadEnv(BASE_ENV);
    const diagnostics = getEnvDiagnostics();
    const serialised = JSON.stringify(diagnostics);

    expect(diagnostics.configured).toContain("DATABASE_URL");
    expect(diagnostics.configured).toContain("JWT_SECRET");
    expect(serialised).not.toContain(BASE_ENV.JWT_SECRET);
    expect(serialised).not.toContain(BASE_ENV.DATABASE_URL);
    expect(serialised).not.toContain(BASE_ENV.SUPABASE_SERVICE_ROLE_KEY);
  });

  it("lists absent optional variables as fallbacks, not failures", async () => {
    const { getEnvDiagnostics } = await loadEnv({
      ...BASE_ENV,
      REDIS_URL: undefined,
    });
    const diagnostics = getEnvDiagnostics();
    expect(diagnostics.usingFallback).toContain("REDIS_URL");
    expect(diagnostics.services.redis).toBe("not-configured");
  });

  it("warns about ephemeral signing keys in development", async () => {
    const { getEnvDiagnostics } = await loadEnv({
      ...BASE_ENV,
      NODE_ENV: "development",
      JWT_SECRET: undefined,
    });
    expect(getEnvDiagnostics().warnings.join(" ")).toMatch(
      /JWT_SECRET is unset/,
    );
  });
});
