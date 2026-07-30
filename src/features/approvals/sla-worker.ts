import { db } from "@/db";
import { approvalStages, approvalEvents } from "@/db/schema/approvals";
import { eq, and, lt } from "drizzle-orm";

/**
 * Background worker to enforce SLA escalation policy.
 * Escalation ladder: Reminder 1 -> Reminder 2 -> PM -> Admin -> Pending.
 * Expected to be invoked by a Cron Job or Queue Worker.
 */
export async function processSlaBreaches() {
  const now = new Date();

  const overdueStages = await db.query.approvalStages.findMany({
    where: and(
      eq(approvalStages.status, "active"),
      lt(approvalStages.slaDeadline, now),
    ),
    with: {
      cycle: true,
    },
  });

  for (const stage of overdueStages) {
    const previousEvents = await db.query.approvalEvents.findMany({
      where: eq(approvalEvents.cycleId, stage.cycleId),
    });

    // Filter events for this specific stage to map progression
    const stageEvents = previousEvents.filter(
      (e) =>
        e.payload &&
        typeof e.payload === "object" &&
        "stageId" in e.payload &&
        e.payload.stageId === stage.stageId,
    );

    const reminders = stageEvents.filter(
      (e) =>
        e.eventType === "sla_reminder_1" || e.eventType === "sla_reminder_2",
    ).length;
    const pmEscalated = stageEvents.some(
      (e) => e.eventType === "sla_escalated_pm",
    );
    const adminEscalated = stageEvents.some(
      (e) => e.eventType === "sla_escalated_admin",
    );

    let nextEvent:
      | "sla_reminder_1"
      | "sla_reminder_2"
      | "sla_escalated_pm"
      | "sla_escalated_admin"
      | null = null;

    if (reminders === 0) {
      nextEvent = "sla_reminder_1";
    } else if (reminders === 1) {
      nextEvent = "sla_reminder_2";
    } else if (!pmEscalated) {
      nextEvent = "sla_escalated_pm";
    } else if (!adminEscalated) {
      nextEvent = "sla_escalated_admin";
    }

    if (nextEvent) {
      await db.insert(approvalEvents).values({
        cycleId: stage.cycleId,
        eventType: nextEvent,
        payload: {
          stageId: stage.stageId,
          note: `SLA breached, triggering ${nextEvent}`,
        },
      });
      // Notification dispatch logic to PMs/Admins would hook here
    }
  }
}
