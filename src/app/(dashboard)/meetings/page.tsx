import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { getMeetings } from "@/features/meetings/queries";
import { MeetingsDirectory } from "@/features/meetings/components/meetings-directory";
import { getProjects } from "@/features/projects/actions";
import { listEmployeesAction } from "@/features/workforce/employees/actions";

export const metadata = {
  title: "Meetings",
};

// getMeetings() has no filter/search params (see real-queries.ts) — this
// fetches one bounded batch and the directory does search/filter/pagination
// client-side. 500 comfortably covers demo/small-org volumes; a true global
// search endpoint is Sprint 11B backlog, not this sprint's scope.
const FETCH_LIMIT = 500;

/**
 * Global Meetings workspace (Sprint 11A resumed). Consumes ONLY getMeetings()
 * — the pre-existing project-scoped reads (getMeetingsForProject, etc.) are
 * untouched and not called from this page.
 */
export default async function MeetingsPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "meetings", "read")) {
    redirect("/unauthorized");
  }

  const rows = await getMeetings(0, FETCH_LIMIT);

  // createMeeting requires a project; the create dialog offers these.
  const projectRows = await getProjects(undefined, 100, 0);
  const projects = projectRows.map((project) => ({
    projectId: project.projectId,
    projectName: project.projectName,
  }));

  // Attendee picker targets (Sprint 12B). A caller without people-read gets an
  // empty list and can still invite external attendees by email.
  let members: { userId: string; firstName: string; lastName: string | null }[] = [];
  try {
    const employees = await listEmployeesAction({ page: 1, pageSize: 100 });
    members = (employees?.rows ?? []).map((row) => ({
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
    }));
  } catch {
    members = [];
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
        <p className="text-sm text-muted-foreground">Every meeting across all projects.</p>
      </div>
      <MeetingsDirectory rows={rows} projects={projects} members={members} />
    </div>
  );
}
