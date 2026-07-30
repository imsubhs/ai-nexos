import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { getDeliverables, searchDeliverables } from "@/features/deliverables/actions";
import { DeliverablesDirectory } from "@/features/deliverables/components/deliverables-directory";
import { getProjects } from "@/features/projects/actions";

export const metadata = {
  title: "Deliverables",
};

const PAGE_SIZE = 25;

/**
 * Global Deliverables workspace (Sprint 11A resumed; write surface added in
 * Sprint 12A). The list reads through the Sprint 11B public read layer; the
 * detail drawer exposes the five deliverable write actions the public gateway
 * offers (review session, approve, request revision, share) and creation runs
 * through createDeliverable.
 */
export default async function DeliverablesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}>) {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "deliverables", "read")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const cursorOffset = (page - 1) * PAGE_SIZE;

  // getDeliverables/searchDeliverables return a page of rows, not a total
  // count (no count() query exists in the Sprint 11B read layer — see
  // TECHNICAL-DEBT-NOTES.md). Fetching one extra row reveals whether another
  // page exists without fabricating a count; the DataTable pager only needs
  // "is there more," not an exact total.
  const fetched = params.search
    ? await searchDeliverables(params.search, cursorOffset, PAGE_SIZE + 1)
    : await getDeliverables({ status: params.status || undefined }, cursorOffset, PAGE_SIZE + 1);
  // createDeliverable needs a project; the create dialog offers these.
  const projectRows = await getProjects(undefined, 100, 0);
  const projects = projectRows.map((project) => ({
    projectId: project.projectId,
    projectName: project.projectName,
  }));

  const hasMore = fetched.length > PAGE_SIZE;
  const rows = hasMore ? fetched.slice(0, PAGE_SIZE) : fetched;
  const total = cursorOffset + rows.length + (hasMore ? 1 : 0);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deliverables</h1>
          <p className="text-sm text-muted-foreground">
            Every deliverable across all projects.
          </p>
        </div>
      </div>
      <DeliverablesDirectory
        rows={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        projects={projects}
      />
    </div>
  );
}
