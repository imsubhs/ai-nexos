import { describe, it, expect } from "vitest";
import {
  IntegrationGuardError,
  LOCAL_PROJECT_REF,
  assertSafeIntegrationTarget,
  parseRefList,
  projectRefFromDatabaseUrl,
  projectRefFromSupabaseUrl,
} from "../integration/guard";

/**
 * The guard that decides whether the integration suite is allowed to run.
 *
 * A guard nobody has watched refuse is not a guard, so every refusal path is
 * exercised here rather than assumed from reading the code. These tests open no
 * socket: `assertSafeIntegrationTarget` is pure by design precisely so that
 * "does it refuse production?" can be answered without touching production.
 *
 * The project references below are invented. Neither the real production nor
 * the real staging reference appears in this repository — the deny-list is
 * derived at runtime from the developer's own .env.local (see
 * tests/integration/env.ts), so there is nothing to hardcode.
 */

const STAGING = "stagingrefaaaaaaaaaa";
const PRODUCTION = "productionrefbbbbbb";
const UNKNOWN = "someotherrefcccccccc";

/** A well-formed environment aimed at the staging project. */
function stagingEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    NODE_ENV: "test",
    NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-placeholder",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-placeholder",
    DIRECT_DATABASE_URL: `postgresql://postgres.${STAGING}:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
    INTEGRATION_ALLOWED_PROJECT_REFS: STAGING,
    ...overrides,
  };
}

describe("integration guard — CASE 1: valid staging project", () => {
  it("admits a project named in the allow-list", () => {
    const verdict = assertSafeIntegrationTarget(stagingEnv());

    expect(verdict.projectRef).toBe(STAGING);
    expect(verdict.databaseRef).toBe(STAGING);
    expect(verdict.databaseVariable).toBe("DIRECT_DATABASE_URL");
    expect(verdict.allowedRefs).toEqual([STAGING]);
  });

  it("admits it when the allow-list holds several projects", () => {
    const verdict = assertSafeIntegrationTarget(
      stagingEnv({
        INTEGRATION_ALLOWED_PROJECT_REFS: `${UNKNOWN}, ${STAGING}`,
      }),
    );
    expect(verdict.projectRef).toBe(STAGING);
  });

  it("falls back to DATABASE_URL when DIRECT_DATABASE_URL is absent", () => {
    const verdict = assertSafeIntegrationTarget(
      stagingEnv({
        DIRECT_DATABASE_URL: undefined,
        DATABASE_URL: `postgresql://postgres.${STAGING}:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
      }),
    );
    expect(verdict.databaseVariable).toBe("DATABASE_URL");
    expect(verdict.databaseRef).toBe(STAGING);
  });

  it("admits a local Supabase stack when it is named explicitly", () => {
    const verdict = assertSafeIntegrationTarget(
      stagingEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        DIRECT_DATABASE_URL:
          "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
        INTEGRATION_ALLOWED_PROJECT_REFS: LOCAL_PROJECT_REF,
      }),
    );
    expect(verdict.projectRef).toBe(LOCAL_PROJECT_REF);
  });
});

