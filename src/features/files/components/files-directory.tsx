"use client";

/**
 * Files workspace — global flat view over getFiles()/searchFiles(). The
 * per-project folder hierarchy (getFolder) is a separate mode reached via
 * "View in folder" — see FolderBrowser.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Files as FilesIcon, FolderOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { getProjectFolders } from "../actions";
import {
  FilePreviewSheet,
  type FileRow,
  type FolderOption,
} from "./file-preview-sheet";

const SEARCH_DEBOUNCE_MS = 300;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function FilesDirectory({
  rows,
  total,
  page,
  pageSize,
  projects,
}: Readonly<{
  rows: FileRow[];
  total: number;
  page: number;
  pageSize: number;
  /**
   * Sprint 12A: upload and folder creation are project- and folder-scoped, so
   * they live in the folder browser. Previously the only route there was a
   * file's "View in folder" — which an organisation with no files could never
   * take. These links make the folder browser reachable regardless.
   */
  projects: { projectId: string; projectName: string }[];
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<FileRow | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Move targets for the drawer. This list spans projects, so the folder set is
  // fetched per selected file rather than up front — and it is stamped with the
  // project it came from, so a stale set can never be offered as a destination
  // for a file in a different project.
  const [folderSet, setFolderSet] = useState<{
    projectId: string;
    folders: FolderOption[];
  } | null>(null);
  const projectId = selected?.projectId ?? null;

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getProjectFolders(projectId);
        if (!cancelled) {
          setFolderSet({
            projectId,
            folders: rows.map((row) => ({
              folderId: row.folderId,
              name: row.name,
            })),
          });
        }
      } catch {
        if (!cancelled) setFolderSet({ projectId, folders: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const folders = folderSet?.projectId === projectId ? folderSet.folders : [];

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

  const columns: DataTableColumn<FileRow>[] = [
    {
      key: "title",
      header: "Title",
      cell: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "fileType",
      header: "Type",
      cell: (row) => (
        <span className="text-muted-foreground text-sm">{row.fileType}</span>
      ),
    },
    {
      key: "size",
      header: "Size",
      cell: (row) => formatBytes(row.totalSizeBytes),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Uploaded",
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search files by title…"
            className="pl-8"
            aria-label="Search files"
          />
        </div>

        {projects.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">
              Browse &amp; upload:
            </span>
            {projects.map((project) => (
              <Button
                key={project.projectId}
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/files?projectId=${project.projectId}&folderId=root`}
                  />
                }
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {project.projectName}
              </Button>
            ))}
          </div>
        )}
      </div>

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
            title="No files found"
            // "Clear the search" is only actionable when a search is
            // actually active; otherwise it described a control the user
            // had not used.
            description={
              search
                ? "No files match the current search. Clear the search to see everything."
                : "No files have been uploaded to this organization yet."
            }
          />
        }
      />

      <FilePreviewSheet
        file={selected}
        folders={folders}
        onClose={() => setSelected(null)}
        // rows come from a server component, so a rename/move/delete has to
        // re-run the page's fetch rather than just re-render this table.
        onChanged={() => router.refresh()}
      />
    </div>
  );
}
