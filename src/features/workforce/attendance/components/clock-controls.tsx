"use client";

/**
 * The clock lifecycle controls — clock in / break / end break / clock out.
 *
 * Which buttons are enabled is derived from the SAME state machine positions the
 * server enforces (`AttendanceState`), so the UI cannot offer a transition the
 * action would reject. It is presentation only: every button calls a server
 * action that re-derives the state and re-checks `attendance.clock` before
 * writing. Disabling here is courtesy, not control.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Coffee, LogIn, LogOut, Play } from "lucide-react";
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
import {
  submitClockIn,
  submitClockOut,
  submitEndBreak,
  submitStartBreak,
} from "../form-actions";
import type { AttendanceState } from "../types";

export function ClockControls({
  state,
  allowWfh,
}: Readonly<{ state: AttendanceState; allowWfh: boolean }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clockOutOpen, setClockOutOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [wfh, setWfh] = useState(false);

  const run = (command: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await command();
      if (!result.ok) {
        setError(result.error ?? "That action could not be completed.");
        return;
      }
      setClockOutOpen(false);
      setNotes("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {state === "NOT_STARTED" ? (
          <>
            <Button
              disabled={pending}
              onClick={() => run(() => submitClockIn(wfh))}
            >
              <LogIn className="h-4 w-4" />
              Clock in
            </Button>
            {allowWfh ? (
              <label className="text-muted-foreground flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={wfh}
                  disabled={pending}
                  onChange={(e) => setWfh(e.target.checked)}
                />
                Working from home
              </label>
            ) : null}
          </>
        ) : null}

        {state === "WORKING" ? (
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run(() => submitStartBreak("break"))}
            >
              <Coffee className="h-4 w-4" />
              Start break
            </Button>
            <Button disabled={pending} onClick={() => setClockOutOpen(true)}>
              <LogOut className="h-4 w-4" />
              Clock out
            </Button>
          </>
        ) : null}

        {state === "ON_BREAK" ? (
          <>
            <Button
              disabled={pending}
              onClick={() => run(() => submitEndBreak())}
            >
              <Play className="h-4 w-4" />
              End break
            </Button>
            {/* Clocking out from a break is legal — the open break is closed at
                the same instant by finalizeDay, so no time is double-counted. */}
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setClockOutOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              Clock out
            </Button>
          </>
        ) : null}

        {state === "COMPLETED" ? (
          <p className="text-muted-foreground text-sm">
            Today&apos;s session is closed. A mistake in it can be raised under
            Corrections from tomorrow.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clock out</DialogTitle>
            <DialogDescription>
              Your session minutes are computed by the work-validation engine
              when you clock out. Notes are optional.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => submitClockOut(notes));
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="clock-out-notes">Notes</Label>
              <Input
                id="clock-out-notes"
                value={notes}
                maxLength={1000}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth recording about today"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setClockOutOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Clocking out…" : "Clock out"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
