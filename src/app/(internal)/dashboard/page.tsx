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

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Personal dashboard (PRD Module 02 — User Dashboard).
 * M1 ships the shell with zero-state metric cards; live metrics wire up as
 * each module lands (projects/tasks in M2, approvals in M3).
 */
const METRICS = [
  {
    title: "Active Projects",
    icon: FolderKanban,
    value: 0,
    hint: "Arrives with the Projects module (M2)",
  },
  {
    title: "Clients",
    icon: Building2,
    value: 0,
    hint: "Arrives with the Clients module (M2)",
  },
  {
    title: "My Open Tasks",
    icon: CheckSquare,
    value: 0,
    hint: "Arrives with the Tasks module (M2)",
  },
  {
    title: "Pending Approvals",
    icon: ClipboardCheck,
    value: 0,
    hint: "Arrives with Approvals (M3)",
  },
] as const;

export default async function DashboardPage() {
  const user = await requireCurrentUser();

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
              <p className="text-muted-foreground text-xs">{metric.hint}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardHeader className="items-center py-10 text-center">
          <CardTitle className="text-base">
            The platform foundation is live
          </CardTitle>
          <CardDescription className="max-w-md text-balance">
            Authentication, organization, roles, and permissions are
            operational. Client and project management arrive in Milestone 2 —
            this dashboard will light up as each module ships.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
