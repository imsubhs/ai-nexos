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
  initialData?: z.infer<typeof updateProjectSchema> & { projectId?: string };
  onSuccess?: () => void;
};

export function ProjectForm({ initialData, onSuccess }: ProjectFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.input<typeof insertProjectSchema>>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      projectName: initialData?.projectName || "",
      description: initialData?.description || "",
      priority: (initialData?.priority as "critical" | "high" | "medium" | "low") || "medium",
      status: (initialData?.status as "planning" | "in_progress" | "completed") || "planning",
      visibility: (initialData?.visibility as "private" | "internal" | "client_shared") || "internal",
    },
  });

  async function onSubmit(data: z.input<typeof insertProjectSchema>) {
    setIsPending(true);
    try {
      const validatedData = data as z.infer<typeof insertProjectSchema>;
      if (initialData?.projectId) {
        await updateProject(initialData.projectId, validatedData);
        toast.success("Project updated successfully");
      } else {
        await createProject(validatedData);
        toast.success("Project created successfully");
      }
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="projectName">Project Name *</Label>
        <Input id="projectName" {...form.register("projectName")} />
        {form.formState.errors.projectName && (
          <p className="text-sm text-destructive">{form.formState.errors.projectName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" {...form.register("description")} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select id="priority" {...form.register("priority")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Visibility</Label>
          <select id="visibility" {...form.register("visibility")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="private">Private</option>
            <option value="internal">Internal</option>
            <option value="client_shared">Client Shared</option>
          </select>
        </div>
      </div>

      <div className="pt-4 flex justify-end space-x-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : initialData ? "Save Changes" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
