import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { ProjectList } from "@/features/projects/components/project-list";
import { Suspense } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Manage your projects and workflows.",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { query } = await searchParams;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track all ongoing projects across your organization.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <CreateProjectModal />
        </div>
      </div>

      <div className="space-y-4">
        <Suspense
          fallback={
            <div className="bg-muted/20 h-[400px] w-full animate-pulse rounded-xl" />
          }
        >
          <ProjectList query={query} />
        </Suspense>
      </div>
    </div>
  );
}
