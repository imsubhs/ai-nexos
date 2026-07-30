"use client";

/**
 * File detail drawer.
 *
 * Sprint 12B completes the file management surface the DAM schema always
 * supported: rename, move between folders, soft delete, the version history
 * behind `promoteFileVersion` (which shipped in Sprint 11 with no read to
 * reach it), the share links issued against the file, and its activity trail.
 *
 * Inline preview and download remain absent, and that is still TD-02, not an
 * oversight: `storageService` hands back mock signed URLs, so there is no byte
 * stream to render or serve. The drawer says so rather than offering a control
 * that cannot finish the job.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  deleteFile,
  generateShareLink,
  getFileActivity,
  getFileShares,
  getFileVersions,
  promoteFileVersion,
  updateFile,
} from "../actions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/shared/status-badge";
import type { files } from "@/db/schema/files";

export type FileRow = typeof files.$inferSelect;

export type FolderOption = { folderId: string; name: string };

type VersionRow = {
  versionId: string;
  versionNumber: number;
  originalFilename: string;
  sizeBytes: number;
  changeReason: string | null;
  createdAt: Date | string;
};

type ShareRow = {
  shareId: string;
  token: string;
  accessLevel: string;
  versionNumber: number | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
};

type ActivityRow = {
  activityId: string;
  action: string;
  createdAt: Date | string;
};

function DetailRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const FILE_SHARE_ACCESS_LEVELS = ["preview", "download", "metadata", "comment"] as const;

const SELECT_CLASS =
  "border-input bg-background flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none";

export function FilePreviewSheet({
  file: fileProp,
  folders = [],
  onClose,
  onChanged,
}: Readonly<{
  file: FileRow | null;
  /** Move targets within the file's project. */
  folders?: FolderOption[];
  onClose: () => void;
  /** Called after a write so the list behind the drawer re-reads. */
  onChanged?: () => void | Promise<void>;
}>) {
  // The row arrives from a list the parent owns, so a rename or a move made
  // here would leave the drawer showing the pre-write values until it was
  // closed and reopened. `updateFile` returns the updated row; `written` holds
  // it, and is derived-out the moment a different file is selected — no
  // prop-to-state sync effect, which the React Compiler rightly rejects.
  const [written, setWritten] = useState<FileRow | null>(null);
  const file =
    written && fileProp && written.fileId === fileProp.fileId ? written : fileProp;

  const [dialog, setDialog] = useState<"share" | "rename" | "move" | "delete" | null>(null);
  const [accessLevel, setAccessLevel] = useState<string>("preview");
  // Keyed by file id for the same reason: a link minted for one file must not
  // appear under the next one, and clearing it in an effect would be a
  // cascading render.
  const [share, setShare] = useState<{ fileId: string; url: string } | null>(null);
  const [title, setTitle] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<string>("");
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [restoring, setRestoring] = useState<VersionRow | null>(null);

  const fileId = file?.fileId ?? null;

  const loadDetail = useCallback(async (id: string) => {
    const [versionRows, shareRows, activityRows] = await Promise.all([
      getFileVersions(id),
      getFileShares(id),
      getFileActivity(id, 15),
    ]);
    setVersions(versionRows as unknown as VersionRow[]);
    setShares(shareRows as unknown as ShareRow[]);
    setActivity(activityRows as unknown as ActivityRow[]);
  }, []);

  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    (async () => {
      try {
        const [versionRows, shareRows, activityRows] = await Promise.all([
          getFileVersions(fileId),
          getFileShares(fileId),
          getFileActivity(fileId, 15),
        ]);
        if (cancelled) return;
        setVersions(versionRows as unknown as VersionRow[]);
        setShares(shareRows as unknown as ShareRow[]);
        setActivity(activityRows as unknown as ActivityRow[]);
      } catch {
        // A failing history read must not take the drawer down with it.
        if (!cancelled) {
          setVersions([]);
          setShares([]);
          setActivity([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  const afterWrite = async () => {
    if (fileId) await loadDetail(fileId);
    await onChanged?.();
  };

  const currentFolderName =
    folders.find((folder) => folder.folderId === file?.folderId)?.name ?? "Project root";

  return (
    <Sheet open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {file ? (
          <>
            <SheetHeader>
              <SheetTitle>{file.title}</SheetTitle>
              <SheetDescription>{file.fileType}</SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-8">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTitle(file.title);
                    setDialog("rename");
                  }}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={folders.length === 0}
                  title={
                    folders.length === 0
                      ? "This project has no folders to move the file into."
                      : undefined
                  }
                  onClick={() => {
                    setTargetFolderId(file.folderId ?? "");
                    setDialog("move");
                  }}
                >
                  Move
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!file.currentVersionId}
                  onClick={() => setDialog("share")}
                >
                  Share
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setDialog("delete")}
                >
                  Delete
                </Button>
              </div>

              <div className="space-y-1">
                <DetailRow label="Status" value={<StatusBadge status={file.status} />} />
                <DetailRow label="Folder" value={currentFolderName} />
                <DetailRow label="Size" value={formatBytes(file.totalSizeBytes)} />
                <DetailRow
                  label="Uploaded"
                  value={new Date(file.createdAt).toLocaleDateString()}
                />
                {file.description ? (
                  <DetailRow label="Description" value={file.description} />
                ) : null}
              </div>

              <Button
                variant="outline"
                className="w-full"
                render={
                  <Link
                    href={`/files?projectId=${file.projectId}&folderId=${file.folderId ?? "root"}`}
                  />
                }
              >
                View in folder
              </Button>

              {!file.currentVersionId && (
                <p className="text-muted-foreground text-xs">
                  This file has no current version, so there is nothing to share.
                </p>
              )}

              {share?.fileId === file.fileId && (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium">Share link</p>
                  <p className="text-muted-foreground mt-1 text-xs break-all">{share.url}</p>
                </div>
              )}

              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Versions ({versions.length})</p>
                {versions.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No versions recorded.</p>
                ) : (
                  <ul className="space-y-2">
                    {versions.map((version) => {
                      const isCurrent = version.versionId === file.currentVersionId;
                      return (
                        <li
                          key={version.versionId}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              v{version.versionNumber}
                              {isCurrent ? (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  Current
                                </Badge>
                              ) : null}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {formatBytes(version.sizeBytes)} ·{" "}
                              {new Date(version.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {!isCurrent && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRestoring(version)}
                            >
                              Restore
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Share links ({shares.length})</p>
                {shares.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No share links issued.</p>
                ) : (
                  <ul className="space-y-2">
                    {shares.map((share) => (
                      <li key={share.shareId} className="rounded-md border px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {share.accessLevel}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            v{share.versionNumber ?? "?"} ·{" "}
                            {new Date(share.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs break-all">
                          /portal/s/{share.token}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Activity ({activity.length})</p>
                {activity.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No activity recorded.</p>
                ) : (
                  <ul className="space-y-1">
                    {activity.map((entry) => (
                      <li
                        key={entry.activityId}
                        className="text-muted-foreground flex items-center justify-between gap-2 text-xs"
                      >
                        <span>{entry.action}</span>
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-muted-foreground text-xs">
                Inline preview and download are unavailable: object storage
                returns mock signed URLs (TD-02).
              </p>
            </div>

            <ConfirmDialog
              open={dialog === "rename"}
              onOpenChange={(open) => !open && setDialog(null)}
              title="Rename this file"
              description="Changes the file's title. The stored blob and its versions are untouched."
              confirmLabel="Rename"
              pendingLabel="Renaming…"
              onConfirm={async () => {
                if (!title.trim()) throw new Error("A title is required.");
                setWritten((await updateFile({ fileId: file.fileId, title: title.trim() })) as FileRow);
                setDialog(null);
                await afterWrite();
                toast.success("File renamed");
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="file-title">Title *</Label>
                <Input
                  id="file-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
            </ConfirmDialog>

            <ConfirmDialog
              open={dialog === "move"}
              onOpenChange={(open) => !open && setDialog(null)}
              title="Move this file"
              description="Files can only move between folders in their own project."
              confirmLabel="Move"
              pendingLabel="Moving…"
              onConfirm={async () => {
                setWritten(
                  (await updateFile({
                    fileId: file.fileId,
                    folderId: targetFolderId || null,
                  })) as FileRow,
                );
                setDialog(null);
                await afterWrite();
                toast.success("File moved");
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="file-folder">Destination</Label>
                <select
                  id="file-folder"
                  value={targetFolderId}
                  onChange={(event) => setTargetFolderId(event.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Project root</option>
                  {folders.map((folder) => (
                    <option key={folder.folderId} value={folder.folderId}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            </ConfirmDialog>

            <ConfirmDialog
              open={dialog === "delete"}
              onOpenChange={(open) => !open && setDialog(null)}
              title="Delete this file?"
              description="The file is marked deleted and disappears from every list. Its versions are retained, so this is reversible at the data layer."
              confirmLabel="Delete"
              pendingLabel="Deleting…"
              variant="destructive"
              onConfirm={async () => {
                await deleteFile(file.fileId);
                setDialog(null);
                await onChanged?.();
                onClose();
                toast.success("File deleted");
              }}
            />

            <ConfirmDialog
              open={restoring !== null}
              onOpenChange={(open) => !open && setRestoring(null)}
              title="Restore this version?"
              description={
                restoring
                  ? `Creates a new version pointing at v${restoring.versionNumber}'s content and makes it current.`
                  : ""
              }
              confirmLabel="Restore"
              pendingLabel="Restoring…"
              onConfirm={async () => {
                const result = await promoteFileVersion(file.fileId, restoring!.versionId);
                setWritten({ ...file, currentVersionId: result.newVersionId });
                setRestoring(null);
                await afterWrite();
                toast.success("Version restored");
              }}
            />

            <ConfirmDialog
              open={dialog === "share"}
              onOpenChange={(open) => !open && setDialog(null)}
              title="Share this file"
              description="Issues a tokenised link to the file's current version."
              confirmLabel="Create link"
              pendingLabel="Creating…"
              onConfirm={async () => {
                const link = await generateShareLink({
                  fileId: file.fileId,
                  versionId: file.currentVersionId!,
                  accessLevel: accessLevel as never,
                });
                const token = (link as { token?: string })?.token;
                setShare(
                  token
                    ? { fileId: file.fileId, url: `${window.location.origin}/portal/s/${token}` }
                    : null,
                );
                setDialog(null);
                await afterWrite();
                toast.success("Share link created");
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="file-share-access">Access level</Label>
                <select
                  id="file-share-access"
                  value={accessLevel}
                  onChange={(event) => setAccessLevel(event.target.value)}
                  className={SELECT_CLASS}
                >
                  {FILE_SHARE_ACCESS_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </ConfirmDialog>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
