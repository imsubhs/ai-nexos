import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { ProjectList } from "@/features/projects/components/project-list";
import { getClients } from "@/features/clients/actions";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | AI NEX OS",
  description: "Manage and track all ongoing creative execution projects.",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string;
    status?: string;
    health?: string;
    create?: string;
    clientId?: string;
  }>;
}) {
  const { query, status, health, create, clientId } = await searchParams;
  const clients = await getClients().catch(() => []);

  const clientOptions = (clients || []).map((c: any) => ({
    clientId: c.clientId,
    companyName: c.companyName,
  }));

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track creative execution workspaces, timelines, and deliverables across your organization.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <CreateProjectModal
            defaultOpen={create === "true"}
            initialClientId={clientId}
            clientOptions={clientOptions}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Suspense
          fallback={
            <div className="bg-surface-1/40 h-[400px] w-full animate-pulse rounded-xl border border-border" />
          }
        >
          <ProjectList query={query} status={status} health={health} />
        </Suspense>
      </div>
    </div>
  );
}

