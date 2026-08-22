// @vitest-environment node

/**
 * Regression tests for CRIT-1 and H-1 (Phase 2.5.1 hotfix).
 *
 * These exercise `src/features/approvals/authorization.ts` — the module every
 * approval action now routes its resource decisions through — against a stub
 * database. The stub returns whatever row the test says exists; what is under
 * test is the *decision*, not the SQL.
 *
 * The token half uses real cryptography. `signExternalReviewToken` and
 * `verifyExternalReviewToken` are called for real against the process's
 * ephemeral `JWT_SECRET`, so "invalid signature" and "expired" are genuine
 * conditions rather than a mocked boolean. That matters here: CRIT-1 was a
 * missing call to exactly this verifier, and a test that mocked it away would
 * have passed against the vulnerable code.
 *
 * ── The four controls ────────────────────────────────────────────────────────
 * Each is asserted separately, because conflating them is what produced the
 * findings in the first place:
 *
 *   authentication      is the caller someone       (requireCurrentUser)
 *   authorization       may this ROLE do this       (requirePermission)
 *   tenant isolation    is it this ORG's record     (cycle.organizationId)
 *   object-level authz  is it THIS caller's record  (review.reviewerId)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ApprovalAccessError,
  validateExternalConditionAccess,
  validateExternalReviewAccess,
  validateInternalConditionAccess,
  validateInternalReviewAccess,
} from "@/features/approvals/authorization";
import { signExternalReviewToken } from "@/features/approvals/tokens";
import { PermissionDeniedError } from "@/features/permissions/engine";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import type { CurrentUser } from "@/features/auth/current-user";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — two organisations, four users (ORG_A/ORG_B × owner/member).
// ─────────────────────────────────────────────────────────────────────────────

const ORG_A = randomUUID();
const ORG_B = randomUUID();

function permissionsFor(roleKey: string) {
  const role = SYSTEM_ROLES.find((r) => r.roleKey === roleKey);
  if (!role) throw new Error(`no such system role: ${roleKey}`);
  return role.permissions;
}

function userIn(organizationId: string, roleKey: string): CurrentUser {
  return {
    userId: randomUUID(),
    organizationId,
    email: `${roleKey}@example.test`,
    firstName: roleKey,
    lastName: null,
    avatarUrl: null,
    designation: null,
    roleId: randomUUID(),
    roleKey,
    roleName: roleKey,
    permissions: permissionsFor(roleKey),
    departmentId: null,
    organizationName: "Fixture",
    organizationSlug: "fixture",
    organizationLogoUrl: null,
    organizationTimezone: "UTC",
  };
}

const USER_A_OWNER = userIn(ORG_A, "owner");
const USER_A_MEMBER = userIn(ORG_A, "team_member");
const USER_B_OWNER = userIn(ORG_B, "owner");
/** Holds `approvals: ["read","create","review"]` — notably NOT `approve`. */
const USER_A_PM = userIn(ORG_A, "project_manager");

type Row = {
  review: Record<string, unknown>;
  stage: Record<string, unknown>;
  cycle: Record<string, unknown>;
  condition?: Record<string, unknown>;
};

/**
 * Minimal stand-in for the Drizzle query builder used by the module: the
 * select→join→join→where→limit chain resolves to `rows`, and `query.*` covers
 * the workflow lookup. Deliberately dumb — the assertions are about which
 * branch the module takes, not about SQL generation.
 */
function stubDb(rows: Row[]) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.from = self;
  chain.innerJoin = self;
  chain.where = self;
  chain.limit = async () => rows;
  chain.query = {
    approvalWorkflows: { findFirst: async () => undefined },
    users: { findFirst: async () => undefined },
  };
  return chain as never;
}

/** Builds a coherent review → stage → cycle chain. */
function reviewRow(
  overrides: {
    organizationId?: string;
    reviewerId?: string | null;
    status?: string;
    externalToken?: string | null;
    externalEmail?: string | null;
    reviewId?: string;
  } = {},
): Row {
  const reviewId = overrides.reviewId ?? randomUUID();
  const stageId = randomUUID();
  const cycleId = randomUUID();
  return {
    review: {
      reviewId,
      stageId,
      reviewerId:
        overrides.reviewerId === undefined ? null : overrides.reviewerId,
      status: overrides.status ?? "pending",
      externalToken:
        overrides.externalToken === undefined ? null : overrides.externalToken,
      externalEmail:
        overrides.externalEmail === undefined ? null : overrides.externalEmail,
    },
    stage: { stageId, cycleId },
    cycle: {
      cycleId,
      organizationId: overrides.organizationId ?? ORG_A,
    },
  };
}

function conditionRow(base: Row, isResolved = false): Row {
  return {
    ...base,
    condition: {
      conditionId: randomUUID(),
      reviewId: base.review.reviewId,
      isResolved,
    },
  };
}

