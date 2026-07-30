"use client";

/**
 * Sprint 12A: the card's "more" control was a no-op button (P4). It now opens
 * a menu with the two things the project domain actually supports from a card —
 * opening the project and archiving it (archiveProject) — routed through the
 * shared ConfirmDialog like every other destructive action.
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CalendarIcon, MoreVerticalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ProjectHealthBadge, ProjectPriorityBadge, ProjectStatusBadge } from "./project-badges";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { archiveProject } from "../actions";

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
  const router = useRouter();
  const [archiveOpen, setArchiveOpen] = useState(false);

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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 -mt-2"
                aria-label={`Project actions for ${project.projectName}`}
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/projects/${project.projectId}`} />}>
              Open project
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setArchiveOpen(true)}
            >
              Archive project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive project"
        description={`${project.projectName} will be archived and removed from the active project list.`}
        confirmLabel="Archive project"
        pendingLabel="Archiving…"
        variant="destructive"
        onConfirm={async () => {
          await archiveProject(project.projectId);
          toast.success("Project archived");
          router.refresh();
        }}
      />
    </Card>
  );
}
