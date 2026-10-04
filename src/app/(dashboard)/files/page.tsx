import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { getFiles, getFolder, searchFiles } from "@/features/files/actions";
import { FilesDirectory } from "@/features/files/components/files-directory";
import { getProjects } from "@/features/projects/actions";
import { FolderBrowser } from "@/features/files/components/folder-browser";

export const metadata = {
  title: "Files",
};

const PAGE_SIZE = 25;

/**
 * Global Files workspace (Sprint 11A resumed). Two modes over the Sprint
 * 11B read layer: a flat cross-project list (getFiles/searchFiles) by
 * default, or a per-project folder hierarchy (getFolder) when `projectId`
 * is present in the URL — reached via a file's "View in folder" action.
 */
export default async function FilesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    search?: string;
    page?: string;
    projectId?: string;
    folderId?: string;
    type?: string;
    status?: string;
    browse?: string;
  }>;
}>) {
  const user = await requireCurrentUser();
  if (!hasPermission(user.permissions, "files", "read")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;

  // Folder browser mode is triggered when explicitly browsing folder structure
  // (via folderId or browse=folder). Plain projectId acts as a project filter in the asset directory.
  if (params.projectId && (params.folderId || params.browse === "folder")) {
    const folderId =
      !params.folderId || params.folderId === "root" ? null : params.folderId;
    const folder = await getFolder(folderId, params.projectId);

    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground text-sm">
            Browsing project folders. Upload files and create folders here.
          </p>
        </div>
        <FolderBrowser
          projectId={params.projectId}
          organizationId={user.organizationId}
          initial={folder}
        />
      </div>
    );
  }

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const cursorOffset = (page - 1) * PAGE_SIZE;

  // getFiles/searchFiles return a page of rows, not a total count — see
  // docs/TECHNICAL-DEBT-NOTES.md. Fetching one extra row reveals whether
  // another page exists without fabricating a count.
  const fetched = params.search
    ? await searchFiles(params.search, cursorOffset, PAGE_SIZE + 1)
    : await getFiles(
        {
          projectId: params.projectId || undefined,
          fileType: params.type || undefined,
          status: params.status || undefined,
        },
        cursorOffset,
        PAGE_SIZE + 1,
      );
  // Permission-tolerant project selector (Phase 4B): callers with files.read but without
  // projects.read receive an empty project list rather than an unhandled 500 crash.
  const projectRows = hasPermission(user.permissions, "projects", "read")
    ? await getProjects(undefined, 100, 0).catch(() => [])
    : [];
  const projects = projectRows.map((project) => ({
    projectId: project.projectId,
    projectName: project.projectName,
  }));

  const hasMore = fetched.length > PAGE_SIZE;
  const rows = hasMore ? fetched.slice(0, PAGE_SIZE) : fetched;
  const total = cursorOffset + rows.length + (hasMore ? 1 : 0);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Creative Assets &amp; Files</h1>
        <p className="text-muted-foreground text-sm">
          Every asset across all projects. Filter by project, type, and status.
        </p>
      </div>
      <FilesDirectory
        rows={rows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        projects={projects}
        organizationId={user.organizationId}
      />
    </div>
  );
}
