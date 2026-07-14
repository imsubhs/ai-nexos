/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { lt } from "drizzle-orm";
import { 
  automationExecutionLogs, 
  automationExecutionState,
  automationAudit,
  automationStatistics
} from "@/db/schema/automation";

export interface RetentionPolicyConfig {
  executionLogsDays: number;
  executionStateDays: number;
  auditDays: number;
  metricsDays: number;
}

const DEFAULT_RETENTION: RetentionPolicyConfig = {
  executionLogsDays: 30,
  executionStateDays: 14,
  auditDays: 90,
  metricsDays: 365,
};

/**
 * Retention Policy Engine
 * Responsible for cleaning up older execution logs, state, and audits.
 * Designed to be run periodically via a Cron Job (Module 07 Background Jobs).
 */
export class RetentionPolicyEngine {
  
  async applyRetentionPolicies(config: RetentionPolicyConfig = DEFAULT_RETENTION) {
    const now = new Date();

    const logsThreshold = new Date(now.getTime() - config.executionLogsDays * 24 * 60 * 60 * 1000);
    const stateThreshold = new Date(now.getTime() - config.executionStateDays * 24 * 60 * 60 * 1000);
    const auditThreshold = new Date(now.getTime() - config.auditDays * 24 * 60 * 60 * 1000);
    const metricsThreshold = new Date(now.getTime() - config.metricsDays * 24 * 60 * 60 * 1000);

    // 1. Prune Execution Logs
    await db.delete(automationExecutionLogs)
      .where(lt(automationExecutionLogs.createdAt, logsThreshold));

    // 2. Prune Execution State (Only for completed/failed/cancelled runs, though state might naturally be deleted upon completion)
    await db.delete(automationExecutionState)
      .where(lt(automationExecutionState.createdAt, stateThreshold));

    // 3. Prune Audit Logs
    await db.delete(automationAudit)
      .where(lt(automationAudit.createdAt, auditThreshold));

    // 4. Prune Statistics
    await db.delete(automationStatistics)
      .where(lt(automationStatistics.createdAt, metricsThreshold));

    console.log(`Retention policies applied successfully.`);
  }
}
