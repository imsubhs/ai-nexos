"use client";

/**
 * The deliverable write surface, exactly as wide as the domain allows.
 *
 * Wired (all five write actions the public gateway exposes):
 *   • startReviewSession — moves draft → internal_review / client_review
 *   • approveRevision    — approves and locks the deliverable
 *   • requestRevision    — opens the next revision and unlocks
 *   • generateShareLink  — issues a tokenised client link
 *
 * Not wired, because no such action exists (see docs/SPRINT-12A.md):
 *   • reject / publish / archive / delete — no domain call
 *   • download — blocked by TD-02 (storage returns mock signed URLs)
 *
 * Sprint 12B closed the one real constraint Sprint 12A had to surface:
 * `approveRevision` needs a sessionId and there was no read that listed
 * sessions, so Approve only worked inside the drawer session that started the
 * review. `getReviewSessions(deliverableId)` now supplies them, so an open
 * session survives a reload and Approve targets a specific one.
 */
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  approveRevision,
  generateShareLink,
  requestRevision,
  startReviewSession,
} from "../actions";
import { REVIEW_TYPES, SHARE_ACCESS_LEVELS, humanizeToken } from "../constants";

type Dialogs = "review" | "approve" | "revision" | "share" | null;

export type ReviewSessionOption = {
  sessionId: string;
  reviewType: string;
  status: string;
  createdAt: Date | string;
};

export function DeliverableActions({
  deliverable,
  sessions,
  onChanged,
}: Readonly<{
  deliverable: Record<string, any>;
  /** Review sessions on this deliverable, newest first (Sprint 12B). */
  sessions: ReviewSessionOption[];
  onChanged: () => Promise<void>;
}>) {
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [reviewType, setReviewType] = useState<string>("internal_review");
  const [reason, setReason] = useState("");
  const [accessLevel, setAccessLevel] = useState<string>("view_only");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const deliverableId = deliverable.deliverableId as string;
  const revisionId = deliverable.currentRevisionId as string | null;
  const isLocked = Boolean(deliverable.isLocked);

  // Approving needs a session that has not already produced an approval; the
  // deliverable's own lock flag is the authority on that, so any session on an
  // unlocked deliverable is a valid target. Newest first.
  const sessionId = selectedSessionId ?? sessions[0]?.sessionId ?? null;

  const close = () => setDialog(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isLocked || !revisionId}
          onClick={() => setDialog("review")}
        >
          Start review
        </Button>
        <Button
          size="sm"
          disabled={!sessionId || isLocked}
          onClick={() => setDialog("approve")}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialog("revision")}
        >
          Request revision
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!revisionId}
          onClick={() => setDialog("share")}
        >
          Share
        </Button>
      </div>

      {isLocked && (
        <p className="text-muted-foreground text-xs">
          This deliverable is locked by an approval. Request a revision to
          reopen it.
        </p>
      )}
      {!sessionId && !isLocked && (
        <p className="text-muted-foreground text-xs">
          Approval requires a review session. Start one to enable Approve.
        </p>
      )}
      {shareUrl && (
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium">Share link</p>
          <p className="text-muted-foreground mt-1 text-xs break-all">
            {shareUrl}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={dialog === "review"}
        onOpenChange={(open) => !open && close()}
        title="Start review session"
        description="Moves the deliverable into review and opens it for approval."
        confirmLabel="Start review"
        pendingLabel="Starting…"
        onConfirm={async () => {
          const session = await startReviewSession(
            deliverableId,
            revisionId!,
            reviewType,
          );
          setSelectedSessionId((session as any)?.sessionId ?? null);
          await onChanged();
          toast.success(
            `Review session started (${humanizeToken(reviewType)})`,
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="review-type">Review type</Label>
          <select
            id="review-type"
            value={reviewType}
            onChange={(event) => setReviewType(event.target.value)}
            className="border-input bg-background flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none"
          >
            {REVIEW_TYPES.map((type) => (
              <option key={type} value={type}>
                {humanizeToken(type)}
              </option>
            ))}
          </select>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => !open && close()}
        title="Approve this revision"
        description="Approving marks the deliverable approved and locks it against further edits."
        confirmLabel="Approve"
        pendingLabel="Approving…"
        onConfirm={async () => {
          await approveRevision(deliverableId, sessionId!, reason || undefined);
          setSelectedSessionId(null);
          setReason("");
          await onChanged();
          toast.success("Deliverable approved");
        }}
      >
        <div className="space-y-3">
          {sessions.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="approve-session">Review session</Label>
              <select
                id="approve-session"
                value={sessionId ?? ""}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                className="border-input bg-background flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none"
              >
                {sessions.map((session) => (
                  <option key={session.sessionId} value={session.sessionId}>
                    {humanizeToken(session.reviewType)} ·{" "}
                    {new Date(session.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="approve-notes">Notes (optional)</Label>
            <Input
              id="approve-notes"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "revision"}
        onOpenChange={(open) => !open && close()}
        title="Request a revision"
        description="Opens the next revision, unlocks the deliverable, and records the reason."
        confirmLabel="Request revision"
        pendingLabel="Requesting…"
        onConfirm={async () => {
          if (!reason.trim()) throw new Error("A reason is required.");
          await requestRevision(deliverableId, reason.trim());
          setReason("");
          await onChanged();
          toast.success("Revision requested");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="revision-reason">Reason *</Label>
          <Input
            id="revision-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="What needs to change?"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "share"}
        onOpenChange={(open) => !open && close()}
        title="Share this deliverable"
        description="Issues a tokenised link to the current revision."
        confirmLabel="Create link"
        pendingLabel="Creating…"
        onConfirm={async () => {
          const link = await generateShareLink(
            deliverableId,
            revisionId!,
            accessLevel,
            false,
          );
          const token = (link as any)?.token;
          setShareUrl(
            token ? `${window.location.origin}/portal/s/${token}` : null,
          );
          await onChanged();
          toast.success("Share link created");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="share-access">Access level</Label>
          <select
            id="share-access"
            value={accessLevel}
            onChange={(event) => setAccessLevel(event.target.value)}
            className="border-input bg-background flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none"
          >
            {SHARE_ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {humanizeToken(level)}
              </option>
            ))}
          </select>
        </div>
      </ConfirmDialog>
    </div>
  );
}
