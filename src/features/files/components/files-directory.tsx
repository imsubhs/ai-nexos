"use client";

/**
 * Creative Assets & Files workspace — global flat view over getFiles()/searchFiles().
 * Phase 4F DAM: Grid/List views, Project/Type/Status filtering, asset inspector,
 * secure downloads, and direct asset upload.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Archive,
  Box,
  ChevronDown,
  Code2,
  Download,
  Eye,
  File,
  Files as FilesIcon,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Music,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getFileDownloadUrl, getProjectFolders } from "../actions";
import { performFileUpload } from "../upload";
import {
  FilePreviewSheet,
  type FileRow,
  type FolderOption,
} from "./file-preview-sheet";

const SEARCH_DEBOUNCE_MS = 300;

const FILE_TYPES = [
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Documents" },
  { value: "3d_model", label: "3D Models" },
  { value: "code", label: "Code" },
  { value: "archive", label: "Archives" },
  { value: "other", label: "Other" },
];

const FILE_STATUSES = [
  { value: "ready", label: "Ready" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

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
    case "document":
      return FileText;
    case "archive":
      return Archive;
    case "3d_model":
      return Box;
    case "code":
      return Code2;
    default:
      return File;
  }
}

function fileTypeFor(mimeType: string, filename: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    /^(application\/(zip|x-tar|gzip|x-7z-compressed)|application\/x-rar)/.test(
      mimeType,
    )
  )
    return "archive";
  if (/^(font\/|application\/(x-font|vnd\.ms-fontobject))/.test(mimeType))
    return "font";
  if (/\.(ts|tsx|js|jsx|py|rb|go|rs|java|c|cpp|sh)$/i.test(filename))
    return "code";
  if (/\.(glb|gltf|fbx|obj|blend)$/i.test(filename)) return "3d_model";
  if (
    mimeType.startsWith("text/") ||
    /^application\/(pdf|msword|vnd\.|json|xml)/.test(mimeType)
  )
    return "document";
  return "other";
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function FilesDirectory({
  rows,
  total,
  page,
  pageSize,
  projects,
  organizationId,
}: Readonly<{
  rows: FileRow[];
  total: number;
  page: number;
  pageSize: number;
  projects: { projectId: string; projectName: string }[];
  organizationId?: string;
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<FileRow | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (searchParams.get("view") as "grid" | "list") || "grid",
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProject, setUploadProject] = useState(
    searchParams.get("projectId") || projects[0]?.projectId || "",
  );
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [folderSet, setFolderSet] = useState<{
    projectId: string;
    folders: FolderOption[];
  } | null>(null);
  const selectedProjectId = selected?.projectId ?? null;

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    (async () => {
      try {
        const folderRows = await getProjectFolders(selectedProjectId);
        if (!cancelled) {
          setFolderSet({
            projectId: selectedProjectId,
            folders: folderRows.map((row) => ({
              folderId: row.folderId,
              name: row.name,
            })),
          });
        }
      } catch {
        if (!cancelled) setFolderSet({ projectId: selectedProjectId, folders: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const folders =
    folderSet?.projectId === selectedProjectId ? folderSet.folders : [];

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.replace(`/files?${params.toString()}`, { scroll: false });
    });
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParams({ search: value, page: null });
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleDownload = async (file: FileRow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setDownloadingId(file.fileId);
      const res = await getFileDownloadUrl(file.fileId);
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
        toast.success(`Download started for ${file.title}`);
      } else {
        toast.error("Download URL could not be generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const activeProjectId = searchParams.get("projectId");
  const activeType = searchParams.get("type");
  const activeStatus = searchParams.get("status");

  const activeProjectName = projects.find(
    (p) => p.projectId === activeProjectId,
  )?.projectName;

  const columns: DataTableColumn<FileRow>[] = [
    {
      key: "title",
      header: "Asset Title",
      cell: (row) => {
        const Icon = getFileTypeIcon(row.fileType);
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-surface-3 text-brand-primary shrink-0">
              <Icon className="size-4" />
            </div>
            <span className="font-medium text-foreground">{row.title}</span>
          </div>
        );
      },
    },
    {
      key: "project",
      header: "Project",
      cell: (row) => {
        const proj = projects.find((p) => p.projectId === row.projectId);
        return (
          <span className="text-muted-foreground text-sm">
            {proj?.projectName || "Unassigned"}
          </span>
        );
      },
    },
    {
      key: "fileType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="text-xs uppercase">
          {row.fileType}
        </Badge>
      ),
    },
    {
      key: "size",
      header: "Size",
      cell: (row) => (
        <span className="text-sm font-mono text-muted-foreground">
          {formatBytes(row.totalSizeBytes)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Uploaded",
      cell: (row) => (
        <span className="text-muted-foreground text-xs">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => handleDownload(row, e)}
            disabled={downloadingId === row.fileId}
            title="Download file"
          >
            {downloadingId === row.fileId ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(row)}
            title="Inspect asset"
          >
            <Eye className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Filters, View Toggles & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search bar */}
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search assets by title…"
              className="pl-8 h-9"
              aria-label="Search files"
            />
          </div>

          {/* Project Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-9">
                  <span className="truncate max-w-[130px]">
                    {activeProjectName ? activeProjectName : "All Projects"}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => setParams({ projectId: null, page: null })}
              >
                All Projects
              </DropdownMenuItem>
              {projects.map((proj) => (
                <DropdownMenuItem
                  key={proj.projectId}
                  onClick={() =>
                    setParams({ projectId: proj.projectId, page: null })
                  }
                >
                  {proj.projectName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-9">
                  <span>
                    {activeType
                      ? FILE_TYPES.find((t) => t.value === activeType)?.label ||
                        activeType
                      : "All Types"}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => setParams({ type: null, page: null })}
              >
                All Types
              </DropdownMenuItem>
              {FILE_TYPES.map((t) => (
                <DropdownMenuItem
                  key={t.value}
                  onClick={() => setParams({ type: t.value, page: null })}
                >
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-9">
                  <span>
                    {activeStatus
                      ? FILE_STATUSES.find((s) => s.value === activeStatus)
                          ?.label || activeStatus
                      : "All Statuses"}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => setParams({ status: null, page: null })}
              >
                All Statuses
              </DropdownMenuItem>
              {FILE_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onClick={() => setParams({ status: s.value, page: null })}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Filters (if active) */}
          {(activeProjectId || activeType || activeStatus || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground h-9"
              onClick={() =>
                setParams({
                  projectId: null,
                  type: null,
                  status: null,
                  search: null,
                  page: null,
                })
              }
            >
              Reset filters
            </Button>
          )}
        </div>

        {/* Right Action buttons: View Switcher, Folder Browser shortcut & Upload */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-surface-1 p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setViewMode("grid");
                setParams({ view: "grid" });
              }}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setViewMode("list");
                setParams({ view: "list" });
              }}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Folder Browser link */}
          {activeProjectId ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              render={
                <Link
                  href={`/files?projectId=${activeProjectId}&folderId=root`}
                />
              }
            >
              <FolderOpen className="mr-1.5 h-4 w-4" />
              Folders
            </Button>
          ) : projects.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9">
                    <FolderOpen className="mr-1.5 h-4 w-4" />
                    Browse Folders
                    <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                {projects.map((proj) => (
                  <DropdownMenuItem
                    key={proj.projectId}
                    render={
                      <Link
                        href={`/files?projectId=${proj.projectId}&folderId=root`}
                      />
                    }
                  >
                    {proj.projectName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Upload Button */}
          {organizationId && projects.length > 0 && (
            <Button
              size="sm"
              className="h-9"
              onClick={() => {
                setUploadProject(activeProjectId || projects[0]?.projectId || "");
                setUploadOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Upload Asset
            </Button>
          )}
        </div>
      </div>

      {/* Main Content: Grid View or List View */}
      {viewMode === "grid" ? (
        rows.length === 0 ? (
          <div className="rounded-xl border border-border/80 bg-surface-1 p-8">
            <EmptyState
              icon={FilesIcon}
              title="No assets found"
              description={
                search || activeProjectId || activeType || activeStatus
                  ? "No creative assets match the selected filters. Clear your filters to see all assets."
                  : "No creative assets have been uploaded to this organization yet."
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((row) => {
                const Icon = getFileTypeIcon(row.fileType);
                const proj = projects.find((p) => p.projectId === row.projectId);
                return (
                  <div
                    key={row.fileId}
                    onClick={() => setSelected(row)}
                    className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-surface-2 p-4 transition-all hover:border-brand-primary/50 hover:bg-surface-2/80 hover:shadow-md cursor-pointer"
                  >
                    {/* Top Row: Type & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-surface-3 text-brand-primary">
                          <Icon className="size-4" />
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                          {row.fileType}
                        </Badge>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>

                    {/* Middle: Asset Title & Project info */}
                    <div className="space-y-1 my-2">
                      <h4 className="font-medium text-foreground text-sm line-clamp-1 group-hover:text-brand-primary transition-colors">
                        {row.title}
                      </h4>
                      <p className="text-muted-foreground text-xs flex items-center gap-1">
                        <FolderOpen className="size-3 shrink-0" />
                        <span className="truncate">{proj?.projectName || "Unassigned"}</span>
                      </p>
                    </div>

                    {/* Bottom: Size, Date & Action Buttons */}
                    <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{formatBytes(row.totalSizeBytes)}</span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => handleDownload(row, e)}
                          disabled={downloadingId === row.fileId}
                          title="Download asset"
                        >
                          {downloadingId === row.fileId ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelected(row)}
                          title="View asset inspector"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination for Grid View */}
            {total > pageSize && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground text-xs">
                  Page {page} of {Math.ceil(total / pageSize)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setParams({ page: String(page - 1) })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * pageSize >= total}
                    onClick={() => setParams({ page: String(page + 1) })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        <DataTable
          columns={columns}
          ariaLabel="Files"
          rows={rows}
          rowKey={(row) => row.fileId}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(nextPage) => setParams({ page: String(nextPage) })}
          onRowClick={(row) => setSelected(row)}
          emptyState={
            <EmptyState
              icon={FilesIcon}
              title="No assets found"
              description={
                search || activeProjectId || activeType || activeStatus
                  ? "No creative assets match the selected filters. Clear your filters to see all assets."
                  : "No creative assets have been uploaded to this organization yet."
              }
            />
          }
        />
      )}

      {/* Asset Inspector Drawer */}
      <FilePreviewSheet
        file={selected}
        folders={folders}
        onClose={() => setSelected(null)}
        onChanged={() => router.refresh()}
      />

      {/* Direct Asset Upload Modal */}
      {organizationId && (
        <ConfirmDialog
          open={uploadOpen}
          onOpenChange={(open) => {
            if (!open) {
              setUploadOpen(false);
              setUploadFile(null);
              setUploadTitle("");
            }
          }}
          title="Upload Creative Asset"
          description="Directly uploads an asset to the chosen project in secure storage."
          confirmLabel="Upload Asset"
          pendingLabel="Uploading & computing checksum…"
          onConfirm={async () => {
            if (!uploadFile) throw new Error("Please select a file to upload.");
            if (!uploadProject) throw new Error("Please select a destination project.");

            const mimeType = uploadFile.type || "application/octet-stream";
            const extension = uploadFile.name.includes(".")
              ? uploadFile.name.split(".").pop()!
              : "bin";
            const hash = await sha256Hex(uploadFile);

            await performFileUpload({
              organizationId,
              projectId: uploadProject,
              folderId: null,
              title: uploadTitle.trim() || uploadFile.name,
              fileType: fileTypeFor(mimeType, uploadFile.name),
              originalFilename: uploadFile.name,
              mimeType,
              sizeBytes: uploadFile.size,
              extension,
              clientHash: hash,
              file: uploadFile,
            });

            setUploadFile(null);
            setUploadTitle("");
            if (uploadInputRef.current) uploadInputRef.current.value = "";
            setUploadOpen(false);
            router.refresh();
            toast.success("Asset uploaded successfully");
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-proj">Destination Project *</Label>
              <select
                id="upload-proj"
                value={uploadProject}
                onChange={(e) => setUploadProject(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-asset-file">File *</Label>
              <Input
                id="upload-asset-file"
                ref={uploadInputRef}
                type="file"
                onChange={(event) =>
                  setUploadFile(event.target.files?.[0] ?? null)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-asset-title">Asset Title</Label>
              <Input
                id="upload-asset-title"
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                placeholder={uploadFile?.name ?? "Defaults to filename"}
              />
            </div>

            <p className="text-muted-foreground text-xs">
              Uploads directly to tenant-isolated Supabase Storage. Browser computes SHA-256
              hash before transfer to guarantee data integrity.
            </p>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
}
