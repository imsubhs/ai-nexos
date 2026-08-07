"use server";

import * as real from "./real-queries";
import * as mock from "./mock-queries";
import { isDemoMode } from "@/lib/env.server";

export async function getMeetingsForProject(
  ...args: Parameters<typeof real.getMeetingsForProject>
): Promise<Awaited<ReturnType<typeof real.getMeetingsForProject>>> {
  if (isDemoMode()) return (mock as any).getMeetingsForProject(...args);
  return (real as any).getMeetingsForProject(...args);
}

export async function getMeetingById(
  ...args: Parameters<typeof real.getMeetingById>
): Promise<Awaited<ReturnType<typeof real.getMeetingById>>> {
  if (isDemoMode()) return (mock as any).getMeetingById(...args);
  return (real as any).getMeetingById(...args);
}

export async function getMeetingDecisions(
  ...args: Parameters<typeof real.getMeetingDecisions>
): Promise<Awaited<ReturnType<typeof real.getMeetingDecisions>>> {
  if (isDemoMode()) return (mock as any).getMeetingDecisions(...args);
  return (real as any).getMeetingDecisions(...args);
}

export async function getMeetingActionItems(
  ...args: Parameters<typeof real.getMeetingActionItems>
): Promise<Awaited<ReturnType<typeof real.getMeetingActionItems>>> {
  if (isDemoMode()) return (mock as any).getMeetingActionItems(...args);
  return (real as any).getMeetingActionItems(...args);
}

export async function getMeetings(
  ...args: Parameters<typeof real.getMeetings>
): Promise<Awaited<ReturnType<typeof real.getMeetings>>> {
  if (isDemoMode()) return (mock as any).getMeetings(...args);
  return (real as any).getMeetings(...args);
}

export async function getMeetingAttendees(
  ...args: Parameters<typeof real.getMeetingAttendees>
): Promise<Awaited<ReturnType<typeof real.getMeetingAttendees>>> {
  if (isDemoMode()) return (mock as any).getMeetingAttendees(...args);
  return (real as any).getMeetingAttendees(...args);
}

export async function getMeetingAgenda(
  ...args: Parameters<typeof real.getMeetingAgenda>
): Promise<Awaited<ReturnType<typeof real.getMeetingAgenda>>> {
  if (isDemoMode()) return (mock as any).getMeetingAgenda(...args);
  return (real as any).getMeetingAgenda(...args);
}

export async function getMeetingOutcomes(
  ...args: Parameters<typeof real.getMeetingOutcomes>
): Promise<Awaited<ReturnType<typeof real.getMeetingOutcomes>>> {
  if (isDemoMode()) return (mock as any).getMeetingOutcomes(...args);
  return (real as any).getMeetingOutcomes(...args);
}

export async function getMeetingActivity(
  ...args: Parameters<typeof real.getMeetingActivity>
): Promise<Awaited<ReturnType<typeof real.getMeetingActivity>>> {
  if (isDemoMode()) return (mock as any).getMeetingActivity(...args);
  return (real as any).getMeetingActivity(...args);
}
