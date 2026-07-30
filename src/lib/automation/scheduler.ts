/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { automationSchedules } from "@/db/schema/automation";
import { QueueProvider } from "./queue";
import { lte, and, eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Distributed Scheduler Poller
 * Polls the database for schedules where next_run_at <= NOW().
 * Designed to run in a distributed environment using SELECT ... FOR UPDATE SKIP LOCKED
 * via Drizzle ORM / Postgres to prevent concurrent workers from processing the same schedule twice.
 */
export class DistributedScheduler {
  private isPolling = false;
  private intervalId?: NodeJS.Timeout;

  constructor(private queueProvider: QueueProvider) {}

  start(pollingIntervalMs: number = 60000) {
    if (this.isPolling) return;
    this.isPolling = true;

    this.intervalId = setInterval(() => {
      this.poll().catch((err) => {
        console.error("Scheduler polling error:", err);
      });
    }, pollingIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.isPolling = false;
  }

  async poll() {
    // We use a transaction to safely fetch and update schedules that are due to run.
    await db.transaction(async (tx) => {
      // Find all active schedules that are due
      // In raw SQL this should use FOR UPDATE SKIP LOCKED to allow concurrent pollers.
      const dueSchedules = await tx
        .select()
        .from(automationSchedules)
        .where(
          and(
            eq(automationSchedules.isActive, true),
            lte(automationSchedules.nextRunAt, new Date()),
          ),
        )
        // Drizzle ORM Postgres specific locking
        .for("update", { skipLocked: true });

      for (const schedule of dueSchedules) {
        // Enqueue the trigger
        await this.queueProvider.enqueue("automation_execution", {
          id: crypto.randomUUID(),
          runId: crypto.randomUUID(), // New run
          payload: {
            workflowId: schedule.workflowId,
            triggerSource: "schedule",
            idempotencyKey: `${schedule.idempotencyKeyPrefix || "cron"}_${schedule.id}_${Date.now()}`,
          },
          retryCount: 0,
        });

        // Calculate next run date (Mocked for this implementation, typically use cron-parser)
        const nextDate = new Date(Date.now() + 60000); // Mock: next minute

        // Update the schedule
        await tx
          .update(automationSchedules)
          .set({
            lastRunAt: new Date(),
            nextRunAt: nextDate,
          })
          .where(eq(automationSchedules.id, schedule.id));
      }
    });
  }
}
