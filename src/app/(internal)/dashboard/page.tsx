import type { Metadata } from "next";
import {
  Building2,
  CheckSquare,
  ClipboardCheck,
  FolderKanban,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCurrentUser } from "@/features/auth/current-user";
import { getActiveProjectsCount } from "@/features/projects/actions";
import { getClientsCount } from "@/features/clients/actions";
import { getMyOpenTasksCount } from "@/features/tasks/actions";
import { getPendingApprovalsCount } from "@/features/approvals/actions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  const [
    activeProjects,
    clientsCount,
    myOpenTasks,
    pendingApprovals
  ] = await Promise.all([
    getActiveProjectsCount(),
    getClientsCount(),
    getMyOpenTasksCount(),
    getPendingApprovalsCount(),
  ]);

  const METRICS = [
    {
      title: "Active Projects",
      icon: FolderKanban,
      value: activeProjects,
    },
    {
      title: "Clients",
      icon: Building2,
      value: clientsCount,
    },
    {
      title: "My Open Tasks",
      icon: CheckSquare,
      value: myOpenTasks,
    },
    {
      title: "Pending Approvals",
      icon: ClipboardCheck,
      value: pendingApprovals,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user.firstName}
        </h1>
        <p className="text-muted-foreground text-sm">
          {user.organizationName} · {user.roleName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <Card key={metric.title}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{metric.title}</CardDescription>
                <metric.icon className="text-muted-foreground size-4" />
              </div>
              <CardTitle className="text-3xl tabular-nums">
                {metric.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
