/**
 * Timeline progress recomputation.
 *
 * A plain module, deliberately: this is an internal helper that takes a live
 * Drizzle transaction and assumes its caller has already authorised the write.
 * It previously lived in `real-actions.ts`, where the file-level "use server"
 * turns every export into a public HTTP endpoint — so an internal helper with
 * no permission check of its own was published on the client action surface.
 *
 * Callers must hold an authorised transaction. The organisation scope comes
 * from the timeline row the caller already validated.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { milestones, timelines } from "@/db/schema/timelines";
import { projects } from "@/db/schema/projects";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function recalculateTimelineProgress(
  timelineId: string,
  tx: DbTransaction,
) {
  const [timeline] = await tx
    .select()
    .from(timelines)
    .where(eq(timelines.timelineId, timelineId));
  if (!timeline) return;

  const allMilestones = await tx
    .select()
    .from(milestones)
    .where(eq(milestones.timelineId, timelineId));

  let overallProgress = 0;
  if (allMilestones.length > 0) {
    const totalProgress = allMilestones.reduce((acc, m) => acc + m.progress, 0);
    overallProgress = Math.round(totalProgress / allMilestones.length);
  }

  await tx
    .update(timelines)
    .set({ overallProgress })
    .where(eq(timelines.timelineId, timelineId));

  await tx
    .update(projects)
    .set({ completionPercentage: overallProgress })
    .where(eq(projects.projectId, timeline.projectId));
}
