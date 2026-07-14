import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CalendarIcon, MoreVerticalIcon } from "lucide-react";
import Link from "next/link";
import { ProjectHealthBadge, ProjectPriorityBadge, ProjectStatusBadge } from "./project-badges";
import { Button } from "@/components/ui/button";

export function ProjectCard({ project }: { project: Record<string, unknown> & {
  projectId: string;
  projectName: string;
  projectCode: string;
  description?: string | null;
  status: string;
  healthStatus: string;
  priority: string;
  estimatedEndDate?: Date | string | null;
  completionPercentage: number;
  client?: { companyName: string } | null;
} }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
            <span className="font-mono bg-muted px-1.5 rounded text-xs">{project.projectCode}</span>
            {project.client?.companyName && (
              <>
                <span>•</span>
                <span>{project.client.companyName}</span>
              </>
            )}
          </div>
          <Link href={`/projects/${project.projectId}`} className="text-lg font-semibold hover:underline">
            {project.projectName}
          </Link>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
          {project.description || "No description provided."}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <ProjectStatusBadge status={project.status} />
          <ProjectHealthBadge health={project.healthStatus} />
          <ProjectPriorityBadge priority={project.priority} />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <div className="flex items-center space-x-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>
              {project.estimatedEndDate 
                ? new Date(project.estimatedEndDate).toLocaleDateString()
                : "No deadline"}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span>{project.completionPercentage}%</span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${project.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
