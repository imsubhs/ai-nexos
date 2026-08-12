import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FilePenLine } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { getAttendanceHistoryAction } from "@/features/workforce/attendance/actions";
import { listMyCorrectionsAction } from "@/features/workforce/corrections/actions";
import {
  CorrectionRequestDialog,
  type CorrectableDay,
} from "@/features/workforce/corrections/components/correction-request-dialog";
import { MyCorrectionsList } from "@/features/workforce/corrections/components/my-corrections-list";
import {
  StatusFilterTabs,
  parseStatusParam,
} from "@/features/workforce/corrections/components/status-filter-tabs";
import { resolveWorkforcePolicy } from "@/features/workforce/shared/policy-resolver";
import type { CorrectionStatus } from "@/features/workforce/shared/enums";

export const metadata: Metadata = { title: "Corrections" };

/** The correction window, shifted back one day: today is never correctable. */
function correctionRange(windowDays: number): { from: string; to: string } {
  const todayMs = Date.parse(
    `${new Date().toISOString().slice(0, 10)}T00:00:00Z`,
  );
  const day = 86_400_000;
  return {
    from: new Date(todayMs - windowDays * day).toISOString().slice(0, 10),
    to: new Date(todayMs - day).toISOString().slice(0, 10),
  };
}

/**
 * My corrections (doc 16 S-6, WP-122).
 *
 * The days offered in the request form are the viewer's own history over the
 * policy window, read through A-6 — which accepts no userId. That is what keeps
 * "request a correction" self-scoped by construction rather than by a check.
 */
export default async function CorrectionsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ status?: string }> }>) {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "corrections", "create")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const status = parseStatusParam(params.status);
  const policy = resolveWorkforcePolicy();
  const range = correctionRange(policy.correctionWindowDays);

  const [mine, history] = await Promise.all([
    listMyCorrectionsAction({
      status: (status ?? undefined) as CorrectionStatus | undefined,
      pageSize: 100,
    }),
    // The window is 30 days by default, inside A-6's 92-day cap.
    getAttendanceHistoryAction({ ...range, pageSize: 100 }),
  ]);

  // Both stored days and derived absences are correctable — a missing day is
  // exactly what a LOGIN_TIME or STATUS_CHANGE request is usually about.
  const days: CorrectableDay[] = history.rows.map((row) => ({
    date: row.date,
    status: row.status,
    clockInAt: row.clockInAt,
    clockOutAt: row.clockOutAt,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Corrections</h1>
          <p className="text-muted-foreground text-sm">
            Ask a reviewer to amend one of your own past days. Requests are open
            for {policy.correctionWindowDays} days; nothing changes until
            approved.
          </p>
        </div>
        <CorrectionRequestDialog
          days={days}
          windowDays={policy.correctionWindowDays}
        />
      </div>

      <StatusFilterTabs
        basePath="/workforce/corrections"
        active={status}
        counts={mine.counts}
        total={Object.values(mine.counts).reduce((sum, n) => sum + n, 0)}
      />

      {mine.rows.length === 0 ? (
        <EmptyState
          icon={FilePenLine}
          title={
            status
              ? "No requests with this status"
              : "No correction requests yet"
          }
          description={
            status
              ? "Clear the filter to see all of your requests."
              : "When a recorded day is wrong, request a correction and a reviewer will decide on it."
          }
        />
      ) : (
        <MyCorrectionsList rows={mine.rows} />
      )}
    </div>
  );
}
