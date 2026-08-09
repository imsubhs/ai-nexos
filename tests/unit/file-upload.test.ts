// @vitest-environment node

/**
 * Sprint 2.4 — the upload path actually transfers bytes.
 *
 * Before this, `initializeFileUpload` minted a real signed upload URL, the
 * dialog discarded it, `finalizeFileUpload` ran anyway and the UI reported
 * success. The file record and its SHA-256 were real; the object was not.
 *
 * The ordering assertions matter more than the happy path: finalising marks a
 * version complete and advances the file's lifecycle, so it must be
 * unreachable when the transfer failed.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initializeFileUpload = vi.fn();
const finalizeFileUpload = vi.fn();

vi.mock("@/features/files/actions", () => ({
  initializeFileUpload: (...args: unknown[]) => initializeFileUpload(...args),
  finalizeFileUpload: (...args: unknown[]) => finalizeFileUpload(...args),
}));

const { performFileUpload, transferFileBytes } =
  await import("@/features/files/upload");

const HASH = "a".repeat(64);

const INPUT = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
  folderId: null,
  title: "Brief.pdf",
  fileType: "document",
  originalFilename: "Brief.pdf",
  mimeType: "application/pdf",
  sizeBytes: 11,
  extension: "pdf",
  clientHash: HASH,
  file: new Blob(["hello world"], { type: "application/pdf" }),
};

const SIGNED_URL =
  "https://project.supabase.co/storage/v1/object/upload/sign/documents/org/proj/file/version.pdf?token=signed-token";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  initializeFileUpload.mockReset();
  finalizeFileUpload.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  initializeFileUpload.mockResolvedValue({
    fileId: "file-1",
    versionId: "version-1",
    deduplicated: false,
    uploadUrl: SIGNED_URL,
  });
  finalizeFileUpload.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("transferFileBytes", () => {
  it("PUTs the body to the signed URL with its content type", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await transferFileBytes(SIGNED_URL, INPUT.file, "application/pdf");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SIGNED_URL);
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(INPUT.file);
    expect(init.headers["content-type"]).toBe("application/pdf");
    // A path collision must be an error, never a silent overwrite of another
    // version's object.
    expect(init.headers["x-upsert"]).toBe("false");
  });

  it("throws when storage rejects the upload", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    await expect(
      transferFileBytes(SIGNED_URL, INPUT.file, "application/pdf"),
    ).rejects.toThrow(/403/);
  });

  it("throws when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(
      transferFileBytes(SIGNED_URL, INPUT.file, "application/pdf"),
    ).rejects.toThrow(/could not be sent to storage/);
  });
});

describe("performFileUpload", () => {
  it("consumes the returned uploadUrl and sends the bytes", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const result = await performFileUpload(INPUT);

    expect(initializeFileUpload).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(SIGNED_URL);
    expect(fetchMock.mock.calls[0][1].body).toBe(INPUT.file);
    expect(result.transferred).toBe(true);
  });

  it("finalises only after a successful transfer", async () => {
    const order: string[] = [];
    fetchMock.mockImplementation(async () => {
      order.push("transfer");
      return { ok: true, status: 200 };
    });
    finalizeFileUpload.mockImplementation(async () => {
      order.push("finalize");
      return { success: true };
    });

    await performFileUpload(INPUT);

    expect(order).toEqual(["transfer", "finalize"]);
  });

  it("does not finalise when the transfer fails", async () => {
    // The whole point. A finalised version with no object behind it is a
    // record that lies about itself.
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(performFileUpload(INPUT)).rejects.toThrow(/Upload failed/);
    expect(finalizeFileUpload).not.toHaveBeenCalled();
  });

  it("does not finalise when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(performFileUpload(INPUT)).rejects.toThrow(/Upload failed/);
    expect(finalizeFileUpload).not.toHaveBeenCalled();
  });

  it("finalises with the hash computed in the browser", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await performFileUpload(INPUT);

    expect(finalizeFileUpload).toHaveBeenCalledWith({
      fileId: "file-1",
      versionId: "version-1",
      sha256Hash: HASH,
    });
  });

  it("skips the transfer when the content was deduplicated", async () => {
    // The bytes are already in the bucket under an existing version; there is
    // nothing to send and no URL is issued.
    initializeFileUpload.mockResolvedValue({
      fileId: "file-1",
      versionId: "version-1",
      deduplicated: true,
      uploadUrl: null,
    });

    const result = await performFileUpload(INPUT);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(finalizeFileUpload).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ deduplicated: true, transferred: false });
  });

  it("skips the transfer when no upload URL is issued at all", async () => {
    // The demo dispatcher stores nothing and now says so with a null URL,
    // rather than handing back a fabricated host that cannot accept a PUT.
    initializeFileUpload.mockResolvedValue({
      fileId: "file-1",
      versionId: "version-1",
      deduplicated: false,
      uploadUrl: null,
    });

    const result = await performFileUpload(INPUT);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.transferred).toBe(false);
  });
});
