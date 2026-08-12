import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { getTodayAttendanceAction } from "@/features/workforce/attendance/actions";
import { MetricsGrid } from "@/features/workforce/attendance/components/metrics-grid";
import { TodayCard } from "@/features/workforce/attendance/components/today-card";
import { DEFAULT_WORKFORCE_POLICY } from "@/features/workforce/shared/types";

export const metadata: Metadata = { title: "My Attendance" };

/**
 * My Attendance (doc 16 S-4, WP-111) — the self clock screen.
 *
 * Authorization is enforced here at render time as well as inside every action:
 * this redirect stops an unpermitted viewer seeing the page, and the action's
 * own `requirePermission` stops them acting on it if they call it directly.
 */
export default async function MyAttendancePage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "attendance", "clock")) {
    redirect("/unauthorized");
  }

  const view = await getTodayAttendanceAction();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Attendance
          </h1>
          <p className="text-muted-foreground text-sm">
            Your own day. Times are shown in UTC.
          </p>
        </div>
        <Link
          href="/workforce/history"
          className="text-sm underline underline-offset-4"
        >
          View my history
        </Link>
      </div>

      <TodayCard view={view} allowWfh={DEFAULT_WORKFORCE_POLICY.allowWFH} />
      <MetricsGrid metrics={view.metrics} isOngoing={view.isOngoing} />
    </div>
  );
}
