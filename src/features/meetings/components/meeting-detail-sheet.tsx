"use client";

/**
 * Meeting detail drawer.
 *
 * Sprint 12A could only render the meeting's own columns: there was no
 * `updateMeeting`, and the outcome reads were project-scoped stubs returning
 * `[]`, so the drawer told the user what it could not do. Sprint 12B closed
 * both gaps, and this is now the meeting's working surface:
 *
 *   • edit / cancel / complete / status change  → updateMeeting (guarded by
 *     MEETING_STATUS_TRANSITIONS, so an illegal transition is refused with a
 *     sentence rather than written silently)
 *   • attendees                                 → add / RSVP / remove
 *   • agenda                                    → add / complete / reorder / remove
 *   • decisions and action items                → record, and promote an action
 *     item to a real task
 *   • notes                                     → the `notes` jsonb column
 *   • activity                                  → meeting_activity, the audit
 *     trail every write above appends to
 *
 * Everything is fetched on open through the public gateway; the directory row
 * only carries list columns.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  getProjectTimeline,
  getTimelineMilestones,
} from "@/features/timelines/actions";
import type { meetings } from "@/db/schema/meetings";
import {
  getMeetingActivity,
  getMeetingAgenda,
  getMeetingAttendees,
  getMeetingById,
  getMeetingOutcomes,
} from "../queries";
import { cancelMeeting, completeMeeting, updateMeeting } from "../actions";
import { MEETING_STATUS_TRANSITIONS, humanizeToken } from "../constants";
import { MeetingForm } from "./meeting-form";
import {
  MeetingAttendeesPanel,
  type AttendeeRow,
  type MeetingMemberOption,
} from "./meeting-attendees-panel";
import { MeetingAgendaPanel, type AgendaRow } from "./meeting-agenda-panel";
import {
  MeetingOutcomesPanel,
  type ActionItemRow,
  type DecisionRow,
  type MilestoneOption,
} from "./meeting-outcomes-panel";

export type MeetingRow = typeof meetings.$inferSelect;

type DrawerData = {
  meeting: MeetingRow;
  attendees: AttendeeRow[];
  agenda: AgendaRow[];
  decisions: DecisionRow[];
  actionItems: ActionItemRow[];
  activity: {
    activityId: string;
    eventType: string;
    createdAt: Date | string;
  }[];
  timelineId: string | null;
  milestones: MilestoneOption[];
};

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function notesText(notes: unknown): string | null {
  if (!notes) return null;
  if (typeof notes === "string") return notes;
  const text = (notes as { text?: unknown }).text;
  return typeof text === "string" && text.length > 0 ? text : null;
}

export function MeetingDetailSheet({
  meetingId,
  members,
  projects,
  onClose,
  onChanged,
}: Readonly<{
  meetingId: string | null;
  members: MeetingMemberOption[];
  projects: { projectId: string; projectName: string }[];
  onClose: () => void;
  /** Called after a write so the directory behind the drawer re-reads. */
  onChanged?: () => void;
}>) {
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<"cancel" | "complete" | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [statusPending, setStatusPending] = useState(false);

  const load = useCallback(async (id: string): Promise<DrawerData | null> => {
    const meeting = (await getMeetingById(id)) as MeetingRow | undefined;
    if (!meeting) return null;

    const [attendees, agenda, outcomes, activity] = await Promise.all([
      getMeetingAttendees(id),
      getMeetingAgenda(id),
      getMeetingOutcomes(id),
      getMeetingActivity(id, 25),
    ]);

    // Promotion targets. A project without a timeline simply yields none, and
    // the outcomes panel disables promotion and says why.
    let timelineId: string | null = null;
    let milestones: MilestoneOption[] = [];
    try {
      const timeline = await getProjectTimeline(meeting.projectId);
      if (timeline?.timelineId) {
        timelineId = timeline.timelineId;
        const rows = await getTimelineMilestones(timeline.timelineId, 50, 0);
        milestones = rows
          .filter((row) => Boolean(row.phaseId))
          .map((row) => ({
            milestoneId: row.milestoneId,
            phaseId: row.phaseId as string,
            name: row.name,
          }));
      }
    } catch {
      // A caller without timeline read access loses promotion, not the drawer.
    }

    return {
      meeting,
      attendees: attendees as unknown as AttendeeRow[],
      agenda: agenda as unknown as AgendaRow[],
      decisions: outcomes.decisions as unknown as DecisionRow[],
      actionItems: outcomes.actionItems as unknown as ActionItemRow[],
      activity: activity as unknown as DrawerData["activity"],
      timelineId,
      milestones,
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!meetingId) return;
    setData(await load(meetingId));
    onChanged?.();
  }, [meetingId, load, onChanged]);

  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setEditing(false);
      try {
        const result = await load(meetingId!);
        if (!cancelled) setData(result);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [meetingId, load]);

  const meeting = data?.meeting ?? null;
  const allowedStatuses = meeting
    ? (MEETING_STATUS_TRANSITIONS[
        meeting.status as keyof typeof MEETING_STATUS_TRANSITIONS
      ] ?? [])
    : [];

  const changeStatus = async (status: string) => {
    if (!meeting || status === meeting.status) return;
    setStatusPending(true);
    try {
      await updateMeeting(meeting.meetingId, { status: status as never });
      await refresh();
      toast.success(`Status set to ${humanizeToken(status)}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not change the status",
      );
    } finally {
      setStatusPending(false);
    }
  };

  return (
    <Sheet
      open={meetingId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : meeting && data ? (
          <>
            <SheetHeader>
              <SheetTitle>{meeting.title}</SheetTitle>
              <SheetDescription>
                {humanizeToken(meeting.meetingType)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-8">
              {editing ? (
                <MeetingForm
                  projects={projects}
                  meeting={meeting}
                  onSuccess={async () => {
                    setEditing(false);
                    await refresh();
                  }}
                />
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!allowedStatuses.includes("completed")}
                      onClick={() => setDialog("complete")}
                    >
                      Mark complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!allowedStatuses.includes("cancelled")}
                      onClick={() => setDialog("cancel")}
                    >
                      Cancel meeting
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meeting-status">Change status</Label>
                    <select
                      id="meeting-status"
                      value={meeting.status}
                      disabled={statusPending || allowedStatuses.length === 0}
                      onChange={(event) => changeStatus(event.target.value)}
                      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none focus-visible:ring-3 disabled:opacity-50"
                    >
                      <option value={meeting.status}>
                        {humanizeToken(meeting.status)} (current)
                      </option>
                      {allowedStatuses.map((status) => (
                        <option key={status} value={status}>
                          {humanizeToken(status)}
                        </option>
                      ))}
                    </select>
                    {allowedStatuses.length === 0 && (
                      <p className="text-muted-foreground text-xs">
                        {humanizeToken(meeting.status)} is a terminal state — no
                        further transitions are available.
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <DetailRow
                      label="Status"
                      value={<StatusBadge status={meeting.status} />}
                    />
                    <DetailRow
                      label="Starts"
                      value={
                        meeting.startTime
                          ? new Date(meeting.startTime).toLocaleString()
                          : null
                      }
                    />
                    <DetailRow
                      label="Ends"
                      value={
                        meeting.endTime
                          ? new Date(meeting.endTime).toLocaleString()
                          : null
                      }
                    />
                    <DetailRow label="Location" value={meeting.location} />
                    <DetailRow label="Provider" value={meeting.provider} />
                    {meeting.meetingUrl ? (
                      <DetailRow
                        label="Join"
                        value={
                          <a
                            href={meeting.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-3"
                          >
                            Open meeting link
                          </a>
                        }
                      />
                    ) : null}
                  </div>

                  {meeting.description ? (
                    <p className="text-muted-foreground text-sm">
                      {meeting.description}
                    </p>
                  ) : null}

                  <Separator />
                  <MeetingAttendeesPanel
                    meetingId={meeting.meetingId}
                    attendees={data.attendees}
                    members={members}
                    onChanged={refresh}
                  />

                  <Separator />
                  <MeetingAgendaPanel
                    meetingId={meeting.meetingId}
                    items={data.agenda}
                    onChanged={refresh}
                  />

                  <Separator />
                  <MeetingOutcomesPanel
                    meetingId={meeting.meetingId}
                    projectId={meeting.projectId}
                    timelineId={data.timelineId}
                    milestones={data.milestones}
                    decisions={data.decisions}
                    actionItems={data.actionItems}
                    onChanged={refresh}
                  />

                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Notes</p>
                    {notesText(meeting.notes) ? (
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                        {notesText(meeting.notes)}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No notes yet — add them from Edit.
                      </p>
                    )}
                  </div>

                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Activity ({data.activity.length})
                    </p>
                    {data.activity.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No activity recorded.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {data.activity.map((entry) => (
                          <li
                            key={entry.activityId}
                            className="text-muted-foreground flex items-center justify-between gap-2 text-xs"
                          >
                            <span>{humanizeToken(entry.eventType)}</span>
                            <span>
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Recordings and transcripts are not part of this build — the
                    tables exist but no ingestion path does.
                  </p>
                </>
              )}
            </div>

            <ConfirmDialog
              open={dialog === "complete"}
              onOpenChange={(open) => !open && setDialog(null)}
              title="Mark this meeting complete?"
              description="Completed meetings can only be archived afterwards."
              confirmLabel="Mark complete"
              pendingLabel="Completing…"
              onConfirm={async () => {
                await completeMeeting(meeting.meetingId);
                setDialog(null);
                await refresh();
                toast.success("Meeting completed");
              }}
            />

            <ConfirmDialog
              open={dialog === "cancel"}
              onOpenChange={(open) => !open && setDialog(null)}
              title="Cancel this meeting?"
              description="The meeting stays on record as cancelled; the reason is written to its activity trail."
              confirmLabel="Cancel meeting"
              pendingLabel="Cancelling…"
              variant="destructive"
              onConfirm={async () => {
                await cancelMeeting(
                  meeting.meetingId,
                  cancelReason.trim() || undefined,
                );
                setCancelReason("");
                setDialog(null);
                await refresh();
                toast.success("Meeting cancelled");
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Reason (optional)</Label>
                <Input
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
              </div>
            </ConfirmDialog>
          </>
        ) : (
          <div className="text-muted-foreground p-4 text-sm">
            Meeting not found.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
