import { getProjects } from "../actions";
import { ProjectCard } from "./project-card";

export async function ProjectList({ query }: { query?: string }) {
  const projects = await getProjects(query);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed bg-muted/20">
        <h3 className="text-lg font-medium">No projects found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {query ? "Try adjusting your search query." : "Get started by creating a new project."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.projectId} project={project} />
      ))}
    </div>
  );
}
