/**
 * The production deploy gate, exercised the way CI invokes it.
 *
 * `tests/unit/env-validation.test.ts` already covers `assertProductionConfig()`
 * as a function. This file covers the thing the pipeline actually runs:
 * `npm run env:check -- --production` as a process, asserting on its **exit
 * code**. That distinction is the whole point of the gate — a deploy stage is
 * gated on a non-zero exit, not on a thrown error somebody remembered to catch,
 * and a gate that has never been observed rejecting anything is untested
 * (SPRINT-2.4.md M-14, P-02).
 *
 * Two properties of the harness matter:
 *
 *   · The child runs with `cwd` set to an empty temporary directory, so the
 *     `dotenv` call at the top of `scripts/check-env.ts` finds no `.env.local`
 *     and cannot quietly supply the variable a case is trying to remove. Without
 *     this the suite would pass on a developer machine and mean nothing in CI,
 *     where no `.env.local` exists.
 *   · The child's environment is built from scratch rather than inherited, for
 *     the same reason: a real `DATABASE_URL` in the ambient shell would mask a
 *     missing one here.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TSX = path.join(REPO_ROOT, "node_modules", ".bin", "tsx");
const CHECK_ENV = path.join(REPO_ROOT, "scripts", "check-env.ts");

/**
 * A production configuration with every required variable present and valid.
 * Values are syntactically plausible and deliberately fake — the gate under
 * test checks presence and shape, never reachability, so nothing here needs to
 * resolve and no real credential is involved.
 */
const VALID_PRODUCTION_ENV: Readonly<Record<string, string>> = {
  DATABASE_URL:
    "postgresql://postgres.exampleref:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  DIRECT_DATABASE_URL:
    "postgresql://postgres.exampleref:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-placeholder",
  JWT_SECRET: "j".repeat(48),
  SHARE_JWT_SECRET: "s".repeat(48),
  NEXT_PUBLIC_SUPABASE_URL: "https://exampleref.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-placeholder",
  NEXT_PUBLIC_APP_DOMAIN: "app.example.com",
  NEXT_PUBLIC_PORTAL_DOMAIN: "portal.example.com",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  NEXT_PUBLIC_PORTAL_URL: "https://portal.example.com",
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: "documents",
};

let emptyCwd: string;

beforeAll(() => {
  emptyCwd = mkdtempSync(path.join(tmpdir(), "nexos-deploy-gate-"));
});

afterAll(() => {
  rmSync(emptyCwd, { recursive: true, force: true });
});

type GateResult = { status: number; output: string };

function runGate(overrides: Record<string, string | undefined>): GateResult {
  const env: NodeJS.ProcessEnv = {
    // Only what a child process genuinely needs to start.
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    // The script also derives this from `--production`; setting it explicitly
    // mirrors how a deploy runner invokes the gate and keeps the child's
    // environment a complete `ProcessEnv` rather than a partial record.
    NODE_ENV: "production",
    ...VALID_PRODUCTION_ENV,
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }

  const result = spawnSync(TSX, [CHECK_ENV, "--production"], {
    cwd: emptyCwd,
    env,
    encoding: "utf8",
    timeout: 60_000,
  });

  return {
    status: result.status ?? -1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/** Every variable the gate must refuse to deploy without. */
const PRODUCTION_REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
  "SHARE_JWT_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_DOMAIN",
  "NEXT_PUBLIC_PORTAL_DOMAIN",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_PORTAL_URL",
  "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET",
] as const;

describe("production deploy gate (npm run env:check -- --production)", () => {
  it("exits 0 for a complete production configuration", () => {
    const { status, output } = runGate({});
    expect(status, output).toBe(0);
    expect(output).toContain("Valid for production");
  });

  // Table-driven rather than one case each: the point is that *no* required
  // variable can be omitted, and a list makes a future addition to the manifest
  // an obvious one-line change here instead of a silently uncovered variable.
  it.each(PRODUCTION_REQUIRED_VARIABLES)(
    "exits non-zero when %s is absent",
    (name) => {
      const { status, output } = runGate({ [name]: undefined });
      expect(
        status,
        `expected a non-zero exit with ${name} absent\n${output}`,
      ).not.toBe(0);
      expect(output).toContain(name);
    },
  );

  it("treats an empty string as absent", () => {
    const { status, output } = runGate({ NEXT_PUBLIC_APP_URL: "" });
    expect(status, output).not.toBe(0);
    expect(output).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("rejects an http:// application URL", () => {
    const { status, output } = runGate({
      NEXT_PUBLIC_APP_URL: "http://app.example.com",
    });
    expect(status, output).not.toBe(0);
    expect(output).toContain("https://");
  });

  it("rejects an http:// portal URL, which would publish share tokens in clear", () => {
    const { status, output } = runGate({
      NEXT_PUBLIC_PORTAL_URL: "http://portal.example.com",
    });
    expect(status, output).not.toBe(0);
    expect(output).toContain("NEXT_PUBLIC_PORTAL_URL");
  });

  it("rejects a loopback origin", () => {
    const { status, output } = runGate({
      NEXT_PUBLIC_APP_URL: "https://localhost:3000",
    });
    expect(status, output).not.toBe(0);
    expect(output).toContain("localhost");
  });

  it("rejects a bare host that is not an absolute URL", () => {
    const { status, output } = runGate({
      NEXT_PUBLIC_APP_URL: "app.example.com",
    });
    expect(status, output).not.toBe(0);
    expect(output).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("refuses to deploy the demo dataset to production", () => {
    const { status, output } = runGate({ DEMO_MODE: "true" });
    expect(status, output).not.toBe(0);
    expect(output).toContain("DEMO_MODE");
  });

  it("rejects a signing secret below the 32-character minimum", () => {
    const { status, output } = runGate({ JWT_SECRET: "too-short" });
    expect(status, output).not.toBe(0);
    expect(output).toContain("JWT_SECRET");
  });

  it("reports every missing variable in one pass rather than the first", () => {
    const { status, output } = runGate({
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_PORTAL_URL: undefined,
      NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: undefined,
    });
    expect(status, output).not.toBe(0);
    expect(output).toContain("NEXT_PUBLIC_APP_URL");
    expect(output).toContain("NEXT_PUBLIC_PORTAL_URL");
    expect(output).toContain("NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET");
  });

  /**
   * The gate's output lands in CI logs, which are retained and often visible
   * more widely than the secret store. It prints names and states; a value
   * appearing there would be a leak on every run (K-06, P-04).
   */
  it("never echoes a secret value", () => {
    const { output } = runGate({});
    for (const name of [
      "JWT_SECRET",
      "SHARE_JWT_SECRET",
      "SUPABASE_SERVICE_ROLE_KEY",
      "DATABASE_URL",
    ] as const) {
      expect(output).not.toContain(VALID_PRODUCTION_ENV[name]);
    }
  });
});
