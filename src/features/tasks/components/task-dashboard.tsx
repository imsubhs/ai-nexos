"use client";

/**
 * Task workspace shell. Sprint 12A moved task loading up here from TaskList /
 * TaskBoard: a create, an edit, or a status change has to be reflected by
 * whichever view is on screen, and two independent useEffect fetches could not
 * do that. One fetch, one `reload()`, shared by list, board, and dialog.
 */
import React, { useCallback, useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTasks } from "../actions";
import type { TaskScope } from "./task-form";
import { TaskForm } from "./task-form";
import { TaskList } from "./task-list";
import { TaskBoard } from "./task-board";
import { TaskDetailModal, type TaskMemberOption } from "./task-detail-modal";

type TaskRow = Record<string, any>;

export function TaskDashboard({
  scope,
  members = [],
}: Readonly<{
  scope: TaskScope;
  /** Assignable users, passed down to the detail dialog (Sprint 12B). */
  members?: TaskMemberOption[];
}>) {
  const [view, setView] = useState<"list" | "board">("list");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { milestoneId } = scope;

  const reload = useCallback(async () => {
    const loaded = await getTasks(milestoneId, 0, 1000);
    setTasks(loaded as TaskRow[]);
  }, [milestoneId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const loaded = await getTasks(milestoneId, 0, 1000);
        if (!cancelled) setTasks(loaded as TaskRow[]);
      } catch (error) {
        // Surfaced in the UI rather than console.error()'d. A hard navigation
        // away from /tasks aborts this fetch without React ever running the
        // cleanup below, so logging here produced console noise for something
        // the user had already walked away from.
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Could not load tasks.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [milestoneId]);

  // The dialog reads from the live list rather than holding its own copy, so a
  // status change made inside it is reflected the moment reload() resolves.
  const selectedTask = tasks.find((task) => task.taskId === selectedId) ?? null;

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* aria-pressed toggle buttons: the selected view is announced, not
            conveyed by styling alone. Plain buttons (rather than a
            radiogroup/tablist) because those roles imply arrow-key
            navigation this control does not implement. */}
        <div
          aria-label="Task view"
          className="bg-muted flex items-center gap-1 rounded-lg border p-1"
        >
          {(
            [
              ["list", "List View"],
              ["board", "Board View"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={`focus-visible:ring-ring rounded-md px-4 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                view === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {loadError && (
        <p role="alert" className="text-destructive text-sm">
          Could not load tasks: {loadError}
        </p>
      )}

      <div className="min-h-0 flex-1">
        {view === "list" ? (
          <TaskList
            tasks={tasks}
            loading={loading}
            onTaskClick={setSelectedId}
          />
        ) : (
          <TaskBoard
            tasks={tasks}
            loading={loading}
            onTaskClick={setSelectedId}
            onChanged={reload}
          />
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            scope={scope}
            onSuccess={async () => {
              setCreateOpen(false);
              await reload();
            }}
          />
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          scope={scope}
          members={members}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