describe("integration guard — CASE 2: production project", () => {
  it("refuses a project on the deny-list even though the URL is well-formed", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION}.supabase.co`,
          DIRECT_DATABASE_URL: `postgresql://postgres.${PRODUCTION}:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        }),
        { deniedProjectRefs: [PRODUCTION] },
      ),
    ).toThrow(IntegrationGuardError);
  });

  it("refuses it even when someone has added it to the allow-list", () => {
    // The deny-list is the layer that must not be defeatable by editing the
    // allow-list, because the allow-list is the thing a mistake edits.
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION}.supabase.co`,
          DIRECT_DATABASE_URL: `postgresql://postgres.${PRODUCTION}:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
          INTEGRATION_ALLOWED_PROJECT_REFS: `${STAGING}, ${PRODUCTION}`,
        }),
        { deniedProjectRefs: [PRODUCTION] },
      ),
    ).toThrow(/deny-list/i);
  });

  it("refuses when only the DATABASE connection points at the denied project", () => {
    // The API URL naming staging while the database names production is the
    // dangerous asymmetry: the destructive writes follow the database.
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          DIRECT_DATABASE_URL: `postgresql://postgres.${PRODUCTION}:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        }),
        { deniedProjectRefs: [PRODUCTION] },
      ),
    ).toThrow(/deny-list/i);
  });

  it("refuses the direct db.<ref>.supabase.co host form too", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          DIRECT_DATABASE_URL: `postgresql://postgres:pw@db.${PRODUCTION}.supabase.co:5432/postgres`,
        }),
        { deniedProjectRefs: [PRODUCTION] },
      ),
    ).toThrow(/deny-list/i);
  });

  it("honours INTEGRATION_DENIED_PROJECT_REFS from the environment", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          INTEGRATION_ALLOWED_PROJECT_REFS: STAGING,
          INTEGRATION_DENIED_PROJECT_REFS: STAGING,
        }),
      ),
    ).toThrow(/deny-list/i);
  });

  it("names the offending project without echoing any credential", () => {
    let message = "";
    try {
      assertSafeIntegrationTarget(
        stagingEnv({
          NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION}.supabase.co`,
          DIRECT_DATABASE_URL: `postgresql://postgres.${PRODUCTION}:sup3rs3cret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        }),
        { deniedProjectRefs: [PRODUCTION] },
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain(PRODUCTION);
    expect(message).not.toContain("sup3rs3cret");
    expect(message).not.toContain("service-role-placeholder");
  });
});

describe("integration guard — CASE 3: unknown project", () => {
  it("refuses a project that is simply not on the allow-list", () => {
    // Not denied, not obviously production — and still refused. "Not known to
    // be dangerous" is the condition every unvetted project satisfies.
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          NEXT_PUBLIC_SUPABASE_URL: `https://${UNKNOWN}.supabase.co`,
          DIRECT_DATABASE_URL: `postgresql://postgres.${UNKNOWN}:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        }),
      ),
    ).toThrow(/not in INTEGRATION_ALLOWED_PROJECT_REFS/);
  });

  it("refuses a local stack that has not been named in the allow-list", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
          DIRECT_DATABASE_URL:
            "postgresql://postgres:postgres@localhost:54322/postgres",
        }),
      ),
    ).toThrow(IntegrationGuardError);
  });

  it("refuses when the API and the database name different projects", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          INTEGRATION_ALLOWED_PROJECT_REFS: `${STAGING}, ${UNKNOWN}`,
          DIRECT_DATABASE_URL: `postgresql://postgres.${UNKNOWN}:pw@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
        }),
      ),
    ).toThrow(/must belong to the same project/);
  });
});

describe("integration guard — CASE 4: missing allow-list", () => {
  it("refuses when INTEGRATION_ALLOWED_PROJECT_REFS is unset", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({ INTEGRATION_ALLOWED_PROJECT_REFS: undefined }),
      ),
    ).toThrow(/INTEGRATION_ALLOWED_PROJECT_REFS is not set/);
  });

  it("refuses when it is set but empty", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({ INTEGRATION_ALLOWED_PROJECT_REFS: "   ,  , " }),
      ),
    ).toThrow(/INTEGRATION_ALLOWED_PROJECT_REFS is not set/);
  });
});

describe("integration guard — CASE 5: NODE_ENV is not test", () => {
  it.each(["production", "development", undefined, ""])(
    "refuses NODE_ENV=%s",
    (nodeEnv) => {
      expect(() =>
        assertSafeIntegrationTarget(stagingEnv({ NODE_ENV: nodeEnv })),
      ).toThrow(/NODE_ENV must be "test"/);
    },
  );

  it("checks NODE_ENV before anything else, so a bad env cannot mask it", () => {
    expect(() =>
      assertSafeIntegrationTarget({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: undefined,
      }),
    ).toThrow(/NODE_ENV must be "test"/);
  });
});

