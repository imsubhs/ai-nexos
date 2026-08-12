/**
 * The attendance clock lifecycle, driven through the real action pipeline
 * (`buildAttendanceActions`) against an in-memory repository.
 *
 * The pipeline is where the production defect lived: it derived the attendance
 * day from `new Date().toISOString().slice(0, 10)` — the server's UTC date —
 * while `attendance_records.date` is specified as a DayDate resolved in the
 * organization's policy timezone. On Vercel (UTC) an Asia/Kolkata employee
 * clocking in at 00:46 IST was filed against the previous date, was stamped
 * LATE against a 09:00 shift measured on the wrong clock, and could not open
 * the new day's session until 05:30 IST because the state machine correctly
 * refused a second session on what it believed was the same day.
 *
 * These tests pin the corrected boundary from both sides: the day rolls over on
 * the organization's clock, AND one session per attendance day is still the
 * rule. Fake timers hold the clock at the exact instant of the production
 * walkthrough so the regression is the literal scenario that was reported.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({
  headers: async () => new Map<string, string>(),
}));
vi.mock("@/features/events/domain-publisher", () => ({
  publishDomainEvent: async () => {},
}));
vi.mock("../events/handlers", () => ({
  ensureWorkforceHandlersRegistered: () => {},
}));

const currentUser = {
  userId: "user-1",
  organizationId: "org-1",
  organizationTimezone: "Asia/Kolkata",
  permissions: { attendance: ["clock", "read", "view_team"] },
};

vi.mock("@/features/auth/current-user", () => ({
  requireCurrentUser: async () => currentUser,
}));

import { buildAttendanceActions } from "./action-core";
import { AttendanceError } from "./repository";
import { createMemoryAttendanceRepository } from "./test-support/memory-repository";

/** 00:46:52 IST on 13 Aug 2026 — the instant of the production clock-in. */
const WALKTHROUGH = "2026-08-12T19:16:52.252Z";

function actions(repo = createMemoryAttendanceRepository()) {
  return {
    repo,
    api: buildAttendanceActions(repo, async () => 1),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  currentUser.organizationTimezone = "Asia/Kolkata";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("attendance day derivation", () => {
  it("files a clock-in under the organization's day, not the server's", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();

    const view = await api.clockIn();

    // Server UTC says 2026-08-12. The employee's clock says the 13th.
    expect(view.date).toBe("2026-08-13");
    expect(view.state).toBe("WORKING");
  });

  it("files it under the UTC day for a UTC organization", async () => {
    currentUser.organizationTimezone = "UTC";
    vi.setSystemTime(new Date(WALKTHROUGH));

    expect((await actions().api.clockIn()).date).toBe("2026-08-12");
  });

  it("does not stamp an early-morning clock-in LATE", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));

    // 00:46 IST is eight hours BEFORE the 09:00 IST shift. Measured against
    // 09:00 UTC — 14:30 IST — it looked like a late arrival.
    expect((await actions().api.clockIn()).isLate).toBe(false);
  });

  it("still stamps a genuinely late arrival LATE", async () => {
    // 09:20 IST on the 13th, past the 09:00 + 15m threshold.
    vi.setSystemTime(new Date("2026-08-13T03:50:00Z"));

    const view = await actions().api.clockIn();
    expect(view.date).toBe("2026-08-13");
    expect(view.isLate).toBe(true);
  });

  it("reads today's view on the same day it wrote it", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();
    await api.clockIn();

    // The read must resolve the same date the write did, or the employee's own
    // session disappears from the page that just created it.
    const view = await api.getTodayAttendance();
    expect(view.date).toBe("2026-08-13");
    expect(view.state).toBe("WORKING");
  });

  it("reports NOT_STARTED for the organization's day when nothing exists", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));

    const view = await actions().api.getTodayAttendance();
    expect(view).toMatchObject({ state: "NOT_STARTED", date: "2026-08-13" });
  });
});

