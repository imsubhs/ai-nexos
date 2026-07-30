import {
  getProjectById,
  getProjectDashboardSummary,
} from "@/features/projects/actions";
import {
  ProjectHealthBadge,
  ProjectPriorityBadge,
  ProjectStatusBadge,
} from "@/features/projects/components/project-badges";
import { ProjectMembersTable } from "@/features/projects/components/project-members-table";
import { AddMemberModal } from "@/features/projects/components/add-member-modal";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Project Dashboard",
};

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, summary] = await Promise.all([
    getProjectById(projectId),
    getProjectDashboardSummary(projectId).catch(() => null),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="mb-2 flex items-center space-x-4">
        {/* Sprint 12A: icon-only back control with no accessible name — the
            same defect class as P2-03, found by the Phase 8 sweep. */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to all projects"
          render={<Link href="/projects" />}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <div>
          <div className="text-muted-foreground flex items-center space-x-2 text-sm">
            <span className="bg-muted rounded px-1.5 font-mono">
              {project.projectCode}
            </span>
            <span>•</span>
            <span>{project.client?.companyName || "Internal Project"}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/projects/${project.projectId}/timeline`} />}
          >
            View Timeline
          </Button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {project.projectName}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            {project.description || "No description provided for this project."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
          <ProjectStatusBadge status={project.status} />
          <ProjectHealthBadge health={project.healthStatus} />
          <ProjectPriorityBadge priority={project.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-4">
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Project Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-muted-foreground">Progress</div>
                  <div className="text-lg font-semibold">
                    {summary.overallProgress}%
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Deadline</div>
                  <div className="font-semibold">
                    {summary.upcomingDeadline
                      ? new Date(summary.upcomingDeadline).toLocaleDateString()
                      : "None"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pending Tasks</div>
                  <div className="font-semibold">{summary.openTasks}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Latest Activity</div>
                  <div className="font-semibold">
                    {summary.latestDeliverable || "None"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Summary data not available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Team Members</CardTitle>
            <AddMemberModal projectId={project.projectId} />
          </CardHeader>
          <CardContent className="px-0">
            <ProjectMembersTable members={project.members || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
