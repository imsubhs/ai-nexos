/**
 * The correction window on the organization's clock (policy 10.5).
 *
 * "A mistake in today's session can be raised under Corrections from tomorrow"
 * only means anything if "today" is the same day the attendance slice filed the
 * session under. While the window was measured in server UTC and attendance
 * days were too, the two were wrong together; now that attendance days are the
 * organization's, a UTC window here would open a day early — offering a
 * correction on the day an employee is still working, which the submit action
 * would then reject as not past.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/features/events/domain-publisher", () => ({
  publishDomainEvent: async () => {},
}));
vi.mock("../events/handlers", () => ({
  ensureWorkforceHandlersRegistered: () => {},
}));
vi.mock("./notify", () => ({
  notifyCorrectionSubmitted: async () => {},
  notifyCorrectionDecision: async () => {},
}));

const currentUser = {
  userId: "user-1",
  organizationId: "org-1",
  organizationTimezone: "Asia/Kolkata",
  permissions: { corrections: ["create", "read"] },
};

vi.mock("@/features/auth/current-user", () => ({
  requireCurrentUser: async () => currentUser,
}));

import { buildCorrectionActions } from "./action-core";
import type { CorrectionRepository, CreateCorrectionData } from "./repository";
import type { CorrectionDetail } from "./types";

/** 00:46 IST on 13 Aug 2026 — UTC still calls this the 12th. */
const WALKTHROUGH = "2026-08-12T19:16:52.252Z";

function stubRepo(): CorrectionRepository {
  const created: CorrectionDetail[] = [];
  return {
    async create(
      organizationId: string,
      _actor: string,
      data: CreateCorrectionData,
    ) {
      const detail = {
        correctionId: `cor-${created.length + 1}`,
        organizationId,
        correctionCode: "COR-0001",
        userId: data.userId,
        employeeName: "Test Employee",
        date: data.date,
        correctionType: data.correctionType,
        requestedClockInAt: data.requestedClockInAt ?? null,
        requestedClockOutAt: data.requestedClockOutAt ?? null,
        requestedStatus: data.requestedStatus ?? null,
        reason: data.reason,
        evidenceUrl: data.evidenceUrl ?? null,
        status: "PENDING",
        reviewedBy: null,
        reviewerName: null,
        reviewNote: null,
        reviewedAt: null,
        appliedAt: null,
        approvalCycleId: null,
        createdAt: new Date().toISOString(),
      } as unknown as CorrectionDetail;
      created.push(detail);
      return detail;
    },
    async findById() {
      return null;
    },
    async hasOpenForDate() {
      return false;
    },
    async listForUser() {
      return { rows: [], total: 0, counts: {} } as never;
    },
    async listQueue() {
      return { rows: [], total: 0, counts: {} } as never;
    },
    async applyDecision() {
      throw new Error("not used");
    },
    async markApplied() {
      throw new Error("not used");
    },
    async cancel() {
      throw new Error("not used");
    },
    async markUnderReview() {
      throw new Error("not used");
    },
  } as unknown as CorrectionRepository;
}

beforeEach(() => {
  vi.useFakeTimers();
  currentUser.organizationTimezone = "Asia/Kolkata";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("correction eligibility", () => {
  it("treats the organization's today as not yet correctable", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const actions = buildCorrectionActions(stubRepo());

    // 13 Aug is today on the employee's clock, even though UTC says the 12th.
    await expect(
      actions.submit({
        date: "2026-08-13",
        correctionType: "LOGIN_TIME",
        requestedClockInAt: "2026-08-12T19:00:00.000Z",
        reason: "Clocked in from the wrong device on arrival.",
      }),
    ).rejects.toMatchObject({ key: "correction/date-not-past" });
  });

  it("accepts the organization's yesterday", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const actions = buildCorrectionActions(stubRepo());

    const detail = await actions.submit({
      date: "2026-08-12",
      correctionType: "LOGIN_TIME",
      requestedClockInAt: "2026-08-12T03:30:00.000Z",
      reason: "Clocked in from the wrong device on arrival.",
    });
    expect(detail.date).toBe("2026-08-12");
  });

  it("follows the organization's clock, not the server's", async () => {
    // The same instant under a UTC organization: the 12th IS today there, so
    // the very request accepted above must be refused.
    currentUser.organizationTimezone = "UTC";
    vi.setSystemTime(new Date(WALKTHROUGH));
    const actions = buildCorrectionActions(stubRepo());

    await expect(
      actions.submit({
        date: "2026-08-12",
        correctionType: "LOGIN_TIME",
        requestedClockInAt: "2026-08-12T03:30:00.000Z",
        reason: "Clocked in from the wrong device on arrival.",
      }),
    ).rejects.toMatchObject({ key: "correction/date-not-past" });
  });

  it("refuses a day older than the policy window", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const actions = buildCorrectionActions(stubRepo());

    await expect(
      actions.submit({
        date: "2026-06-01",
        correctionType: "LOGIN_TIME",
        requestedClockInAt: "2026-06-01T03:30:00.000Z",
        reason: "Clocked in from the wrong device on arrival.",
      }),
    ).rejects.toMatchObject({ key: "correction/window-expired" });
  });

  it("refuses submission without corrections.create", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const actions = buildCorrectionActions(stubRepo());
    currentUser.permissions = { corrections: ["read"] };

    await expect(
      actions.submit({
        date: "2026-08-12",
        correctionType: "LOGIN_TIME",
        requestedClockInAt: "2026-08-12T03:30:00.000Z",
        reason: "Clocked in from the wrong device on arrival.",
      }),
    ).rejects.toThrow();

    currentUser.permissions = { corrections: ["create", "read"] };
  });
});
