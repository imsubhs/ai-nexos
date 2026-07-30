import { getProjects } from "../actions";
import { ProjectCard } from "./project-card";

export async function ProjectList({ query }: { query?: string }) {
  const projects = await getProjects(query);

  if (projects.length === 0) {
    return (
      <div className="bg-muted/20 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <h3 className="text-lg font-medium">No projects found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {query
            ? "Try adjusting your search query."
            : "Get started by creating a new project."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.projectId} project={project} />
      ))}
    </div>
  );
}
