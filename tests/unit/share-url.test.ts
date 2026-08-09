// @vitest-environment node

/**
 * Sprint 2.4 — share links address the portal, not the dashboard.
 *
 * Both share dialogs built `${window.location.origin}/portal/s/${token}`.
 * `window.location.origin` is the app domain, and `src/proxy.ts` redirects
 * `/portal/*` there straight back to `/` — so the link an internal user copied
 * and sent to a client resolved to a dashboard the client cannot reach. It also
 * published the internal route shape the proxy rewrite exists to hide.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  originalEnv = { ...process.env };
  vi.resetModules();
});

afterEach(() => {
  process.env = originalEnv;
  vi.unstubAllEnvs();
});

async function loadBuilder(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
  const { buildShareUrl } = await import("@/features/shares/utils/share-url");
  return buildShareUrl;
}

const TOKEN = "3f5a9c1e7b2d4f6a8c0e2b4d6f8a0c2e";

describe("buildShareUrl", () => {
  it("builds the link on the configured portal origin", async () => {
    const buildShareUrl = await loadBuilder({
      NEXT_PUBLIC_PORTAL_URL: "https://portal.example.com",
    });
    expect(buildShareUrl(TOKEN)).toBe(`https://portal.example.com/s/${TOKEN}`);
  });

  it("never emits the internal /portal route shape", async () => {
    const buildShareUrl = await loadBuilder({
      NEXT_PUBLIC_PORTAL_URL: "https://portal.example.com",
    });
    expect(buildShareUrl(TOKEN)).not.toContain("/portal/");
  });

  it("does not address the application domain", async () => {
    // The regression: an internal user standing on app.<domain> issued a link
    // pointing back at app.<domain>.
    const buildShareUrl = await loadBuilder({
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
      NEXT_PUBLIC_APP_DOMAIN: "app.example.com",
      NEXT_PUBLIC_PORTAL_URL: "https://portal.example.com",
    });
    expect(buildShareUrl(TOKEN)).not.toContain("app.example.com");
  });

  it("uses configuration rather than the browser's current origin", async () => {
    // A `window` in scope must not change the result; this is why the builder
    // is a pure function of configuration.
    vi.stubGlobal("window", {
      location: { origin: "https://app.example.com" },
    });
    const buildShareUrl = await loadBuilder({
      NEXT_PUBLIC_PORTAL_URL: "https://portal.example.com",
    });
    expect(buildShareUrl(TOKEN)).toBe(`https://portal.example.com/s/${TOKEN}`);
    vi.unstubAllGlobals();
  });

  it("tolerates a trailing slash on the configured origin", async () => {
    const buildShareUrl = await loadBuilder({
      NEXT_PUBLIC_PORTAL_URL: "https://portal.example.com/",
    });
    expect(buildShareUrl(TOKEN)).toBe(`https://portal.example.com/s/${TOKEN}`);
  });

  it("falls back to the local portal host in development", async () => {
    // Production cannot reach this branch: NEXT_PUBLIC_PORTAL_URL is
    // production-required and must be https (src/lib/env.server.ts).
    const buildShareUrl = await loadBuilder({
      NEXT_PUBLIC_PORTAL_URL: undefined,
      NEXT_PUBLIC_PORTAL_DOMAIN: undefined,
    });
    expect(buildShareUrl(TOKEN)).toBe(
      `http://portal.localhost:3000/s/${TOKEN}`,
    );
  });

  it("carries the token verbatim", async () => {
    const buildShareUrl = await loadBuilder({
      NEXT_PUBLIC_PORTAL_URL: "https://portal.example.com",
    });
    expect(new URL(buildShareUrl(TOKEN)).pathname).toBe(`/s/${TOKEN}`);
  });
});
