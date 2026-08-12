import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { getTeamAttendanceAction } from "@/features/workforce/attendance/actions";
import { DayNav } from "@/features/workforce/attendance/components/day-nav";
import { TeamKpis } from "@/features/workforce/attendance/components/team-kpis";
import { TeamTable } from "@/features/workforce/attendance/components/team-table";
import { timeZoneLabel } from "@/features/workforce/shared/business-day";

export const metadata: Metadata = { title: "Team Attendance" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Team attendance (doc 16 S-10 + S-11, WP-131). One page for both the manager
 * and the org-wide lens — scope comes from permission, not from a second route.
 *
 * `?date=&departmentId=` are the view state, with the parameter names matching
 * the contract DTO fields (doc 18 F-06). Malformed values degrade to the default
 * rather than 500-ing on a stale link.
 */
export default async function TeamAttendancePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    date?: string;
    departmentId?: string;
    page?: string;
  }>;
}>) {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "attendance", "view_team")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const date =
    params.date && ISO_DATE.test(params.date) ? params.date : undefined;
  const departmentId =
    params.departmentId && UUID.test(params.departmentId)
      ? params.departmentId
      : undefined;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const team = await getTeamAttendanceAction({
    date,
    departmentId,
    page,
    pageSize: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Team Attendance
          </h1>
          <p className="text-muted-foreground text-sm">
            Everyone in {user.organizationName} for one day. Times are shown in{" "}
            {user.organizationTimezone} (
            {timeZoneLabel(user.organizationTimezone)}).
          </p>
        </div>
        <DayNav
          basePath="/workforce/team"
          date={team.date}
          extraParams={departmentId ? { departmentId } : undefined}
        />
      </div>

      <TeamKpis kpis={team.kpis} />

      {team.rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No attendance recorded for this day"
          description="Nobody has clocked in on this date. Pick another day, or check back once the team starts their sessions."
        />
      ) : (
        <TeamTable rows={team.rows} timeZone={user.organizationTimezone} />
      )}
    </div>
  );
}
