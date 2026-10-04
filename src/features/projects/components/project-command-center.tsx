"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Columns3,
  Edit2,
  Flag,
  FolderKanban,
  GitCommit,
  LayoutDashboard,
  ListTodo,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ProjectHealthBadge,
  ProjectPriorityBadge,
  ProjectStatusBadge,
} from "./project-badges";
import { ProjectForm } from "./project-form";
import { ProjectMembersTable } from "./project-members-table";
import { AddMemberModal } from "./add-member-modal";
import { ProjectTaskWorkspace } from "./project-task-workspace";
import { ProjectMilestonesView } from "./project-milestones-view";
import { TimelineDashboard } from "@/features/timelines/components/timeline-dashboard";
import { archiveProject } from "../actions";
import { createTimeline } from "@/features/timelines/actions";
import { toast } from "sonner";
import type { ProjectDashboardSummary } from "../real-actions";

import type { TaskMemberOption } from "@/features/tasks/components/task-detail-modal";

type ProjectRow = Record<string, any> & {
  projectId: string;
  projectName: string;
  projectCode: string;
  description?: string | null;
  status: string;
  healthStatus: string;
  priority: string;
  startDate?: Date | string | null;
  estimatedEndDate?: Date | string | null;
  actualEndDate?: Date | string | null;
  completionPercentage: number;
  budget?: string | null;
  visibility?: string | null;
  clientId?: string | null;
  client?: { clientId: string; companyName: string } | null;
  manager?: { userId?: string; firstName?: string | null; lastName?: string | null; email?: string } | null;
  creativeDirector?: { userId?: string; firstName?: string | null; lastName?: string | null; email?: string } | null;
  members?: any[];
};

interface ProjectCommandCenterProps {
  project: ProjectRow;
  summary: ProjectDashboardSummary | null;
  timeline: any | null;
  milestones: any[];
  tasks: any[];
  availableUsers: { userId: string; name?: string | null; email: string }[];
  clientOptions: { clientId: string; companyName: string }[];
  defaultTab?: string;
}

