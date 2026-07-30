/**
 * Sprint 12A — DemoStore ⇄ Drizzle schema parity.
 *
 * P1-02 (Organisation Profile unsaveable) and P2-01 (a deliverable seeded with
 * a status that is not in `deliverableStatusEnum`) were the same defect: the
 * DemoStore drifted from the tables it is supposed to mirror, and nothing
 * enforced the parity the v1.0 baseline claims (§2.3, §10.5). Phase A's
 * architectural recommendation was a single test that would have caught both.
 * This is that test.
 *
 * Two assertions per covered collection:
 *   1. every seeded key is a real column on the table (no invented fields);
 *   2. every non-nullable column without a default is present on the row.
 * Plus: enum-typed columns only ever hold a declared enum member.
 */
import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import type { PgTableWithColumns, PgEnumColumn } from "drizzle-orm/pg-core";
import { getDemoStore } from "@/lib/demo/store";
import { organizations } from "@/db/schema/organizations";
import { tasks } from "@/db/schema/tasks";
import { taskAssignees, taskComments, taskActivity } from "@/db/schema/tasks";
import { deliverables, deliverableRevisions } from "@/db/schema/deliverables";
import {
  meetings,
  meetingAttendees,
  meetingAgenda,
  meetingOutcomes,
  meetingDecisions,
  meetingActionItems,
  meetingActivity,
} from "@/db/schema/meetings";
import { files, fileVersions, fileFolders } from "@/db/schema/files";
import { notifications, notificationTemplates } from "@/db/schema/notifications";
import { events } from "@/db/schema/events";

/**
 * Relational conveniences the demo store attaches to rows so mock reads can
 * answer `with:`-style queries without a join. They are not table columns and
 * are exempted by name rather than by loosening the check.
 */
const RELATION_KEYS = new Set(["assignees", "user", "role", "department", "revisions"]);

type AnyTable = PgTableWithColumns<any>;

const COVERED: Array<[string, AnyTable, keyof ReturnType<typeof getDemoStore>]> = [
  ["organizations", organizations, "organizations"],
  ["tasks", tasks, "tasks"],
  ["deliverables", deliverables, "deliverables"],
  ["deliverable_revisions", deliverableRevisions, "deliverableRevisions"],
  ["meetings", meetings, "meetings"],
  ["files", files, "files"],
  ["file_versions", fileVersions, "fileVersions"],
  ["file_folders", fileFolders, "fileFolders"],
  ["notifications", notifications, "notifications"],
  // Sprint 12B: every collection the domain-completion work seeded or began
  // writing to. Each of these is a table the aggregate always had and nothing
  // populated — exactly the shape of drift this test exists to catch.
  ["task_assignees", taskAssignees, "taskAssignees"],
  ["task_comments", taskComments, "taskComments"],
  ["task_activity", taskActivity, "taskActivity"],
  ["meeting_attendees", meetingAttendees, "meetingAttendees"],
  ["meeting_agenda", meetingAgenda, "meetingAgenda"],
  ["meeting_outcomes", meetingOutcomes, "meetingOutcomes"],
  ["meeting_decisions", meetingDecisions, "meetingDecisions"],
  ["meeting_action_items", meetingActionItems, "meetingActionItems"],
  ["meeting_activity", meetingActivity, "meetingActivity"],
  ["notification_templates", notificationTemplates, "notificationTemplates"],
  ["events", events, "domainEvents"],
];

describe("DemoStore is schema-parallel with the tables it mirrors", () => {
  const store = getDemoStore();

  for (const [label, table, collection] of COVERED) {
    const columns = getTableColumns(table);
    const columnNames = new Set(Object.keys(columns));
    const rows = store[collection] as Record<string, unknown>[];

    describe(label, () => {
      it("seeds at least one row", () => {
        expect(rows.length).toBeGreaterThan(0);
      });

      it("carries no key that is not a column", () => {
        for (const row of rows) {
          const unknownKeys = Object.keys(row).filter(
            (key) => !columnNames.has(key) && !RELATION_KEYS.has(key),
          );
          expect(unknownKeys, `${label}: unknown keys`).toEqual([]);
        }
      });

      it("carries every required column", () => {
        const required = Object.entries(columns)
          .filter(([, column]) => {
            const meta = column as { notNull: boolean; hasDefault: boolean };
            return meta.notNull && !meta.hasDefault;
          })
          .map(([name]) => name);

        for (const row of rows) {
          const missing = required.filter((name) => row[name] === undefined);
          expect(missing, `${label}: missing required columns`).toEqual([]);
        }
      });

      it("only holds declared members in enum columns", () => {
        const enumColumns = Object.entries(columns)
          .map(([name, column]) => [name, column as unknown as PgEnumColumn<any>] as const)
          .filter(([, column]) => Array.isArray(column.enumValues));

        for (const row of rows) {
          for (const [name, column] of enumColumns) {
            const value = row[name];
            if (value === null || value === undefined) continue;
            expect(
              column.enumValues as string[],
              `${label}.${name} = ${String(value)}`,
            ).toContain(value);
          }
        }
      });
    });
  }
});
