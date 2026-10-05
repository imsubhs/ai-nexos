"use client";

/**
 * Kanban board over the milestone's tasks.
 *
 * Sprint 12A made the board writable. Board movement is a per-card "Move to"
 * menu rather than drag-and-drop: it is the same supported domain call
 * (updateTask with a new status), it works from the keyboard and on touch, and
 * it does not invent a reordering concept the task domain has no column for.
 * The menu offers only the five statuses that have a column; the twelve-value
 * vocabulary lives in the detail dialog.
 */
import React, { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateTask } from "../actions";
import { BOARD_COLUMNS } from "../constants";

type TaskRow = Record<string, any>;

export function TaskBoard({
  tasks,
  loading,
  onTaskClick,
  onChanged,
}: Readonly<{
  tasks: TaskRow[];
  loading: boolean;
  onTaskClick: (taskId: string) => void;
  onChanged: () => Promise<void>;
}>) {
  const [movingId, setMovingId] = useState<string | null>(null);

  const move = async (task: TaskRow, status: string) => {
    if (task.status === status) return;
    setMovingId(task.taskId);
    try {
      await updateTask(task.taskId, { status: status as never });
      await onChanged();
      toast.success(`Moved to ${labelFor(status)}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not move the task",
      );
    } finally {
      setMovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground p-4 text-sm">Loading board...</div>
    );
  }

  // Statuses outside the five columns are real domain states with no column.
  // Surfacing the count keeps the board honest rather than silently hiding
  // work — the list view and the detail dialog can still reach them.
  const offBoard = tasks.filter(
    (task) => !BOARD_COLUMNS.some((column) => column.id === task.status),
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-[600px] gap-4 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            tasks={tasks.filter((task) => task.status === column.id)}
            movingId={movingId}
            onTaskClick={onTaskClick}
            onMove={move}
          />
        ))}
      </div>

      {offBoard.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {offBoard.length} task{offBoard.length === 1 ? "" : "s"} in a status
          without a board column (
          {[...new Set(offBoard.map((t) => labelFor(t.status)))].join(", ")}).
          Switch to List View to see them.
        </p>
      )}
    </div>
  );
}

function labelFor(status: string): string {
  return (
    BOARD_COLUMNS.find((column) => column.id === status)?.label ??
    status.replaceAll("_", " ")
  );
}

function BoardColumn({
  column,
  tasks,
  movingId,
  onTaskClick,
  onMove,
}: Readonly<{
  column: { id: string; label: string };
  tasks: TaskRow[];
  movingId: string | null;
  onTaskClick: (taskId: string) => void;
  onMove: (task: TaskRow, status: string) => Promise<void>;
}>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Card height approx
    overscan: 5,
  });

  return (
    <div className="bg-surface-1/60 border-border flex w-80 shrink-0 flex-col rounded-lg border shadow-xs">
      <div className="border-border-subtle bg-surface-2/40 flex items-center justify-between rounded-t-lg border-b p-3">
        <h3 className="text-foreground text-sm font-semibold">
          {column.label}
          <span className="text-muted-foreground ml-2 font-mono text-xs font-normal">
            {tasks.length}
          </span>
        </h3>
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto p-2">
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const task = tasks[virtualItem.index];
            const isMoving = movingId === task.taskId;
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                className="absolute top-0 left-0 w-full pb-2"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div
                  className={`bg-card border-border hover:border-border-strong rounded-md border shadow-xs transition-all dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${
                    isMoving ? "opacity-50" : ""
                  }`}
                >
                  {/* A real <button> rather than a click-handling <div>: the
                      card opens a dialog, so it must be reachable and
                      activatable from the keyboard. */}
                  <button
                    type="button"
                    className="hover:bg-surface-3/50 focus-visible:ring-primary flex w-full flex-col gap-2 rounded-t-md p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    onClick={() => onTaskClick(task.taskId)}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="text-brand-primary border-brand-primary/30 bg-brand-primary/5 font-mono text-xs"
                      >
                        {task.taskCode}
                      </Badge>
                      <span className="text-muted-foreground text-xs capitalize">
                        {task.priority}
                      </span>
                    </div>
                    <h4 className="text-foreground text-sm font-medium">
                      {task.name}
                    </h4>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      {task.estimatedDurationMins > 0 && (
                        <span>Est: {task.estimatedDurationMins}m</span>
                      )}
                      {task.isPrivate && <span>🔒 Private</span>}
                    </div>
                  </button>

                  <div className="border-border-subtle bg-surface-1/30 flex justify-end rounded-b-md border-t px-2 py-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isMoving}
                            aria-label={`Move ${task.name} to another column`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Move to</DropdownMenuLabel>
                        {BOARD_COLUMNS.map((target) => (
                          <DropdownMenuItem
                            key={target.id}
                            disabled={target.id === task.status}
                            onClick={() => onMove(task, target.id)}
                          >
                            {target.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
