// @vitest-environment node

/**
 * Regression tests for CRIT-2 (Phase 2.5.1 hotfix).
 *
 * The defect: every notification action took `(userId, organizationId)` — or
 * `(notificationId, userId, organizationId)` — from the caller and used them as
 * its WHERE clause. Because `real-actions.ts` and `queries.ts` carry
 * `"use server"`, and `NotificationBell` (a client component in the app header)
 * imported them, those action ids were registered and reachable. Any signed-in
 * user could read, mark and rewrite the notification state of any user in any
 * organisation by naming them.
 *
 * Two things are asserted, and they are different claims:
 *
 *   1. STRUCTURAL — the actions accept no identity arguments at all, so the
 *      malicious request is not expressible. This is the stronger property and
 *      the reason the fix removed the parameters rather than validating them:
 *      checking `organizationId === session.organizationId` would still have
 *      left `userId` free to name a colleague inside the same tenant.
 *
 *   2. BEHAVIOURAL — the values that actually reach the query come from the
 *      session, and extra arguments a caller passes are ignored. Drizzle's
 *      condition objects are inspected for their bound parameters, so this
 *      tests the emitted predicate rather than a mock's bookkeeping.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { CurrentUser } from "@/features/auth/current-user";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — two organisations, two users each.
// ─────────────────────────────────────────────────────────────────────────────

const ORG_A = randomUUID();
const ORG_B = randomUUID();

const USER_A_OWNER = {
  userId: randomUUID(),
  organizationId: ORG_A,
} as const;
const USER_B_OWNER = {
  userId: randomUUID(),
  organizationId: ORG_B,
} as const;
const USER_B_MEMBER = {
  userId: randomUUID(),
  organizationId: ORG_B,
} as const;

/** Bound parameter values recorded from every predicate the module builds. */
const boundParams: string[][] = [];
/** Rows handed to `insert().values()`. */
const insertedRows: Record<string, unknown>[] = [];
/** Rows handed to `update().set()`. */
const updatedSets: Record<string, unknown>[] = [];

/** Walks a Drizzle SQL/condition object and collects its string parameters. */
function extractParams(node: unknown, depth = 0): string[] {
  const found: string[] = [];
  if (!node || depth > 8) return found;
  if (Array.isArray(node)) {
    for (const item of node) found.push(...extractParams(item, depth + 1));
    return found;
  }
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if ("value" in record && typeof record.value === "string") {
      found.push(record.value);
    }
    for (const key of Object.keys(record)) {
      found.push(...extractParams(record[key], depth + 1));
    }
  }
  return found;
}

/**
 * A chainable stand-in for the Drizzle builder.
 *
 * Every terminal is thenable, so `await db.update(t).set(v).where(c)` and
 * `await db.select().from(t).where(c).orderBy(x)` both resolve. Reads always
 * resolve to `[]`, which is enough: what is under test is the predicate, not
 * the rows.
 */
function makeChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const self = () => chain;

  chain.select = self;
  chain.from = self;
  chain.update = self;
  chain.insert = self;
  chain.orderBy = self;
  chain.limit = self;

  chain.set = (value: Record<string, unknown>) => {
    updatedSets.push(value);
    return chain;
  };
  chain.values = (value: Record<string, unknown>) => {
    insertedRows.push(value);
    return chain;
  };
  chain.where = (condition: unknown) => {
    boundParams.push(extractParams(condition));
    return chain;
  };
  chain.then = (resolve: (value: unknown) => unknown) => resolve([]);

  return chain;
}

const currentUser = vi.hoisted(() => ({ value: null as CurrentUser | null }));

vi.mock("@/db", () => {
  // A fresh chain per property access keeps recorded state per call simple.
  const target = {} as Record<string, unknown>;
  return {
    db: new Proxy(target, {
      get(_t, prop: string) {
        const chain = makeChain();
        return chain[prop];
      },
    }),
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/auth/current-user", () => ({
  requireCurrentUser: async () => {
    if (!currentUser.value) throw new Error("no session");
    return currentUser.value;
  },
  getCurrentUser: async () => currentUser.value,
}));

function sessionOf(user: { userId: string; organizationId: string }) {
  currentUser.value = {
    ...user,
    email: "fixture@example.test",
    firstName: "Fixture",
    lastName: null,
    avatarUrl: null,
    designation: null,
    roleId: randomUUID(),
    roleKey: "owner",
    roleName: "Owner",
    permissions: { "*": ["*"] },
    departmentId: null,
    organizationName: "Fixture",
    organizationSlug: "fixture",
    organizationLogoUrl: null,
    organizationTimezone: "UTC",
  } as CurrentUser;
}

const actions = await import("@/features/notifications/real-actions");
const queries = await import("@/features/notifications/real-queries");

beforeEach(() => {
  boundParams.length = 0;
  insertedRows.length = 0;
  updatedSets.length = 0;
  sessionOf(USER_A_OWNER);
});

/** Every parameter bound across all predicates built during one call. */
function allParams(): string[] {
  return boundParams.flat();
}