describe("one session per attendance day", () => {
  it("refuses a second clock-in on the same organization day", async () => {
    vi.setSystemTime(new Date("2026-08-13T04:00:00Z")); // 09:30 IST
    const { api } = actions();
    await api.clockIn();
    vi.setSystemTime(new Date("2026-08-13T11:00:00Z")); // 16:30 IST, same day
    await api.clockOut();

    // The state machine is unchanged: a completed day stays completed.
    await expect(api.clockIn()).rejects.toMatchObject({
      key: "attendance/already-clocked-in",
    });
  });

  it("allows the next day's session once the organization's clock turns over", async () => {
    vi.setSystemTime(new Date("2026-08-12T04:00:00Z")); // 09:30 IST, the 12th
    const { api } = actions();
    await api.clockIn();
    vi.setSystemTime(new Date("2026-08-12T11:00:00Z")); // 16:30 IST, the 12th
    await api.clockOut();

    // 00:46 IST on the 13th: a NEW business day, though UTC still says the
    // 12th. This is the walkthrough's "cannot start another session" — it was
    // the day boundary being wrong, not the state machine being too strict.
    vi.setSystemTime(new Date(WALKTHROUGH));
    const next = await api.clockIn();
    expect(next.date).toBe("2026-08-13");
    expect(next.state).toBe("WORKING");
  });

  it("still refuses a new day while a session from an earlier day is open", async () => {
    vi.setSystemTime(new Date("2026-08-12T04:00:00Z"));
    const { api } = actions();
    await api.clockIn(); // never clocked out

    vi.setSystemTime(new Date(WALKTHROUGH));
    await expect(api.clockIn()).rejects.toMatchObject({
      key: "attendance/session-open",
    });
  });
});

describe("break lifecycle", () => {
  it("runs clock-in → break → end break → clock-out across the day boundary", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH)); // 00:46 IST on the 13th
    const { api } = actions();

    const working = await api.clockIn();
    expect(working.state).toBe("WORKING");

    vi.setSystemTime(new Date("2026-08-12T20:00:00Z")); // 01:30 IST
    const onBreak = await api.startBreak({ kind: "break" });
    expect(onBreak.state).toBe("ON_BREAK");
    expect(onBreak.date).toBe("2026-08-13");

    vi.setSystemTime(new Date("2026-08-12T20:30:00Z")); // 02:00 IST
    const back = await api.endBreak();
    expect(back.state).toBe("WORKING");

    vi.setSystemTime(new Date("2026-08-13T03:16:52.252Z")); // 08:46 IST
    const done = await api.clockOut();
    expect(done.state).toBe("COMPLETED");
    expect(done.date).toBe("2026-08-13");
  });

  it("refuses a break when no session is open", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    await expect(actions().api.startBreak()).rejects.toBeInstanceOf(
      AttendanceError,
    );
  });

  it("refuses to end a break that was never started", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();
    await api.clockIn();
    await expect(api.endBreak()).rejects.toMatchObject({
      key: "attendance/not-on-break",
    });
  });
});

describe("completed-session metrics", () => {
  it("computes an eight-hour day with no breaks", async () => {
    vi.setSystemTime(new Date("2026-08-13T03:30:00Z")); // 09:00 IST
    const { api } = actions();
    await api.clockIn();
    vi.setSystemTime(new Date("2026-08-13T11:30:00Z")); // 17:00 IST

    const done = await api.clockOut();
    expect(done.metrics.workingMinutes).toBe(480);
    expect(done.metrics.breakMinutes).toBe(0);
    expect(done.metrics.effectiveMinutes).toBe(480);
    expect(done.metrics.overtimeMinutes).toBe(0);
  });

  it("subtracts a break from effective time and keeps the invariant", async () => {
    vi.setSystemTime(new Date("2026-08-13T03:30:00Z")); // 09:00 IST
    const { api } = actions();
    await api.clockIn();
    vi.setSystemTime(new Date("2026-08-13T07:30:00Z")); // 13:00 IST
    await api.startBreak({ kind: "lunch" });
    vi.setSystemTime(new Date("2026-08-13T08:15:00Z")); // 13:45 IST
    await api.endBreak();
    vi.setSystemTime(new Date("2026-08-13T12:30:00Z")); // 18:00 IST

    const m = (await api.clockOut()).metrics;
    expect(m.workingMinutes).toBe(540);
    expect(m.breakMinutes).toBe(45);
    expect(m.effectiveMinutes).toBe(495);
    // session = effective + break + idle, with idle 0 until the tracker lands.
    expect(m.effectiveMinutes + m.breakMinutes + m.idleMinutes).toBe(
      m.workingMinutes,
    );
  });

  it("reports overtime past the threshold, and not before it", async () => {
    vi.setSystemTime(new Date("2026-08-13T03:30:00Z")); // 09:00 IST
    const { api } = actions();
    await api.clockIn();
    // 09:00 → 18:00 IST = 540 effective; 60 over the 480 standard, past the
    // 30-minute threshold.
    vi.setSystemTime(new Date("2026-08-13T12:30:00Z"));

    expect((await api.clockOut()).metrics.overtimeMinutes).toBe(60);
  });

  it("reports a sub-minute session as zero, not as missing", async () => {
    // The production walkthrough: clock in 00:46:52, clock out 00:47:08 — 16
    // seconds. The engine rounds to whole minutes, so every metric is a real,
    // computed 0. Zero is the answer; the screens must not read it as "we
    // could not work it out".
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();
    await api.clockIn();
    vi.setSystemTime(new Date("2026-08-12T19:17:08.745Z"));

    const done = await api.clockOut();
    expect(done.state).toBe("COMPLETED");
    expect(done.metrics).toMatchObject({
      workingMinutes: 0,
      breakMinutes: 0,
      effectiveMinutes: 0,
      idleMinutes: 0,
      focusMinutes: 0,
      overtimeMinutes: 0,
    });
  });

  it("leaves an open session's metrics at zero until clock-out", async () => {
    vi.setSystemTime(new Date("2026-08-13T03:30:00Z"));
    const { api } = actions();
    const open = await api.clockIn();

    expect(open.isOngoing).toBe(true);
    expect(open.metrics.workingMinutes).toBe(0);
  });

  it("computes a session that spans the organization's midnight", async () => {
    // 21:00 IST on the 12th → 02:00 IST on the 13th. The day the session is
    // filed under is the day it STARTED; the engine measures the elapsed
    // interval regardless of the calendar rolling over inside it.
    vi.setSystemTime(new Date("2026-08-12T15:30:00Z"));
    const { api } = actions();
    const started = await api.clockIn();
    expect(started.date).toBe("2026-08-12");

    vi.setSystemTime(new Date("2026-08-12T20:30:00Z"));
    const done = await api.clockOut();
    expect(done.date).toBe("2026-08-12");
    expect(done.metrics.workingMinutes).toBe(300);
  });
});