describe("integration guard — CASE 6: malformed Supabase URL", () => {
  it.each([
    ["an unset URL", undefined],
    ["an empty URL", ""],
    ["a bare hostname", "stagingref.supabase.co"],
    ["a nonsense string", "not a url at all"],
    ["a non-http scheme", "ftp://stagingrefaaaaaaaaaa.supabase.co"],
  ])("refuses %s", (_label, url) => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({ NEXT_PUBLIC_SUPABASE_URL: url }),
      ),
    ).toThrow(IntegrationGuardError);
  });

  it("refuses a host whose project reference cannot be determined", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.com",
        }),
      ),
    ).toThrow(/Cannot determine a Supabase project reference/);
  });

  it("refuses plain http:// against a hosted project", () => {
    // The service-role key would travel in clear text.
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          NEXT_PUBLIC_SUPABASE_URL: `http://${STAGING}.supabase.co`,
        }),
      ),
    ).toThrow(/must use https:\/\//);
  });

  it("refuses an unparseable database connection string", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({ DIRECT_DATABASE_URL: "postgres://%%%broken" }),
      ),
    ).toThrow(IntegrationGuardError);
  });

  it("refuses a database host whose project cannot be determined", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({
          DIRECT_DATABASE_URL:
            "postgresql://postgres:pw@db.internal.example.com:5432/postgres",
        }),
      ),
    ).toThrow(/Cannot determine a Supabase project reference/);
  });
});

describe("integration guard — required variables", () => {
  it.each([
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const)("refuses when %s is missing", (name) => {
    expect(() =>
      assertSafeIntegrationTarget(stagingEnv({ [name]: undefined })),
    ).toThrow(new RegExp(`Missing required integration variable.*${name}`));
  });

  it("refuses when no database connection variable is set", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({ DIRECT_DATABASE_URL: undefined, DATABASE_URL: undefined }),
      ),
    ).toThrow(/Neither DIRECT_DATABASE_URL nor DATABASE_URL is set/);
  });

  it("treats a blank value as absent", () => {
    expect(() =>
      assertSafeIntegrationTarget(
        stagingEnv({ SUPABASE_SERVICE_ROLE_KEY: "   " }),
      ),
    ).toThrow(/Missing required integration variable/);
  });
});

describe("project reference derivation", () => {
  it("reads the reference from a hosted Supabase URL", () => {
    expect(projectRefFromSupabaseUrl(`https://${STAGING}.supabase.co`)).toBe(
      STAGING,
    );
  });

  it("maps every loopback form to the local reference", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]) {
      expect(projectRefFromSupabaseUrl(`http://${host}:54321`)).toBe(
        LOCAL_PROJECT_REF,
      );
    }
  });

  it("reads the reference from the pooler username", () => {
    expect(
      projectRefFromDatabaseUrl(
        `postgresql://postgres.${STAGING}:pw@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
        "DATABASE_URL",
      ),
    ).toBe(STAGING);
  });

  it("reads the reference from the direct host", () => {
    expect(
      projectRefFromDatabaseUrl(
        `postgresql://postgres:pw@db.${STAGING}.supabase.co:5432/postgres`,
        "DIRECT_DATABASE_URL",
      ),
    ).toBe(STAGING);
  });

  it("survives a percent-encoded password without leaking it", () => {
    const ref = projectRefFromDatabaseUrl(
      `postgresql://postgres.${STAGING}:p%40ssw0rd%21@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`,
      "DIRECT_DATABASE_URL",
    );
    expect(ref).toBe(STAGING);
  });

  it("parses reference lists tolerantly and normalises case", () => {
    expect(parseRefList(` ${STAGING.toUpperCase()} , ${UNKNOWN}\n`)).toEqual([
      STAGING,
      UNKNOWN,
    ]);
    expect(parseRefList(undefined)).toEqual([]);
    expect(parseRefList("")).toEqual([]);
  });

  it("de-duplicates repeated entries", () => {
    expect(parseRefList(`${STAGING},${STAGING}`)).toEqual([STAGING]);
  });
});
