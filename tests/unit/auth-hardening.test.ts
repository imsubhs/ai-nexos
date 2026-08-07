import { describe, expect, it } from "vitest";
import {
  DEMO_SESSION_COOKIE,
  demoSessionCookieOptions,
  isDemoSessionValue,
} from "@/features/auth/demo-session";
import { safeInternalPath } from "@/features/auth/redirect";

describe("demo session cookie", () => {
  it("is inaccessible to scripts", () => {
    // features/auth/mock-actions.ts previously set this with `path` alone, so
    // any script on the page could read it — and forge it.
    expect(demoSessionCookieOptions().httpOnly).toBe(true);
  });

  it("does not ride along with cross-site subrequests", () => {
    expect(demoSessionCookieOptions().sameSite).toBe("lax");
  });

  it("expires on its own rather than living until the browser closes", () => {
    expect(demoSessionCookieOptions().maxAge).toBeGreaterThan(0);
  });

  it("accepts only the exact session value", () => {
    expect(isDemoSessionValue("true")).toBe(true);
    expect(isDemoSessionValue("TRUE")).toBe(false);
    expect(isDemoSessionValue("1")).toBe(false);
    expect(isDemoSessionValue("")).toBe(false);
    expect(isDemoSessionValue(undefined)).toBe(false);
  });

  it("has one canonical name, shared by the proxy and the actions", () => {
    expect(DEMO_SESSION_COOKIE).toBe("demo_session");
  });
});

describe("isDemoMode", () => {
  const original = { node: process.env.NODE_ENV, demo: process.env.DEMO_MODE };

  function withEnv(nodeEnv: string, demoMode: string, run: () => void) {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = nodeEnv;
    env.DEMO_MODE = demoMode;
    try {
      run();
    } finally {
      env.NODE_ENV = original.node;
      env.DEMO_MODE = original.demo;
    }
  }

  it("refuses demo mode in production even when DEMO_MODE=true", async () => {
    // Demo mode is not a data-source toggle: mock sign-in accepts any password
    // and the demo user carries owner permissions on every module. One code
    // path reaching it in production is an unauthenticated owner session.
    const { isDemoMode } = await import("@/lib/env.server");
    withEnv("production", "true", () => {
      expect(isDemoMode()).toBe(false);
    });
  });

  it("honours DEMO_MODE outside production", async () => {
    const { isDemoMode } = await import("@/lib/env.server");
    withEnv("development", "true", () => {
      expect(isDemoMode()).toBe(true);
    });
    withEnv("development", "false", () => {
      expect(isDemoMode()).toBe(false);
    });
  });
});

describe("safeInternalPath", () => {
  it.each<[string | null, string]>([
    ["https://evil.example.net/", "an absolute URL"],
    ["//evil.example.net/path", "a protocol-relative URL"],
    ["/\\evil.example.net", "a backslash-smuggled host"],
    ["/path\nSet-Cookie: x=y", "a header-injection attempt"],
    ["", "an empty value"],
    [null, "a missing value"],
  ])("refuses %s (%s)", (input) => {
    expect(safeInternalPath(input)).toBe("/dashboard");
  });

  it("refuses portal and auth internals as post-login destinations", () => {
    expect(safeInternalPath("/portal/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/auth/callback")).toBe("/dashboard");
  });

  it("allows an ordinary internal path", () => {
    expect(safeInternalPath("/projects/abc")).toBe("/projects/abc");
  });
});