describe("history reads agree with the writes", () => {
  it("returns the day under the date the clock-in filed it", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();
    await api.clockIn();
    vi.setSystemTime(new Date("2026-08-13T11:30:00Z"));
    await api.clockOut();

    const history = await api.getAttendanceHistory({
      from: "2026-08-01",
      to: "2026-08-31",
    });
    const stored = history.rows.filter((r) => !r.isDerived);
    expect(stored).toHaveLength(1);
    expect(stored[0].date).toBe("2026-08-13");
  });

  it("defaults the history month to the organization's month", async () => {
    // 00:30 IST on 1 September; UTC still calls it 31 August. A UTC default
    // would open August and hide the day the employee is currently working.
    vi.setSystemTime(new Date("2026-08-31T19:00:00Z"));

    const history = await actions().api.getAttendanceHistory();
    expect(history.from).toBe("2026-09-01");
    expect(history.to).toBe("2026-09-30");
  });

  it("never derives an absence for the organization's today or later", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH)); // 13 Aug IST, a Thursday

    const history = await actions().api.getAttendanceHistory({
      from: "2026-08-10",
      to: "2026-08-20",
    });
    const dates = history.rows.map((r) => r.date);
    expect(dates).toContain("2026-08-12");
    expect(dates).not.toContain("2026-08-13");
    expect(dates.every((d) => d < "2026-08-13")).toBe(true);
  });

  it("defaults the team directory to the organization's day", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();
    await api.clockIn();

    const team = await api.getTeamAttendance();
    expect(team.date).toBe("2026-08-13");
    expect(team.rows).toHaveLength(1);
  });
});

describe("authorization", () => {
  it("refuses the clock commands without attendance.clock", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();
    currentUser.permissions = { attendance: ["read"] };

    await expect(api.clockIn()).rejects.toThrow();
    await expect(api.clockOut()).rejects.toThrow();
    await expect(api.startBreak()).rejects.toThrow();
    await expect(api.endBreak()).rejects.toThrow();
    await expect(api.getTodayAttendance()).rejects.toThrow();

    currentUser.permissions = { attendance: ["clock", "read", "view_team"] };
  });

  it("refuses the team directory without attendance.view_team", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();
    currentUser.permissions = { attendance: ["clock", "read"] };

    await expect(api.getTeamAttendance()).rejects.toThrow();
    await expect(api.listAttendance()).rejects.toThrow();

    currentUser.permissions = { attendance: ["clock", "read", "view_team"] };
  });

  it("refuses history without attendance.read", async () => {
    vi.setSystemTime(new Date(WALKTHROUGH));
    const { api } = actions();
    currentUser.permissions = { attendance: ["clock"] };

    await expect(api.getAttendanceHistory()).rejects.toThrow();

    currentUser.permissions = { attendance: ["clock", "read", "view_team"] };
  });
});
