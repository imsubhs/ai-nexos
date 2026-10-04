"use client";

/**
 * Deliverable detail drawer.
 * Phase 4F DAM: Displays full deliverable detail, revisions, review history,
 * and ATTACHED CREATIVE ASSETS with secure downloading and project asset linking.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Download,
  File,
  Film,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Music,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  archiveDeliverable,
  getDeliverableActivity,
  getDeliverableApprovals,
  getDeliverableById,
  getDeliverableFiles,
  getDeliverableShareLinks,
  getReviewSessions,
  linkFileToDeliverable,
  unlinkFileFromDeliverable,
} from "../actions";
import { getFileDownloadUrl, getFiles } from "@/features/files/actions";
import {
  DeliverableActions,
  type ReviewSessionOption,
} from "./deliverable-actions";

type DeliverableDetail = Awaited<ReturnType<typeof getDeliverableById>>;
type AttachedFile = Awaited<ReturnType<typeof getDeliverableFiles>>[number];

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function getFileTypeIcon(fileType: string) {
  switch (fileType?.toLowerCase()) {
    case "image":
      return ImageIcon;
    case "video":
      return Film;
    case "audio":
      return Music;
    default:
      return File;
  }
}

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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // Link asset modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [availableProjectFiles, setAvailableProjectFiles] = useState<
    { fileId: string; title: string; fileType: string }[]
  >([]);
  const [selectedFileToLink, setSelectedFileToLink] = useState<string>("");
  const [loadingProjectFiles, setLoadingProjectFiles] = useState(false);

  // Archive dialog
  const [archiveOpen, setArchiveOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!deliverableId) return;
    const [result, hist, files] = await Promise.all([
      getDeliverableById(deliverableId).catch(() => null),
      loadHistory(deliverableId).catch(() => EMPTY_HISTORY),
      getDeliverableFiles(deliverableId).catch(() => []),
    ]);
    setDetail(result);
    setHistory(hist);
    setAttachedFiles(files);
    onChanged?.();
  }, [deliverableId, onChanged]);

  useEffect(() => {
    if (!deliverableId) return;
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [result, hist, files] = await Promise.all([
          getDeliverableById(deliverableId!).catch(() => null),
          loadHistory(deliverableId!).catch(() => EMPTY_HISTORY),
          getDeliverableFiles(deliverableId!).catch(() => []),
        ]);
        if (!cancelled) {
          setDetail(result);
          setHistory(hist);
          setAttachedFiles(files);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();

    return () => {
      cancelled = true;
    };
  }, [deliverableId]);

  const handleDownloadFile = async (fileId: string, title: string) => {
    try {
      setDownloadingFileId(fileId);
      const res = await getFileDownloadUrl(fileId);
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
        toast.success(`Download started for ${title}`);
      } else {
        toast.error("Download URL could not be generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleUnlinkFile = async (fileId: string, title: string) => {
    if (!deliverableId) return;
    try {
      await unlinkFileFromDeliverable({ deliverableId, fileId });
      toast.success(`Unlinked ${title} from deliverable`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlink file");
    }
  };

  const openLinkModal = async () => {
    if (!detail?.projectId) return;
    setLoadingProjectFiles(true);
    setLinkModalOpen(true);
    try {
      const files = await getFiles({ projectId: detail.projectId }, 0, 100);
      const attachedIds = new Set(attachedFiles.map((f) => f.fileId));
      const candidates = files
        .filter((f) => !attachedIds.has(f.fileId))
        .map((f) => ({ fileId: f.fileId, title: f.title, fileType: f.fileType }));
      setAvailableProjectFiles(candidates);
      if (candidates[0]) {
        setSelectedFileToLink(candidates[0].fileId);
      }
    } catch {
      setAvailableProjectFiles([]);
    } finally {
      setLoadingProjectFiles(false);
    }
  };

  const handleConfirmLink = async () => {
    if (!deliverableId || !selectedFileToLink) return;
    await linkFileToDeliverable({
      deliverableId,
      fileId: selectedFileToLink,
    });
    setLinkModalOpen(false);
    setSelectedFileToLink("");
    toast.success("Asset attached to deliverable");
    await refresh();
  };

  const handleArchiveDeliverable = async () => {
    if (!deliverableId) return;
    await archiveDeliverable(deliverableId);
    setArchiveOpen(false);
    toast.success("Deliverable archived");
    await refresh();
  };

  return (
    <Sheet
      open={deliverableId !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <SheetContent className="sm:max-w-md overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail ? (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between gap-2">
                <SheetTitle className="truncate">{detail.title}</SheetTitle>
                {detail.status !== "archived" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setArchiveOpen(true)}
                    title="Archive deliverable"
                  >
                    <Archive className="size-4" />
                  </Button>
                )}
              </div>
              <SheetDescription className="capitalize">
                {detail.type?.replaceAll("_", " ")}
              </SheetDescription>
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

              {/* Attached Creative Assets Section (Phase 4F DAM) */}
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <LinkIcon className="size-3.5 text-brand-primary" />
                  Attached Creative Assets ({attachedFiles.length})
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={openLinkModal}
                >
                  <Plus className="mr-1 size-3" />
                  Attach Asset
                </Button>
              </div>

              {attachedFiles.length === 0 ? (
                <p className="text-muted-foreground text-xs py-2">
                  No files have been attached to this deliverable yet.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {attachedFiles.map((file) => {
                    const Icon = getFileTypeIcon(file.fileType);
                    return (
                      <div
                        key={file.mappingId || file.fileId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 p-2.5 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded bg-surface-3 text-brand-primary">
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-xs text-foreground">
                              {file.title}
                            </p>
                            <p className="text-muted-foreground text-[10px] font-mono">
                              {formatBytes(file.totalSizeBytes)} · v{file.versionNumber}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDownloadFile(file.fileId, file.title)}
                            disabled={downloadingFileId === file.fileId}
                            title="Download asset"
                          >
                            {downloadingFileId === file.fileId ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Download className="size-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleUnlinkFile(file.fileId, file.title)}
                            title="Unlink asset"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Revisions Section */}
              <Separator className="my-3" />
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

              {/* Review Sessions */}
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

              {/* Approvals */}
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

              {/* Share Links */}
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

              {/* Activity Trail */}
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

              <p className="text-muted-foreground pt-4 text-[11px]">
                Deliverable outputs are connected to project execution and underlying creative files.
              </p>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground p-4 text-sm">
            Deliverable not found.
          </div>
        )}
      </SheetContent>

      {/* Attach Project Asset Dialog */}
      <ConfirmDialog
        open={linkModalOpen}
        onOpenChange={(open) => !open && setLinkModalOpen(false)}
        title="Attach Creative Asset"
        description="Select an asset from this project to attach to the deliverable."
        confirmLabel="Attach Asset"
        pendingLabel="Attaching…"
        onConfirm={handleConfirmLink}
      >
        <div className="space-y-4">
          {loadingProjectFiles ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : availableProjectFiles.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No unattached assets found in this project. Upload assets to this project first.
            </p>
          ) : (
            <div className="space-y-2">
              <label htmlFor="select-asset" className="text-sm font-medium">
                Choose Asset
              </label>
              <select
                id="select-asset"
                value={selectedFileToLink}
                onChange={(e) => setSelectedFileToLink(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {availableProjectFiles.map((file) => (
                  <option key={file.fileId} value={file.fileId}>
                    {file.title} ({file.fileType})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </ConfirmDialog>

      {/* Archive Deliverable Confirmation */}
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={(open) => !open && setArchiveOpen(false)}
        title="Archive Deliverable"
        description={`Are you sure you want to archive "${detail?.title}"? It will be marked as archived without permanently deleting associated files.`}
        confirmLabel="Archive"
        pendingLabel="Archiving…"
        variant="destructive"
        onConfirm={handleArchiveDeliverable}
      />
    </Sheet>
  );
}
