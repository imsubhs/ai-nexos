"use client";

/**
 * The DAM write surface, exactly as wide as the domain allows.
 *
 * Wired (the write actions the files public gateway exposes):
 *   • createFolder          — new folder at the current level
 *   • initializeFileUpload  → finalizeFileUpload — registers a file and its v1
 *   • generateShareLink     — tokenised link to a file version
 *
 * Not wired, because no such action exists (see docs/SPRINT-12A.md):
 *   • rename / move / delete — the files domain has no such call
 *   • in-place preview and download — blocked by TD-02: storage returns mock
 *     signed URLs, so there is no byte stream to render or download
 *
 * One honest limitation, stated in the upload dialog rather than hidden: the
 * two-step upload registers metadata and the real SHA-256 of the chosen file,
 * but the binary itself is not transferred, because `initializeFileUpload`
 * returns a mock storage URL (TD-02). The file record, its version, and the
 * dedup hash are all real; the bytes are not.
 */
import { useRef, useState } from "react";
import { FolderPlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createFolder, finalizeFileUpload, initializeFileUpload } from "../actions";

/** MIME → the fileType enum in src/features/files/schemas.ts. */
function fileTypeFor(mimeType: string, filename: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (/^(application\/(zip|x-tar|gzip|x-7z-compressed)|application\/x-rar)/.test(mimeType))
    return "archive";
  if (/^(font\/|application\/(x-font|vnd\.ms-fontobject))/.test(mimeType)) return "font";
  if (/\.(ts|tsx|js|jsx|py|rb|go|rs|java|c|cpp|sh)$/i.test(filename)) return "code";
  if (/\.(glb|gltf|fbx|obj|blend)$/i.test(filename)) return "3d_model";
  if (
    mimeType.startsWith("text/") ||
    /^application\/(pdf|msword|vnd\.|json|xml)/.test(mimeType)
  )
    return "document";
  return "other";
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function FileWriteActions({
  organizationId,
  projectId,
  folderId,
  onChanged,
}: Readonly<{
  organizationId: string;
  projectId: string;
  /** Current folder — null at the project root. New items land here. */
  folderId: string | null;
  onChanged: () => Promise<void>;
}>) {
  const [dialog, setDialog] = useState<"folder" | "upload" | null>(null);
  const [folderName, setFolderName] = useState("");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setDialog("folder")}>
        <FolderPlus className="mr-2 h-4 w-4" />
        New folder
      </Button>
      <Button size="sm" onClick={() => setDialog("upload")}>
        <Upload className="mr-2 h-4 w-4" />
        Upload file
      </Button>

      <ConfirmDialog
        open={dialog === "folder"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="New folder"
        description={
          folderId
            ? "Created inside the folder you are viewing."
            : "Created at the project root."
        }
        confirmLabel="Create folder"
        pendingLabel="Creating…"
        onConfirm={async () => {
          const name = folderName.trim();
          if (!name) throw new Error("A folder name is required.");
          await createFolder({ organizationId, projectId, parentId: folderId, name });
          setFolderName("");
          await onChanged();
          toast.success(`Folder “${name}” created`);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="folder-name">Folder name *</Label>
          <Input
            id="folder-name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Campaign Assets"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "upload"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setSelected(null);
            setTitle("");
          }
        }}
        title="Upload file"
        description="Registers the file, its first version, and its SHA-256 checksum in this folder."
        confirmLabel="Upload"
        pendingLabel="Uploading…"
        onConfirm={async () => {
          if (!selected) throw new Error("Choose a file to upload.");
          const mimeType = selected.type || "application/octet-stream";
          const extension = selected.name.includes(".")
            ? selected.name.split(".").pop()!
            : "bin";
          const hash = await sha256Hex(selected);

          const init = await initializeFileUpload({
            organizationId,
            projectId,
            folderId,
            title: title.trim() || selected.name,
            fileType: fileTypeFor(mimeType, selected.name) as never,
            originalFilename: selected.name,
            mimeType,
            sizeBytes: selected.size,
            extension,
            clientHash: hash,
          });

          await finalizeFileUpload({
            fileId: (init as any).fileId,
            versionId: (init as any).versionId,
            sha256Hash: hash,
          });

          setSelected(null);
          setTitle("");
          if (inputRef.current) inputRef.current.value = "";
          await onChanged();
          toast.success("File uploaded");
        }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-file">File *</Label>
            <Input
              id="upload-file"
              ref={inputRef}
              type="file"
              onChange={(event) => setSelected(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-title">Title</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={selected?.name ?? "Defaults to the filename"}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            The file record, version and checksum are created for real. The binary
            itself is not transferred — object storage still returns mock signed
            URLs (TD-02), so there is nowhere to put the bytes yet.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
