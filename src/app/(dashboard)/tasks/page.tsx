import { Suspense } from "react";
import { Metadata } from "next";
import { TaskDashboard } from "@/features/tasks/components/task-dashboard";
import { listEmployeesAction } from "@/features/workforce/employees/actions";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Manage your tasks across all projects.",
};

/**
 * TaskDashboard is milestone-scoped (getTasks(milestoneId, …)), so this
 * workspace pins the seeded demo milestone until a global task read layer
 * exists (see docs/STABILIZATION_REPORT.md). Sprint 12A added timelineId and
 * phaseId because task creation requires the full hierarchy (insertTaskSchema).
 * These must match src/lib/demo/store.ts exactly — sequentialUuid(n) renders
 * as 00000000-0000-4000-8000-<n padded to 12>, i.e. a v4/variant-8 UUID.
 */
const DEMO_TASK_SCOPE = {
  projectId: "00000000-0000-4000-8000-000000000201", // id.projectWebsite
  timelineId: "00000000-0000-4000-8000-000000000301", // id.timelineWebsite
  phaseId: "00000000-0000-4000-8000-000000000312", // id.phasePreProd
  milestoneId: "00000000-0000-4000-8000-000000000322", // id.milestoneWireframes
} as const;

export default async function TasksPage() {
  // Assignment targets (Sprint 12B). A caller without people-read gets an empty
  // list and the assign control simply does not render.
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
    <div className="flex h-full flex-1 flex-col space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          {/* One heading only — the dashboard used to render a second "Tasks"
              heading directly beneath this one. The subtitle now states the
              real scope instead of claiming "across all projects". */}
          <p className="text-muted-foreground">
            Wireframes milestone · Website Redesign.
          </p>
        </div>
      </div>

      <div className="bg-card min-h-0 flex-1 overflow-hidden rounded-xl border">
        <Suspense fallback={<div className="bg-muted/20 h-full w-full animate-pulse" />}>
          <TaskDashboard scope={DEMO_TASK_SCOPE} members={members} />
        </Suspense>
      </div>
    </div>
  );
}
