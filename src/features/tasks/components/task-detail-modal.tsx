"use client";

/**
 * Task detail dialog.
 *
 * Sprint 12A made it the task's edit surface (status across the full twelve
 * values, plus the edit form). Sprint 12B completes it against the rest of the
 * task aggregate, all of which had tables and no actions:
 *
 *   • assignment  → assignTask / unassignTask over `task_assignees`
 *   • comments    → addTaskComment / getTaskComments over `task_comments`
 *   • timer       → startTaskTimer now returns its entry and
 *                   getActiveTaskTimer finds one that outlived the page, so
 *                   Start/Stop is a closed loop rather than a one-way door
 *   • history     → getTaskActivity over `task_activity`
 *   • delete      → soft delete via `deletedAt`, which every read already filters
 *
 * Checklists remain unbuilt: `insertTaskChecklistSchema` exists but no action
 * does, and the nested checklist → item structure needs two write paths this
 * sprint has no read layer for. Recorded in docs/SPRINT-12B.md.
 */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  addTaskComment,
  assignTask,
  deleteTask,
  getActiveTaskTimer,
  getTaskActivity,
  getTaskAssignees,
  getTaskComments,
  startTaskTimer,
  stopTaskTimer,
  unassignTask,
  updateTask,
} from "../actions";
import { TASK_STATUSES, humanizeToken } from "../constants";
import type { TaskScope } from "./task-form";
import { TaskForm } from "./task-form";

export type TaskMemberOption = {
  userId: string;
  firstName: string;
  lastName: string | null;
};

type AssigneeRow = {
  assigneeId: string;
  userId: string;
  firstName: string;
  lastName: string | null;
};

type CommentRow = {
  commentId: string;
  content: unknown;
  createdAt: Date | string;
  firstName: string | null;
  lastName: string | null;
};

type ActivityRow = {
  activityId: string;
  eventType: string;
  createdAt: Date | string;
};

function Detail({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-foreground">{children ?? "—"}</p>
    </div>
  );
}

function commentText(content: unknown): string {
  if (typeof content === "string") return content;
  const text = (content as { text?: unknown } | null)?.text;
  return typeof text === "string" ? text : "";
}

function personName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ") || "Unknown";
}

