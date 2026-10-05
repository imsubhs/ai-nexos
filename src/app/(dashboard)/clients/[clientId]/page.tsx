import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getClientActivity, getClientById } from "@/features/clients/actions";
import { getProjects } from "@/features/projects/actions";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission, requirePermission } from "@/features/permissions";
import { ClientCommandHeader } from "@/features/clients/components/client-command-header";
import { ClientCommandTabs } from "@/features/clients/components/client-command-tabs";
import { revalidatePath } from "next/cache";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}): Promise<Metadata> {
  const { clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) return { title: "Client Not Found | AI NEX OS" };
  return {
    title: `${client.companyName} | Client Command Center | AI NEX OS`,
    description: `Executive command center for ${client.companyName} engagements, brand assets, and stakeholder contacts.`,
  };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "clients", "read");

  const [client, activities, allProjects] = await Promise.all([
    getClientById(clientId),
    getClientActivity(clientId),
    getProjects().catch(() => []),
  ]);

  if (!client) {
    notFound();
  }

  // Filter projects belonging to this client
  const clientProjects = allProjects
    .filter((p) => p.clientId === clientId)
    .map((p) => ({
      projectId: p.projectId,
      projectName: p.projectName,
      projectCode: p.projectCode,
      status: p.status,
      healthStatus: p.healthStatus,
      priority: p.priority,
      completionPercentage: p.completionPercentage,
      startDate: p.startDate,
      estimatedEndDate: p.estimatedEndDate,
      manager: p.manager,
    }));

  const canCreateProject = hasPermission(
    user.permissions,
    "projects",
    "create",
  );

  const handleRefresh = async () => {
    "use server";
    revalidatePath(`/clients/${clientId}`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-6 pt-6 sm:p-8">
      {/* Navigation Breadcrumb */}
      <Breadcrumb className="mb-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/clients" />}>
              Clients
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-foreground max-w-[200px] truncate font-medium sm:max-w-[400px]">
              {client.companyName}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Workstation Command Header */}
      <ClientCommandHeader
        client={client}
        activeProjectsCount={clientProjects.length}
        onRefresh={handleRefresh}
      />

      {/* 4 Workstation Command Tabs */}
      <ClientCommandTabs
        clientId={clientId}
        client={{
          clientId: client.clientId,
          companyName: client.companyName,
          brandColors: client.brandColors,
          typography: client.typography,
          moodboards: client.moodboards,
          brandAssetsUrl: client.brandAssetsUrl,
          googleDriveFolderUrl: client.googleDriveFolderUrl,
          referenceAssets: client.referenceAssets,
        }}
        projects={clientProjects}
        contacts={(client.contacts || []).map((c) => ({
          contactId: c.contactId,
          clientId: c.clientId,
          name: c.name,
          contactType: c.contactType as any,
          designation: c.designation,
          email: c.email,
          phone: c.phone,
          linkedin: c.linkedin,
          notes: c.notes,
          status: c.status as any,
        }))}
        activities={activities.map((a) => ({
          activityId: a.activityId,
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          description: a.description,
          metadata: a.metadata as Record<string, unknown> | null,
          createdAt: a.createdAt,
          userId: a.userId,
        }))}
        canCreateProject={canCreateProject}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
