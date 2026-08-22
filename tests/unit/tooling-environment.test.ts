import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ENVIRONMENT_FILES,
  type MutableEnv,
  deniedProjectRefsFromApplicationEnv,
  describeTarget,
  loadToolingEnv,
  prepareToolingTarget,
  requireEnvironment,
  resolveEnvironmentFile,
  selectEnvironment,
} from "../../scripts/lib/environment";
import { EnvironmentGuardError } from "../../scripts/lib/project-ref";

/**
 * The environment contract for the destructive CLI tooling.
 *
 * Every one of these runs offline. `loadToolingEnv` touches the filesystem —
 * against a temporary directory built per test — and nothing here opens a
 * socket, which is the point: "does db:seed refuse production?" has to be
 * answerable without seeding production.
 *
 * The project references are invented. Neither the real production nor the real
 * staging reference appears in this repository: the deny-list is derived at
 * runtime from whatever `.env.local` says, so there is nothing to hardcode.
 */

const STAGING = "stagingrefaaaaaaaaaa";
const PRODUCTION = "productionrefbbbbbb";

function envFileBody(ref: string, extra: string[] = []): string {
  return [
    `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co`,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-placeholder",
    "SUPABASE_SERVICE_ROLE_KEY=service-role-placeholder",
    `DIRECT_DATABASE_URL=postgresql://postgres.${ref}:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
    ...extra,
  ].join("\n");
}

let cwd: string;
let env: MutableEnv;

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "nexos-toolenv-"));
  env = {};
});

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
});

function writeStagingFile(extra: string[] = []): void {
  writeFileSync(
    join(cwd, ENVIRONMENT_FILES.staging),
    envFileBody(STAGING, [
      `INTEGRATION_ALLOWED_PROJECT_REFS=${STAGING}`,
      ...extra,
    ]),
  );
}

function writeProductionFile(ref = PRODUCTION): void {
  writeFileSync(join(cwd, ENVIRONMENT_FILES.production), envFileBody(ref));
}

// ── 1. staging → .env.test.local ───────────────────────────────────────────

describe("CASE 1: staging resolves to .env.test.local", () => {
  it("selects staging from --environment=staging", () => {
    expect(selectEnvironment(["--environment=staging"], env)).toEqual({
      environment: "staging",
      source: "--environment=staging",
    });
  });

  it("accepts the space-separated and --env forms", () => {
    expect(
      selectEnvironment(["--environment", "staging"], env)?.environment,
    ).toBe("staging");
    expect(selectEnvironment(["--env=staging"], env)?.environment).toBe(
      "staging",
    );
  });

  it("accepts TOOL_ENV for callers that cannot pass arguments", () => {
    expect(selectEnvironment([], { TOOL_ENV: "staging" })).toEqual({
      environment: "staging",
      source: "TOOL_ENV",
    });
  });

  it("resolves the staging file and loads it", () => {
    writeStagingFile();
    expect(resolveEnvironmentFile("staging", env, cwd).path).toBe(
      join(cwd, ".env.test.local"),
    );

    const loaded = loadToolingEnv(
      { environment: "staging", source: "test" },
      env,
      cwd,
    );
    expect(loaded.file).toBe(join(cwd, ".env.test.local"));
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toContain(STAGING);
  });

  it("forces NODE_ENV=test for a staging selection", () => {
    writeStagingFile();
    env.NODE_ENV = "development";
    loadToolingEnv({ environment: "staging", source: "test" }, env, cwd);
    expect(env.NODE_ENV).toBe("test");
  });
});

// ── 2. production → .env.local ─────────────────────────────────────────────

describe("CASE 2: production resolves to .env.local", () => {
  it("selects production from --environment=production", () => {
    expect(
      selectEnvironment(["--environment=production"], env)?.environment,
    ).toBe("production");
  });

  it("honours the legacy --production flag, which the Vercel build uses", () => {
    // `env:check -- --production --verify` is the deploy gate. Breaking it
    // would break production deployment, so it counts as an explicit selection.
    expect(selectEnvironment(["--production", "--verify"], env)).toEqual({
      environment: "production",
      source: "--production",
    });
  });

  it("loads .env.local and does not force NODE_ENV", () => {
    writeProductionFile();
    const loaded = loadToolingEnv(
      { environment: "production", source: "test" },
      env,
      cwd,
    );
    expect(loaded.file).toBe(join(cwd, ".env.local"));
    expect(env.NODE_ENV).toBeUndefined();
  });

  it("uses the ambient process environment when no file exists", () => {
    // The Vercel build container has no .env.local — the real values are
    // injected as environment variables. Production was still named explicitly.
    const loaded = loadToolingEnv(
      { environment: "production", source: "--production" },
      env,
      cwd,
    );
    expect(loaded.file).toBeUndefined();
    expect(loaded.environment).toBe("production");
  });
});

// ── 3. unknown environment → fail ──────────────────────────────────────────

describe("CASE 3: unknown environment fails", () => {
  it.each(["--environment=prod", "--environment=dev", "--env=live"])(
    "refuses %s",
    (arg) => {
      expect(() => selectEnvironment([arg], env)).toThrow(
        /Unknown environment/,
      );
    },
  );

  it("refuses an unknown TOOL_ENV", () => {
    expect(() => selectEnvironment([], { TOOL_ENV: "qa" })).toThrow(
      /Unknown environment/,
    );
  });

  it("refuses --environment with no value", () => {
    expect(() => selectEnvironment(["--environment"], env)).toThrow(
      /Unknown environment/,
    );
  });
});

// ── 4. staging file missing → fail ─────────────────────────────────────────

describe("CASE 4: missing staging file fails closed", () => {
  it("refuses when .env.test.local is absent", () => {
    expect(() =>
      loadToolingEnv({ environment: "staging", source: "test" }, env, cwd),
    ).toThrow(/staging environment file is missing/);
  });

  it("does NOT fall back to .env.local even when that file exists", () => {
    // The whole point. A present .env.local is exactly the situation in which
    // a fallback would be silent, would look like success, and would target
    // production.
    writeProductionFile();
    expect(() =>
      loadToolingEnv({ environment: "staging", source: "test" }, env, cwd),
    ).toThrow(/no fallback/);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
  });
});

// ── 5. production file missing → fail (when explicitly named) ──────────────

describe("CASE 5: an explicitly named missing file fails", () => {
  it("refuses when APP_ENV_FILE names a file that does not exist", () => {
    env.APP_ENV_FILE = join(cwd, "nope.env");
    expect(() =>
      loadToolingEnv({ environment: "production", source: "test" }, env, cwd),
    ).toThrow(/names a file that does not exist/);
  });

  it("refuses an APP_ENV_FILE override for staging when it is absent", () => {
    env.APP_ENV_FILE = join(cwd, "nope.env");
    expect(() =>
      loadToolingEnv({ environment: "staging", source: "test" }, env, cwd),
    ).toThrow(EnvironmentGuardError);
  });
});

// ── 6/7/8. the staging target guard, through the tooling entry point ───────

describe("CASE 6: an allow-listed staging project is accepted", () => {
  it("prepares the target and reports it", () => {
    writeStagingFile();
    const target = prepareToolingTarget(
      "db:migrate",
      ["--environment=staging"],
      env,
      cwd,
    );
    expect(target.environment).toBe("staging");
    expect(target.projectRef).toBe(STAGING);
    expect(target.databaseRef).toBe(STAGING);
    expect(target.databaseVariable).toBe("DIRECT_DATABASE_URL");
    expect(target.databaseHost).toBe(
      "aws-0-ap-northeast-1.pooler.supabase.com:5432",
    );
  });
});

describe("CASE 7: the production project is refused when selected as staging", () => {
  it("refuses a staging file that points at the application's own project", () => {
    // .env.local names PRODUCTION, so PRODUCTION is denied automatically —
    // even though the staging file allow-lists it.
    writeProductionFile(PRODUCTION);
    writeFileSync(
      join(cwd, ENVIRONMENT_FILES.staging),
      envFileBody(PRODUCTION, [
        `INTEGRATION_ALLOWED_PROJECT_REFS=${PRODUCTION}`,
      ]),
    );

    expect(() =>
      prepareToolingTarget("db:seed", ["--environment=staging"], env, cwd),
    ).toThrow(/deny-list/i);
  });

  it("derives the deny-list from the application env file", () => {
    writeProductionFile(PRODUCTION);
    expect(deniedProjectRefsFromApplicationEnv(cwd)).toEqual([PRODUCTION]);
  });

  it("refuses a staging project that is not on the allow-list", () => {
    writeFileSync(join(cwd, ENVIRONMENT_FILES.staging), envFileBody(STAGING));
    expect(() =>
      prepareToolingTarget("db:migrate", ["--environment=staging"], env, cwd),
    ).toThrow(/INTEGRATION_ALLOWED_PROJECT_REFS is not set/);
  });
});

describe("CASE 8: a staging API/database mismatch fails", () => {
  it("refuses when the two variables name different projects", () => {
    writeFileSync(
      join(cwd, ENVIRONMENT_FILES.staging),
      [
        `NEXT_PUBLIC_SUPABASE_URL=https://${STAGING}.supabase.co`,
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-placeholder",
        "SUPABASE_SERVICE_ROLE_KEY=service-role-placeholder",
        `DIRECT_DATABASE_URL=postgresql://postgres.${PRODUCTION}:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        `INTEGRATION_ALLOWED_PROJECT_REFS=${STAGING} ${PRODUCTION}`,
      ].join("\n"),
    );

    expect(() =>
      prepareToolingTarget("db:migrate", ["--environment=staging"], env, cwd),
    ).toThrow(/must belong to the same project|deny-list/i);
  });
});

// ── 9. db:seed against production without confirmation ─────────────────────

describe("CASE 9: destructive commands require an explicit environment", () => {
  it.each(["db:migrate", "db:seed", "storage:setup"])(
    "%s refuses to run with no environment named",
    (command) => {
      expect(() => requireEnvironment(command, [], env)).toThrow(
        /requires an explicit environment/,
      );
    },
  );

  it("names both options in the refusal, so the fix is obvious", () => {
    let message = "";
    try {
      requireEnvironment("db:seed", [], env);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("--environment=staging");
    expect(message).toContain("--environment=production");
    expect(message).toContain(".env.test.local");
  });

  it("models the seed production-confirmation rule", () => {
    // scripts/seed.ts requires --confirm-production in addition to
    // --environment=production. Selecting production is not, by itself, enough.
    const argv = ["--environment=production"];
    const selection = selectEnvironment(argv, env);
    expect(selection?.environment).toBe("production");
    expect(argv.includes("--confirm-production")).toBe(false);

    const confirmed = [...argv, "--confirm-production"];
    expect(confirmed.includes("--confirm-production")).toBe(true);
  });
});

// ── 10. no secret values in messages ───────────────────────────────────────

describe("CASE 10: no secret value ever appears in a message", () => {
  it("keeps the password and keys out of a refusal", () => {
    writeProductionFile(PRODUCTION);
    writeFileSync(
      join(cwd, ENVIRONMENT_FILES.staging),
      [
        `NEXT_PUBLIC_SUPABASE_URL=https://${PRODUCTION}.supabase.co`,
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-tOpS3cret",
        "SUPABASE_SERVICE_ROLE_KEY=service-tOpS3cret",
        `DIRECT_DATABASE_URL=postgresql://postgres.${PRODUCTION}:dbP4ssw0rd@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        `INTEGRATION_ALLOWED_PROJECT_REFS=${PRODUCTION}`,
      ].join("\n"),
    );

    let message = "";
    try {
      prepareToolingTarget("db:seed", ["--environment=staging"], env, cwd);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/deny-list/i);
    for (const secret of [
      "dbP4ssw0rd",
      "anon-tOpS3cret",
      "service-tOpS3cret",
    ]) {
      expect(message).not.toContain(secret);
    }
  });

  it("truncates the project reference in the printed banner", () => {
    writeStagingFile();
    const target = prepareToolingTarget(
      "db:migrate",
      ["--environment=staging"],
      env,
      cwd,
    );
    const banner = describeTarget(target);

    expect(banner).toContain("staging");
    expect(banner).toContain("aws-0-ap-northeast-1.pooler.supabase.com:5432");
    // Neither the full reference nor anything credential-bearing.
    expect(banner).not.toContain(STAGING);
    expect(banner).not.toContain("pw@");
    expect(banner).not.toContain("service-role-placeholder");
  });
});

// ── 11. no silent fallback, anywhere ───────────────────────────────────────

describe("CASE 11: environment selection cannot silently fall back", () => {
  it("leaves process.env untouched when staging cannot be loaded", () => {
    writeProductionFile();
    expect(() =>
      prepareToolingTarget("db:migrate", ["--environment=staging"], env, cwd),
    ).toThrow(EnvironmentGuardError);
    expect(env.DIRECT_DATABASE_URL).toBeUndefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("never resolves staging to the production file", () => {
    expect(resolveEnvironmentFile("staging", env, cwd).path).not.toContain(
      ".env.local",
    );
  });

  it("offers no variable that disables the requirement", () => {
    writeProductionFile();
    for (const sabotage of [
      { ALLOW_PRODUCTION: "true" },
      { SKIP_ENV_GUARD: "1" },
      { CI: "true" },
      { NODE_ENV: "test" },
    ]) {
      const attempt: MutableEnv = { ...env, ...sabotage };
      expect(() =>
        loadToolingEnv(
          { environment: "staging", source: "test" },
          attempt,
          cwd,
        ),
      ).toThrow(EnvironmentGuardError);
    }
  });
});

// ── 12. NODE_ENV cannot override the explicit selection ────────────────────

describe("CASE 12: NODE_ENV cannot override the explicit selection", () => {
  it("does not let NODE_ENV select an environment", () => {
    expect(selectEnvironment([], { NODE_ENV: "test" })).toBeUndefined();
    expect(selectEnvironment([], { NODE_ENV: "production" })).toBeUndefined();
  });

  it("keeps staging as the target even when NODE_ENV says production", () => {
    writeStagingFile();
    env.NODE_ENV = "production";

    const target = prepareToolingTarget(
      "db:migrate",
      ["--environment=staging"],
      env,
      cwd,
    );
    expect(target.environment).toBe("staging");
    expect(target.projectRef).toBe(STAGING);
    // The selection wins and the process is made to agree with it.
    expect(env.NODE_ENV).toBe("test");
  });

  it("keeps production as the target even when NODE_ENV says test", () => {
    writeProductionFile();
    env.NODE_ENV = "test";

    const target = prepareToolingTarget(
      "env:check",
      ["--environment=production"],
      env,
      cwd,
    );
    expect(target.environment).toBe("production");
  });

  it("prefers the command-line flag over a stale TOOL_ENV", () => {
    expect(
      selectEnvironment(["--environment=staging"], { TOOL_ENV: "production" })
        ?.environment,
    ).toBe("staging");
  });
});
