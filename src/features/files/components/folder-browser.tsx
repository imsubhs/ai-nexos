"use client";

/**
 * Per-project folder hierarchy view over getFolder(). Reached from the flat
 * Files directory via "View in folder." Breadcrumb trail is built client-side
 * as the user navigates deeper (one getFolder() call per level); reloading a
 * deep folderId link still works, it just starts the visible trail at that
 * folder instead of the full ancestor chain, since getFolder() only returns
 * one level at a time and there is no path/ancestor query in the read layer.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Folder,
  Files as FilesIcon,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  deleteFolder,
  getFolder,
  getProjectFolders,
  updateFolder,
} from "../actions";
import {
  FilePreviewSheet,
  type FileRow,
  type FolderOption,
} from "./file-preview-sheet";
import { FileWriteActions } from "./file-write-actions";

type FolderResult = Awaited<ReturnType<typeof getFolder>>;
type FolderRow = { folderId: string; name: string; color?: string | null };

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function FolderBrowser({
  projectId,
  organizationId,
  initial,
}: Readonly<{
  projectId: string;
  /** Required by createFolder / initializeFileUpload. */
  organizationId: string;
  initial: FolderResult;
}>) {
  const router = useRouter();
  const [trail, setTrail] = useState<
    { folderId: string | null; name: string }[]
  >(
    initial.folder
      ? [{ folderId: initial.folder.folderId, name: initial.folder.name }]
      : [],
  );
  const [current, setCurrent] = useState<FolderResult>(initial);
  const [selectedFile, setSelectedFile] = useState<FileRow | null>(null);
  const [loading, setLoading] = useState(false);
  // Move destinations for both files and folders (Sprint 12B). getFolder only
  // returns one level, so the flat project read supplies the picker.
  const [allFolders, setAllFolders] = useState<FolderOption[]>([]);
  const [renaming, setRenaming] = useState<FolderRow | null>(null);
  const [movingFolder, setMovingFolder] = useState<FolderRow | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderRow | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderParentId, setFolderParentId] = useState("");

  const loadFolders = useCallback(async () => {
    try {
      const rows = await getProjectFolders(projectId);
      setAllFolders(
        rows.map((row) => ({ folderId: row.folderId, name: row.name })),
      );
    } catch {
      setAllFolders([]);
    }
  }, [projectId]);

  useEffect(() => {
    // Wrapped in a void call so the effect body itself never writes state
    // synchronously — the fetch resolves first (react-hooks/set-state-in-effect).
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadFolders();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFolders]);

  const navigateTo = async (
    folderId: string | null,
    newTrail: typeof trail,
  ) => {
    setLoading(true);
    try {
      const result = await getFolder(folderId, projectId);
      setCurrent(result);
      setTrail(newTrail);
      router.replace(
        `/files?projectId=${projectId}&folderId=${folderId ?? "root"}`,
        { scroll: false },
      );
    } finally {
      setLoading(false);
    }
  };

  const currentFolderId =
    trail.length > 0 ? trail[trail.length - 1].folderId : null;

  /** Re-read the folder in place after any write inside it. */
  const refresh = async () => {
    const result = await getFolder(currentFolderId, projectId);
    setCurrent(result);
    await loadFolders();
  };

  const goToRoot = () => navigateTo(null, []);
  const goToIndex = (index: number) =>
    navigateTo(trail[index].folderId, trail.slice(0, index + 1));
  const openFolder = (folderId: string, name: string) =>
    navigateTo(folderId, [...trail, { folderId, name }]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={goToRoot} className="cursor-pointer">
                Project root
              </BreadcrumbLink>
            </BreadcrumbItem>
            {trail.map((crumb, index) => (
              <span key={crumb.folderId ?? "root"} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {index === trail.length - 1 ? (
                    <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      onClick={() => goToIndex(index)}
                      className="cursor-pointer"
                    >
                      {crumb.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-center gap-2">
          <FileWriteActions
            organizationId={organizationId}
            projectId={projectId}
            folderId={currentFolderId}
            onChanged={refresh}
          />
          <Button variant="outline" size="sm" render={<a href="/files" />}>
            <ArrowLeft className="h-4 w-4" />
            All files
          </Button>
        </div>
      </div>

      <div className={loading ? "pointer-events-none opacity-50" : undefined}>
        {current.childFolders.length === 0 &&
        current.childFiles.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="This folder is empty"
            description="No subfolders or files here yet."
          />
        ) : (
          <div className="space-y-4">
            {current.childFolders.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {current.childFolders.map((folder: any) => (
                  <div
                    key={folder.folderId}
                    className="hover:border-primary/40 hover:bg-muted/40 bg-card flex items-center gap-2 rounded-xl border p-4 transition-colors"
                  >
                    <button
                      onClick={() => openFolder(folder.folderId, folder.name)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Folder
                        className="text-muted-foreground h-5 w-5 shrink-0"
                        style={{ color: folder.color }}
                      />
                      <span className="truncate font-medium">
                        {folder.name}
                      </span>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for folder ${folder.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setFolderName(folder.name);
                            setRenaming(folder);
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setFolderParentId(folder.parentId ?? "");
                            setMovingFolder(folder);
                          }}
                        >
                          Move
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingFolder(folder)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : null}

            {current.childFiles.length > 0 ? (
              <div className="bg-card divide-y rounded-xl border">
                {current.childFiles.map((file: any) => (
                  <button
                    key={file.fileId}
                    onClick={() => setSelectedFile(file)}
                    className="hover:bg-muted/40 flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FilesIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="truncate font-medium">{file.title}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-muted-foreground text-sm">
                        {formatBytes(file.totalSizeBytes)}
                      </span>
                      <StatusBadge status={file.status} />
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <FilePreviewSheet
        file={selectedFile}
        folders={allFolders}
        onClose={() => setSelectedFile(null)}
        onChanged={refresh}
      />

      <ConfirmDialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title="Rename this folder"
        description="Folder names must be unique within their parent."
        confirmLabel="Rename"
        pendingLabel="Renaming…"
        onConfirm={async () => {
          if (!folderName.trim()) throw new Error("A name is required.");
          await updateFolder({
            folderId: renaming!.folderId,
            name: folderName.trim(),
          });
          setRenaming(null);
          await refresh();
          toast.success("Folder renamed");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="folder-name">Name *</Label>
          <Input
            id="folder-name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={movingFolder !== null}
        onOpenChange={(open) => !open && setMovingFolder(null)}
        title="Move this folder"
        description="A folder cannot be moved into itself or into one of its own subfolders."
        confirmLabel="Move"
        pendingLabel="Moving…"
        onConfirm={async () => {
          await updateFolder({
            folderId: movingFolder!.folderId,
            parentId: folderParentId || null,
          });
          setMovingFolder(null);
          await refresh();
          toast.success("Folder moved");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="folder-parent">Destination</Label>
          <select
            id="folder-parent"
            value={folderParentId}
            onChange={(event) => setFolderParentId(event.target.value)}
            className="border-input bg-background flex h-8 w-full rounded-lg border px-2.5 py-1 text-sm outline-none"
          >
            <option value="">Project root</option>
            {allFolders
              .filter((option) => option.folderId !== movingFolder?.folderId)
              .map((option) => (
                <option key={option.folderId} value={option.folderId}>
                  {option.name}
                </option>
              ))}
          </select>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={deletingFolder !== null}
        onOpenChange={(open) => !open && setDeletingFolder(null)}
        title="Delete this folder?"
        description={
          deletingFolder
            ? `"${deletingFolder.name}" must be empty — files and subfolders are never deleted with it.`
            : ""
        }
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        variant="destructive"
        onConfirm={async () => {
          await deleteFolder(deletingFolder!.folderId);
          setDeletingFolder(null);
          await refresh();
          toast.success("Folder deleted");
        }}
      />
    </div>
  );
}
