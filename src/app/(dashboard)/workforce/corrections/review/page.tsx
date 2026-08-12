import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { listCorrectionReviewQueueAction } from "@/features/workforce/corrections/actions";
import { ReviewQueueTable } from "@/features/workforce/corrections/components/review-queue-table";
import {
  StatusFilterTabs,
  parseStatusParam,
} from "@/features/workforce/corrections/components/status-filter-tabs";
import type { CorrectionStatus } from "@/features/workforce/shared/enums";

export const metadata: Metadata = { title: "Review Queue" };

/**
 * Correction review queue (doc 16 S-7, WP-123).
 *
 * Breadth is organization-wide: the TeamScopeResolver (WP-121) is deferred, and
 * every role that holds `corrections.review` today — owner, super_admin, hr — is
 * org-wide by design (doc 14 §10.2). When manager-scope review ships, the scope
 * narrows inside the action, not here.
 */
export default async function ReviewQueuePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ status?: string }> }>) {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "corrections", "review")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const status = parseStatusParam(params.status);

  const queue = await listCorrectionReviewQueueAction({
    status: (status ?? undefined) as CorrectionStatus | undefined,
    pageSize: 100,
  });

  const pending =
    (queue.counts.PENDING ?? 0) + (queue.counts.UNDER_REVIEW ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground text-sm">
          {pending === 0
            ? "Nothing is awaiting a decision."
            : `${pending} request${pending === 1 ? "" : "s"} awaiting a decision.`}{" "}
          Approving a request amends the day and recomputes its minutes through
          the work-validation engine.
        </p>
      </div>

      <StatusFilterTabs
        basePath="/workforce/corrections/review"
        active={status}
        counts={queue.counts}
        total={Object.values(queue.counts).reduce((sum, n) => sum + n, 0)}
      />

      {queue.rows.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={
            status
              ? "No requests with this status"
              : "No pending correction requests"
          }
          description={
            status
              ? "Clear the filter to see the whole queue."
              : "When someone asks for a day to be amended, it appears here for a decision."
          }
        />
      ) : (
        <ReviewQueueTable rows={queue.rows} viewerId={user.userId} />
      )}
    </div>
  );
}
