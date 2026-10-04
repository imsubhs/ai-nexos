import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare, FolderKanban, Plus } from "lucide-react";
import { TaskDashboard } from "@/features/tasks/components/task-dashboard";
import type { TaskScope } from "@/features/tasks/components/task-form";
import { listEmployeesAction } from "@/features/workforce/employees/actions";
import { getProjects } from "@/features/projects/actions";
import {
  getProjectTimeline,
  getTimelineMilestones,
} from "@/features/timelines/actions";
import { isDemoMode } from "@/lib/env.server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = {
  title: "Tasks | AI NEX OS",
  description: "Manage project tasks, board status, and milestone delivery.",
};

export default async function TasksPage(props: {
  searchParams?: Promise<{ projectId?: string; milestoneId?: string }>;
}) {
  const searchParams = await props.searchParams;

  // 1. Fetch team members for assignment targets (people.read permission tolerant)
  let members: {
    userId: string;
    firstName: string;
    lastName: string | null;
  }[] = [];
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

  // 2. Resolve real dynamic task scope from tenant's projects & milestones
  let scope: TaskScope | null = null;
  let activeProjectName = "Production Tasks";
  let activeMilestoneName = "Operations Board";

  try {
    const projects = await getProjects(undefined, 20, 0);
    if (projects.length > 0) {
      const selectedProject =
        (searchParams?.projectId
          ? projects.find((p) => p.projectId === searchParams.projectId)
          : null) || projects[0];

      activeProjectName = selectedProject.projectName;

      const timeline = await getProjectTimeline(selectedProject.projectId);
      if (timeline) {
        const milestones = await getTimelineMilestones(
          timeline.timelineId,
          50,
          0,
        );
        if (milestones.length > 0) {
          const selectedMilestone =
            (searchParams?.milestoneId
              ? milestones.find(
                  (m) => m.milestoneId === searchParams.milestoneId,
                )
              : null) || milestones[0];

          activeMilestoneName = selectedMilestone.name;
          const phaseId =
            selectedMilestone.phaseId || timeline.phases?.[0]?.phaseId;

          if (phaseId) {
            scope = {
              projectId: selectedProject.projectId,
              timelineId: timeline.timelineId,
              phaseId,
              milestoneId: selectedMilestone.milestoneId,
            };
          }
        }
      }
    }
  } catch {
    // If tenant project resolution fails, scope remains null
  }

  // Fallback to dynamic demo store only in demo mode when no real projects exist
  if (!scope && isDemoMode()) {
    try {
      const { getDemoStore } = await import("@/lib/demo/store");
      const store = getDemoStore();
      const demoMilestone = store.milestones[0];
      const demoProject = store.projects[0];
      if (demoMilestone && demoProject) {
        scope = {
          projectId: demoProject.projectId,
          timelineId: demoMilestone.timelineId,
          phaseId: demoMilestone.phaseId,
          milestoneId: demoMilestone.milestoneId,
        };
        activeProjectName = demoProject.projectName;
        activeMilestoneName = demoMilestone.name;
      }
    } catch {
      scope = null;
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col space-y-4">
      {/* Header with real project and milestone scope */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground-heading">
            Tasks Operations
          </h1>
          <p className="text-muted-foreground text-sm">
            {scope
              ? `${activeMilestoneName} · ${activeProjectName}`
              : "Operational task management and execution board"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button render={<Link href="/projects" />} size="sm" variant="outline">
            <FolderKanban className="size-3.5" />
            <span>Projects</span>
          </Button>
        </div>
      </div>

      {/* Task Workspace or Honest Empty State */}
      <div className="bg-card min-h-[500px] flex-1 overflow-hidden rounded-lg border border-border shadow-xs dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {scope ? (
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center p-12 text-sm text-muted-foreground animate-pulse">
                Loading task operations…
              </div>
            }
          >
            <TaskDashboard scope={scope} members={members} />
          </Suspense>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={CheckSquare}
              title="No Project Milestones Configured"
              description="Tasks in AI NEX OS are scoped to project timeline milestones. Create a project and configure timeline milestones to begin tracking tasks."
              action={
                <Button render={<Link href="/projects" />} size="sm">
                  <Plus className="size-3.5" />
                  <span>Create Project</span>
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
