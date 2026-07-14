import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { ProjectList } from "@/features/projects/components/project-list";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects | AIC Nex OS",
  description: "Manage your projects and workflows.",
};

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: { query?: string };
}) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage and track all ongoing projects across your organization.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <CreateProjectModal />
        </div>
      </div>

      <div className="space-y-4">
        <Suspense fallback={<div className="h-[400px] w-full bg-muted/20 animate-pulse rounded-xl" />}>
          <ProjectList query={searchParams.query} />
        </Suspense>
      </div>
    </div>
  );
}
