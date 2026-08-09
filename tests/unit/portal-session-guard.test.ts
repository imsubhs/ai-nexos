// @vitest-environment node

/**
 * Sprint 2.4, S-1 — the portal dashboard fails closed.
 *
 * The page read data with the literals `"mock-org-id"` / `"mock-client-id"`
 * whenever demo mode was off, and checked no session. The proxy serves the
 * portal domain without authentication by design, so that page was an
 * unauthenticated entry point standing next to a correctly hardened route
 * handler it never called.
 *
 * These tests pin the two properties that matter: identity is derived from the
 * server-side session and cannot be supplied by the caller, and no valid
 * session means no read at all.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
const resolvePortalSession = vi.fn();
const isDemoMode = vi.fn();
const getDashboardView = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));

vi.mock("@/lib/portal/session", () => ({
  PORTAL_SESSION_COOKIE: "nexos_portal_session",
  resolvePortalSession: (...args: unknown[]) => resolvePortalSession(...args),
}));

vi.mock("@/lib/env.server", () => ({
  isDemoMode: () => isDemoMode(),
}));

vi.mock("@/lib/portal/services/PortalServiceLayer", () => ({
  PortalServiceLayer: {
    getDashboardView: (...args: unknown[]) => getDashboardView(...args),
  },
}));

const { getPortalContext } = await import("@/lib/portal/context");
const { default: DashboardPage } =
  await import("@/app/portal/(portal)/dashboard/page");

const SESSION = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  clientId: "33333333-3333-4333-8333-333333333333",
};

beforeEach(() => {
  cookieGet.mockReset();
  resolvePortalSession.mockReset();
  isDemoMode.mockReset();
  getDashboardView.mockReset();

  isDemoMode.mockReturnValue(false);
  cookieGet.mockReturnValue(undefined);
  resolvePortalSession.mockResolvedValue(null);
  getDashboardView.mockResolvedValue({ unifiedTimeline: [] });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Puts a valid session behind a present cookie. */
function withValidSession() {
  cookieGet.mockReturnValue({ value: "raw-session-token" });
  resolvePortalSession.mockResolvedValue(SESSION);
}

describe("getPortalContext", () => {
  it("returns null when no session cookie is present", async () => {
    expect(await getPortalContext()).toBeNull();
  });

  it("returns null when the cookie does not resolve to a session", async () => {
    // resolvePortalSession() answers null for an unknown token, an expired
    // session and a revoked one alike — status and expiry are both filtered in
    // SQL. Every one of those reaches the caller as the same fail-closed null.
    cookieGet.mockReturnValue({ value: "expired-or-revoked" });
    resolvePortalSession.mockResolvedValue(null);

    expect(await getPortalContext()).toBeNull();
  });

  it("takes the organisation from the session", async () => {
    withValidSession();
    const context = await getPortalContext();
    expect(context?.organizationId).toBe(SESSION.organizationId);
  });

  it("takes the client from the session", async () => {
    withValidSession();
    const context = await getPortalContext();
    expect(context?.clientId).toBe(SESSION.clientId);
  });

  it("carries the session id through", async () => {
    withValidSession();
    expect((await getPortalContext())?.sessionId).toBe(SESSION.sessionId);
  });

  it("reads the session from the httpOnly portal cookie", async () => {
    withValidSession();
    await getPortalContext();
    expect(cookieGet).toHaveBeenCalledWith("nexos_portal_session");
    expect(resolvePortalSession).toHaveBeenCalledWith("raw-session-token");
  });

  it("accepts no arguments, so a caller cannot name a tenant", async () => {
    // The structural guarantee. Replacing the mock literals with values taken
    // from a query string or body would have moved the vulnerability rather
    // than closing it, so there is deliberately no parameter to supply.
    expect(getPortalContext.length).toBe(0);
  });

  it("ignores a caller-supplied organizationId", async () => {
    withValidSession();
    const context = await (
      getPortalContext as unknown as (o: unknown) => Promise<{
        organizationId: string;
      } | null>
    )({ organizationId: "attacker-org" });

    expect(context?.organizationId).toBe(SESSION.organizationId);
    expect(context?.organizationId).not.toBe("attacker-org");
  });

  it("ignores a caller-supplied clientId", async () => {
    withValidSession();
    const context = await (
      getPortalContext as unknown as (o: unknown) => Promise<{
        clientId: string;
      } | null>
    )({ clientId: "attacker-client" });

    expect(context?.clientId).toBe(SESSION.clientId);
    expect(context?.clientId).not.toBe("attacker-client");
  });

  it("serves the seeded demo identity in demo mode without a session", async () => {
    isDemoMode.mockReturnValue(true);
    cookieGet.mockReturnValue(undefined);

    const context = await getPortalContext();

    expect(context).toEqual({
      organizationId: "00000000-0000-4000-8000-00000000f001",
      clientId: "00000000-0000-4000-8000-000000000101",
      sessionId: null,
    });
    // Demo mode must not consult the session store at all.
    expect(resolvePortalSession).not.toHaveBeenCalled();
  });

  it("never yields the old placeholder tenant", async () => {
    withValidSession();
    const context = await getPortalContext();
    expect(context?.organizationId).not.toBe("mock-org-id");
    expect(context?.clientId).not.toBe("mock-client-id");
  });
});

describe("portal dashboard page", () => {
  it("does not read data when there is no session", async () => {
    // The regression this whole change exists to prevent.
    await DashboardPage();
    expect(getDashboardView).not.toHaveBeenCalled();
  });

  it("does not read data when the session is expired or revoked", async () => {
    cookieGet.mockReturnValue({ value: "expired-or-revoked" });
    resolvePortalSession.mockResolvedValue(null);

    await DashboardPage();

    expect(getDashboardView).not.toHaveBeenCalled();
  });

  it("reads with the tenant from the session", async () => {
    withValidSession();

    await DashboardPage();

    expect(getDashboardView).toHaveBeenCalledTimes(1);
    expect(getDashboardView).toHaveBeenCalledWith(
      SESSION.organizationId,
      SESSION.clientId,
    );
  });

  it("never passes a placeholder tenant to the service layer", async () => {
    withValidSession();

    await DashboardPage();

    const args = getDashboardView.mock.calls[0];
    expect(args).not.toContain("mock-org-id");
    expect(args).not.toContain("mock-client-id");
  });

  it("still serves the demo dashboard in demo mode", async () => {
    isDemoMode.mockReturnValue(true);

    await DashboardPage();

    expect(getDashboardView).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-00000000f001",
      "00000000-0000-4000-8000-000000000101",
    );
  });
});
