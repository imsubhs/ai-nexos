"use client";

/**
 * Decision and action-item persistence (Sprint 12B · Phase 1).
 *
 * `createDecision`, `createActionItem` and `promoteActionItemToTask` have
 * existed since Sprint 11 — Sprint 12A could not wire them because the only
 * outcome reads were project-scoped stubs, so anything written here was
 * invisible to the person who wrote it. `getMeetingOutcomes(meetingId)` closes
 * that loop, and this panel is the surface.
 *
 * Promotion needs the full task hierarchy (promoteActionItemSchema wants
 * project + timeline + phase + milestone). The milestone is chosen here and the
 * phase is taken from it, so no hierarchy is guessed.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  createActionItem,
  createDecision,
  promoteActionItemToTask,
} from "../actions";
import {
  ACTION_ITEM_STATUSES,
  DECISION_STATUSES,
  DECISION_TYPES,
  TASK_PRIORITIES,
  humanizeToken,
} from "../constants";

export type DecisionRow = {
  decisionId: string;
  title: string;
  description: string | null;
  decisionType: string;
  status: string;
  priority: string;
};

export type ActionItemRow = {
  actionItemId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  promotedToTaskId: string | null;
};

export type MilestoneOption = {
  milestoneId: string;
  phaseId: string;
  name: string;
};

const SELECT_CLASS =
  "border-input bg-background flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none";

export function MeetingOutcomesPanel({
  meetingId,
  projectId,
  timelineId,
  milestones,
  decisions,
  actionItems,
  onChanged,
}: Readonly<{
  meetingId: string;
  projectId: string;
  /** Null when the meeting's project has no timeline — promotion is then unavailable. */
  timelineId: string | null;
  milestones: MilestoneOption[];
  decisions: DecisionRow[];
  actionItems: ActionItemRow[];
  onChanged: () => Promise<void>;
}>) {
  const [dialog, setDialog] = useState<"decision" | "action" | null>(null);
  const [promoting, setPromoting] = useState<ActionItemRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [decisionType, setDecisionType] = useState<string>("strategic");
  const [decisionStatus, setDecisionStatus] = useState<string>("open");
  const [actionStatus, setActionStatus] = useState<string>("open");
  const [priority, setPriority] = useState<string>("medium");
  const [milestoneId, setMilestoneId] = useState<string>(milestones[0]?.milestoneId ?? "");

  const canPromote = Boolean(timelineId) && milestones.length > 0;

  const resetFields = () => {
    setTitle("");
    setDescription("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Decisions ({decisions.length})</p>
          <Button size="sm" variant="outline" onClick={() => setDialog("decision")}>
            Record decision
          </Button>
        </div>
        {decisions.length === 0 ? (
          <p className="text-muted-foreground text-xs">No decisions recorded.</p>
        ) : (
          <ul className="space-y-2">
            {decisions.map((decision) => (
              <li key={decision.decisionId} className="rounded-md border px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium">{decision.title}</p>
                  <StatusBadge status={decision.status} />
                </div>
                {decision.description ? (
                  <p className="text-muted-foreground mt-1 text-xs">{decision.description}</p>
                ) : null}
                <Badge variant="outline" className="mt-2 text-[10px]">
                  {humanizeToken(decision.decisionType)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Action items ({actionItems.length})</p>
          <Button size="sm" variant="outline" onClick={() => setDialog("action")}>
            Add action item
          </Button>
        </div>
        {actionItems.length === 0 ? (
          <p className="text-muted-foreground text-xs">No action items recorded.</p>
        ) : (
          <ul className="space-y-2">
            {actionItems.map((item) => (
              <li key={item.actionItemId} className="rounded-md border px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium">{item.title}</p>
                  <StatusBadge status={item.status} />
                </div>
                {item.description ? (
                  <p className="text-muted-foreground mt-1 text-xs">{item.description}</p>
                ) : null}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {humanizeToken(item.priority)}
                  </Badge>
                  {item.promotedToTaskId ? (
                    <span className="text-muted-foreground text-xs">Promoted to a task</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canPromote}
                      title={
                        canPromote
                          ? undefined
                          : "This project has no timeline milestone to attach a task to."
                      }
                      onClick={() => setPromoting(item)}
                    >
                      Promote to task
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!canPromote && actionItems.some((item) => !item.promotedToTaskId) && (
          <p className="text-muted-foreground text-xs">
            Promotion needs a timeline milestone to file the new task under; this
            project has none yet.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={dialog === "decision"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Record a decision"
        description="Stored as a meeting outcome of type decision."
        confirmLabel="Record decision"
        pendingLabel="Recording…"
        onConfirm={async () => {
          if (!title.trim()) throw new Error("A title is required.");
          await createDecision({
            meetingId,
            outcomeType: "decision",
            title: title.trim(),
            description: description.trim() || undefined,
            decisionType: decisionType as never,
            status: decisionStatus as never,
            priority: priority as never,
          });
          resetFields();
          await onChanged();
          toast.success("Decision recorded");
        }}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="decision-title">Title *</Label>
            <Input
              id="decision-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="decision-description">Description</Label>
            <Input
              id="decision-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="decision-type">Type</Label>
              <select
                id="decision-type"
                value={decisionType}
                onChange={(event) => setDecisionType(event.target.value)}
                className={SELECT_CLASS}
              >
                {DECISION_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {humanizeToken(option)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-status">Status</Label>
              <select
                id="decision-status"
                value={decisionStatus}
                onChange={(event) => setDecisionStatus(event.target.value)}
                className={SELECT_CLASS}
              >
                {DECISION_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {humanizeToken(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "action"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Add an action item"
        description="Stored as a meeting outcome of type action item."
        confirmLabel="Add action item"
        pendingLabel="Adding…"
        onConfirm={async () => {
          if (!title.trim()) throw new Error("A title is required.");
          await createActionItem({
            meetingId,
            outcomeType: "action_item",
            title: title.trim(),
            description: description.trim() || undefined,
            status: actionStatus as never,
            priority: priority as never,
          });
          resetFields();
          await onChanged();
          toast.success("Action item added");
        }}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="action-title">Title *</Label>
            <Input
              id="action-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-description">Description</Label>
            <Input
              id="action-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="action-status">Status</Label>
              <select
                id="action-status"
                value={actionStatus}
                onChange={(event) => setActionStatus(event.target.value)}
                className={SELECT_CLASS}
              >
                {ACTION_ITEM_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {humanizeToken(option)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-priority">Priority</Label>
              <select
                id="action-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className={SELECT_CLASS}
              >
                {TASK_PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {humanizeToken(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={promoting !== null}
        onOpenChange={(open) => !open && setPromoting(null)}
        title="Promote to a task"
        description="Creates a task carrying this action item's title, priority and due date, and links the two."
        confirmLabel="Create task"
        pendingLabel="Promoting…"
        onConfirm={async () => {
          const milestone = milestones.find((m) => m.milestoneId === milestoneId);
          if (!milestone || !timelineId) throw new Error("Choose a milestone first.");
          await promoteActionItemToTask({
            actionItemId: promoting!.actionItemId,
            projectId,
            timelineId,
            phaseId: milestone.phaseId,
            milestoneId: milestone.milestoneId,
          });
          setPromoting(null);
          await onChanged();
          toast.success("Action item promoted to a task");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="promote-milestone">Milestone</Label>
          <select
            id="promote-milestone"
            value={milestoneId}
            onChange={(event) => setMilestoneId(event.target.value)}
            className={SELECT_CLASS}
          >
            {milestones.map((milestone) => (
              <option key={milestone.milestoneId} value={milestone.milestoneId}>
                {milestone.name}
              </option>
            ))}
          </select>
        </div>
      </ConfirmDialog>
    </div>
  );
}
