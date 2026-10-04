"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flag, Plus, Calendar, CheckCircle2 } from "lucide-react";
import { createMilestone } from "@/features/timelines/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Milestone = {
  milestoneId: string;
  name: string;
  description?: string | null;
  status: string;
  progress: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  phaseId: string;
};

type Phase = {
  phaseId: string;
  name: string;
  orderIndex: number;
  milestones?: Milestone[];
};

export function ProjectMilestonesView({
  timelineId,
  phases = [],
  milestones = [],
}: {
  timelineId?: string | null;
  phases?: Phase[];
  milestones?: Milestone[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phaseId, setPhaseId] = useState(phases[0]?.phaseId || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineId) {
      toast.error("Timeline not initialized");
      return;
    }
    if (!name.trim()) {
      toast.error("Milestone name is required");
      return;
    }
    if (!phaseId) {
      toast.error("Please select a project phase");
      return;
    }

    setIsPending(true);
    try {
      await createMilestone({
        timelineId,
        phaseId,
        name: name.trim(),
        description: description.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      });
      toast.success("Milestone created");
      setOpen(false);
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create milestone",
      );
    } finally {
      setIsPending(false);
    }
  };

  if (!timelineId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1/40 p-12 text-center">
        <Flag className="size-8 text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-1">
          No Timeline Defined
        </h3>
        <p className="max-w-sm text-xs text-muted-foreground">
          Initialize this project&apos;s timeline to define delivery phases and milestones.
        </p>

      </div>
    );
  }

  // Group milestones by phase
  const phasesWithMilestones = phases.map((phase) => ({
    ...phase,
    milestones: milestones.filter((m) => m.phaseId === phase.phaseId),
  }));

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(
    (m) => m.status === "completed" || m.progress === 100,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-border bg-surface-1">
        <div>
          <h3 className="text-base font-semibold text-foreground">Project Milestones</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedMilestones} of {totalMilestones} milestones completed across{" "}
            {phases.length} execution phases.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="gap-1.5 shadow-xs">
                <Plus className="size-4" />
                <span>Add Milestone</span>
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Add Project Milestone</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateMilestone} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="m-name">Milestone Name *</Label>
                <Input
                  id="m-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Concept Sign-off"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-phase">Phase</Label>
                <select
                  id="m-phase"
                  value={phaseId}
                  onChange={(e) => setPhaseId(e.target.value)}
                  className="border-input bg-surface-1 text-foreground flex h-9 w-full rounded-md border px-3 py-1.5 text-sm"
                >
                  {phases.map((p) => (
                    <option key={p.phaseId} value={p.phaseId}>
                      {p.name.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-start">Start Date</Label>
                  <Input
                    id="m-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-end">Target Due Date</Label>
                  <Input
                    id="m-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-desc">Description</Label>
                <Input
                  id="m-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key deliverables or acceptance criteria"
                />
              </div>

              <div className="flex justify-end pt-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Milestone"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {totalMilestones === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1/40 p-12 text-center">
          <Flag className="size-8 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">
            No milestones defined
          </h3>
          <p className="max-w-sm text-xs text-muted-foreground mb-4">
            Add key delivery checkpoints to track progress across the creative workflow.
          </p>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            <span>Create First Milestone</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {phasesWithMilestones.map((phase) => (
            <div
              key={phase.phaseId}
              className="rounded-xl border border-border bg-surface-1 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/80 bg-surface-2/40 px-4 py-3">
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {phase.name.replace("_", " ")}
                </h4>
                <Badge variant="outline" className="text-xs font-mono">
                  {phase.milestones.length} milestone{phase.milestones.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="divide-y divide-border/60">
                {phase.milestones.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-muted-foreground/60 italic">
                    No milestones in this phase
                  </div>
                ) : (
                  phase.milestones.map((m) => (
                    <div
                      key={m.milestoneId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-surface-2/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {m.progress === 100 || m.status === "completed" ? (
                            <CheckCircle2 className="size-4 text-emerald-400" />
                          ) : (
                            <Flag className="size-4 text-brand-primary" />
                          )}
                          <span className="font-semibold text-foreground text-sm">
                            {m.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize font-normal"
                          >
                            {m.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {m.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 pl-6">
                            {m.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-6 self-end sm:self-center shrink-0">
                        {m.endDate && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="size-3.5" />
                            <span>{new Date(m.endDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 w-32">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className="h-full rounded-full bg-brand-primary transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, m.progress))}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-brand-primary">
                            {m.progress}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
