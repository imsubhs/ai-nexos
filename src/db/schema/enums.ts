import { pgEnum } from "drizzle-orm/pg-core";

/** Generic lifecycle status for master-data entities (DBD §62 data lifecycle). */
export const entityStatusEnum = pgEnum("entity_status", [
  "active",
  "inactive",
  "archived",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "intern",
  "freelance",
]);

/** Background job lifecycle — foundation of the File Processing Pipeline (TRD §57–59). */
export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "file_validation",
  "file_virus_scan",
  "file_metadata_extraction",
  "file_thumbnail_generation",
  "file_compression",
  "notification_delivery",
  "report_generation",
  "analytics_calculation",
  "cleanup",
]);
