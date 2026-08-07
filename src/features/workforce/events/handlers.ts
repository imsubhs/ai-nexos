/**
 * Workforce event handlers (Sprint 4B) — the read-model projection side of the
 * attendance/correction event flow.
 *
 * Flow (doc 14 §11): an action runs the FROZEN engine once, persists the
 * hot-path minutes, then publishes an L3 event that CARRIES the full engine
 * `ValidationResult`. This handler consumes `attendance.clocked_out` and
 * `attendance.amended` and projects that result into the
 * ValidationResultRepository — the rich timeline/focus/violations/derived read
 * model. The engine is never re-run here (single calculation, projected), so
 * no duplicate math is introduced.
 *
 * Registration is idempotent and happens lazily from the workforce action
 * pipelines (attendance + corrections), so the handler is always wired before
 * any workforce event fires — in demo AND real mode (the platform publisher
 * dispatches to in-process handlers in both).
 */
import {
  registerDomainEventHandler,
  type PublishedDomainEvent,
} from "@/features/events/domain-publisher";
import type { ValidationResult } from "../work-validation";
import { ATTENDANCE_EVENTS } from "../attendance/events";
import type {
  AttendanceValidationSnapshot,
  ValidationResultRepository,
  ValidationSnapshotSource,
} from "../attendance/validation-result-repository";
import { mockValidationResultRepository } from "../attendance/validation-result-mock-repository";
import { realValidationResultRepository } from "../attendance/validation-result-real-repository";
import { isDemoMode } from "@/lib/env.server";

/** The projection events — only these carry a validation result. */
const PROJECTION_EVENTS: Record<string, ValidationSnapshotSource> = {
  [ATTENDANCE_EVENTS.clockedOut]: "clock-out",
  [ATTENDANCE_EVENTS.amended]: "correction",
};

function validationRepo(): ValidationResultRepository {
  return isDemoMode()
    ? mockValidationResultRepository
    : realValidationResultRepository;
}

/**
 * Project the engine result carried by a clocked-out/amended event into the
 * validation read-model store. Silently ignores events without a validation
 * payload (e.g. break events) or a resolvable day key.
 */
export async function projectValidationSnapshot(
  event: PublishedDomainEvent,
): Promise<void> {
  const source = PROJECTION_EVENTS[event.eventName];
  if (!source) return;

  const validation = event.payload.validation as ValidationResult | undefined;
  const userId = event.payload.userId as string | undefined;
  const date = event.payload.date as string | undefined;
  if (!validation || !userId || !date) return;

  const snapshot: AttendanceValidationSnapshot = {
    attendanceId: event.aggregateId,
    organizationId: event.organizationId,
    userId,
    date,
    computedAt: new Date().toISOString(),
    source,
    result: validation,
  };
  await validationRepo().save(snapshot);
}

let registered = false;

/**
 * Register the workforce read-model handlers exactly once. Cheap to call on
 * every action entry — the guard makes repeats no-ops.
 */
export function ensureWorkforceHandlersRegistered(): void {
  if (registered) return;
  registered = true;
  registerDomainEventHandler(projectValidationSnapshot);
}
