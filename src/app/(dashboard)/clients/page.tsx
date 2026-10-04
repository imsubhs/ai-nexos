import { getClients } from "@/features/clients/actions";
import { getProjects } from "@/features/projects/actions";
import { CreateClientModal } from "@/features/clients/components/create-client-modal";
import { ClientDirectoryFilters } from "@/features/clients/components/client-directory-filters";
import { Building2 } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clients Workspace | AI NEX OS",
  description: "Executive client directory, brand guidelines, and active project engagements.",
};

export default async function ClientsPage() {
  // Fetch clients and projects in parallel using existing server actions
  const [clients, allProjects] = await Promise.all([
    getClients(),
    getProjects().catch(() => []),
  ]);

  // Compute honest active projects count for each client
  const enrichedClients = clients.map((client) => {
    const activeProjects = allProjects.filter(
      (p) =>
        p.clientId === client.clientId &&
        !["completed", "cancelled", "archived"].includes(p.status),
    );

    return {
      ...client,
      activeProjectsCount: activeProjects.length,
      primaryContact: null,
    };
  });

  return (
    <div className="flex-1 space-y-6 p-6 sm:p-8 pt-6 max-w-7xl mx-auto w-full">
      {/* Executive Workstation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-surface-2 border border-border-subtle text-brand-primary">
              <Building2 className="size-4" />
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground-heading">
              Client Directory
            </h1>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-surface-2 border border-border text-foreground-muted">
              {clients.length} {clients.length === 1 ? "account" : "accounts"}
            </span>
          </div>
          <p className="text-xs text-foreground-muted max-w-2xl">
            Executive accounts directory, stakeholder directory, brand identity kits, and active project relationships.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <CreateClientModal />
        </div>
      </div>

      {/* Directory Search, Filters & Cards Grid */}
      <ClientDirectoryFilters clients={enrichedClients} />
    </div>
  );
}
