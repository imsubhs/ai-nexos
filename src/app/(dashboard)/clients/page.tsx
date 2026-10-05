import { getClients } from "@/features/clients/actions";
import { getProjects } from "@/features/projects/actions";
import { CreateClientModal } from "@/features/clients/components/create-client-modal";
import { ClientDirectoryFilters } from "@/features/clients/components/client-directory-filters";
import { Building2 } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clients Workspace | AI NEX OS",
  description:
    "Executive client directory, brand guidelines, and active project engagements.",
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
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6 pt-6 sm:p-8">
      {/* Executive Workstation Header */}
      <div className="border-border-subtle flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="bg-surface-2 border-border-subtle text-brand-primary flex size-7 items-center justify-center rounded-md border">
              <Building2 className="size-4" />
            </div>
            <h1 className="font-heading text-foreground-heading text-2xl font-bold tracking-tight">
              Client Directory
            </h1>
            <span className="bg-surface-2 border-border text-foreground-muted rounded-[4px] border px-2 py-0.5 font-mono text-xs font-semibold">
              {clients.length} {clients.length === 1 ? "account" : "accounts"}
            </span>
          </div>
          <p className="text-foreground-muted max-w-2xl text-xs">
            Executive accounts directory, stakeholder directory, brand identity
            kits, and active project relationships.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <CreateClientModal />
        </div>
      </div>

      {/* Directory Search, Filters & Cards Grid */}
      <ClientDirectoryFilters clients={enrichedClients} />
    </div>
  );
}
