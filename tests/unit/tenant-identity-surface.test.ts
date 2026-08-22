// @vitest-environment node

/**
 * A static gate over the server-action surface — the check that would have
 * caught CRIT-2 on the commit that introduced it.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * `scripts/audit-authorization.ts` passed green while the notifications module
 * was fully exploitable, for two reasons it is worth stating plainly:
 *
 *   1. Its action regex is `/export\s+async\s+function\s+(\w+)/`. The whole
 *      notifications module uses `export const x = async (...) =>`, so the
 *      audit found *zero* actions in the file and reported nothing missing.
 *   2. Its guard vocabulary contains no notion of where identity comes from. An
 *      action that takes `userId` from the caller and never resolves a session
 *      is invisible to it — there is no guard to be absent.
 *
 * This test does not attempt to replace that audit. It closes the narrower,
 * sharper hole: a Server Action must never accept the caller's identity as an
 * argument. Both `export async function` and `export const … = async` forms are
 * matched, because the gap between them is exactly where the bug lived.
 *
 * ── The distinction this encodes ─────────────────────────────────────────────
 *
 * These are four different controls and the audit only ever measured the first:
 *
 *   authentication        `requireCurrentUser()`   — who is calling
 *   authorization (RBAC)  `requirePermission()`    — may this role do this
 *   object-level authz    resource ownership check — is it THIS caller's record
 *   tenant isolation      `organizationId` scoping — is it this ORG's record
 *
 * An action holding all four is safe. An action holding only the first is what
 * the audit calls "covered". See docs/AUTHORIZATION-CONTROLS.md.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

/** Parameter names that name *the caller* and must come from the session. */
const IDENTITY_PARAMS =
  /^(userId|organizationId|orgId|tenantId|currentUserId)$/;

/**
 * Exceptions, each with a reason. Kept deliberately tiny: an entry here is a
 * standing claim that a Server Action may be told who is asking, and that claim
 * should be rare enough to argue about individually.
 */