export function ProjectCommandCenter({
  project,
  summary,
  timeline,
  milestones,
  tasks,
  availableUsers,
  clientOptions,
  defaultTab = "overview",
}: ProjectCommandCenterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("tab") || defaultTab,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isInitializingTimeline, setIsInitializingTimeline] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  const handleInitializeTimeline = async () => {
    setIsInitializingTimeline(true);
    try {
      await createTimeline({ projectId: project.projectId, status: "planning" });
      toast.success("Project timeline initialized with default phases");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to initialize timeline",
      );
    } finally {
      setIsInitializingTimeline(false);
    }
  };

  const overallProgress = summary?.overallProgress ?? project.completionPercentage ?? 0;
  const [isOverdue] = useState(() => {
    return Boolean(
      project.estimatedEndDate &&
        new Date(project.estimatedEndDate).getTime() < Date.now() &&
        project.status !== "completed",
    );
  });


  const memberOptions: TaskMemberOption[] = (project.members || []).map((m: any) => ({
    userId: m.user?.userId || m.userId,
    firstName: m.user?.firstName || "Member",
    lastName: m.user?.lastName || null,
  }));

  const managerDisplayName = project.manager
    ? [project.manager.firstName, project.manager.lastName].filter(Boolean).join(" ") ||
      project.manager.email
    : null;


  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Navigation Breadcrumb & Back control */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-sm">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to all projects"
            className="size-8 text-muted-foreground hover:text-foreground"
            render={<Link href="/projects" />}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex items-center space-x-2 text-muted-foreground">
            <Link
              href="/projects"
              className="hover:text-foreground hover:underline"
            >
              Projects
            </Link>
            <span>/</span>
            <span className="font-mono text-xs font-semibold text-brand-primary bg-surface-3 border border-border px-1.5 py-0.5 rounded">
              {project.projectCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Edit2 className="size-3.5" />
            <span>Edit Project</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  aria-label="More project actions"
                >
                  <MoreVertical className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                Edit project details
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setIsArchiveOpen(true)}
              >
                Archive project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Project Header Banner */}
      <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            {/* Client connection badge */}
            <div className="flex items-center space-x-2 text-xs">
              {project.client ? (
                <Link
                  href={`/clients/${project.client.clientId}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2 border border-border/80 text-foreground-secondary hover:text-brand-primary hover:border-brand-primary/40 transition-colors"
                >
                  <Building2 className="size-3 text-brand-primary" />
                  <span className="font-medium">{project.client.companyName}</span>
                  <span className="text-muted-foreground text-[10px]">CRM Client</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-2/60 border border-border/60 text-muted-foreground">
                  <FolderKanban className="size-3" />
                  <span>Internal Project</span>
                </span>
              )}

              {project.visibility && (
                <Badge variant="outline" className="text-[10px] capitalize font-normal text-muted-foreground">
                  <Shield className="size-2.5 mr-1" />
                  {project.visibility.replace("_", " ")}
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {project.projectName}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                {project.description || "No project description provided."}
              </p>
            </div>

            {/* Badges Ribbon */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ProjectStatusBadge status={project.status} />
              <ProjectHealthBadge health={project.healthStatus} />
              <ProjectPriorityBadge priority={project.priority} />
              {isOverdue && (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-xs font-normal">
                  Overdue Deadline
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Metrics Column */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-surface-2/40 p-4 lg:w-72 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Execution Progress</span>
              <span className="font-mono font-semibold text-brand-primary">
                {overallProgress}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-brand-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, overallProgress))}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Tasks Done</span>
                <span className="font-mono font-semibold text-foreground">
                  {summary?.completedTasks ?? 0} / {(summary?.openTasks ?? 0) + (summary?.completedTasks ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Due Date</span>
                <span className="font-medium text-foreground">
                  {project.estimatedEndDate
                    ? new Date(project.estimatedEndDate).toLocaleDateString()
                    : "Flexible"}
                </span>
              </div>
            </div>

            {project.manager && (
              <div className="pt-2 border-t border-border/60 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Project Lead:</span>
                <span className="font-medium text-foreground">
                  {managerDisplayName}
                </span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Execution Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="bg-surface-1 border border-border p-1 rounded-xl w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5 text-xs py-1.5 px-3">
            <LayoutDashboard className="size-3.5" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5 text-xs py-1.5 px-3">
            <Columns3 className="size-3.5" />
            <span>Board</span>
            <span className="ml-1 text-[10px] font-mono text-muted-foreground">
              ({tasks.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 text-xs py-1.5 px-3">
            <GitCommit className="size-3.5" />
            <span>Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 text-xs py-1.5 px-3">
            <ListTodo className="size-3.5" />
            <span>Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-1.5 text-xs py-1.5 px-3">
            <Flag className="size-3.5" />
            <span>Milestones</span>
            <span className="ml-1 text-[10px] font-mono text-muted-foreground">
              ({milestones.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 text-xs py-1.5 px-3">
            <Users className="size-3.5" />
            <span>Team</span>
            <span className="ml-1 text-[10px] font-mono text-muted-foreground">
              ({(project.members || []).length})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Overall Completion
                </CardTitle>
                <CheckCircle2 className="size-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {overallProgress}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {summary?.completedTasks ?? 0} finished deliverable tasks
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Active Execution
                </CardTitle>
                <Clock className="size-4 text-brand-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {summary?.openTasks ?? tasks.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Open tasks awaiting completion or review
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Target Deadline
                </CardTitle>
                <Calendar className="size-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-foreground">
                  {project.estimatedEndDate
                    ? new Date(project.estimatedEndDate).toLocaleDateString()
                    : "Not set"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isOverdue ? "Deadline exceeded" : "Project schedule target"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Assigned Team
                </CardTitle>
                <Users className="size-4 text-sky-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {(project.members || []).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active team collaborators
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border bg-surface-1 shadow-xs">
              <CardHeader className="border-b border-border/80 pb-3">
                <CardTitle className="text-base text-foreground">
                  Execution Context & Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Project Overview
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed">
                    {project.description ||
                      "No detailed scope notes have been documented for this project."}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Start Date</span>
                    <span className="font-medium text-foreground">
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString()
                        : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Estimated End</span>
                    <span className="font-medium text-foreground">
                      {project.estimatedEndDate
                        ? new Date(project.estimatedEndDate).toLocaleDateString()
                        : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Client Account</span>
                    <span className="font-medium text-foreground">
                      {project.client?.companyName || "Internal Agency Project"}
                    </span>
                  </div>
                </div>

                {project.budget && (
                  <div className="pt-2 text-xs">
                    <span className="text-muted-foreground">Allocated Budget: </span>
                    <span className="font-mono font-medium text-foreground">
                      ${project.budget}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/80 pb-3">
                <CardTitle className="text-base text-foreground">Team Summary</CardTitle>
                <AddMemberModal
                  projectId={project.projectId}
                  availableUsers={availableUsers}
                />
              </CardHeader>
              <CardContent className="pt-4">
                {(project.members || []).length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No team members assigned yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(project.members || []).slice(0, 5).map((m: any) => {
                      const name =
                        [m.user?.firstName, m.user?.lastName].filter(Boolean).join(" ") ||
                        m.user?.email ||
                        "Team Member";
                      return (
                        <div
                          key={m.memberId}
                          className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0"
                        >
                          <div>
                            <span className="font-medium text-foreground block">
                              {name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {m.user?.email}
                            </span>
                          </div>
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {m.role}
                          </Badge>
                        </div>
                      );
                    })}
                    {(project.members || []).length > 5 && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleTabChange("team")}
                        className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
                      >
                        View all {(project.members || []).length} members →
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. BOARD TAB (KANBAN) */}
        <TabsContent value="board" className="space-y-4">
          <ProjectTaskWorkspace
            projectId={project.projectId}
            initialTasks={tasks}
            members={memberOptions}
            milestones={milestones}
            timelineId={timeline?.timelineId}
            defaultView="board"
          />
        </TabsContent>

        {/* 3. TIMELINE TAB (GANTT) */}
        <TabsContent value="timeline" className="space-y-4">
          {!timeline ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1/40 p-12 text-center">
              <GitCommit className="size-8 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Timeline Not Initialized
              </h3>
              <p className="max-w-sm text-xs text-muted-foreground mb-4">
                Initialize the project timeline to visualize delivery schedules with Gantt charts, roadmaps, and calendars.
              </p>
              <Button
                size="sm"
                onClick={handleInitializeTimeline}
                disabled={isInitializingTimeline}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                <span>
                  {isInitializingTimeline ? "Initializing..." : "Initialize Timeline"}
                </span>
              </Button>
            </div>
          ) : (
            <TimelineDashboard timeline={timeline} />
          )}
        </TabsContent>

        {/* 4. TASKS TAB (LIST) */}
        <TabsContent value="tasks" className="space-y-4">
          <ProjectTaskWorkspace
            projectId={project.projectId}
            initialTasks={tasks}
            members={memberOptions}
            milestones={milestones}
            timelineId={timeline?.timelineId}
            defaultView="list"
          />
        </TabsContent>

        {/* 5. MILESTONES TAB */}
        <TabsContent value="milestones" className="space-y-4">
          <ProjectMilestonesView
            timelineId={timeline?.timelineId}
            phases={timeline?.phases || []}
            milestones={milestones}
          />
        </TabsContent>

        {/* 6. TEAM TAB */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-1">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Project Workforce
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage roles and collaborator assignments for this project.
              </p>
            </div>
            <AddMemberModal
              projectId={project.projectId}
              availableUsers={availableUsers}
            />
          </div>

          <ProjectMembersTable members={project.members || []} />
        </TabsContent>
      </Tabs>

      {/* Edit Project Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <ProjectForm
            initialData={project}
            clientOptions={clientOptions}
            onSuccess={() => {
              setIsEditOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Archive Project Dialog */}
      <ConfirmDialog
        open={isArchiveOpen}
        onOpenChange={setIsArchiveOpen}
        title="Archive Project"
        description={`${project.projectName} will be archived and removed from active project directories.`}
        confirmLabel="Archive Project"
        pendingLabel="Archiving..."
        variant="destructive"
        onConfirm={async () => {
          await archiveProject(project.projectId);
          toast.success("Project archived");
          router.push("/projects");
        }}
      />
    </div>
  );
}
