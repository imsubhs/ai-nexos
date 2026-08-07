import { describe, expect, it } from "vitest";
import {
  UNAUTHENTICATED_BY_DESIGN,
  auditAuthorization,
} from "../../scripts/audit-authorization";

/**
 * Readiness checklist 3.7: "`requirePermission` on every real action — pattern
 * followed; **never audited exhaustively.** The service-layer connection
 * bypasses RLS, so a single omission is unprotected."
 *
 * This is that audit, run on every commit. Reviewing 160-odd exported actions
 * by eye is the kind of task a person does correctly once and then never
 * repeats; the first run of it found six genuinely unguarded actions, three of
 * which took the tenant id as a parameter.
 */
describe("authorization coverage", () => {
  it("every exported server action reaches an authorization guard", () => {
    const findings = auditAuthorization();

    // Named in the failure so a regression says which action, not just a count.
    const unguarded = findings.map((f) => `${f.file}::${f.action}`);

    expect(
      unguarded,
      unguarded.length > 0
        ? `These server actions are reachable over HTTP without any identity ` +
            `check. Add requireCurrentUser()/requirePermission(), or — if the ` +
            `action is genuinely public — add it to UNAUTHENTICATED_BY_DESIGN ` +
            `in scripts/audit-authorization.ts with the reason.`
        : undefined,
    ).toEqual([]);
  });

  it("keeps the public-by-design list short and justified", () => {
    const entries = Object.entries(UNAUTHENTICATED_BY_DESIGN);

    // The escape hatch must stay small enough to read in one sitting. If it
    // grows, the audit is being silenced rather than satisfied.
    expect(entries.length).toBeLessThanOrEqual(8);

    for (const [action, reason] of entries) {
      expect(
        reason.length,
        `${action} needs a real justification`,
      ).toBeGreaterThan(20);
    }
  });

  it("only exempts the sign-in surface, which cannot require a session", () => {
    for (const action of Object.keys(UNAUTHENTICATED_BY_DESIGN)) {
      expect(action).toMatch(/^features\/auth\//);
    }
  });
});