export function TaskDetailModal({
  task,
  scope,
  members = [],
  onClose,
  onChanged,
}: Readonly<{
  task: Record<string, any>;
  scope: TaskScope;
  /** Assignable users (Sprint 12B). */
  members?: TaskMemberOption[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}>) {
  const [editing, setEditing] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [assignees, setAssignees] = useState<AssigneeRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");

  const taskId = task.taskId as string;

  const loadDetail = useCallback(async () => {
    const [assigneeRows, commentRows, activityRows, timer] = await Promise.all([
      getTaskAssignees(taskId),
      getTaskComments(taskId, 25),
      getTaskActivity(taskId, 20),
      getActiveTaskTimer(taskId),
    ]);
    setAssignees(assigneeRows as unknown as AssigneeRow[]);
    setComments(commentRows as unknown as CommentRow[]);
    setActivity(activityRows as unknown as ActivityRow[]);
    setActiveTimerId(
      (timer as { timeEntryId?: string } | undefined)?.timeEntryId ?? null,
    );
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [assigneeRows, commentRows, activityRows, timer] =
          await Promise.all([
            getTaskAssignees(taskId),
            getTaskComments(taskId, 25),
            getTaskActivity(taskId, 20),
            getActiveTaskTimer(taskId),
          ]);
        if (cancelled) return;
        setAssignees(assigneeRows as unknown as AssigneeRow[]);
        setComments(commentRows as unknown as CommentRow[]);
        setActivity(activityRows as unknown as ActivityRow[]);
        setActiveTimerId(
          (timer as { timeEntryId?: string } | undefined)?.timeEntryId ?? null,
        );
      } catch {
        // A failing sub-read must not take the whole dialog down.
        if (!cancelled) {
          setAssignees([]);
          setComments([]);
          setActivity([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  // Fields are read defensively: the task row shape varies by source, and a
  // missing field must render an em dash, not throw while rendering.
  const priority = task.priority ? humanizeToken(String(task.priority)) : null;
  const taskType = task.taskType ? humanizeToken(String(task.taskType)) : null;
  const progress =
    typeof task.progress === "number" ? `${task.progress}%` : null;
  const logged = task.actualDurationMins ?? 0;
  const estimated = task.estimatedDurationMins ?? 0;

  const assignedIds = new Set(assignees.map((row) => row.userId));
  const assignable = members.filter(
    (member) => !assignedIds.has(member.userId),
  );

  const run = async (
    key: string,
    work: () => Promise<void>,
    message: string,
  ) => {
    setPending(key);
    try {
      await work();
      await loadDetail();
      await onChanged();
      toast.success(message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setPending(null);
    }
  };

  const changeStatus = async (status: string) => {
    if (status === task.status) return;
    setStatusPending(true);
    try {
      await updateTask(taskId, { status: status as never });
      await loadDetail();
      await onChanged();
      toast.success(`Status set to ${humanizeToken(status)}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not change status",
      );
    } finally {
      setStatusPending(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="font-mono">
              {task.taskCode}
            </Badge>
            <DialogTitle className="text-lg">{task.name}</DialogTitle>
          </div>
          <DialogDescription>
            {editing
              ? "Edit this task. Changes apply immediately on save."
              : "Task detail: status, assignment, time, comments and history."}
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <TaskForm
            scope={scope}
            task={task}
            onSuccess={async () => {
              setEditing(false);
              await onChanged();
            }}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Status</p>
                <StatusBadge status={task.status} />
              </div>
              <Detail label="Priority">{priority}</Detail>
              <Detail label="Type">{taskType}</Detail>
              <Detail label="Progress">{progress}</Detail>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1 space-y-2">
                <Label htmlFor="task-detail-status">Change status</Label>
                <select
                  id="task-detail-status"
                  value={task.status}
                  disabled={statusPending}
                  onChange={(event) => changeStatus(event.target.value)}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-3 disabled:opacity-50"
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {humanizeToken(status)}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit task
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Assignees ({assignees.length})
                </p>
                {assignable.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Assign a team member"
                      value={assignUserId}
                      onChange={(event) => setAssignUserId(event.target.value)}
                      className="border-input bg-background h-8 rounded-lg border px-2 py-1 text-xs outline-none"
                    >
                      <option value="">Select a person…</option>
                      {assignable.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {personName(member.firstName, member.lastName)}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!assignUserId || pending === "assign"}
                      onClick={() =>
                        run(
                          "assign",
                          async () => {
                            await assignTask(taskId, assignUserId);
                            setAssignUserId("");
                          },
                          "Task assigned",
                        )
                      }
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </div>

              {assignees.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No one is assigned.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {assignees.map((assignee) => (
                    <li
                      key={assignee.assigneeId}
                      className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                    >
                      {personName(assignee.firstName, assignee.lastName)}
                      <button
                        type="button"
                        aria-label={`Unassign ${personName(assignee.firstName, assignee.lastName)}`}
                        className="text-muted-foreground hover:text-destructive"
                        disabled={pending === `unassign-${assignee.userId}`}
                        onClick={() =>
                          run(
                            `unassign-${assignee.userId}`,
                            () =>
                              unassignTask(taskId, assignee.userId).then(
                                () => undefined,
                              ),
                            "Assignee removed",
                          )
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-muted-foreground mb-2 text-sm font-medium">
                Description
              </h3>
              <div className="bg-muted/50 text-foreground rounded-lg p-4 text-sm">
                {task.description ? (
                  typeof task.description === "string" ? (
                    task.description
                  ) : (
                    commentText(task.description) ||
                    JSON.stringify(task.description)
                  )
                ) : (
                  <span className="text-muted-foreground italic">
                    No description provided.
                  </span>
                )}
              </div>
            </div>

            <div className="bg-muted/50 space-y-2 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-foreground text-sm font-medium">
                    Time Tracking
                  </h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Logged: {logged}m / Est: {estimated}m
                  </p>
                </div>
                {activeTimerId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending === "timer"}
                    onClick={() =>
                      run(
                        "timer",
                        () =>
                          stopTaskTimer(activeTimerId).then(() => undefined),
                        "Timer stopped",
                      )
                    }
                  >
                    Stop timer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending === "timer"}
                    onClick={() =>
                      run(
                        "timer",
                        () => startTaskTimer(taskId).then(() => undefined),
                        "Timer started",
                      )
                    }
                  >
                    Start timer
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">
                Comments ({comments.length})
              </p>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="task-comment" className="sr-only">
                    Add a comment
                  </Label>
                  <Input
                    id="task-comment"
                    value={comment}
                    placeholder="Add a comment…"
                    onChange={(event) => setComment(event.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!comment.trim() || pending === "comment"}
                  onClick={() =>
                    run(
                      "comment",
                      async () => {
                        await addTaskComment(taskId, comment);
                        setComment("");
                      },
                      "Comment added",
                    )
                  }
                >
                  Comment
                </Button>
              </div>

              {comments.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No comments yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {comments.map((row) => (
                    <li
                      key={row.commentId}
                      className="rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {personName(row.firstName, row.lastName)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(row.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{commentText(row.content)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">History ({activity.length})</p>
              {activity.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No history recorded.
                </p>
              ) : (
                <ul className="space-y-1">
                  {activity.map((entry) => (
                    <li
                      key={entry.activityId}
                      className="text-muted-foreground flex items-center justify-between gap-2 text-xs"
                    >
                      <span>{humanizeToken(entry.eventType)}</span>
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-muted-foreground text-xs">
              Checklists and task dependencies are not part of this surface: the
              tables exist but no public action does.
            </p>
          </div>
        )}

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this task?"
          description="The task disappears from every list. It is a soft delete, so the record and its history are retained."
          confirmLabel="Delete"
          pendingLabel="Deleting…"
          variant="destructive"
          onConfirm={async () => {
            await deleteTask(taskId);
            setConfirmDelete(false);
            await onChanged();
            onClose();
            toast.success("Task deleted");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
