/**
 * Workforce shared value objects (merge doc 14 §5).
 * Pure types + policy defaults; no framework imports.
 */

const MINUTE_MS = 60_000;

/** Half-open interval [startAt, endAt) in epoch ms; open period = endAt null. */
export interface TimePeriod {
  startAt: number;
  endAt: number | null;
}

/**
 * Server-captured context at clock commands (doc 14 §5). Never client-supplied;
 * ipAddress captured only when the user's privacy preference allows (policy 10.6).
 */
export interface ClockContext {
  ipAddress?: string;
  device?: string;
  browser?: string;
  location?: string;
}

/** Work-validation engine config (ported engine's ActivityConfig shape, W1). */
export interface ActivityConfig {
  idleThresholdMs: number;
  windowSizeMs: number;
  activityThresholds: { medium: number; high: number };
}

/**
 * Resolved workforce policy (doc 14 §5): user prefs ▸ organization_settings.workforce
 * ▸ these defaults (doc 10 §6.2). Defaults seeded from WorkTrack CompanySettings.
 */
export interface WorkforcePolicy {
  /** "HH:mm" in the resolved timezone. */
  workStartTime: string;
  workEndTime: string;
  lateThresholdMinutes: number;
  /** ISO weekday numbers, 1 (Mon) – 7 (Sun). */
  workingDays: number[];
  workingHoursPerDay: number;
  overtimeThresholdMinutes: number;
  allowWFH: boolean;
  requireLocationTracking: boolean;
  /** "HH:mm" — open sessions are force-closed at this time (policy 10.1). */
  autoLogoutTime: string;
  /** Corrections allowed this many days back (policy 10.5). */
  correctionWindowDays: number;
  activityConfig: ActivityConfig;
}

export const DEFAULT_WORKFORCE_POLICY: WorkforcePolicy = {
  workStartTime: "09:00",
  workEndTime: "18:00",
  lateThresholdMinutes: 15,
  workingDays: [1, 2, 3, 4, 5],
  workingHoursPerDay: 8,
  overtimeThresholdMinutes: 30,
  allowWFH: true,
  requireLocationTracking: false,
  autoLogoutTime: "23:59",
  correctionWindowDays: 30,
  activityConfig: {
    idleThresholdMs: 10 * MINUTE_MS,
    windowSizeMs: 5 * MINUTE_MS,
    activityThresholds: { medium: 20, high: 60 },
  },
};

/**
 * Canonical work-validation vocabulary (WorkTrack constants, mandated on every
 * surface including export column headers — doc 14 §1.2).
 */
export const WORK_VALIDATION_LABELS = {
  session: "Session Time",
  effective: "Effective Work Time",
  break: "Break Time",
  idle: "Idle Time",
  focus: "Focus Time",
} as const;
