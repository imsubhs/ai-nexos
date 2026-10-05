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
  Download,
  Edit2,
  Eye,
  File as FileIcon,
  FileText,
  Film,
  Flag,
  FolderKanban,
  FolderOpen,
  GitCommit,
  Image as ImageIcon,
  LayoutDashboard,
  ListTodo,
  Loader2,
  MoreVertical,
  Music,
  Package,
  Plus,
  Shield,
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
import { CreateDeliverableDialog } from "@/features/deliverables/components/create-deliverable-dialog";
import { DeliverableDetailSheet } from "@/features/deliverables/components/deliverable-detail-sheet";
import { FilePreviewSheet } from "@/features/files/components/file-preview-sheet";
import { FileWriteActions } from "@/features/files/components/file-write-actions";
import { getFileDownloadUrl } from "@/features/files/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { humanizeToken } from "@/features/deliverables/constants";

function getFileTypeIcon(fileType: string) {
  switch (fileType?.toLowerCase()) {
    case "image":
      return ImageIcon;
    case "video":
      return Film;
    case "audio":
      return Music;
    case "document":
      return FileText;
    case "3d_model":
      return Package;
    default:
      return FileIcon;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

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
  manager?: {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
  } | null;
  creativeDirector?: {
    userId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
  } | null;
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
  files?: any[];
  deliverables?: any[];
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
  files = [],
  deliverables = [],
}: ProjectCommandCenterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("tab") || defaultTab,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isInitializingTimeline, setIsInitializingTimeline] = useState(false);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<
    string | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const handleDownloadFile = async (file: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setDownloadingFileId(file.fileId);
      const res = await getFileDownloadUrl(file.fileId);
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
        toast.success(`Download started for ${file.title}`);
      } else {
        toast.error("Download URL could not be generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState({}, "", url.toString());
  };

  const handleInitializeTimeline = async () => {
    setIsInitializingTimeline(true);
    try {
      await createTimeline({
        projectId: project.projectId,
        status: "planning",
      });
      toast.success("Project timeline initialized with default phases");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to initialize timeline",
      );
    } finally {
      setIsInitializingTimeline(false);
    }
  };

  const overallProgress =
    summary?.overallProgress ?? project.completionPercentage ?? 0;
  const [isOverdue] = useState(() => {
    return Boolean(
      project.estimatedEndDate &&
      new Date(project.estimatedEndDate).getTime() < Date.now() &&
      project.status !== "completed",
    );
  });

  const memberOptions: TaskMemberOption[] = (project.members || []).map(
    (m: any) => ({
      userId: m.user?.userId || m.userId,
      firstName: m.user?.firstName || "Member",
      lastName: m.user?.lastName || null,
    }),
  );

  const managerDisplayName = project.manager
    ? [project.manager.firstName, project.manager.lastName]
        .filter(Boolean)
        .join(" ") || project.manager.email
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
            className="text-muted-foreground hover:text-foreground size-8"
            render={<Link href="/projects" />}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="text-muted-foreground flex items-center space-x-2">
            <Link
              href="/projects"
              className="hover:text-foreground hover:underline"
            >
              Projects
            </Link>
            <span>/</span>
            <span className="text-brand-primary bg-surface-3 border-border rounded border px-1.5 py-0.5 font-mono text-xs font-semibold">
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
                  className="text-muted-foreground hover:text-foreground size-8"
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
      <div className="border-border bg-surface-1 rounded-xl border p-6 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            {/* Client connection badge */}
            <div className="flex items-center space-x-2 text-xs">
              {project.client ? (
                <Link
                  href={`/clients/${project.client.clientId}`}
                  className="bg-surface-2 border-border/80 text-foreground-secondary hover:text-brand-primary hover:border-brand-primary/40 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition-colors"
                >
                  <Building2 className="text-brand-primary size-3" />
                  <span className="font-medium">
                    {project.client.companyName}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    CRM Client
                  </span>
                </Link>
              ) : (
                <span className="bg-surface-2/60 border-border/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1">
                  <FolderKanban className="size-3" />
                  <span>Internal Project</span>
                </span>
              )}

              {project.visibility && (
                <Badge
                  variant="outline"
                  className="text-muted-foreground text-[10px] font-normal capitalize"
                >
                  <Shield className="mr-1 size-2.5" />
                  {project.visibility.replace("_", " ")}
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                {project.projectName}
              </h1>
              <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm">
                {project.description || "No project description provided."}
              </p>
            </div>

            {/* Badges Ribbon */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ProjectStatusBadge status={project.status} />
              <ProjectHealthBadge health={project.healthStatus} />
              <ProjectPriorityBadge priority={project.priority} />
              {isOverdue && (
                <Badge
                  variant="outline"
                  className="border-rose-500/30 bg-rose-500/10 text-xs font-normal text-rose-400"
                >
                  Overdue Deadline
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Metrics Column */}
          <div className="border-border/70 bg-surface-2/40 flex shrink-0 flex-col gap-3 rounded-xl border p-4 lg:w-72">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Execution Progress</span>
              <span className="text-brand-primary font-mono font-semibold">
                {overallProgress}%
              </span>
            </div>
            <div className="bg-surface-3 h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-brand-primary h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, overallProgress))}%`,
                }}
              />
            </div>

            <div className="border-border/60 grid grid-cols-2 gap-2 border-t pt-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Tasks Done
                </span>
                <span className="text-foreground font-mono font-semibold">
                  {summary?.completedTasks ?? 0} /{" "}
                  {(summary?.openTasks ?? 0) + (summary?.completedTasks ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Due Date
                </span>
                <span className="text-foreground font-medium">
                  {project.estimatedEndDate
                    ? new Date(project.estimatedEndDate).toLocaleDateString()
                    : "Flexible"}
                </span>
              </div>
            </div>

            {project.manager && (
              <div className="border-border/60 flex items-center justify-between border-t pt-2 text-xs">
                <span className="text-muted-foreground">Project Lead:</span>
                <span className="text-foreground font-medium">
                  {managerDisplayName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution Workspace Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full space-y-6"
      >
        <TabsList className="bg-surface-1 border-border w-full justify-start overflow-x-auto rounded-xl border p-1">
          <TabsTrigger value="overview" className="gap-1.5 px-3 py-1.5 text-xs">
            <LayoutDashboard className="size-3.5" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5 px-3 py-1.5 text-xs">
            <Columns3 className="size-3.5" />
            <span>Board</span>
            <span className="text-muted-foreground ml-1 font-mono text-[10px]">
              ({tasks.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 px-3 py-1.5 text-xs">
            <GitCommit className="size-3.5" />
            <span>Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 px-3 py-1.5 text-xs">
            <ListTodo className="size-3.5" />
            <span>Tasks</span>
          </TabsTrigger>
          <TabsTrigger
            value="milestones"
            className="gap-1.5 px-3 py-1.5 text-xs"
          >
            <Flag className="size-3.5" />
            <span>Milestones</span>
            <span className="text-muted-foreground ml-1 font-mono text-[10px]">
              ({milestones.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5 px-3 py-1.5 text-xs">
            <Users className="size-3.5" />
            <span>Team</span>
            <span className="text-muted-foreground ml-1 font-mono text-[10px]">
              ({(project.members || []).length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5 px-3 py-1.5 text-xs">
            <Package className="size-3.5" />
            <span>Assets &amp; Deliverables</span>
            <span className="text-muted-foreground ml-1 font-mono text-[10px]">
              ({(files || []).length + (deliverables || []).length})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  Overall Completion
                </CardTitle>
                <CheckCircle2 className="size-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-foreground font-mono text-2xl font-bold">
                  {overallProgress}%
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Based on {summary?.completedTasks ?? 0} finished deliverable
                  tasks
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  Active Execution
                </CardTitle>
                <Clock className="text-brand-primary size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-foreground font-mono text-2xl font-bold">
                  {summary?.openTasks ?? tasks.length}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Open tasks awaiting completion or review
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  Target Deadline
                </CardTitle>
                <Calendar className="size-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-foreground text-lg font-semibold">
                  {project.estimatedEndDate
                    ? new Date(project.estimatedEndDate).toLocaleDateString()
                    : "Not set"}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {isOverdue ? "Deadline exceeded" : "Project schedule target"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium">
                  Assigned Team
                </CardTitle>
                <Users className="size-4 text-sky-400" />
              </CardHeader>
              <CardContent>
                <div className="text-foreground font-mono text-2xl font-bold">
                  {(project.members || []).length}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Active team collaborators
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="border-border bg-surface-1 shadow-xs lg:col-span-2">
              <CardHeader className="border-border/80 border-b pb-3">
                <CardTitle className="text-foreground text-base">
                  Execution Context & Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <h4 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
                    Project Overview
                  </h4>
                  <p className="text-foreground text-sm leading-relaxed">
                    {project.description ||
                      "No detailed scope notes have been documented for this project."}
                  </p>
                </div>

                <div className="border-border/60 grid grid-cols-2 gap-4 border-t pt-3 text-xs sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Start Date
                    </span>
                    <span className="text-foreground font-medium">
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString()
                        : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Estimated End
                    </span>
                    <span className="text-foreground font-medium">
                      {project.estimatedEndDate
                        ? new Date(
                            project.estimatedEndDate,
                          ).toLocaleDateString()
                        : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Client Account
                    </span>
                    <span className="text-foreground font-medium">
                      {project.client?.companyName || "Internal Agency Project"}
                    </span>
                  </div>
                </div>

                {project.budget && (
                  <div className="pt-2 text-xs">
                    <span className="text-muted-foreground">
                      Allocated Budget:{" "}
                    </span>
                    <span className="text-foreground font-mono font-medium">
                      ${project.budget}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-surface-1 shadow-xs">
              <CardHeader className="border-border/80 flex flex-row items-center justify-between border-b pb-3">
                <CardTitle className="text-foreground text-base">
                  Team Summary
                </CardTitle>
                <AddMemberModal
                  projectId={project.projectId}
                  availableUsers={availableUsers}
                />
              </CardHeader>
              <CardContent className="pt-4">
                {(project.members || []).length === 0 ? (
                  <div className="text-muted-foreground py-6 text-center text-xs">
                    No team members assigned yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(project.members || []).slice(0, 5).map((m: any) => {
                      const name =
                        [m.user?.firstName, m.user?.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                        m.user?.email ||
                        "Team Member";
                      return (
                        <div
                          key={m.memberId}
                          className="border-border/40 flex items-center justify-between border-b py-1 text-xs last:border-0"
                        >
                          <div>
                            <span className="text-foreground block font-medium">
                              {name}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {m.user?.email}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize"
                          >
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
                        className="text-muted-foreground hover:text-foreground mt-2 w-full text-xs"
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
            <div className="border-border bg-surface-1/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
              <GitCommit className="text-muted-foreground mb-3 size-8" />
              <h3 className="text-foreground mb-1 text-base font-semibold">
                Timeline Not Initialized
              </h3>
              <p className="text-muted-foreground mb-4 max-w-sm text-xs">
                Initialize the project timeline to visualize delivery schedules
                with Gantt charts, roadmaps, and calendars.
              </p>
              <Button
                size="sm"
                onClick={handleInitializeTimeline}
                disabled={isInitializingTimeline}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                <span>
                  {isInitializingTimeline
                    ? "Initializing..."
                    : "Initialize Timeline"}
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
          <div className="border-border bg-surface-1 flex items-center justify-between rounded-xl border p-4">
            <div>
              <h3 className="text-foreground text-base font-semibold">
                Project Workforce
              </h3>
              <p className="text-muted-foreground text-xs">
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

        {/* 7. ASSETS & DELIVERABLES TAB (Phase 4F DAM) */}
        <TabsContent value="assets" className="space-y-6">
          {/* Header Action Bar */}
          <div className="border-border bg-surface-1 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
                <Package className="text-brand-primary size-4" />
                Creative Deliverables &amp; Assets
              </h3>
              <p className="text-muted-foreground text-xs">
                Track creative outputs, files, and deliverables linked directly
                to this project.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CreateDeliverableDialog
                projects={[
                  {
                    projectId: project.projectId,
                    projectName: project.projectName,
                  },
                ]}
              />
              <FileWriteActions
                organizationId={project.organizationId || ""}
                projectId={project.projectId}
                folderId={null}
                onChanged={async () => router.refresh()}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                render={
                  <Link
                    href={`/files?projectId=${project.projectId}&folderId=root`}
                  />
                }
              >
                <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                Folder Hierarchy
              </Button>
            </div>
          </div>

          {/* Section A: Deliverables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <FileText className="text-brand-primary size-4" />
                Deliverables ({(deliverables || []).length})
              </h4>
            </div>

            {!deliverables || deliverables.length === 0 ? (
              <div className="border-border/80 bg-surface-2 rounded-xl border p-6">
                <EmptyState
                  icon={FileText}
                  title="No deliverables yet"
                  description="Define key creative outputs like storyboards, video drafts, or brand packages for this project."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deliverables.map((deliv: any) => (
                  <div
                    key={deliv.deliverableId}
                    onClick={() =>
                      setSelectedDeliverableId(deliv.deliverableId)
                    }
                    className="group border-border/80 bg-surface-2 hover:border-brand-primary/50 hover:bg-surface-2/80 flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] uppercase"
                        >
                          {humanizeToken(deliv.type || "other")}
                        </Badge>
                        <StatusBadge status={deliv.status} />
                      </div>
                      <h5 className="text-foreground group-hover:text-brand-primary line-clamp-1 text-sm font-medium transition-colors">
                        {deliv.title}
                      </h5>
                      {deliv.description && (
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                          {deliv.description}
                        </p>
                      )}
                    </div>
                    <div className="border-border/60 text-muted-foreground mt-3 flex items-center justify-between border-t pt-3 text-xs">
                      <span>
                        Created {new Date(deliv.createdAt).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-7"
                        onClick={() =>
                          setSelectedDeliverableId(deliv.deliverableId)
                        }
                        title="View deliverable"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Creative Assets & Files */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <FileIcon className="text-brand-primary size-4" />
                Creative Assets ({(files || []).length})
              </h4>
            </div>

            {!files || files.length === 0 ? (
              <div className="border-border/80 bg-surface-2 rounded-xl border p-6">
                <EmptyState
                  icon={FileIcon}
                  title="No creative assets yet"
                  description="Upload artwork, video cuts, audio stems, or documentation to store and attach to this project."
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {files.map((file: any) => {
                  const Icon = getFileTypeIcon(file.fileType);
                  return (
                    <div
                      key={file.fileId}
                      onClick={() => setSelectedFile(file)}
                      className="group border-border/80 bg-surface-2 hover:border-brand-primary/50 hover:bg-surface-2/80 flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all hover:shadow-md"
                    >
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="bg-surface-3 text-brand-primary flex size-7 items-center justify-center rounded-lg">
                            <Icon className="size-3.5" />
                          </div>
                          <StatusBadge status={file.status} />
                        </div>
                        <h5 className="text-foreground group-hover:text-brand-primary line-clamp-1 text-xs font-medium transition-colors">
                          {file.title}
                        </h5>
                      </div>
                      <div className="border-border/60 text-muted-foreground mt-3 flex items-center justify-between border-t pt-2.5 text-[11px]">
                        <span className="font-mono">
                          {formatBytes(file.totalSizeBytes)}
                        </span>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground size-6"
                            onClick={(e) => handleDownloadFile(file, e)}
                            disabled={downloadingFileId === file.fileId}
                            title="Download asset"
                          >
                            {downloadingFileId === file.fileId ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Download className="size-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground size-6"
                            onClick={() => setSelectedFile(file)}
                            title="Inspect asset"
                          >
                            <Eye className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Deliverable Detail Sheet */}
      <DeliverableDetailSheet
        deliverableId={selectedDeliverableId}
        onClose={() => setSelectedDeliverableId(null)}
        onChanged={() => router.refresh()}
      />

      {/* File Preview Sheet */}
      <FilePreviewSheet
        file={selectedFile}
        folders={[]}
        onClose={() => setSelectedFile(null)}
        onChanged={() => router.refresh()}
      />

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
