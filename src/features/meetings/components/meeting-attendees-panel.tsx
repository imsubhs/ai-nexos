"use client";

/**
 * Attendee management (Sprint 12B · Phase 1).
 *
 * `meeting_attendees` has always modelled either an internal user or an
 * external email plus a role and an RSVP state; nothing here invents a field.
 * Add / change RSVP / remove all route through the public gateway.
 */
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  addMeetingAttendee,
  removeMeetingAttendee,
  updateMeetingAttendee,
} from "../actions";
import {
  MEETING_ATTENDEE_ROLES,
  MEETING_RSVP_STATUSES,
  humanizeToken,
} from "../constants";

export type MeetingMemberOption = {
  userId: string;
  firstName: string;
  lastName: string | null;
};

export type AttendeeRow = {
  attendeeId: string;
  userId: string | null;
  externalEmail: string | null;
  role: string | null;
  rsvpStatus: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

const SELECT_CLASS =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-3 disabled:opacity-50";

function attendeeName(row: AttendeeRow): string {
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
  return name || row.externalEmail || row.email || "Unknown attendee";
}

export function MeetingAttendeesPanel({
  meetingId,
  attendees,
  members,
  onChanged,
}: Readonly<{
  meetingId: string;
  attendees: AttendeeRow[];
  /** Internal users selectable as attendees. */
  members: MeetingMemberOption[];
  onChanged: () => Promise<void>;
}>) {
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<AttendeeRow | null>(null);
  const [userId, setUserId] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [role, setRole] = useState<string>("participant");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const alreadyInvited = new Set(attendees.map((a) => a.userId).filter(Boolean));
  const selectable = members.filter((member) => !alreadyInvited.has(member.userId));

  const changeRsvp = async (attendee: AttendeeRow, rsvpStatus: string) => {
    setPendingId(attendee.attendeeId);
    try {
      await updateMeetingAttendee({ attendeeId: attendee.attendeeId, rsvpStatus: rsvpStatus as never });
      await onChanged();
      toast.success(`RSVP set to ${humanizeToken(rsvpStatus)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the RSVP");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Attendees ({attendees.length})</p>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          Add attendee
        </Button>
      </div>

      {attendees.length === 0 ? (
        <p className="text-muted-foreground text-xs">No attendees invited yet.</p>
      ) : (
        <ul className="space-y-2">
          {attendees.map((attendee) => (
            <li
              key={attendee.attendeeId}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{attendeeName(attendee)}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {humanizeToken(attendee.role ?? "participant")}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <select
                  aria-label={`RSVP for ${attendeeName(attendee)}`}
                  value={attendee.rsvpStatus ?? "pending"}
                  disabled={pendingId === attendee.attendeeId}
                  onChange={(event) => changeRsvp(attendee, event.target.value)}
                  className={SELECT_CLASS}
                >
                  {MEETING_RSVP_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {humanizeToken(status)}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${attendeeName(attendee)} from this meeting`}
                  onClick={() => setRemoving(attendee)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add an attendee"
        description="Invite a team member, or an external contact by email address."
        confirmLabel="Add attendee"
        pendingLabel="Adding…"
        onConfirm={async () => {
          await addMeetingAttendee({
            meetingId,
            userId: userId || undefined,
            externalEmail: externalEmail || undefined,
            role: role as never,
            rsvpStatus: "pending",
          });
          setUserId("");
          setExternalEmail("");
          await onChanged();
          toast.success("Attendee added");
        }}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="attendee-user">Team member</Label>
            <select
              id="attendee-user"
              value={userId}
              onChange={(event) => {
                setUserId(event.target.value);
                if (event.target.value) setExternalEmail("");
              }}
              className="border-input bg-background flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none"
            >
              <option value="">— none —</option>
              {selectable.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {[member.firstName, member.lastName].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendee-email">…or external email</Label>
            <Input
              id="attendee-email"
              type="email"
              value={externalEmail}
              disabled={Boolean(userId)}
              onChange={(event) => setExternalEmail(event.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendee-role">Role</Label>
            <select
              id="attendee-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="border-input bg-background flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none"
            >
              {MEETING_ATTENDEE_ROLES.map((option) => (
                <option key={option} value={option}>
                  {humanizeToken(option)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this attendee?"
        description={
          removing
            ? `${attendeeName(removing)} will no longer be listed on this meeting.`
            : ""
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        variant="destructive"
        onConfirm={async () => {
          await removeMeetingAttendee(removing!.attendeeId);
          setRemoving(null);
          await onChanged();
          toast.success("Attendee removed");
        }}
      />
    </div>
  );
}
