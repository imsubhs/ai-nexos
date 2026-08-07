import type { SupabaseClient } from "@supabase/supabase-js";
import {
  StorageService,
  PreSignedUploadParams,
  PreSignedUrlResponse,
} from "./StorageService";
import { getStorageBucket } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

/** How long a client has to complete an upload it was handed a URL for. */
const UPLOAD_URL_TTL_SECONDS = 60 * 60;

/**
 * Supabase Storage backing for {@link StorageService} (closes TD-02).
 *
 * Signing requires the service-role key: an upload URL authorises a write, so
 * it can only be minted server-side. Callers are responsible for authorising
 * the request *before* asking for a URL — this class does not know who the
 * caller is and deliberately makes no access decision of its own.
 */
export class SupabaseStorageProvider implements StorageService {
  private bucketName: string;
  private client: SupabaseClient | undefined;

  constructor(bucketName: string = getStorageBucket()) {
    this.bucketName = bucketName;
  }

  /**
   * Built on first use rather than in the constructor, so that importing this
   * module (or the `storageService` singleton below) never reaches for
   * credentials at module-load time.
   */
  private bucket() {
    this.client ??= createServiceClient();
    return this.client.storage.from(this.bucketName);
  }

  getStoragePath(
    organizationId: string,
    projectId: string,
    fileId: string,
    versionId: string,
    extension: string,
  ): string {
    return `${organizationId}/${projectId}/${fileId}/${versionId}.${extension}`;
  }

  async createPreSignedUploadUrl(
    params: PreSignedUploadParams,
  ): Promise<PreSignedUrlResponse> {
    const path = this.getStoragePath(
      params.organizationId,
      params.projectId,
      params.fileId,
      params.versionId,
      params.extension,
    );

    const { data, error } = await this.bucket().createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error(
        `Failed to generate upload URL: ${error?.message || "Unknown error"}`,
      );
    }

    return {
      uploadUrl: data.signedUrl,
      path,
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000),
    };
  }

  async createPreSignedDownloadUrl(
    path: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const { data, error } = await this.bucket().createSignedUrl(
      path,
      expiresInSeconds,
    );

    if (error || !data) {
      throw new Error(
        `Failed to generate download URL: ${error?.message || "Unknown error"}`,
      );
    }

    return data.signedUrl;
  }

  async deleteFile(path: string): Promise<boolean> {
    const { error } = await this.bucket().remove([path]);

    if (error) {
      console.error(`Failed to delete blob at ${path}`, error);
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageProvider();
