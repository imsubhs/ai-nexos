/**
 * Task vocabularies shared by the create/edit form, the board, and the detail
 * dialog. Values mirror taskStatusEnum / taskPriorityEnum / taskTypeEnum in
 * src/db/schema/enums.ts and insertTaskSchema in ./schemas.ts — a single list
 * so a control can never offer a status the domain does not accept.
 */

export const TASK_STATUSES = [
  "backlog",
  "todo",
  "ready",
  "in_progress",
  "blocked",
  "waiting",
  "review",
  "client_review",
  "approved",
  "completed",
  "cancelled",
  "archived",
] as const;

export const TASK_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export const TASK_TYPES = [
  "creative",
  "design",
  "video_editing",
  "motion_graphics",
  "prompt_engineering",
  "ai_generation",
  "qa",
  "review",
  "documentation",
  "meeting",
  "development",
  "research",
  "marketing",
  "other",
] as const;

/**
 * The five columns the Kanban board renders. A status outside this set is a
 * legitimate domain state but has no column, so the board's per-card status
 * control offers only these — the detail dialog exposes all twelve.
 */
export const BOARD_COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "completed", label: "Completed" },
] as const;

/** snake_case → "Title Case". */
export function humanizeToken(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
