import { getProjects } from "../actions";
import { ProjectDirectoryFilters, type ProjectRow } from "./project-directory-filters";

export async function ProjectList({
  query,
  status,
  health,
}: {
  query?: string;
  status?: string;
  health?: string;
}) {
  const projects = await getProjects(query, 50, 0, status, health);

  return <ProjectDirectoryFilters projects={projects as unknown as ProjectRow[]} />;
}

