export interface FileUploadSettings {
  maxSizeBytes: number;
  allowedMimeTypes?: string[];
}

export interface PreSignedUploadParams {
  organizationId: string;
  projectId: string;
  fileId: string;
  versionId: string;
  extension: string;
  settings?: FileUploadSettings;
}

export interface PreSignedUrlResponse {
  uploadUrl: string;
  path: string; // The canonical path used in the database
  expiresAt: Date;
}

/**
 * Interface defining the standard contract for any cloud storage provider
 * ensuring we are not tightly coupled to Supabase, AWS, or GCP.
 */
export interface StorageService {
  /**
   * Generates a pre-signed URL for client-side direct upload
   */
  createPreSignedUploadUrl(params: PreSignedUploadParams): Promise<PreSignedUrlResponse>;

  /**
   * Generates a short-lived download URL for an authenticated user
   */
  createPreSignedDownloadUrl(path: string, expiresInSeconds: number): Promise<string>;

  /**
   * Physically deletes a file blob from the storage bucket
   */
  deleteFile(path: string): Promise<boolean>;

  /**
   * Generates the canonical storage path format
   */
  getStoragePath(organizationId: string, projectId: string, fileId: string, versionId: string, extension: string): string;
}