describe("CRIT-2 · the identity parameters are gone", () => {
  it.each([
    ["getNotificationsAction", 0],
    ["getNotificationFeedAction", 0],
    ["markAllNotificationsReadAction", 0],
    ["markNotificationReadAction", 1],
    ["markNotificationUnreadAction", 1],
    ["updateNotificationPreferencesAction", 1],
  ])("%s accepts %i argument(s)", (name, arity) => {
    const fn = (
      actions as unknown as Record<string, (...a: unknown[]) => unknown>
    )[name];
    expect(typeof fn).toBe("function");
    // The single argument the mark/update actions keep is the resource id or
    // the preference payload — never an identity.
    expect(fn.length).toBe(arity);
  });

  it.each([
    ["getNotificationsQuery", 0],
    ["getNotificationPreferencesQuery", 0],
  ])("%s accepts %i argument(s)", (name, arity) => {
    const fn = (
      queries as unknown as Record<string, (...a: unknown[]) => unknown>
    )[name];
    expect(typeof fn).toBe("function");
    expect(fn.length).toBe(arity);
  });
});

describe("CRIT-2 · reads are scoped to the session", () => {
  it("user A's feed queries user A's ids", async () => {
    await actions.getNotificationFeedAction();
    const params = allParams();
    expect(params).toContain(USER_A_OWNER.userId);
    expect(params).toContain(ORG_A);
  });

  it("passing another user's ids as extra arguments changes nothing", async () => {
    // The pre-fix call shape. JavaScript ignores surplus arguments, which is
    // precisely the property removing the parameters buys.
    await (
      actions.getNotificationFeedAction as unknown as (
        ...a: unknown[]
      ) => Promise<unknown>
    )(USER_B_MEMBER.userId, ORG_B);

    const params = allParams();
    expect(params).toContain(USER_A_OWNER.userId);
    expect(params).toContain(ORG_A);
    expect(params).not.toContain(USER_B_MEMBER.userId);
    expect(params).not.toContain(ORG_B);
  });

  it("the raw notifications read is scoped to the session", async () => {
    await actions.getNotificationsAction();
    const params = allParams();
    expect(params).toContain(USER_A_OWNER.userId);
    expect(params).toContain(ORG_A);
    expect(params).not.toContain(USER_B_OWNER.userId);
  });

  it("switching session switches the tenant the query names", async () => {
    sessionOf(USER_B_OWNER);
    await actions.getNotificationsAction();
    const params = allParams();
    expect(params).toContain(USER_B_OWNER.userId);
    expect(params).toContain(ORG_B);
    expect(params).not.toContain(ORG_A);
  });
});

describe("CRIT-2 · writes cannot target another user", () => {
  it("marking read constrains the row to the session's user and org", async () => {
    const foreignNotification = randomUUID();
    await actions.markNotificationReadAction(foreignNotification);

    const params = allParams();
    // The id the caller named is still used — but only alongside the two
    // identity predicates it cannot influence, so a foreign row matches nothing.
    expect(params).toContain(foreignNotification);
    expect(params).toContain(USER_A_OWNER.userId);
    expect(params).toContain(ORG_A);
  });

  it("marking read cannot be redirected at user B by extra arguments", async () => {
    const target = randomUUID();
    await (
      actions.markNotificationReadAction as unknown as (
        ...a: unknown[]
      ) => Promise<unknown>
    )(target, USER_B_MEMBER.userId, ORG_B);

    const params = allParams();
    expect(params).toContain(USER_A_OWNER.userId);
    expect(params).toContain(ORG_A);
    expect(params).not.toContain(USER_B_MEMBER.userId);
    expect(params).not.toContain(ORG_B);
  });

  it("marking unread is scoped the same way", async () => {
    const target = randomUUID();
    await (
      actions.markNotificationUnreadAction as unknown as (
        ...a: unknown[]
      ) => Promise<unknown>
    )(target, USER_B_MEMBER.userId, ORG_B);

    const params = allParams();
    expect(params).toContain(USER_A_OWNER.userId);
    expect(params).not.toContain(USER_B_MEMBER.userId);
    expect(params).not.toContain(ORG_B);
  });

  it("mark-all cannot clear another user's inbox", async () => {
    await (
      actions.markAllNotificationsReadAction as unknown as (
        ...a: unknown[]
      ) => Promise<unknown>
    )(USER_B_MEMBER.userId, ORG_B);

    const params = allParams();
    expect(params).toContain(USER_A_OWNER.userId);
    expect(params).toContain(ORG_A);
    expect(params).not.toContain(USER_B_MEMBER.userId);
    expect(params).not.toContain(ORG_B);
  });
});

describe("CRIT-2 · preferences are written for the session's user", () => {
  const payload = {
    level: "user" as const,
    eventTypePreferences: {},
    timezone: "UTC",
    digestFrequency: "instant" as const,
  };

  it("inserts against the session identity, not a supplied one", async () => {
    await (
      actions.updateNotificationPreferencesAction as unknown as (
        ...a: unknown[]
      ) => Promise<unknown>
    )(payload);

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      userId: USER_A_OWNER.userId,
      organizationId: ORG_A,
    });
  });

  it("ignores identity passed in the pre-fix argument positions", async () => {
    // Pre-fix shape was (userId, organizationId, input). Supplying it now means
    // the first argument is parsed as the payload, so the call must fail
    // validation rather than quietly write to user B.
    await expect(
      (
        actions.updateNotificationPreferencesAction as unknown as (
          ...a: unknown[]
        ) => Promise<unknown>
      )(USER_B_MEMBER.userId, ORG_B, payload),
    ).rejects.toBeTruthy();

    // Nothing was written for user B.
    expect(
      insertedRows.some((row) => row.userId === USER_B_MEMBER.userId),
    ).toBe(false);
    expect(updatedSets).toHaveLength(0);
  });
});
