/**
 * Client-side upload orchestration: initialize → transfer bytes → finalize.
 *
 * The middle step did not exist. `initializeFileUpload` minted a real Supabase
 * signed upload URL and returned it; the upload dialog discarded it, called
 * `finalizeFileUpload`, and reported success. The file record, its version and
 * a genuine browser-computed SHA-256 were all created, and the object they
 * described was never written. Every later read — preview, download, share —
 * resolved a storage path with nothing behind it.
 *
 * Bytes go **browser → Supabase Storage**, never through this application's
 * server. The signed URL is the whole point: routing the body through a Next
 * route handler would add a request-size ceiling, double the transfer and put
 * file content in the application's memory for no gain in control, since the
 * authorisation decision has already been made server-side when the URL was
 * minted.
 *
 * Failure ordering matters more than anything else here. `finalizeFileUpload`
 * advances the file's lifecycle to `queued` and writes the content hash, which
 * is what marks the version as complete. It must never run for an object that
 * was not stored, so a failed transfer throws and the caller's success path is
 * simply not reached.
 */

import { finalizeFileUpload, initializeFileUpload } from "./actions";

/** What `initializeFileUpload` hands back, narrowed to what this module uses. */
type InitializedUpload = {
  fileId: string;
  versionId: string;
  deduplicated: boolean;
  uploadUrl: string | null;
};

export type PerformUploadInput = {
  organizationId: string;
  projectId: string;
  folderId: string | null;
  title: string;
  fileType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
  /** SHA-256 of `file`, computed in the browser before this call. */
  clientHash: string;
  /** The bytes themselves. Sent directly to storage, never to this server. */
  file: Blob;
};

export type PerformUploadResult = {
  fileId: string;
  versionId: string;
  /** True when an existing blob was reused and no bytes needed transferring. */
  deduplicated: boolean;
  /** True when this call actually wrote bytes to object storage. */
  transferred: boolean;
};

/**
 * How long the browser caches the stored object, in seconds. Mirrors the
 * Supabase client default so a direct PUT and an SDK upload produce objects
 * with the same metadata.
 */
const CACHE_CONTROL_SECONDS = 3600;

/**
 * PUTs the file to a Supabase signed upload URL.
 *
 * The URL returned by `createSignedUploadUrl()` already carries its `token`
 * query parameter, so this request needs no API key and no session — which is
 * exactly why it can be issued from the browser. `x-upsert: false` keeps a
 * second upload to the same path an error rather than a silent overwrite;
 * paths are `{org}/{project}/{file}/{version}.{ext}` and a collision would mean
 * two versions claiming one object.
 */
export async function transferFileBytes(
  uploadUrl: string,
  file: Blob,
  mimeType: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "content-type": mimeType,
        "cache-control": `max-age=${CACHE_CONTROL_SECONDS}`,
        "x-upsert": "false",
      },
    });
  } catch (cause) {
    // A network failure here is indistinguishable to the user from a rejected
    // upload, and both mean the same thing: the object is not stored.
    throw new Error(
      `Upload failed: the file could not be sent to storage. ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Upload failed: storage rejected the file (HTTP ${response.status}).`,
    );
  }
}

/**
 * Registers a file, transfers its bytes, and only then finalises it.
 *
 * `uploadUrl` is null in two cases, and neither needs a transfer: the content
 * hash matched an existing version in the project, or the demo dispatcher
 * served the request and stores nothing. A non-null URL is a commitment that
 * bytes must be written before finalising.
 */
export async function performFileUpload(
  input: PerformUploadInput,
): Promise<PerformUploadResult> {
  const initialized = (await initializeFileUpload({
    organizationId: input.organizationId,
    projectId: input.projectId,
    folderId: input.folderId,
    title: input.title,
    fileType: input.fileType as never,
    originalFilename: input.originalFilename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    extension: input.extension,
    clientHash: input.clientHash,
  })) as unknown as InitializedUpload;

  let transferred = false;
  if (initialized.uploadUrl) {
    // Throws on failure, so finalizeFileUpload below is unreachable for an
    // object that was not stored.
    await transferFileBytes(initialized.uploadUrl, input.file, input.mimeType);
    transferred = true;
  }

  await finalizeFileUpload({
    fileId: initialized.fileId,
    versionId: initialized.versionId,
    sha256Hash: input.clientHash,
  });

  return {
    fileId: initialized.fileId,
    versionId: initialized.versionId,
    deduplicated: initialized.deduplicated,
    transferred,
  };
}
