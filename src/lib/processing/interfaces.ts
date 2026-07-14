/**
 * Module 07: File & Asset Management - Asynchronous Processing Interfaces
 * 
 * These interfaces define the contract for background workers in the pipeline.
 * Implementations will be executed by queue consumers or serverless webhooks
 * moving files through their lifecycle:
 * uploading -> queued -> scanning -> metadata_extraction -> thumbnail_generation -> ready.
 */

export interface VirusScanner {
  /**
   * Scans a file buffer or storage path for malware.
   * @param storagePath The canonical path in the storage provider
   * @returns Boolean indicating if the file is safe
   */
  scan(storagePath: string): Promise<{ isSafe: boolean; details?: string }>;
}

export interface MetadataExtractor {
  /**
   * Extracts EXIF, XMP, IPTC, or document properties.
   */
  extract(storagePath: string, mimeType: string): Promise<Record<string, unknown>>;
}

export interface ThumbnailGenerator {
  /**
   * Generates a preview image or video sprite.
   * Returns a base64 encoded string or a new storage path.
   */
  generate(storagePath: string, mimeType: string): Promise<{
    thumbnailUrl: string;
    width: number;
    height: number;
  }>;
}

export interface OCRProcessor {
  /**
   * Extracts text from images or PDFs for search indexing.
   */
  extractText(storagePath: string, mimeType: string): Promise<string>;
}

export interface AITagger {
  /**
   * Generates auto-tags, captions, or embeddings for the file.
   */
  generateMetadata(storagePath: string, mimeType: string): Promise<{
    tags: string[];
    caption?: string;
    aiMetadata?: Record<string, unknown>;
  }>;
}
