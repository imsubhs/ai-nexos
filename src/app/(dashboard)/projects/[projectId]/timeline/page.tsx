import { requireCurrentUser } from "@/features/auth/current-user";
import { getProjectById } from "@/features/projects/actions";
import { getProjectTimeline } from "@/features/timelines/actions";
import { TimelineDashboard } from "@/features/timelines/components/timeline-dashboard";
import { TimelineSkeleton } from "@/features/timelines/components/timeline-skeleton";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function ProjectTimelinePage(props: { params: Promise<{ projectId: string }> }) {
  const params = await props.params;
  const { projectId } = params;

  await requireCurrentUser();
  
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const timeline = await getProjectTimeline(projectId);

  return (
    <div className="flex-1 space-y-6">
      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineDashboard timeline={timeline} />
      </Suspense>
    </div>
  );
}
