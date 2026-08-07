// @vitest-environment node
// Server env validation refuses to run where `window` exists, so this suite
// opts out of the project-wide jsdom environment.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  JWT_SECRET: "a".repeat(48),
  SHARE_JWT_SECRET: "b".repeat(48),
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
  return import("@/lib/env");
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
    expect(() => getServerEnv()).toThrow(/JWT_SECRET is required in production/);
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
    const { getServerEnv } = await loadEnv({ ...BASE_ENV, JWT_SECRET: "short" });
    expect(() => getServerEnv()).toThrow(/at least 32 characters/);
  });

  it("rejects an unrecognised DEMO_MODE value", async () => {
    const { getServerEnv } = await loadEnv({ ...BASE_ENV, DEMO_MODE: "yes" });
    expect(() => getServerEnv()).toThrow(/DEMO_MODE/);
  });

  it("treats optional integrations as genuinely optional", async () => {
    const { getServerEnv } = await loadEnv({
      ...BASE_ENV,
      REDIS_URL: undefined,
      RESEND_API_KEY: undefined,
      SENTRY_DSN: undefined,
    });
    expect(() => getServerEnv()).not.toThrow();
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
