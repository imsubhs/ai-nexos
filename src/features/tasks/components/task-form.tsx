"use client";

/**
 * Create / edit a task. One form for both, mirroring the ProjectForm pattern
 * (react-hook-form + zodResolver + sonner) so tasks do not introduce a second
 * mutation idiom. Only fields the task domain actually accepts are offered —
 * insertTaskSchema is the contract.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTask, updateTask } from "../actions";
import { insertTaskSchema } from "../schemas";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  humanizeToken,
} from "../constants";

/** The subset of insertTaskSchema this form edits. */
const taskFormSchema = insertTaskSchema.pick({
  name: true,
  status: true,
  priority: true,
  taskType: true,
  estimatedDurationMins: true,
  progress: true,
});

type TaskFormValues = z.input<typeof taskFormSchema>;

export type TaskScope = {
  projectId: string;
  timelineId: string;
  phaseId: string;
  milestoneId: string;
};

const SELECT_CLASS =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-3";

export function TaskForm({
  scope,
  task,
  onSuccess,
}: Readonly<{
  scope: TaskScope;
  /** Present when editing; absent when creating. */
  task?: Record<string, any> | null;
  onSuccess: () => void | Promise<void>;
}>) {
  const [isPending, setIsPending] = useState(false);
  const isEdit = Boolean(task?.taskId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: task?.name ?? "",
      status: task?.status ?? "backlog",
      priority: task?.priority ?? "medium",
      taskType: task?.taskType ?? "other",
      estimatedDurationMins: task?.estimatedDurationMins ?? 0,
      progress: task?.progress ?? 0,
    },
  });

  const onSubmit = async (values: TaskFormValues) => {
    setIsPending(true);
    try {
      const parsed = taskFormSchema.parse(values);
      if (isEdit) {
        await updateTask(task!.taskId, parsed);
        toast.success("Task updated");
      } else {
        // insertTaskSchema's remaining fields all carry defaults; parse the
        // whole payload so createTask receives the fully-defaulted shape
        // rather than the picked subset.
        await createTask(insertTaskSchema.parse({ ...scope, ...parsed }));
        toast.success("Task created");
      }
      await onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-name">Task name *</Label>
        <Input id="task-name" {...register("name")} />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="task-status">Status</Label>
          <select
            id="task-status"
            {...register("status")}
            className={SELECT_CLASS}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {humanizeToken(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-priority">Priority</Label>
          <select
            id="task-priority"
            {...register("priority")}
            className={SELECT_CLASS}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {humanizeToken(priority)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-type">Type</Label>
          <select
            id="task-type"
            {...register("taskType")}
            className={SELECT_CLASS}
          >
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {humanizeToken(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-estimate">Estimate (minutes)</Label>
          <Input
            id="task-estimate"
            type="number"
            min={0}
            {...register("estimatedDurationMins", { valueAsNumber: true })}
          />
          {errors.estimatedDurationMins && (
            <p className="text-destructive text-sm">
              {errors.estimatedDurationMins.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-progress">Progress (%)</Label>
        <Input
          id="task-progress"
          type="number"
          min={0}
          max={100}
          {...register("progress", { valueAsNumber: true })}
        />
        {errors.progress && (
          <p className="text-destructive text-sm">{errors.progress.message}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
