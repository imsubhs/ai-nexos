import {
  getProjectById,
  getProjectDashboardSummary,
} from "@/features/projects/actions";
import {
  getProjectTimeline,
  getTimelineMilestones,
} from "@/features/timelines/actions";
import { getTasksByProject } from "@/features/tasks/actions";
import { getOrganizationMembers } from "@/features/organizations/actions";
import { getClients } from "@/features/clients/actions";
import { ProjectCommandCenter } from "@/features/projects/components/project-command-center";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectById(projectId).catch(() => null);
  return {
    title: project
      ? `${project.projectName} | AI NEX OS`
      : "Project Command Center | AI NEX OS",
    description: project?.description || "Creative execution workspace.",
  };
}

import { getFiles } from "@/features/files/actions";
import { getDeliverables } from "@/features/deliverables/actions";

export default async function ProjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId } = await params;
  const { tab } = await searchParams;

  const [project, summary, timeline, tasks, orgUsers, clients, files, deliverables] =
    await Promise.all([
      getProjectById(projectId),
      getProjectDashboardSummary(projectId).catch(() => null),
      getProjectTimeline(projectId).catch(() => null),
      getTasksByProject(projectId, 0, 500).catch(() => []),
      getOrganizationMembers().catch(() => []),
      getClients().catch(() => []),
      getFiles({ projectId }, 0, 100).catch(() => []),
      getDeliverables({ projectId }, 0, 100).catch(() => []),
    ]);

  if (!project) {
    notFound();
  }

  const milestones = timeline?.timelineId
    ? await getTimelineMilestones(timeline.timelineId, 2000, 0).catch(() => [])
    : [];

  const availableUsers = (orgUsers || []).map((u: any) => ({
    userId: u.userId,
    name:
      u.name ||
      `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
      null,
    email: u.email,
  }));

  const clientOptions = (clients || []).map((c: any) => ({
    clientId: c.clientId,
    companyName: c.companyName,
  }));

  return (
    <ProjectCommandCenter
      project={project}
      summary={summary}
      timeline={timeline}
      milestones={milestones}
      tasks={tasks}
      availableUsers={availableUsers}
      clientOptions={clientOptions}
      defaultTab={tab || "overview"}
      files={files}
      deliverables={deliverables}
    />
  );
}

