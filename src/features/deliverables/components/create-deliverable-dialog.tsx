"use client";

/**
 * Create a deliverable draft. createDeliverable is the only creation path the
 * deliverables domain exposes; it needs a project, a title and a type, and it
 * opens the record at status "draft" with revision v1 — nothing here invents
 * fields the action does not take.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDeliverable } from "../actions";
import { DELIVERABLE_TYPES, humanizeToken } from "../constants";

export type ProjectOption = { projectId: string; projectName: string };

type FormValues = {
  projectId: string;
  title: string;
  type: string;
  description: string;
};

const SELECT_CLASS =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-3";

export function CreateDeliverableDialog({
  projects,
}: Readonly<{ projects: ProjectOption[] }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      projectId: projects[0]?.projectId ?? "",
      title: "",
      type: "other",
      description: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsPending(true);
    try {
      await createDeliverable({
        projectId: values.projectId,
        title: values.title,
        type: values.type,
        description: values.description || undefined,
      });
      toast.success("Deliverable created");
      setOpen(false);
      reset({ ...values, title: "", description: "" });
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the deliverable",
      );
    } finally {
      setIsPending(false);
    }
  };

  // Without a project there is nothing to attach a deliverable to, and
  // createDeliverable requires one. A disabled control that says why beats a
  // control that opens a form which can only fail.
  if (projects.length === 0) {
    return (
      <Button disabled title="Create a project before adding deliverables">
        <PlusIcon className="mr-2 h-4 w-4" />
        New Deliverable
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Deliverable
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New Deliverable</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deliverable-title">Title *</Label>
            <Input
              id="deliverable-title"
              {...register("title", { required: "Title is required" })}
            />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliverable-project">Project *</Label>
              <select
                id="deliverable-project"
                {...register("projectId", { required: true })}
                className={SELECT_CLASS}
              >
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable-type">Type</Label>
              <select
                id="deliverable-type"
                {...register("type")}
                className={SELECT_CLASS}
              >
                {DELIVERABLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanizeToken(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliverable-description">Description</Label>
            <Input id="deliverable-description" {...register("description")} />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create deliverable"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
