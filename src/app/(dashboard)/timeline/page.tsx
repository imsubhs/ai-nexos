import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { getProjects } from "@/features/projects/actions";
import { getTimelines } from "@/features/timelines/actions";
import { TimelineFeed } from "@/features/timelines/components/timeline-feed";

export const metadata = {
  title: "Timeline",
};

const PAGE_SIZE = 25;
const PROJECT_LOOKUP_LIMIT = 200;

/**
 * Global Timeline workspace (Sprint 11A resumed). Consumes ONLY
 * getTimelines() — the pre-existing project-scoped getProjectTimeline/
 * getTimelineMilestones/getTimelineDependencies are untouched. This does
 * not rebuild the Timeline Engine; it lists what that engine already
 * produces per project.
 *
 * The `timelines` table carries no name column, so a row's only human label
 * comes from its project. That name is resolved here through the existing
 * public getProjects() action and passed down as a lookup — the timelines
 * dispatcher is not modified.
 */
export default async function TimelinePage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "timeline", "read")) {
    redirect("/unauthorized");
  }

  const canReadProjects = hasPermission(user.permissions, "projects", "read");

  const [rows, projects] = await Promise.all([
    getTimelines(0, PAGE_SIZE),
    canReadProjects
      ? getProjects(undefined, PROJECT_LOOKUP_LIMIT, 0)
      : Promise.resolve([]),
  ]);

  const projectNames = Object.fromEntries(
    projects.map((project) => [
      project.projectId,
      { name: project.projectName, code: project.projectCode },
    ]),
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
        <p className="text-sm text-muted-foreground">Every project timeline in one feed.</p>
      </div>
      <TimelineFeed initialRows={rows} projectNames={projectNames} />
    </div>
  );
}
