// @vitest-environment node

/**
 * Regression tests for H-2 (meetings), H-3 (revisions) and H-4 (timelines).
 *
 * All three findings had the same shape: an action resolved a caller-supplied
 * id by primary key alone, then wrote a row stamped with the *caller's* own
 * organisation. The read crossed the tenant boundary and the write grafted one
 * tenant's record onto another's.
 *
 * The property under test is therefore: **every lookup of a caller-supplied id
 * binds the session's `organizationId`**. A predicate carrying it cannot match
 * a foreign row; one that omits it can, which is precisely what these three
 * did. The assertions inspect the predicates the code builds — see
 * `helpers/recording-db.ts` for why that is the level chosen here, and what the
 * integration suite would add.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { CurrentUser } from "@/features/auth/current-user";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import { createRecorder, createRecordingDb } from "./helpers/recording-db";

const ORG_A = randomUUID();
const ORG_B = randomUUID();

const recorder = createRecorder();
const dbState = vi.hoisted(() => ({
  queue: [] as unknown[],
  findFirst: [] as unknown[],
}));
const currentUser = vi.hoisted(() => ({ value: null as CurrentUser | null }));

vi.mock("@/db", async () => {
  const { createRecorder: mk, createRecordingDb: mkDb } =
    await import("./helpers/recording-db");
  void mk;
  return {
    get db() {
      return mkDb(recorderRef.current, {
        queue: dbState.queue,
        findFirst: dbState.findFirst,
      });
    },
  };
});

// The mock factory is hoisted above `recorder`, so it reaches it through a box.
const recorderRef = { current: recorder };

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/auth/current-user", () => ({
  requireCurrentUser: async () => {
    if (!currentUser.value) throw new Error("no session");
    return currentUser.value;
  },
  getCurrentUser: async () => currentUser.value,
}));

function permissionsFor(roleKey: string) {
  const role = SYSTEM_ROLES.find((r) => r.roleKey === roleKey);
  if (!role) throw new Error(`no such system role: ${roleKey}`);
  return role.permissions;
}

function sessionOf(organizationId: string, roleKey = "owner"): CurrentUser {
  const user: CurrentUser = {
    userId: randomUUID(),
    organizationId,
    email: "fixture@example.test",
    firstName: "Fixture",
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
  currentUser.value = user;
  return user;
}

const meetings = await import("@/features/meetings/real-actions");
const revisions = await import("@/features/revisions/real-actions");
const timelines = await import("@/features/timelines/real-actions");

beforeEach(() => {
  recorder.reset();
  dbState.queue.length = 0;
  dbState.findFirst.length = 0;
  sessionOf(ORG_A);
});

/** Asserts a foreign tenant id never reaches a predicate, and the caller's does. */
function expectScopedToOrgA() {
  const params = recorder.all();
  expect(params).toContain(ORG_A);
  expect(params).not.toContain(ORG_B);
}

describe("H-2 · meetings", () => {
  const meetingId = randomUUID();
  const projectId = randomUUID();

  it("createDecision scopes the meeting lookup to the caller's organization", async () => {
    // No meeting comes back — a foreign id is exactly this case, because the
    // organisation predicate excludes it.
    await expect(
      meetings.createDecision({
        meetingId,
        outcomeType: "decision",
        title: "Decision",
        description: "d",
        decisionType: "strategic",
        status: "open",
        priority: "medium",
      } as never),
    ).rejects.toThrow(/Meeting not found/);

    const params = recorder.all();
    expect(params).toContain(meetingId);
    expectScopedToOrgA();
  });

  it("createActionItem scopes the meeting lookup to the caller's organization", async () => {
    await expect(
      meetings.createActionItem({
        meetingId,
        outcomeType: "action_item",
        title: "Action",
        description: "d",
        status: "open",
        priority: "medium",
      } as never),
    ).rejects.toThrow(/Meeting not found/);

    expect(recorder.all()).toContain(meetingId);
    expectScopedToOrgA();
  });

  it("promoteActionItemToTask scopes the action-item lookup to the caller's organization", async () => {
    const actionItemId = randomUUID();

    await expect(
      meetings.promoteActionItemToTask({
        actionItemId,
        projectId,
        timelineId: randomUUID(),
        phaseId: randomUUID(),
        milestoneId: randomUUID(),
      } as never),
    ).rejects.toThrow(/Action item not found/);

    const params = recorder.all();
    expect(params).toContain(actionItemId);
    expectScopedToOrgA();
  });

  it("createMeeting refuses a project outside the caller's organization", async () => {
    await expect(
      meetings.createMeeting({
        projectId,
        title: "Kickoff",
        meetingType: "kickoff",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600_000),
        timezone: "UTC",
        isPrivate: false,
        isConfidential: false,
      } as never),
    ).rejects.toThrow(/Project not found/);

    expectScopedToOrgA();
  });

  it("a role without meetings.update cannot create a decision", async () => {
    // `finance` holds no meetings permission at all.
    sessionOf(ORG_A, "finance");
    await expect(
      meetings.createDecision({
        meetingId,
        outcomeType: "decision",
        title: "Decision",
        description: "d",
        decisionType: "strategic",
        status: "open",
        priority: "medium",
      } as never),
    ).rejects.toThrow(/Permission denied: meetings/);
  });
});

