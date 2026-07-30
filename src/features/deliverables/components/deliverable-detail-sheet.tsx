"use client";

/**
 * Deliverable detail drawer. Fetches the full record (with revisions) via
 * getDeliverableById() on open — the directory table only carries list
 * columns, so this is a genuine second read through the public gateway,
 * not a reuse of row data already in hand.
 *
 * Sprint 12B adds the four histories the write side had been recording all
 * along with nothing to read them back: review sessions, approvals, share
 * links, and the deliverable's activity trail.
 */
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import {
  getDeliverableActivity,
  getDeliverableApprovals,
  getDeliverableById,
  getDeliverableShareLinks,
  getReviewSessions,
} from "../actions";
import {
  DeliverableActions,
  type ReviewSessionOption,
} from "./deliverable-actions";

type DeliverableDetail = Awaited<ReturnType<typeof getDeliverableById>>;

type History = {
  sessions: ReviewSessionOption[];
  approvals: {
    approvalId: string;
    status: string;
    notes: string | null;
    reviewType: string | null;
    createdAt: Date | string;
  }[];
  shareLinks: {
    shareId: string;
    token: string;
    accessLevel: string;
    createdAt: Date | string;
  }[];
  activity: {
    activityId: string;
    eventType: string;
    createdAt: Date | string;
  }[];
};

const EMPTY_HISTORY: History = {
  sessions: [],
  approvals: [],
  shareLinks: [],
  activity: [],
};

async function loadHistory(deliverableId: string): Promise<History> {
  const [sessions, approvals, shareLinks, activity] = await Promise.all([
    getReviewSessions(deliverableId),
    getDeliverableApprovals(deliverableId),
    getDeliverableShareLinks(deliverableId),
    getDeliverableActivity(deliverableId, 20),
  ]);
  return {
    sessions: sessions as unknown as History["sessions"],
    approvals: approvals as unknown as History["approvals"],
    shareLinks: shareLinks as unknown as History["shareLinks"],
    activity: activity as unknown as History["activity"],
  };
}

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

export function DeliverableDetailSheet({
  deliverableId,
  onClose,
  onChanged,
}: Readonly<{
  deliverableId: string | null;
  onClose: () => void;
  /** Called after a write so the directory row behind the drawer re-reads. */
  onChanged?: () => void;
}>) {
  const [detail, setDetail] = useState<DeliverableDetail | null>(null);
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const [loading, setLoading] = useState(false);

  // Sprint 12A: a write in the drawer must refresh the drawer itself (status,
  // lock flag, revision list) as well as the list behind it. Sprint 12B adds
  // the histories, which every write above also changes.
  const refresh = useCallback(async () => {
    if (!deliverableId) return;
    const result = await getDeliverableById(deliverableId);
    setDetail(result ?? null);
    try {
      setHistory(await loadHistory(deliverableId));
    } catch {
      setHistory(EMPTY_HISTORY);
    }
    onChanged?.();
  }, [deliverableId, onChanged]);

  useEffect(() => {
    // No synchronous setState here for the "closed" case — the Sheet is
    // already hidden (open={deliverableId !== null}) so stale `detail` isn't
    // visible, and the next real open re-fetches and overwrites it anyway.
    if (!deliverableId) return;
    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      try {
        const result = await getDeliverableById(deliverableId!);
        if (!cancelled) setDetail(result ?? null);
        const loaded = await loadHistory(deliverableId!).catch(
          () => EMPTY_HISTORY,
        );
        if (!cancelled) setHistory(loaded);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [deliverableId]);

  return (
    <Sheet
      open={deliverableId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="sm:max-w-md">
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail ? (
          <>
            <SheetHeader>
              <SheetTitle>{detail.title}</SheetTitle>
              <SheetDescription>{detail.type}</SheetDescription>
            </SheetHeader>

            <div className="space-y-1 px-4">
              <DeliverableActions
                deliverable={detail}
                sessions={history.sessions}
                onChanged={refresh}
              />
              <Separator className="my-3" />
              <DetailRow
                label="Status"
                value={<StatusBadge status={detail.status} />}
              />
              <DetailRow
                label="Created"
                value={new Date(detail.createdAt).toLocaleDateString()}
              />
              <DetailRow
                label="Locked"
                value={detail.isLocked ? "Yes" : "No"}
              />
              {detail.description ? (
                <>
                  <Separator className="my-2" />
                  <p className="text-muted-foreground text-sm">
                    {detail.description}
                  </p>
                </>
              ) : null}
              <Separator className="my-2" />
              <p className="text-sm font-medium">
                Revisions ({(detail as any).revisions?.length ?? 0})
              </p>
              <div className="space-y-2">
                {((detail as any).revisions ?? []).map((revision: any) => (
                  <div
                    key={revision.revisionId}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>
                      v{revision.versionNumber}
                      {revision.revisionId === detail.currentRevisionId ? (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          Current
                        </Badge>
                      ) : null}
                    </span>
                    <StatusBadge status={revision.status} />
                  </div>
                ))}
              </div>

              <Separator className="my-2" />
              <p className="text-sm font-medium">
                Review sessions ({history.sessions.length})
              </p>
              {history.sessions.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No review sessions yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {history.sessions.map((session) => (
                    <li
                      key={session.sessionId}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="capitalize">
                        {session.reviewType.replaceAll("_", " ")}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <Separator className="my-2" />
              <p className="text-sm font-medium">
                Approval history ({history.approvals.length})
              </p>
              {history.approvals.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No approvals recorded.
                </p>
              ) : (
                <ul className="space-y-2">
                  {history.approvals.map((approval) => (
                    <li
                      key={approval.approvalId}
                      className="rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={approval.status} />
                        <span className="text-muted-foreground text-xs">
                          {new Date(approval.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {approval.notes ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {approval.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <Separator className="my-2" />
              <p className="text-sm font-medium">
                Share links ({history.shareLinks.length})
              </p>
              {history.shareLinks.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No share links issued.
                </p>
              ) : (
                <ul className="space-y-2">
                  {history.shareLinks.map((link) => (
                    <li
                      key={link.shareId}
                      className="rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {link.accessLevel.replaceAll("_", " ")}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(link.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs break-all">
                        /portal/s/{link.token}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <Separator className="my-2" />
              <p className="text-sm font-medium">
                Activity ({history.activity.length})
              </p>
              {history.activity.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No activity recorded.
                </p>
              ) : (
                <ul className="space-y-1">
                  {history.activity.map((entry) => (
                    <li
                      key={entry.activityId}
                      className="text-muted-foreground flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="capitalize">
                        {entry.eventType.replaceAll("_", " ")}
                      </span>
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-muted-foreground pt-2 text-xs">
                Publishing and download are not part of this build: no publish
                action exists, and storage returns mock signed URLs (TD-02).
              </p>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground p-4 text-sm">
            Deliverable not found.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
