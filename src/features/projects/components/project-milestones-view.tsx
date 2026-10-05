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
      <div className="border-border bg-surface-1/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
        <Flag className="text-muted-foreground mb-3 size-8" />
        <h3 className="text-foreground mb-1 text-base font-semibold">
          No Timeline Defined
        </h3>
        <p className="text-muted-foreground max-w-sm text-xs">
          Initialize this project&apos;s timeline to define delivery phases and
          milestones.
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
      <div className="border-border bg-surface-1 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-foreground text-base font-semibold">
            Project Milestones
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {completedMilestones} of {totalMilestones} milestones completed
            across {phases.length} execution phases.
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
        <div className="border-border bg-surface-1/40 flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <Flag className="text-muted-foreground mb-3 size-8" />
          <h3 className="text-foreground mb-1 text-base font-semibold">
            No milestones defined
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm text-xs">
            Add key delivery checkpoints to track progress across the creative
            workflow.
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
              className="border-border bg-surface-1 overflow-hidden rounded-xl border"
            >
              <div className="border-border/80 bg-surface-2/40 flex items-center justify-between border-b px-4 py-3">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {phase.name.replace("_", " ")}
                </h4>
                <Badge variant="outline" className="font-mono text-xs">
                  {phase.milestones.length} milestone
                  {phase.milestones.length === 1 ? "" : "s"}
                </Badge>
              </div>

              <div className="divide-border/60 divide-y">
                {phase.milestones.length === 0 ? (
                  <div className="text-muted-foreground/60 px-4 py-3 text-xs italic">
                    No milestones in this phase
                  </div>
                ) : (
                  phase.milestones.map((m) => (
                    <div
                      key={m.milestoneId}
                      className="hover:bg-surface-2/20 flex flex-col justify-between gap-3 p-4 transition-colors sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {m.progress === 100 || m.status === "completed" ? (
                            <CheckCircle2 className="size-4 text-emerald-400" />
                          ) : (
                            <Flag className="text-brand-primary size-4" />
                          )}
                          <span className="text-foreground text-sm font-semibold">
                            {m.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs font-normal capitalize"
                          >
                            {m.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {m.description && (
                          <p className="text-muted-foreground line-clamp-1 pl-6 text-xs">
                            {m.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-6 self-end sm:self-center">
                        {m.endDate && (
                          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Calendar className="size-3.5" />
                            <span>
                              {new Date(m.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex w-32 items-center gap-2">
                          <div className="bg-surface-3 h-1.5 flex-1 overflow-hidden rounded-full">
                            <div
                              className="bg-brand-primary h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(0, m.progress))}%`,
                              }}
                            />
                          </div>
                          <span className="text-brand-primary font-mono text-xs">
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
