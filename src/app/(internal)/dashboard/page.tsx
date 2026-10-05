import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckSquare,
  ClipboardCheck,
  Clock,
  FileText,
  Files,
  FolderKanban,
  Plus,
  ShieldCheck,
  Video,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import {
  getActiveProjectsCount,
  getProjects,
} from "@/features/projects/actions";
import { getClientsCount } from "@/features/clients/actions";
import { getMyOpenTasksCount } from "@/features/tasks/actions";
import { getPendingApprovalsCount } from "@/features/approvals/actions";

export const metadata: Metadata = {
  title: "Mission Control | AI NEX OS",
  description:
    "Executive operations, project status, and production telemetry.",
};

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const canReadProjects = hasPermission(user.permissions, "projects", "read");

  const [
    activeProjects,
    clientsCount,
    myOpenTasks,
    pendingApprovals,
    recentProjects,
  ] = await Promise.all([
    getActiveProjectsCount().catch(() => 0),
    getClientsCount().catch(() => 0),
    getMyOpenTasksCount().catch(() => 0),
    getPendingApprovalsCount().catch(() => 0),
    canReadProjects
      ? getProjects(undefined, 5, 0).catch(() => [])
      : Promise.resolve([]),
  ]);

  const METRICS = [
    {
      title: "Active Projects",
      icon: FolderKanban,
      value: activeProjects,
      description: "Projects currently in execution",
      href: "/projects",
    },
    {
      title: "Active Clients",
      icon: Building2,
      value: clientsCount,
      description: "Client accounts under management",
      href: "/clients",
    },
    {
      title: "My Open Tasks",
      icon: CheckSquare,
      value: myOpenTasks,
      description: "Action items assigned to you",
      href: "/tasks",
    },
    {
      title: "Pending Approvals",
      icon: ClipboardCheck,
      value: pendingApprovals,
      description: "Awaiting review and sign-off",
      href: "/workforce/corrections/review",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Mission Control Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground-heading text-2xl font-bold tracking-tight">
              Mission Control
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live Workspace
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {user.organizationName} · Welcome back, {user.firstName} (
            {user.roleName})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canReadProjects && (
            <Button
              render={<Link href="/projects" />}
              size="sm"
              variant="default"
            >
              <Plus className="size-3.5" />
              <span>New Project</span>
            </Button>
          )}
          <Button render={<Link href="/tasks" />} size="sm" variant="outline">
            <CheckSquare className="size-3.5" />
            <span>Tasks</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <Link
            key={metric.title}
            href={metric.href}
            className="group block focus-visible:outline-none"
          >
            <Card className="hover:border-border-strong group-focus-visible:ring-primary/50 transition-colors group-focus-visible:ring-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-foreground-muted text-xs font-medium tracking-wider uppercase">
                    {metric.title}
                  </CardDescription>
                  <div className="border-border bg-surface-3 text-brand-primary flex size-7 items-center justify-center rounded-md border">
                    <metric.icon className="size-4" />
                  </div>
                </div>
                <CardTitle className="text-foreground-heading text-3xl font-bold tabular-nums">
                  {metric.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <p className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>{metric.description}</span>
                  <ArrowRight className="text-brand-primary size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Operational Split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Active Projects Command Center (2 Cols) */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base font-semibold">
                  Active Projects
                </CardTitle>
                <CardDescription className="text-xs">
                  Operational status, timeline health, and delivery metrics
                </CardDescription>
              </div>
              {canReadProjects && (
                <Button
                  render={<Link href="/projects" />}
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                >
                  View All
                  <ArrowRight className="ml-1 size-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <div className="divide-border-subtle border-border-subtle bg-surface-1/40 divide-y overflow-hidden rounded-md border">
                  {recentProjects.map((project) => {
                    const progress = project.completionPercentage ?? 0;
                    return (
                      <div
                        key={project.projectId}
                        className="hover:bg-surface-3/50 flex flex-col gap-2 p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-brand-primary font-mono text-xs font-semibold">
                              {project.projectCode}
                            </span>
                            <Link
                              href={`/projects/${project.projectId}`}
                              className="text-foreground hover:text-brand-primary truncate text-sm font-medium hover:underline"
                            >
                              {project.projectName}
                            </Link>
                          </div>
                          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                            {project.client && (
                              <span>Client: {project.client.companyName}</span>
                            )}
                            {project.client && project.manager && (
                              <span>·</span>
                            )}
                            {project.manager && (
                              <span>
                                PM: {project.manager.firstName}{" "}
                                {project.manager.lastName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <div className="hidden w-24 flex-col items-end gap-1 sm:flex">
                            <span className="text-muted-foreground font-mono text-[11px]">
                              {progress}%
                            </span>
                            <div className="bg-surface-3 h-1.5 w-full overflow-hidden rounded-full">
                              <div
                                className="bg-brand-primary h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, progress))}%`,
                                }}
                              />
                            </div>
                          </div>
                          <StatusBadge
                            status={project.healthStatus ?? project.status}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={FolderKanban}
                  title="No Active Projects"
                  description={
                    canReadProjects
                      ? "Create your first agency project to track milestones, tasks, and deliverables."
                      : "You do not have access to view projects in this organization."
                  }
                  action={
                    canReadProjects ? (
                      <Button render={<Link href="/projects" />} size="sm">
                        <Plus className="size-3.5" />
                        <span>Create Project</span>
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Fast Actions & Telemetry (1 Col) */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground-muted text-sm font-semibold tracking-wider uppercase">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button
                render={<Link href="/deliverables" />}
                variant="outline"
                size="sm"
                className="h-9 justify-start gap-2.5"
              >
                <FileText className="text-brand-primary size-4" />
                <span>Deliverables & Approvals</span>
              </Button>

              <Button
                render={<Link href="/meetings" />}
                variant="outline"
                size="sm"
                className="h-9 justify-start gap-2.5"
              >
                <Video className="text-brand-primary size-4" />
                <span>Schedule Meeting</span>
              </Button>

              <Button
                render={<Link href="/files" />}
                variant="outline"
                size="sm"
                className="h-9 justify-start gap-2.5"
              >
                <Files className="text-brand-primary size-4" />
                <span>Files & DAM Media</span>
              </Button>

              <Button
                render={<Link href="/workforce/attendance" />}
                variant="outline"
                size="sm"
                className="h-9 justify-start gap-2.5"
              >
                <Clock className="text-brand-primary size-4" />
                <span>Record Attendance</span>
              </Button>
            </CardContent>
          </Card>

          {/* Operational Security & Status */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold">
                  Operational Security
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3 text-xs">
              <div className="border-border-subtle flex items-center justify-between border-b pb-2">
                <span>Tenant Isolation</span>
                <span className="font-mono text-emerald-400">
                  Strict RLS Active
                </span>
              </div>
              <div className="border-border-subtle flex items-center justify-between border-b pb-2">
                <span>Role Enforcement</span>
                <span className="text-foreground font-mono">
                  {user.roleName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rate Limiting</span>
                <span className="font-mono text-emerald-400">Protected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
