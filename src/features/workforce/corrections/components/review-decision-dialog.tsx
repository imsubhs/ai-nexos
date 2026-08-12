"use client";

/**
 * The review dialog (doc 16 S-7, contracts CO-6/CO-7).
 *
 * Opening it fetches the review context — the request AND the AttendanceDay it
 * would amend — so a decision is made against the stored record rather than
 * against the request in isolation. Opening also marks the request UNDER_REVIEW,
 * which is persisted (idempotently) so a second reviewer sees it is being looked
 * at.
 *
 * Every rule shown here is also enforced by the server: self-review is rejected,
 * a reject without a note is rejected, and an already-decided request is
 * rejected by the state machine. This dialog cannot grant anything by omission.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getCorrectionReviewContextAction } from "../actions";
import { decideCorrection, markUnderReview } from "../form-actions";
import { formatDate, formatMinutes, humanizeEnum } from "../../shared/format";
import type { CorrectionListItem, ReviewContext } from "../types";

function time(iso: string | null): string {
  return iso ? iso.slice(11, 16) : "—";
}

export function ReviewDecisionDialog({
  row,
}: Readonly<{ row: CorrectionListItem }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openDialog = () => {
    setOpen(true);
    setError(null);
    setNote("");
    setContext(null);
    setLoading(true);
    startTransition(async () => {
      try {
        const loaded = await getCorrectionReviewContextAction({
          correctionId: row.correctionId,
        });
        setContext(loaded);
        // Persisting UNDER_REVIEW is idempotent and must not block the read:
        // a failure here (e.g. the request was just cancelled) is reported, but
        // the reviewer still sees what they opened.
        const marked = await markUnderReview(row.correctionId);
        if (!marked.ok) setError(marked.error);
        else router.refresh();
      } catch {
        setError("That request could not be loaded.");
      } finally {
        setLoading(false);
      }
    });
  };

  const decide = (decision: "APPROVED" | "REJECTED") => {
    setError(null);
    startTransition(async () => {
      const result = await decideCorrection({
        correctionId: row.correctionId,
        decision,
        reviewNote: note.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  const correction = context?.correction;

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Review {row.correctionCode} — {row.employeeName}
            </DialogTitle>
            <DialogDescription>
              {formatDate(row.date)} · {humanizeEnum(row.correctionType)}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading the record…</p>
          ) : null}

          {correction ? (
            <div className="space-y-4">
              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <h3 className="mb-2 text-sm font-medium">Recorded now</h3>
                  {context?.dayVisible === false ? (
                    <p className="text-muted-foreground text-sm">
                      You do not have permission to view team attendance, so the
                      stored record is not shown.
                    </p>
                  ) : context?.day ? (
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd>{humanizeEnum(context.day.status ?? "—")}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">In</dt>
                        <dd className="tabular-nums">
                          {time(context.day.clockInAt)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Out</dt>
                        <dd className="tabular-nums">
                          {time(context.day.clockOutAt)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Session</dt>
                        <dd className="tabular-nums">
                          {formatMinutes(context.day.metrics.workingMinutes)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No attendance record exists for this date. Approving will
                      record the decision, but there is no day to amend.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border p-3">
                  <h3 className="mb-2 text-sm font-medium">Requested</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        {correction.requestedStatus
                          ? humanizeEnum(correction.requestedStatus)
                          : "unchanged"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">In</dt>
                      <dd className="tabular-nums">
                        {correction.requestedClockInAt
                          ? time(correction.requestedClockInAt)
                          : "unchanged"}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Out</dt>
                      <dd className="tabular-nums">
                        {correction.requestedClockOutAt
                          ? time(correction.requestedClockOutAt)
                          : "unchanged"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section>
                <h3 className="mb-1 text-sm font-medium">Reason given</h3>
                <p className="text-muted-foreground text-sm">
                  {correction.reason}
                </p>
                {correction.evidenceUrl ? (
                  <a
                    href={correction.evidenceUrl}
                    className="text-sm underline underline-offset-4"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Attached evidence
                  </a>
                ) : null}
              </section>

              <div className="grid gap-2">
                <Label htmlFor="review-note">
                  Review note (required to reject)
                </Label>
                <textarea
                  id="review-note"
                  className="border-input bg-background min-h-20 rounded-md border p-3 text-sm"
                  maxLength={1000}
                  value={note}
                  disabled={pending}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why this decision — recorded on the request."
                />
              </div>

              {correction.status !== "PENDING" &&
              correction.status !== "UNDER_REVIEW" ? (
                <p className="text-muted-foreground text-sm">
                  This request is already {humanizeEnum(correction.status)} and
                  can no longer be decided.
                </p>
              ) : null}
            </div>
          ) : null}

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
              Close
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !correction}
              onClick={() => decide("REJECTED")}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
            <Button
              type="button"
              disabled={pending || !correction}
              onClick={() => decide("APPROVED")}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
