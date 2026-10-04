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
import { getActiveProjectsCount, getProjects } from "@/features/projects/actions";
import { getClientsCount } from "@/features/clients/actions";
import { getMyOpenTasksCount } from "@/features/tasks/actions";
import { getPendingApprovalsCount } from "@/features/approvals/actions";

export const metadata: Metadata = {
  title: "Mission Control | AI NEX OS",
  description: "Executive operations, project status, and production telemetry.",
};

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const canReadProjects = hasPermission(user.permissions, "projects", "read");

  const [activeProjects, clientsCount, myOpenTasks, pendingApprovals, recentProjects] =
    await Promise.all([
      getActiveProjectsCount().catch(() => 0),
      getClientsCount().catch(() => 0),
      getMyOpenTasksCount().catch(() => 0),
      getPendingApprovalsCount().catch(() => 0),
      canReadProjects ? getProjects(undefined, 5, 0).catch(() => []) : Promise.resolve([]),
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground-heading">
              Mission Control
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Workspace
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {user.organizationName} · Welcome back, {user.firstName} ({user.roleName})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canReadProjects && (
            <Button render={<Link href="/projects" />} size="sm" variant="default">
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
          <Link key={metric.title} href={metric.href} className="group block focus-visible:outline-none">
            <Card className="transition-colors hover:border-border-strong group-focus-visible:ring-2 group-focus-visible:ring-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
                    {metric.title}
                  </CardDescription>
                  <div className="flex size-7 items-center justify-center rounded-md border border-border bg-surface-3 text-brand-primary">
                    <metric.icon className="size-4" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold tabular-nums text-foreground-heading">
                  {metric.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <p className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{metric.description}</span>
                  <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100 text-brand-primary" />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Operational Split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Active Projects Command Center (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
                <CardDescription className="text-xs">
                  Operational status, timeline health, and delivery metrics
                </CardDescription>
              </div>
              {canReadProjects && (
                <Button render={<Link href="/projects" />} size="sm" variant="ghost" className="text-xs">
                  View All
                  <ArrowRight className="size-3 ml-1" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <div className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border-subtle bg-surface-1/40">
                  {recentProjects.map((project) => {
                    const progress = project.completionPercentage ?? 0;
                    return (
                      <div
                        key={project.projectId}
                        className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-surface-3/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-brand-primary">
                              {project.projectCode}
                            </span>
                            <Link
                              href={`/projects/${project.projectId}`}
                              className="truncate text-sm font-medium text-foreground hover:text-brand-primary hover:underline"
                            >
                              {project.projectName}
                            </Link>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {project.client && (
                              <span>Client: {project.client.companyName}</span>
                            )}
                            {project.client && project.manager && <span>·</span>}
                            {project.manager && (
                              <span>PM: {project.manager.firstName} {project.manager.lastName}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex flex-col items-end gap-1 w-24">
                            <span className="text-[11px] font-mono text-muted-foreground">{progress}%</span>
                            <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                              <div
                                className="h-full bg-brand-primary rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              />
                            </div>
                          </div>
                          <StatusBadge status={project.healthStatus ?? project.status} />
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
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button
                render={<Link href="/deliverables" />}
                variant="outline"
                size="sm"
                className="justify-start gap-2.5 h-9"
              >
                <FileText className="size-4 text-brand-primary" />
                <span>Deliverables & Approvals</span>
              </Button>

              <Button
                render={<Link href="/meetings" />}
                variant="outline"
                size="sm"
                className="justify-start gap-2.5 h-9"
              >
                <Video className="size-4 text-brand-primary" />
                <span>Schedule Meeting</span>
              </Button>

              <Button
                render={<Link href="/files" />}
                variant="outline"
                size="sm"
                className="justify-start gap-2.5 h-9"
              >
                <Files className="size-4 text-brand-primary" />
                <span>Files & DAM Media</span>
              </Button>

              <Button
                render={<Link href="/workforce/attendance" />}
                variant="outline"
                size="sm"
                className="justify-start gap-2.5 h-9"
              >
                <Clock className="size-4 text-brand-primary" />
                <span>Record Attendance</span>
              </Button>
            </CardContent>
          </Card>

          {/* Operational Security & Status */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                <CardTitle className="text-sm font-semibold">Operational Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span>Tenant Isolation</span>
                <span className="font-mono text-emerald-400">Strict RLS Active</span>
              </div>
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span>Role Enforcement</span>
                <span className="font-mono text-foreground">{user.roleName}</span>
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
