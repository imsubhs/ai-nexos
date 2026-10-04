"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createProject, updateProject } from "../actions";
import { insertProjectSchema, updateProjectSchema } from "../schemas";

type ProjectFormProps = {
  initialData?: (Record<string, any> & { projectId?: string }) | null;
  initialClientId?: string;
  clientOptions?: { clientId: string; companyName: string }[];
  onSuccess?: () => void;
};


export function ProjectForm({
  initialData,
  initialClientId,
  clientOptions = [],
  onSuccess,
}: ProjectFormProps) {
  const [isPending, setIsPending] = useState(false);

  const defaultClientId =
    initialData?.clientId || (initialClientId && initialClientId.length > 0 ? initialClientId : "");

  const form = useForm<z.input<typeof insertProjectSchema>>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      projectName: initialData?.projectName || "",
      description: initialData?.description || "",
      clientId: defaultClientId || null,
      priority:
        (initialData?.priority as "critical" | "high" | "medium" | "low") ||
        "medium",
      status:
        (initialData?.status as
          | "planning"
          | "in_progress"
          | "completed"
          | "internal_review"
          | "client_review"
          | "on_hold") || "planning",
      healthStatus:
        (initialData?.healthStatus as
          | "on_track"
          | "at_risk"
          | "delayed"
          | "blocked"
          | "completed") || "on_track",
      visibility:
        (initialData?.visibility as "private" | "internal" | "client_shared") ||
        "internal",
      startDate: initialData?.startDate
        ? new Date(initialData.startDate).toISOString().split("T")[0]
        : undefined,
      estimatedEndDate: initialData?.estimatedEndDate
        ? new Date(initialData.estimatedEndDate).toISOString().split("T")[0]
        : undefined,
    },
  });

  async function onSubmit(data: z.input<typeof insertProjectSchema>) {
    setIsPending(true);
    try {
      const payload = {
        ...data,
        clientId:
          data.clientId && typeof data.clientId === "string" && data.clientId.trim() !== ""
            ? data.clientId.trim()
            : null,
      };

      const validatedData = insertProjectSchema.parse(payload);
      if (initialData?.projectId) {
        await updateProject(initialData.projectId, validatedData);
        toast.success("Project updated successfully");
      } else {
        await createProject(validatedData);
        toast.success("Project created successfully");
      }
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="projectName">Project Name *</Label>
        <Input id="projectName" placeholder="e.g. Autumn Brand Campaign" {...form.register("projectName")} />
        {form.formState.errors.projectName && (
          <p className="text-destructive text-sm">
            {form.formState.errors.projectName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientId">Client</Label>
        <select
          id="clientId"
          {...form.register("clientId")}
          className="border-input bg-surface-1 text-foreground flex h-9 w-full rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">No Client (Internal Project)</option>
          {clientOptions.map((c) => (
            <option key={c.clientId} value={c.clientId}>
              {c.companyName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" placeholder="Brief project scope or overview" {...form.register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            {...form.register("status")}
            className="border-input bg-surface-1 text-foreground flex h-9 w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="internal_review">Internal Review</option>
            <option value="client_review">Client Review</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="healthStatus">Health Status</Label>
          <select
            id="healthStatus"
            {...form.register("healthStatus")}
            className="border-input bg-surface-1 text-foreground flex h-9 w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="delayed">Delayed</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            {...form.register("priority")}
            className="border-input bg-surface-1 text-foreground flex h-9 w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <select
            id="visibility"
            {...form.register("visibility")}
            className="border-input bg-surface-1 text-foreground flex h-9 w-full rounded-md border px-3 py-1.5 text-sm"
          >
            <option value="internal">Internal</option>
            <option value="client_shared">Client Shared</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" type="date" {...form.register("startDate")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedEndDate">Target End Date</Label>
          <Input id="estimatedEndDate" type="date" {...form.register("estimatedEndDate")} />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : initialData
              ? "Save Changes"
              : "Create Project"}
        </Button>
      </div>
    </form>
  );
}

