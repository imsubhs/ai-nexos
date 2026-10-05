"use client";

import { useState, useCallback, useMemo } from "react";
import { PlusIcon, Filter, Layers, Kanban, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTasksByProject } from "@/features/tasks/actions";
import { TaskBoard } from "@/features/tasks/components/task-board";
import { TaskList } from "@/features/tasks/components/task-list";
import {
  TaskForm,
  type TaskScope,
} from "@/features/tasks/components/task-form";
import {
  TaskDetailModal,
  type TaskMemberOption,
} from "@/features/tasks/components/task-detail-modal";

type TaskRow = Record<string, any>;

interface ProjectTaskWorkspaceProps {
  projectId: string;
  initialTasks: TaskRow[];
  members?: TaskMemberOption[];
  milestones?: { milestoneId: string; name: string; phaseId: string }[];
  timelineId?: string | null;
  defaultView?: "board" | "list";
}

export function ProjectTaskWorkspace({
  projectId,
  initialTasks,
  members = [],
  milestones = [],
  timelineId,
  defaultView = "board",
}: ProjectTaskWorkspaceProps) {
  const [view, setView] = useState<"board" | "list">(defaultView);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await getTasksByProject(projectId, 0, 500);
      setTasks(loaded as TaskRow[]);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not reload tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Filter tasks by milestone and priority
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesMilestone =
        selectedMilestoneId === "all" || t.milestoneId === selectedMilestoneId;
      const matchesPriority =
        priorityFilter === "all" || t.priority === priorityFilter;
      return matchesMilestone && matchesPriority;
    });
  }, [tasks, selectedMilestoneId, priorityFilter]);

  // Scope for creating tasks
  const effectiveMilestone =
    (selectedMilestoneId !== "all"
      ? milestones.find((m) => m.milestoneId === selectedMilestoneId)
      : milestones[0]) || null;

  const activeScope: TaskScope | null =
    effectiveMilestone && timelineId
      ? {
          projectId,
          timelineId,
          phaseId: effectiveMilestone.phaseId,
          milestoneId: effectiveMilestone.milestoneId,
        }
      : null;

  const selectedTask = tasks.find((task) => task.taskId === selectedId) ?? null;

  const taskDetailScope: TaskScope = selectedTask
    ? {
        projectId,
        timelineId: selectedTask.timelineId || timelineId || "",
        phaseId: selectedTask.phaseId || "",
        milestoneId: selectedTask.milestoneId || "",
      }
    : (activeScope ?? {
        projectId,
        timelineId: timelineId || "",
        phaseId: "",
        milestoneId: "",
      });

  return (
    <div className="space-y-4">
      {/* Workspace Toolbar */}
      <div className="border-border bg-surface-1 flex flex-col justify-between gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {/* View switcher */}
          <div
            aria-label="Task view"
            className="bg-surface-2 border-border/80 flex items-center gap-1 rounded-lg border p-1"
          >
            <button
              type="button"
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === "board"
                  ? "bg-surface-3 text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="size-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === "list"
                  ? "bg-surface-3 text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Milestone filter */}
          {milestones.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Layers className="text-muted-foreground ml-1 size-3.5" />
              <select
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                className="border-border/80 bg-surface-2 text-foreground focus:ring-brand-primary h-8 rounded-lg border px-2.5 text-xs focus:ring-1 focus:outline-none"
              >
                <option value="all">All Milestones ({tasks.length})</option>
                {milestones.map((m) => (
                  <option key={m.milestoneId} value={m.milestoneId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="text-muted-foreground ml-1 size-3.5" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border-border/80 bg-surface-2 text-foreground focus:ring-brand-primary h-8 rounded-lg border px-2.5 text-xs focus:ring-1 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* New Task Action */}
        {activeScope && (
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="shrink-0 gap-1.5"
          >
            <PlusIcon className="size-4" />
            <span>New Task</span>
          </Button>
        )}
      </div>

      {loadError && (
        <p role="alert" className="text-destructive text-sm">
          Could not load tasks: {loadError}
        </p>
      )}

      {/* Main View Area */}
      {milestones.length === 0 ? (
        <div className="border-border bg-surface-1/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <Layers className="text-muted-foreground mb-3 size-8" />
          <h3 className="text-foreground mb-1 text-base font-semibold">
            No milestones defined
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm text-xs">
            Tasks in AI NEX OS belong to project milestones. Define a milestone
            first to start tracking execution.
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="border-border bg-surface-1/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <Kanban className="text-muted-foreground mb-3 size-8" />
          <h3 className="text-foreground mb-1 text-base font-semibold">
            No tasks in this view
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm text-xs">
            {tasks.length > 0
              ? "No tasks match the active milestone or priority filter."
              : "No tasks have been scheduled for this project yet."}
          </p>
          {activeScope && (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1.5"
            >
              <PlusIcon className="size-4" />
              <span>Create First Task</span>
            </Button>
          )}
        </div>
      ) : view === "board" ? (
        <div className="min-h-[500px]">
          <TaskBoard
            tasks={filteredTasks}
            loading={loading}
            onTaskClick={setSelectedId}
            onChanged={reload}
          />
        </div>
      ) : (
        <TaskList
          tasks={filteredTasks}
          loading={loading}
          onTaskClick={setSelectedId}
        />
      )}

      {/* Task Creation Dialog */}
      {activeScope && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>
                Create New Task
                {effectiveMilestone && (
                  <span className="text-muted-foreground mt-1 block text-xs font-normal">
                    Assigning to milestone:{" "}
                    <span className="text-foreground font-medium">
                      {effectiveMilestone.name}
                    </span>
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <TaskForm
              scope={activeScope}
              onSuccess={async () => {
                setCreateOpen(false);
                await reload();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          scope={taskDetailScope}
          members={members}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
