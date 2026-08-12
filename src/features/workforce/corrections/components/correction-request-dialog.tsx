"use client";

/**
 * Submit a correction request (doc 16 S-6, contract CO-1).
 *
 * The date choices are the viewer's OWN correctable days, resolved on the server
 * and passed in — the form offers no free-text date and no employee field, so
 * there is no shape here in which a user asks to amend someone else's record.
 * The server re-validates all of it: window, type-conditional requireds,
 * duplicate open request, and that the actor is the subject.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FilePenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitCorrection } from "../form-actions";
import {
  CORRECTION_REQUESTABLE_STATUSES,
  CORRECTION_TYPES,
  type CorrectionType,
} from "../../shared/enums";
import { formatDate, humanizeEnum } from "../../shared/format";

/** A day the viewer may raise a correction against, with what it currently says. */
export interface CorrectableDay {
  date: string;
  status: string;
  clockInAt: string | null;
  clockOutAt: string | null;
}

const TYPE_HELP: Record<CorrectionType, string> = {
  LOGIN_TIME: "The recorded clock-in time is wrong.",
  LOGOUT_TIME: "The recorded clock-out time is wrong.",
  BOTH: "Both clock times are wrong.",
  STATUS_CHANGE: "The day's status is wrong (for example it should be WFH).",
  OTHER: "Something else — describe it in the reason.",
};

/** "2026-08-11" + "09:00" → an ISO instant the DTO accepts. */
function toInstant(date: string, time: string): string | undefined {
  if (!time) return undefined;
  return new Date(`${date}T${time}:00.000Z`).toISOString();
}

export function CorrectionRequestDialog({
  days,
  windowDays,
}: Readonly<{ days: CorrectableDay[]; windowDays: number }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(days[0]?.date ?? "");
  const [correctionType, setCorrectionType] =
    useState<CorrectionType>("LOGIN_TIME");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [requestedStatus, setRequestedStatus] = useState<string>("PRESENT");
  const [reason, setReason] = useState("");

  const selected = days.find((d) => d.date === date) ?? null;
  const needsIn = correctionType === "LOGIN_TIME" || correctionType === "BOTH";
  const needsOut =
    correctionType === "LOGOUT_TIME" || correctionType === "BOTH";
  const needsStatus = correctionType === "STATUS_CHANGE";

  const reset = () => {
    setDate(days[0]?.date ?? "");
    setCorrectionType("LOGIN_TIME");
    setClockIn("");
    setClockOut("");
    setRequestedStatus("PRESENT");
    setReason("");
    setError(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitCorrection({
        date,
        correctionType,
        requestedClockInAt: needsIn ? toInstant(date, clockIn) : undefined,
        requestedClockOutAt: needsOut ? toInstant(date, clockOut) : undefined,
        requestedStatus: needsStatus
          ? (requestedStatus as (typeof CORRECTION_REQUESTABLE_STATUSES)[number])
          : undefined,
        reason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  };

  return (
    <>
      <Button
        disabled={days.length === 0}
        title={
          days.length === 0
            ? `No days in the last ${windowDays} days can be corrected yet`
            : undefined
        }
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <FilePenLine className="h-4 w-4" />
        Request correction
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) reset();
          setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a correction</DialogTitle>
            <DialogDescription>
              For one of your own past days, within the last {windowDays} days.
              A reviewer decides; nothing changes until they approve.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="correction-date">Day</Label>
              <select
                id="correction-date"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={date}
                required
                disabled={pending}
                onChange={(e) => setDate(e.target.value)}
              >
                {days.map((day) => (
                  <option key={day.date} value={day.date}>
                    {formatDate(day.date)} — {humanizeEnum(day.status)}
                  </option>
                ))}
              </select>
              {selected ? (
                <p className="text-muted-foreground text-xs">
                  Currently recorded: in{" "}
                  {selected.clockInAt ? selected.clockInAt.slice(11, 16) : "—"},
                  out{" "}
                  {selected.clockOutAt
                    ? selected.clockOutAt.slice(11, 16)
                    : "—"}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="correction-type">What is wrong</Label>
              <select
                id="correction-type"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={correctionType}
                disabled={pending}
                onChange={(e) =>
                  setCorrectionType(e.target.value as CorrectionType)
                }
              >
                {CORRECTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanizeEnum(type)}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                {TYPE_HELP[correctionType]}
              </p>
            </div>

            {needsIn || needsOut ? (
              <div className="grid grid-cols-2 gap-4">
                {needsIn ? (
                  <div className="grid gap-2">
                    <Label htmlFor="correction-clock-in">Clock in (UTC)</Label>
                    <Input
                      id="correction-clock-in"
                      type="time"
                      required
                      value={clockIn}
                      disabled={pending}
                      onChange={(e) => setClockIn(e.target.value)}
                    />
                  </div>
                ) : null}
                {needsOut ? (
                  <div className="grid gap-2">
                    <Label htmlFor="correction-clock-out">
                      Clock out (UTC)
                    </Label>
                    <Input
                      id="correction-clock-out"
                      type="time"
                      required
                      value={clockOut}
                      disabled={pending}
                      onChange={(e) => setClockOut(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {needsStatus ? (
              <div className="grid gap-2">
                <Label htmlFor="correction-status">Requested status</Label>
                <select
                  id="correction-status"
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  value={requestedStatus}
                  disabled={pending}
                  onChange={(e) => setRequestedStatus(e.target.value)}
                >
                  {CORRECTION_REQUESTABLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {humanizeEnum(status)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="correction-reason">Reason</Label>
              <textarea
                id="correction-reason"
                className="border-input bg-background min-h-24 rounded-md border p-3 text-sm"
                required
                minLength={10}
                maxLength={1000}
                value={reason}
                disabled={pending}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What happened, and why the recorded value is wrong (at least 10 characters)."
              />
            </div>

            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !date}>
                {pending ? "Submitting…" : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
