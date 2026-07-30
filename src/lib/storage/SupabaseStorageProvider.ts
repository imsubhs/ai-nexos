import {
  StorageService,
  PreSignedUploadParams,
  PreSignedUrlResponse,
} from "./StorageService";

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

  constructor(bucketName: string = "nexos-assets") {
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
