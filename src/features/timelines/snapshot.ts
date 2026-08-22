/**
 * Timeline snapshotting.
 *
 * A plain module, deliberately — the same treatment `./progress` already
 * received, and for the same reason.
 *
 * H-4. `createTimelineSnapshot` lived in `real-actions.ts`, whose file-level
 * `"use server"` turns every export into a public HTTP endpoint. It took a
 * `timelineId` and a live Drizzle transaction, resolved the timeline by primary
 * key with no organisation predicate, and wrote a version row stamped with
 * whatever organisation the caller's session happened to carry — so a snapshot
 * of one tenant's timeline could be filed under another. Its only authorisation
 * was `requireCurrentUser()`, which establishes who is calling and nothing
 * about what they may touch.
 *
 * It is an internal helper: both call sites (`createMilestone`,
 * `addTimelineDependency`) have already run `authorizeTimelineEdit()` and hold
 * an open transaction. So the fix is not to add a check here but to stop
 * publishing it — and to make the authorisation it depends on explicit by
 * taking the already-validated `CurrentUser` as an argument instead of
 * re-resolving one. A helper that fetches its own identity looks self-
 * sufficient; one that is handed it cannot be called without a caller that had
 * it, which is exactly the contract.
 *
 * The `timelineId` is additionally constrained to the caller's organisation
 * here, so the helper is safe on its own terms and not merely by convention.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { timelines, timelineVersions } from "@/db/schema/timelines";
import type { CurrentUser } from "@/features/auth/current-user";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Records a new version of a timeline. Callers must already have authorised the
 * write — see `authorizeTimelineEdit` in `./real-actions`.
 */
export async function createTimelineSnapshot(
  timelineId: string,
  changeSummary: string,
  reason: string | null,
  tx: DbTransaction,
  user: CurrentUser,
) {
  const [currentTimeline] = await tx
    .select()
    .from(timelines)
    .where(
      and(
        eq(timelines.timelineId, timelineId),
        eq(timelines.organizationId, user.organizationId),
      ),
    );
  if (!currentTimeline) throw new Error("Timeline not found for versioning");

  const timelineData = await tx.query.timelines.findFirst({
    where: and(
      eq(timelines.timelineId, timelineId),
      eq(timelines.organizationId, user.organizationId),
    ),
    with: {
      phases: {
        with: {
          milestones: {
            with: {
              successors: true,
            },
          },
        },
      },
    },
  });

  const nextVersion = currentTimeline.currentVersion + 1;

  await tx.insert(timelineVersions).values({
    timelineId,
    organizationId: user.organizationId,
    versionNumber: nextVersion,
    userId: user.userId,
    changeSummary,
    reason,
    snapshotData: timelineData,
  });

  await tx
    .update(timelines)
    .set({
      currentVersion: nextVersion,
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(
      and(
        eq(timelines.timelineId, timelineId),
        eq(timelines.organizationId, user.organizationId),
      ),
    );
}