describe("H-3 · revisions", () => {
  const deliverableId = randomUUID();
  const projectId = randomUUID();

  it("createRevision refuses a deliverable outside the caller's organization", async () => {
    await expect(
      revisions.createRevision({
        deliverableId,
        projectId,
        name: "v1",
        description: "d",
        type: "STANDARD",
      } as never),
    ).rejects.toThrow(/Deliverable not found or access denied/);

    const params = recorder.all();
    expect(params).toContain(deliverableId);
    expectScopedToOrgA();
  });

  it("createRevisionRequest refuses a deliverable outside the caller's organization", async () => {
    await expect(
      revisions.createRevisionRequest({
        deliverableId,
        projectId,
        requestDetails: "please change it",
      } as never),
    ).rejects.toThrow(/Deliverable not found or access denied/);

    const params = recorder.all();
    expect(params).toContain(deliverableId);
    expectScopedToOrgA();
  });

  it("refuses when the deliverable exists but names a different project", async () => {
    // A caller can supply the two ids independently; they must agree.
    dbState.findFirst.push({
      deliverableId,
      organizationId: ORG_A,
      projectId: randomUUID(),
    });

    await expect(
      revisions.createRevision({
        deliverableId,
        projectId,
        name: "v1",
        description: "d",
        type: "STANDARD",
      } as never),
    ).rejects.toThrow(/Deliverable not found or access denied/);
  });

  it("a role without revisions.create is refused", async () => {
    sessionOf(ORG_A, "finance");
    await expect(
      revisions.createRevision({
        deliverableId,
        projectId,
        name: "v1",
        description: "d",
        type: "STANDARD",
      } as never),
    ).rejects.toThrow(/Permission denied: revisions/);
  });
});

describe("H-4 · timelines", () => {
  const timelineId = randomUUID();

  it("createMilestone scopes the timeline lookup to the caller's organization", async () => {
    await expect(
      timelines.createMilestone({
        timelineId,
        name: "Launch",
        startDate: "2026-01-01",
        endDate: "2026-01-02",
      } as never),
    ).rejects.toThrow(/Timeline not found/);

    const params = recorder.all();
    expect(params).toContain(timelineId);
    expectScopedToOrgA();
  });

  it("addTimelineDependency scopes the timeline lookup to the caller's organization", async () => {
    await expect(
      timelines.addTimelineDependency({
        timelineId,
        predecessorId: randomUUID(),
        successorId: randomUUID(),
        dependencyType: "finish_to_start",
      } as never),
    ).rejects.toThrow(/Timeline not found/);

    const params = recorder.all();
    expect(params).toContain(timelineId);
    expectScopedToOrgA();
  });

  it("createTimelineSnapshot is no longer exported from the action module", async () => {
    const actionSurface = await import("@/features/timelines/real-actions");
    expect(
      (actionSurface as Record<string, unknown>).createTimelineSnapshot,
    ).toBeUndefined();
  });

  it("the snapshot helper scopes every statement to the supplied user", async () => {
    const { createTimelineSnapshot } =
      await import("@/features/timelines/snapshot");
    const user = sessionOf(ORG_A);
    const tx = createRecordingDb(recorder, { queue: [[]] });

    await expect(
      createTimelineSnapshot(timelineId, "change", null, tx as never, user),
    ).rejects.toThrow(/Timeline not found for versioning/);

    const params = recorder.all();
    expect(params).toContain(timelineId);
    expect(params).toContain(ORG_A);
  });

  it("the snapshot helper cannot be pointed at another organization's timeline", async () => {
    const { createTimelineSnapshot } =
      await import("@/features/timelines/snapshot");
    const userB = sessionOf(ORG_B);
    const tx = createRecordingDb(recorder, { queue: [[]] });

    await expect(
      createTimelineSnapshot(timelineId, "change", null, tx as never, userB),
    ).rejects.toThrow(/Timeline not found for versioning/);

    // The predicate names org B — the caller's — so an org A timeline is
    // unreachable no matter which id is supplied.
    const params = recorder.all();
    expect(params).toContain(ORG_B);
    expect(params).not.toContain(ORG_A);
  });
});