const ALLOWED: { file: string; fn: string; because: string }[] = [
  {
    file: "src/features/organizations/mock-actions.ts",
    fn: "checkOwnerProtectionMock",
    because:
      "Demo-only helper. Takes the in-memory store as its first argument, so it " +
      "cannot reach the database, and both call sites pass user.organizationId " +
      'from the session. It should not be exported from a "use server" file at ' +
      "all — tracked as a MEDIUM in docs/AUTHORIZATION-REMEDIATION.md.",
  },
  {
    file: "src/features/projects/real-actions.ts",
    fn: "addProjectMember",
    because:
      "`userId` names the person being added to the project, not the caller — " +
      "a subject, not an identity claim. The caller is resolved with " +
      "requireCurrentUser(), checked for projects.update, and the subject is " +
      "confirmed to be an active member of the caller's own organisation before " +
      "the insert, so a foreign id cannot be written.",
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

/** Files whose first lines carry the "use server" directive. */
function serverActionFiles(): string[] {
  return walk(SRC).filter((file) => {
    const head = readFileSync(file, "utf8").split("\n").slice(0, 5).join("\n");
    return /^\s*(["'])use server\1/m.test(head);
  });
}

type Finding = { file: string; fn: string; param: string };

/**
 * Both export forms. The `const` arm is the one the existing audit misses, and
 * the one every CRIT-2 function used.
 */
const EXPORT_PATTERN =
  /export\s+(?:async\s+function|const)\s+(\w+)\s*(?:=\s*async\s*)?\(([^)]*)\)/g;

function findIdentityParameters(): Finding[] {
  const findings: Finding[] = [];

  for (const file of serverActionFiles()) {
    const source = readFileSync(file, "utf8");
    const relative = file.slice(process.cwd().length + 1);

    for (const match of source.matchAll(EXPORT_PATTERN)) {
      const [, fn, params] = match;
      for (const raw of params.split(",")) {
        // `userId: string` → `userId`; `{ userId }: Input` is an object
        // destructure and is not a top-level identity claim.
        const name = raw.trim().split(/[:=]/)[0].trim();
        if (IDENTITY_PARAMS.test(name)) {
          findings.push({ file: relative, fn, param: name });
        }
      }
    }
  }

  return findings;
}

function isAllowed(finding: Finding): boolean {
  return ALLOWED.some(
    (entry) => entry.file === finding.file && entry.fn === finding.fn,
  );
}

describe("server actions never accept the caller's identity", () => {
  it("finds server action files to check", () => {
    // Guards against the scan silently matching nothing after a refactor and
    // reporting success because it looked at zero files.
    expect(serverActionFiles().length).toBeGreaterThan(20);
  });

  it("no Server Action takes userId or organizationId as an argument", () => {
    const unexpected = findIdentityParameters().filter(
      (finding) => !isAllowed(finding),
    );

    expect(
      unexpected,
      unexpected.length === 0
        ? ""
        : `Server Actions must derive identity from the session.\n` +
            unexpected
              .map((f) => `  · ${f.file} :: ${f.fn}(${f.param})`)
              .join("\n") +
            `\n\nIf one of these is genuinely naming a *subject* rather than the ` +
            `caller, add it to ALLOWED in this file with a written reason.`,
    ).toEqual([]);
  });

  it("the notifications module has no identity parameters (CRIT-2)", () => {
    const notificationFindings = findIdentityParameters().filter((finding) =>
      finding.file.includes("features/notifications/"),
    );
    expect(notificationFindings).toEqual([]);
  });

  it("every allow-list entry carries a substantive reason", () => {
    for (const entry of ALLOWED) {
      expect(entry.because.length).toBeGreaterThan(40);
    }
  });

  it("the allow-list stays short", () => {
    // If this needs raising, the pattern has become normal and that is the
    // thing to fix, not the number.
    expect(ALLOWED.length).toBeLessThanOrEqual(3);
  });

  it("detects the pre-fix shape when it reappears", () => {
    // Proves the matcher actually catches `export const x = async (userId…)`,
    // the form scripts/audit-authorization.ts is blind to. Without this, a
    // regex regression would make the gate above silently vacuous.
    const sample = `
      "use server";
      export const getNotificationsAction = async (
        userId: string,
        organizationId: string,
      ) => {};
    `;
    const hits: string[] = [];
    for (const match of sample.matchAll(EXPORT_PATTERN)) {
      const [, fn, params] = match;
      for (const raw of params.split(",")) {
        const name = raw.trim().split(/[:=]/)[0].trim();
        if (IDENTITY_PARAMS.test(name)) hits.push(`${fn}:${name}`);
      }
    }
    expect(hits).toEqual([
      "getNotificationsAction:userId",
      "getNotificationsAction:organizationId",
    ]);
  });
});

describe("internal transaction helpers stay off the action surface", () => {
  /**
   * H-4. A function taking a Drizzle transaction is by definition called from
   * inside an already-authorised action — it cannot be invoked from a browser,
   * because a transaction handle does not serialise across the action boundary.
   * Exporting one from a `"use server"` file publishes an endpoint that appears
   * callable and carries no authorization of its own. `recalculateTimelineProgress`
   * was moved out for this reason; `createTimelineSnapshot` had not been.
   *
   * The rule is deliberately about a **required** `tx`. A defaulted one
   * (`tx: typeof db | DbTransaction = db`) is an optional internal seam on an
   * action that also works standalone — a weaker smell, not this defect.
   * `stopTaskTimer` has that shape and is recorded in
   * docs/AUTHORIZATION-REMEDIATION.md rather than changed here, because
   * altering its signature is a behavioural change outside a security hotfix.
   */
  it("no server action exports a function requiring a `tx` parameter", () => {
    const offenders: string[] = [];

    for (const file of serverActionFiles()) {
      const source = readFileSync(file, "utf8");
      const relative = file.slice(process.cwd().length + 1);

      for (const match of source.matchAll(EXPORT_PATTERN)) {
        const [, fn, params] = match;
        for (const raw of params.split(",")) {
          const name = raw.trim().split(/[:=]/)[0].trim();
          const hasDefault = raw.includes("=");
          if (name === "tx" && !hasDefault) {
            offenders.push(`${relative} :: ${fn}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("createTimelineSnapshot is not reachable from the timelines action surface", () => {
    const actions = readFileSync(
      join(SRC, "features/timelines/actions.ts"),
      "utf8",
    );
    expect(actions).not.toMatch(
      /export\s+async\s+function\s+createTimelineSnapshot/,
    );

    const realActions = readFileSync(
      join(SRC, "features/timelines/real-actions.ts"),
      "utf8",
    );
    expect(realActions).not.toMatch(
      /export\s+async\s+function\s+createTimelineSnapshot/,
    );
  });
});
