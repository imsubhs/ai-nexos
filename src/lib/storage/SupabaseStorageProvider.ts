import {
  StorageService,
  PreSignedUploadParams,
  PreSignedUrlResponse,
} from "./StorageService";
import { getStorageBucket } from "@/lib/env";

/**
 * This provider is not wired to Supabase yet (TD-02, readiness checklist 4.2).
 * The object below returns fabricated `mock.supabase.co` URLs.
 *
 * That is acceptable in development and dangerous in production, because it
 * fails *open* in a way that is invisible: an upload appears to succeed, a
 * download hands back a URL, and nothing transfers or is authorised. Worse, a
 * "signed" URL that no backend enforces is an unauthenticated one. The guard
 * below turns that into a loud failure on the first call, matching the stance
 * `InMemoryQueueProvider` already takes for the same reason.
 *
 * Sprint 14 replaces the mock; this guard is what makes shipping without it
 * impossible rather than merely inadvisable.
 */
function assertProviderIsUsable(operation: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Object storage is not configured: SupabaseStorageProvider is still the ` +
        `development mock, so "${operation}" would return a URL that transfers ` +
        `nothing and authorises nothing. Wire the real Supabase Storage client ` +
        `before serving production traffic (TD-02).`,
    );
  }
}

// Mock placeholder for actual Supabase client initialization
const supabaseAdmin = {
  storage: {
    from: (bucket: string) => ({
      createSignedUploadUrl: async (path: string) => {
        // MOCK IMPLEMENTATION
        return {
          data: {
            signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=mock`,
            path,
          },
          error: null as { message: string } | null,
        };
      },
      createSignedUrl: async (path: string, expiresInSeconds: number) => {
        // MOCK IMPLEMENTATION
        return {
          data: {
            signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=mock_download&expires=${expiresInSeconds}`,
          },
          error: null as { message: string } | null,
        };
      },
      remove: async (paths: string[]) => {
        return { data: paths, error: null };
      },
    }),
  },
};

export class SupabaseStorageProvider implements StorageService {
  private bucketName: string;

  constructor(bucketName: string = getStorageBucket()) {
    this.bucketName = bucketName;
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
    assertProviderIsUsable("createPreSignedUploadUrl");

    const path = this.getStoragePath(
      params.organizationId,
      params.projectId,
      params.fileId,
      params.versionId,
      params.extension,
    );

    const { data, error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error(
        `Failed to generate upload URL: ${error?.message || "Unknown error"}`,
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Mock 1 hour expiration

    return {
      uploadUrl: data.signedUrl,
      path,
      expiresAt,
    };
  }

  async createPreSignedDownloadUrl(
    path: string,
    expiresInSeconds: number,
  ): Promise<string> {
    assertProviderIsUsable("createPreSignedDownloadUrl");

    const { data, error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      throw new Error(
        `Failed to generate download URL: ${error?.message || "Unknown error"}`,
      );
    }

    return data.signedUrl;
  }

  async deleteFile(path: string): Promise<boolean> {
    assertProviderIsUsable("deleteFile");

    const { error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      console.error(`Failed to delete blob at ${path}`, error);
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const storageService = new SupabaseStorageProvider();
