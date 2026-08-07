"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";
import { isDemoMode } from "@/lib/env.server";

export async function createMeeting(
  ...args: Parameters<typeof real.createMeeting>
): Promise<Awaited<ReturnType<typeof real.createMeeting>>> {
  if (isDemoMode()) return (mock as any).createMeeting(...args);
  return (real as any).createMeeting(...args);
}

export async function updateMeeting(
  ...args: Parameters<typeof real.updateMeeting>
): Promise<Awaited<ReturnType<typeof real.updateMeeting>>> {
  if (isDemoMode()) return (mock as any).updateMeeting(...args);
  return (real as any).updateMeeting(...args);
}

export async function cancelMeeting(
  ...args: Parameters<typeof real.cancelMeeting>
): Promise<Awaited<ReturnType<typeof real.cancelMeeting>>> {
  if (isDemoMode()) return (mock as any).cancelMeeting(...args);
  return (real as any).cancelMeeting(...args);
}

export async function completeMeeting(
  ...args: Parameters<typeof real.completeMeeting>
): Promise<Awaited<ReturnType<typeof real.completeMeeting>>> {
  if (isDemoMode()) return (mock as any).completeMeeting(...args);
  return (real as any).completeMeeting(...args);
}

export async function addMeetingAttendee(
  ...args: Parameters<typeof real.addMeetingAttendee>
): Promise<Awaited<ReturnType<typeof real.addMeetingAttendee>>> {
  if (isDemoMode()) return (mock as any).addMeetingAttendee(...args);
  return (real as any).addMeetingAttendee(...args);
}

export async function updateMeetingAttendee(
  ...args: Parameters<typeof real.updateMeetingAttendee>
): Promise<Awaited<ReturnType<typeof real.updateMeetingAttendee>>> {
  if (isDemoMode()) return (mock as any).updateMeetingAttendee(...args);
  return (real as any).updateMeetingAttendee(...args);
}

export async function removeMeetingAttendee(
  ...args: Parameters<typeof real.removeMeetingAttendee>
): Promise<Awaited<ReturnType<typeof real.removeMeetingAttendee>>> {
  if (isDemoMode()) return (mock as any).removeMeetingAttendee(...args);
  return (real as any).removeMeetingAttendee(...args);
}

export async function addAgendaItem(
  ...args: Parameters<typeof real.addAgendaItem>
): Promise<Awaited<ReturnType<typeof real.addAgendaItem>>> {
  if (isDemoMode()) return (mock as any).addAgendaItem(...args);
  return (real as any).addAgendaItem(...args);
}

export async function updateAgendaItem(
  ...args: Parameters<typeof real.updateAgendaItem>
): Promise<Awaited<ReturnType<typeof real.updateAgendaItem>>> {
  if (isDemoMode()) return (mock as any).updateAgendaItem(...args);
  return (real as any).updateAgendaItem(...args);
}

export async function removeAgendaItem(
  ...args: Parameters<typeof real.removeAgendaItem>
): Promise<Awaited<ReturnType<typeof real.removeAgendaItem>>> {
  if (isDemoMode()) return (mock as any).removeAgendaItem(...args);
  return (real as any).removeAgendaItem(...args);
}

export async function createDecision(
  ...args: Parameters<typeof real.createDecision>
): Promise<Awaited<ReturnType<typeof real.createDecision>>> {
  if (isDemoMode()) return (mock as any).createDecision(...args);
  return (real as any).createDecision(...args);
}

export async function createActionItem(
  ...args: Parameters<typeof real.createActionItem>
): Promise<Awaited<ReturnType<typeof real.createActionItem>>> {
  if (isDemoMode()) return (mock as any).createActionItem(...args);
  return (real as any).createActionItem(...args);
}

export async function promoteActionItemToTask(
  ...args: Parameters<typeof real.promoteActionItemToTask>
): Promise<Awaited<ReturnType<typeof real.promoteActionItemToTask>>> {
  if (isDemoMode()) return (mock as any).promoteActionItemToTask(...args);
  return (real as any).promoteActionItemToTask(...args);
}
