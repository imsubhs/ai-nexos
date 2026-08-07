import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { getStorageBucket } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { SupabaseStorageProvider } from "@/lib/storage/SupabaseStorageProvider";

/**
 * Exercises the real Supabase Storage backing (TD-02) against the live
 * project: sign → upload → sign → download → delete, plus the access
 * guarantees the signed-URL flow is supposed to provide.
 */
describe("Supabase Storage (live)", () => {
  const provider = new SupabaseStorageProvider();
  const bucket = getStorageBucket();
  const admin = createServiceClient();

  const organizationId = randomUUID();
  const projectId = randomUUID();
  const fileId = randomUUID();
  const versionId = randomUUID();
  const payload = `integration-${randomUUID()}`;

  let uploadedPath: string | undefined;

  afterAll(async () => {
    if (uploadedPath) {
      await admin.storage.from(bucket).remove([uploadedPath]);
    }
  });

  beforeAll(async () => {
    const { data, error } = await admin.storage.listBuckets();
    expect(
      error,
      "could not list buckets — check SUPABASE_SERVICE_ROLE_KEY",
    ).toBeNull();
    expect(
      data?.map((b) => b.name),
      `bucket "${bucket}" is missing — run: npm run storage:setup`,
    ).toContain(bucket);
  });

  it("keeps the bucket private", async () => {
    const { data } = await admin.storage.listBuckets();
    const configured = data?.find((b) => b.name === bucket);
    // A public bucket would make every object readable by path alone,
    // defeating the signed-URL authorisation flow entirely.
    expect(configured?.public).toBe(false);
  });

  it("builds a tenant-scoped storage path", () => {
    const path = provider.getStoragePath(
      organizationId,
      projectId,
      fileId,
      versionId,
      "pdf",
    );
    // Organisation first: object paths are prefixed by tenant so a storage
    // policy can scope access with a prefix match.
    expect(path).toBe(
      `${organizationId}/${projectId}/${fileId}/${versionId}.pdf`,
    );
  });

  it("mints a signed upload URL that accepts a real upload", async () => {
    const result = await provider.createPreSignedUploadUrl({
      organizationId,
      projectId,
      fileId,
      versionId,
      extension: "txt",
    });

    expect(result.uploadUrl).toContain(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    expect(result.uploadUrl).not.toContain("mock.supabase.co");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const response = await fetch(result.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "text/plain" },
      body: payload,
    });
    expect(
      response.ok,
      `upload failed: ${response.status} ${await response.clone().text()}`,
    ).toBe(true);

    uploadedPath = result.path;
  });

  it("mints a signed download URL that returns the uploaded bytes", async () => {
    expect(uploadedPath, "upload step did not run").toBeDefined();

    const url = await provider.createPreSignedDownloadUrl(uploadedPath!, 60);
    expect(url).not.toContain("mock.supabase.co");

    const response = await fetch(url);
    expect(response.ok).toBe(true);
    expect(await response.text()).toBe(payload);
  });

  it("refuses an unsigned read of a private object", async () => {
    expect(uploadedPath).toBeDefined();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${uploadedPath}`,
    );
    // No token, no anon key: the object must not be served.
    expect(response.ok).toBe(false);
    expect([400, 401, 403, 404]).toContain(response.status);
  });

  it("deletes the object and stops serving it", async () => {
    expect(uploadedPath).toBeDefined();

    expect(await provider.deleteFile(uploadedPath!)).toBe(true);

    // Storage refuses to sign an object that no longer exists, so the failure
    // surfaces at signing time rather than as a URL that 404s on fetch.
    await expect(
      provider.createPreSignedDownloadUrl(uploadedPath!, 60),
    ).rejects.toThrow(/Object not found/i);

    uploadedPath = undefined;
  });
});