/** Every resource refusal must be byte-identical — see the module header. */
const REFUSAL = "Approval not found or access denied.";

describe("CRIT-1 · resolveCondition external-token bypass", () => {
  const EXTERNAL_EMAIL = "client@external.test";

  it("refuses an arbitrary string as an external token", async () => {
    const row = conditionRow(reviewRow());
    await expect(
      validateExternalConditionAccess(
        row.condition!.conditionId as string,
        "not-a-token-just-a-string",
        stubDb([row]),
      ),
    ).rejects.toBeInstanceOf(ApprovalAccessError);
  });

  it.each([
    ["empty-ish string", "x"],
    ["JWT-shaped but unsigned", "eyJhbGciOiJIUzI1NiJ9.eyJhIjoxfQ.aaaa"],
    ["random uuid", randomUUID()],
  ])("refuses a token that is %s", async (_label, token) => {
    const row = conditionRow(reviewRow());
    await expect(
      validateExternalConditionAccess(
        row.condition!.conditionId as string,
        token,
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("refuses a token whose signature does not verify", async () => {
    const row = conditionRow(reviewRow());
    const good = await signExternalReviewToken(
      row.review.reviewId as string,
      EXTERNAL_EMAIL,
    );
    // Flip the last character of the signature segment.
    const tampered = good.slice(0, -1) + (good.at(-1) === "A" ? "B" : "A");

    await expect(
      validateExternalConditionAccess(
        row.condition!.conditionId as string,
        tampered,
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("refuses an expired token", async () => {
    const base = reviewRow();
    const expired = await signExternalReviewToken(
      base.review.reviewId as string,
      EXTERNAL_EMAIL,
      "-1s",
    );
    const row = conditionRow({
      ...base,
      review: {
        ...base.review,
        externalToken: expired,
        externalEmail: EXTERNAL_EMAIL,
      },
    });

    await expect(
      validateExternalConditionAccess(
        row.condition!.conditionId as string,
        expired,
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("refuses a valid token minted for a DIFFERENT review", async () => {
    const base = reviewRow();
    const otherReviewId = randomUUID();
    const tokenForOther = await signExternalReviewToken(
      otherReviewId,
      EXTERNAL_EMAIL,
    );
    const row = conditionRow({
      ...base,
      review: {
        ...base.review,
        externalToken: tokenForOther,
        externalEmail: EXTERNAL_EMAIL,
      },
    });

    await expect(
      validateExternalConditionAccess(
        row.condition!.conditionId as string,
        tokenForOther,
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("fails closed when the review stores no token (no external review was ever issued)", async () => {
    const base = reviewRow();
    const token = await signExternalReviewToken(
      base.review.reviewId as string,
      EXTERNAL_EMAIL,
    );
    // externalToken/externalEmail stay null — the state of every review this
    // application currently creates.
    const row = conditionRow(base);

    await expect(
      validateExternalConditionAccess(
        row.condition!.conditionId as string,
        token,
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("refuses a superseded token (signature valid, stored value differs)", async () => {
    const base = reviewRow();
    const reviewId = base.review.reviewId as string;
    const oldToken = await signExternalReviewToken(reviewId, EXTERNAL_EMAIL);
    const reissued = await signExternalReviewToken(reviewId, EXTERNAL_EMAIL);

    const row = conditionRow({
      ...base,
      review: {
        ...base.review,
        externalToken: reissued,
        externalEmail: EXTERNAL_EMAIL,
      },
    });

    // The old token still verifies cryptographically; the stored column is the
    // revocation record and no longer matches it.
    expect(oldToken).not.toEqual(reissued);
    await expect(
      validateExternalConditionAccess(
        row.condition!.conditionId as string,
        oldToken,
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("accepts a correctly issued, unexpired, matching token", async () => {
    const base = reviewRow();
    const reviewId = base.review.reviewId as string;
    const token = await signExternalReviewToken(reviewId, EXTERNAL_EMAIL);
    const row = conditionRow({
      ...base,
      review: {
        ...base.review,
        externalToken: token,
        externalEmail: EXTERNAL_EMAIL,
      },
    });

    const result = await validateExternalConditionAccess(
      row.condition!.conditionId as string,
      token,
      stubDb([row]),
    );
    expect(result.condition.conditionId).toBe(row.condition!.conditionId);
  });

  it("refuses when the condition itself does not exist", async () => {
    const token = await signExternalReviewToken(randomUUID(), EXTERNAL_EMAIL);
    await expect(
      validateExternalConditionAccess(randomUUID(), token, stubDb([])),
    ).rejects.toThrow(REFUSAL);
  });
});

describe("CRIT-1 · internal condition resolution", () => {
  it("refuses a caller from another organization", async () => {
    const row = conditionRow(reviewRow({ organizationId: ORG_A }));
    await expect(
      validateInternalConditionAccess(
        row.condition!.conditionId as string,
        USER_B_OWNER,
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("refuses a role without approvals.approve", async () => {
    const row = conditionRow(reviewRow({ organizationId: ORG_A }));
    // project_manager holds read/create/review but not approve.
    await expect(
      validateInternalConditionAccess(
        row.condition!.conditionId as string,
        USER_A_PM,
        stubDb([row]),
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("refuses a team member outright", async () => {
    const row = conditionRow(reviewRow({ organizationId: ORG_A }));
    await expect(
      validateInternalConditionAccess(
        row.condition!.conditionId as string,
        USER_A_MEMBER,
        stubDb([row]),
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("allows an owner in the owning organization", async () => {
    const row = conditionRow(reviewRow({ organizationId: ORG_A }));
    const result = await validateInternalConditionAccess(
      row.condition!.conditionId as string,
      USER_A_OWNER,
      stubDb([row]),
    );
    expect(result.cycle.organizationId).toBe(ORG_A);
  });
});

describe("H-1 · review IDOR", () => {
  it("refuses a review belonging to another organization", async () => {
    const row = reviewRow({
      organizationId: ORG_A,
      reviewerId: USER_B_OWNER.userId,
    });
    await expect(
      validateInternalReviewAccess(
        row.review.reviewId as string,
        USER_B_OWNER,
        "review",
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("refuses a caller who is not the assigned reviewer, even in the right org", async () => {
    const row = reviewRow({
      organizationId: ORG_A,
      reviewerId: randomUUID(),
    });
    await expect(
      validateInternalReviewAccess(
        row.review.reviewId as string,
        USER_A_OWNER,
        "review",
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("refuses an internal caller on a review awaiting an external reviewer", async () => {
    // reviewerId is null — no internal user id can equal it.
    const row = reviewRow({ organizationId: ORG_A, reviewerId: null });
    await expect(
      validateInternalReviewAccess(
        row.review.reviewId as string,
        USER_A_OWNER,
        "review",
        stubDb([row]),
      ),
    ).rejects.toThrow(REFUSAL);
  });

  it("refuses a role without approvals.review before touching the database", async () => {
    // An empty result set: if the permission check did not run first, this
    // would surface as the resource refusal instead.
    await expect(
      validateInternalReviewAccess(
        randomUUID(),
        USER_A_MEMBER,
        "review",
        stubDb([]),
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("allows the assigned reviewer in the owning organization", async () => {
    const row = reviewRow({
      organizationId: ORG_A,
      reviewerId: USER_A_OWNER.userId,
    });
    const result = await validateInternalReviewAccess(
      row.review.reviewId as string,
      USER_A_OWNER,
      "review",
      stubDb([row]),
    );
    expect(result.review.reviewId).toBe(row.review.reviewId);
  });

  it("gives the same message for a missing review and a foreign one", async () => {
    const foreign = reviewRow({
      organizationId: ORG_A,
      reviewerId: USER_B_OWNER.userId,
    });

    const missing = await validateInternalReviewAccess(
      randomUUID(),
      USER_B_OWNER,
      "review",
      stubDb([]),
    ).catch((error: Error) => error.message);

    const crossTenant = await validateInternalReviewAccess(
      foreign.review.reviewId as string,
      USER_B_OWNER,
      "review",
      stubDb([foreign]),
    ).catch((error: Error) => error.message);

    expect(missing).toBe(REFUSAL);
    expect(crossTenant).toBe(REFUSAL);
  });
});

describe("external review access", () => {
  beforeAll(() => {
    // Nothing to set up; asserting the ordering contract only.
  });

  it("does not consult permissions — an external reviewer has none", async () => {
    const EXTERNAL_EMAIL = "client@external.test";
    const base = reviewRow({ organizationId: ORG_A });
    const reviewId = base.review.reviewId as string;
    const token = await signExternalReviewToken(reviewId, EXTERNAL_EMAIL);
    const row: Row = {
      ...base,
      review: {
        ...base.review,
        externalToken: token,
        externalEmail: EXTERNAL_EMAIL,
      },
    };

    const result = await validateExternalReviewAccess(
      reviewId,
      token,
      stubDb([row]),
    );
    expect(result.review.reviewId).toBe(reviewId);
  });

  it("refuses when the token's email does not match the stored address", async () => {
    const base = reviewRow({ organizationId: ORG_A });
    const reviewId = base.review.reviewId as string;
    const token = await signExternalReviewToken(reviewId, "attacker@evil.test");
    const row: Row = {
      ...base,
      review: {
        ...base.review,
        externalToken: token,
        externalEmail: "client@external.test",
      },
    };

    await expect(
      validateExternalReviewAccess(reviewId, token, stubDb([row])),
    ).rejects.toThrow(REFUSAL);
  });
});
