/**
 * Sprint 12B — meeting status transition guard.
 *
 * `updateMeeting` accepts any member of `meetingStatusEnum`, so the only thing
 * standing between a caller and an illegal lifecycle jump (cancelled →
 * in_progress) is this table. The guard is enforced in both the real and mock
 * adapters, which is why it lives in constants.ts rather than in either one.
 */
import { describe, expect, it } from "vitest";
import {
  MEETING_STATUSES,
  MEETING_STATUS_TRANSITIONS,
  canTransitionMeeting,
} from "@/features/meetings/constants";

describe("meeting status transitions", () => {
  it("covers every status in the enum", () => {
    for (const status of MEETING_STATUSES) {
      expect(MEETING_STATUS_TRANSITIONS[status], status).toBeDefined();
    }
  });

  it("only ever targets a declared status", () => {
    for (const targets of Object.values(MEETING_STATUS_TRANSITIONS)) {
      for (const target of targets) {
        expect(MEETING_STATUSES as readonly string[]).toContain(target);
      }
    }
  });

  it("treats a no-op transition as legal", () => {
    for (const status of MEETING_STATUSES) {
      expect(canTransitionMeeting(status, status), status).toBe(true);
    }
  });

  it("lets a scheduled meeting start, complete, cancel or postpone", () => {
    expect(canTransitionMeeting("scheduled", "in_progress")).toBe(true);
    expect(canTransitionMeeting("scheduled", "completed")).toBe(true);
    expect(canTransitionMeeting("scheduled", "cancelled")).toBe(true);
    expect(canTransitionMeeting("scheduled", "postponed")).toBe(true);
  });

  it("refuses to revive a terminal meeting", () => {
    expect(canTransitionMeeting("cancelled", "in_progress")).toBe(false);
    expect(canTransitionMeeting("cancelled", "scheduled")).toBe(false);
    expect(canTransitionMeeting("completed", "in_progress")).toBe(false);
    expect(canTransitionMeeting("archived", "scheduled")).toBe(false);
  });

  it("lets a terminal meeting be archived, and archived is the end", () => {
    expect(canTransitionMeeting("completed", "archived")).toBe(true);
    expect(canTransitionMeeting("cancelled", "archived")).toBe(true);
    expect(MEETING_STATUS_TRANSITIONS.archived).toEqual([]);
  });

  it("does not let a scheduled meeting skip straight to archived", () => {
    // Archiving something that never happened would lose the reason it did not.
    expect(canTransitionMeeting("scheduled", "archived")).toBe(false);
  });

  it("rejects a status that is not in the vocabulary at all", () => {
    expect(canTransitionMeeting("scheduled", "deleted")).toBe(false);
    expect(canTransitionMeeting("nonsense", "completed")).toBe(false);
  });
});
