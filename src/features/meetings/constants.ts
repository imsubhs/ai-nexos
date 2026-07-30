/**
 * Meeting vocabularies for the create dialog and the directory filter,
 * mirroring meetingTypeEnum / meetingStatusEnum / meetingProviderEnum in
 * src/db/schema/enums.ts (and therefore createMeetingSchema).
 */

export const MEETING_TYPES = [
  "kickoff",
  "discovery",
  "client_review",
  "creative_review",
  "internal_standup",
  "sprint_planning",
  "sprint_review",
  "retrospective",
  "approval_meeting",
  "revision_meeting",
  "production_meeting",
  "qa_review",
  "stakeholder_meeting",
  "executive_review",
  "finance",
  "legal",
  "vendor",
  "emergency",
  "other",
] as const;

export const MEETING_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
  "archived",
] as const;

export const MEETING_PROVIDERS = [
  "zoom",
  "google_meet",
  "teams",
  "webex",
  "otter",
  "manual",
  "custom",
] as const;

export const MEETING_ATTENDEE_ROLES = ["organizer", "participant", "optional"] as const;

export const MEETING_RSVP_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "tentative",
] as const;

export const DECISION_TYPES = [
  "strategic",
  "tactical",
  "creative",
  "technical",
  "financial",
  "resource",
  "other",
] as const;

export const DECISION_STATUSES = [
  "open",
  "pending",
  "accepted",
  "implemented",
  "obsolete",
] as const;

export const ACTION_ITEM_STATUSES = [
  "open",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
] as const;

export const TASK_PRIORITIES = ["critical", "high", "medium", "low"] as const;

/**
 * Sprint 12B — legal meeting status transitions.
 *
 * This is not a new state machine: `meetingStatusEnum` already defines the
 * vocabulary and the lifecycle it implies. The table below is the guard that
 * stops `updateMeeting` writing a transition the vocabulary does not support
 * (for example reviving a cancelled meeting into `in_progress`). `archived` is
 * the only exit from a terminal state.
 */
export const MEETING_STATUS_TRANSITIONS: Record<
  (typeof MEETING_STATUSES)[number],
  readonly (typeof MEETING_STATUSES)[number][]
> = {
  scheduled: ["in_progress", "completed", "cancelled", "postponed"],
  in_progress: ["completed", "cancelled"],
  postponed: ["scheduled", "cancelled", "archived"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

/** A no-op transition (from === to) is always legal; anything else is table-driven. */
export function canTransitionMeeting(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed =
    MEETING_STATUS_TRANSITIONS[from as (typeof MEETING_STATUSES)[number]];
  return Boolean(allowed?.includes(to as (typeof MEETING_STATUSES)[number]));
}

/** snake_case → "Title Case". */
export function humanizeToken(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
