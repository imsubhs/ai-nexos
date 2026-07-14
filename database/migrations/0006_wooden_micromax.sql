CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'approved_with_comments', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."deliverable_status" AS ENUM('draft', 'preparing', 'internal_review', 'creative_review', 'qa', 'ready_for_client', 'client_review', 'revision_requested', 'approved', 'rejected', 'delivered', 'archived');--> statement-breakpoint
CREATE TYPE "public"."deliverable_type" AS ENUM('storyboard', 'script', 'prompt_pack', 'prompt_collection', 'moodboard', 'character_sheet', 'character_pack', 'scene_pack', 'image_set', 'video_draft', 'final_video', 'voice_over', 'audio_mix', 'animation', 'presentation', 'brand_identity', 'logo_package', 'marketing_campaign', 'social_media_kit', 'website', 'landing_page', 'documentation', 'contract', 'invoice', 'proposal', 'other');--> statement-breakpoint
CREATE TYPE "public"."file_activity_event" AS ENUM('uploaded', 'version_added', 'downloaded', 'shared', 'moved', 'renamed', 'deleted', 'restored');--> statement-breakpoint
CREATE TYPE "public"."file_lifecycle_status" AS ENUM('draft', 'uploading', 'uploaded', 'queued', 'scanning', 'metadata_extraction', 'thumbnail_generation', 'ready', 'published', 'archived', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."file_relation_type" AS ENUM('task', 'milestone', 'project', 'client', 'meeting', 'deliverable', 'comment', 'approval', 'prompt', 'brand_asset');--> statement-breakpoint
CREATE TYPE "public"."file_share_access" AS ENUM('preview', 'download', 'metadata', 'comment', 'version_upload', 'delete');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('image', 'video', 'audio', 'document', 'archive', '3d_model', 'font', 'code', 'other');--> statement-breakpoint
CREATE TYPE "public"."review_type" AS ENUM('internal_review', 'creative_director', 'qa', 'legal', 'client_review', 'executive_review', 'final_approval');--> statement-breakpoint
CREATE TYPE "public"."share_link_access_level" AS ENUM('view_only', 'comment_only', 'approval_only');--> statement-breakpoint
CREATE TYPE "public"."task_activity_event" AS ENUM('created', 'updated', 'status_changed', 'assigned', 'unassigned', 'comment_added', 'attachment_added', 'checklist_added', 'time_logged', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."task_dependency_type" AS ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish', 'blocking', 'related');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('backlog', 'todo', 'ready', 'in_progress', 'blocked', 'waiting', 'review', 'client_review', 'approved', 'completed', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('creative', 'design', 'video_editing', 'motion_graphics', 'prompt_engineering', 'ai_generation', 'qa', 'review', 'documentation', 'meeting', 'development', 'research', 'marketing', 'other');--> statement-breakpoint
CREATE TABLE "labels" (
	"label_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"color" text DEFAULT '#3B82F6' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_label_name_per_org_or_project" UNIQUE("organization_id","project_id","name")
);
--> statement-breakpoint
CREATE TABLE "task_activity" (
	"activity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"event_type" "task_activity_event" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignees" (
	"assignee_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_task_assignee" UNIQUE("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "task_attachments" (
	"attachment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_checklist_items" (
	"item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_checklists" (
	"checklist_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"name" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"comment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"dependency_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"predecessor_id" uuid NOT NULL,
	"successor_id" uuid NOT NULL,
	"dependency_type" "task_dependency_type" DEFAULT 'finish_to_start' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_task_dependency" UNIQUE("predecessor_id","successor_id")
);
--> statement-breakpoint
CREATE TABLE "task_labels" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_task_label" UNIQUE("task_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "task_tags" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_task_tag_name" UNIQUE("task_id","name")
);
--> statement-breakpoint
CREATE TABLE "task_time_entries" (
	"time_entry_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"duration_mins" integer,
	"is_manual" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_watchers" (
	"watcher_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_task_watcher" UNIQUE("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"task_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"timeline_id" uuid NOT NULL,
	"phase_id" uuid NOT NULL,
	"milestone_id" uuid NOT NULL,
	"parent_task_id" uuid,
	"task_code" text NOT NULL,
	"name" text NOT NULL,
	"description" jsonb,
	"status" "task_status" DEFAULT 'backlog' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"task_type" "task_type" DEFAULT 'other' NOT NULL,
	"start_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"estimated_duration_mins" integer DEFAULT 0,
	"actual_duration_mins" integer DEFAULT 0,
	"progress" integer DEFAULT 0 NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"recurrence_rule" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "tasks_task_code_unique" UNIQUE("task_code")
);
--> statement-breakpoint
CREATE TABLE "file_activity" (
	"activity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"version_id" uuid,
	"event_type" "file_activity_event" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_collection_items" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_file_collection" UNIQUE("collection_id","file_id")
);
--> statement-breakpoint
ALTER TABLE "file_collection_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_collections" (
	"collection_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_comments" (
	"comment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"version_id" uuid,
	"content" jsonb NOT NULL,
	"coordinate_x" integer,
	"coordinate_y" integer,
	"timestamp_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_folders" (
	"folder_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"color" text DEFAULT '#3B82F6' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_folder_name_per_parent" UNIQUE("project_id","parent_id","name")
);
--> statement-breakpoint
ALTER TABLE "file_folders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_labels" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_file_label" UNIQUE("file_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "file_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_metrics" (
	"metric_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"version_id" uuid,
	"metric_type" text NOT NULL,
	"user_id" uuid,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_metrics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_relations" (
	"relation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"entity_type" "file_relation_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_file_entity_relation" UNIQUE("file_id","entity_type","entity_id")
);
--> statement-breakpoint
ALTER TABLE "file_relations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_shares" (
	"share_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"token" text NOT NULL,
	"access_level" "file_share_access" DEFAULT 'preview' NOT NULL,
	"expires_at" timestamp with time zone,
	"max_downloads" integer,
	"download_count" integer DEFAULT 0 NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "file_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "file_shares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_tags" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_file_tag_name" UNIQUE("file_id","name")
);
--> statement-breakpoint
ALTER TABLE "file_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "file_versions" (
	"version_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"storage_path" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256_hash" text NOT NULL,
	"metadata" jsonb,
	"change_reason" text,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "file_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "files" (
	"file_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"folder_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"file_type" "file_type" NOT NULL,
	"status" "file_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"current_version_id" uuid,
	"total_size_bytes" bigint DEFAULT 0 NOT NULL,
	"ai_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_activity" (
	"activity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverable_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_approvals" (
	"approval_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"approver_id" uuid,
	"client_approver_signature" text,
	"client_approver_email" text,
	"status" "approval_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverable_approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_files" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "uq_deliverable_file_revision" UNIQUE("revision_id","file_id")
);
--> statement-breakpoint
ALTER TABLE "deliverable_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_labels" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "uq_deliverable_label" UNIQUE("deliverable_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "deliverable_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_reference_attachments" (
	"attachment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"temporary_storage_path" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_by_client_name" text NOT NULL,
	"is_converted_to_production" boolean DEFAULT false NOT NULL,
	"converted_file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverable_reference_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_review_comments" (
	"comment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid,
	"client_author_name" text,
	"content" jsonb NOT NULL,
	"attachments" jsonb,
	"is_internal_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverable_review_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_review_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"review_type" "review_type" NOT NULL,
	"status" "deliverable_status" DEFAULT 'preparing' NOT NULL,
	"deadline_at" timestamp with time zone,
	"is_expired" boolean DEFAULT false NOT NULL,
	"presence_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverable_review_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_review_threads" (
	"thread_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"file_id" uuid,
	"coordinate_x" integer,
	"coordinate_y" integer,
	"timestamp_seconds" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverable_review_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_revisions" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"reason" text,
	"requested_by" uuid,
	"client_requester_name" text,
	"status" "deliverable_status" DEFAULT 'draft' NOT NULL,
	"comparison_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "uq_deliverable_revision_num" UNIQUE("deliverable_id","version_number")
);
--> statement-breakpoint
ALTER TABLE "deliverable_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_share_links" (
	"share_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"token" text NOT NULL,
	"access_level" "share_link_access_level" DEFAULT 'view_only' NOT NULL,
	"password_hash" text,
	"expires_at" timestamp with time zone,
	"max_downloads" integer,
	"download_count" integer DEFAULT 0 NOT NULL,
	"is_watermark_enabled" boolean DEFAULT false NOT NULL,
	"sent_via_email" boolean DEFAULT false NOT NULL,
	"email_recipient" text,
	"email_delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "deliverable_share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "deliverable_share_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverable_tags" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "uq_deliverable_tag" UNIQUE("deliverable_id","name")
);
--> statement-breakpoint
ALTER TABLE "deliverable_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "deliverables" (
	"deliverable_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"client_id" uuid,
	"task_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"type" "deliverable_type" NOT NULL,
	"status" "deliverable_status" DEFAULT 'draft' NOT NULL,
	"current_revision_id" uuid,
	"is_locked" boolean DEFAULT false NOT NULL,
	"ai_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliverables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity" ADD CONSTRAINT "task_activity_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_checklist_id_task_checklists_checklist_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."task_checklists"("checklist_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_checklists" ADD CONSTRAINT "task_checklists_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_predecessor_id_tasks_task_id_fk" FOREIGN KEY ("predecessor_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_successor_id_tasks_task_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_labels_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("label_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_time_entries" ADD CONSTRAINT "task_time_entries_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_time_entries" ADD CONSTRAINT "task_time_entries_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_timeline_id_timelines_timeline_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("timeline_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_phase_id_project_phases_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."project_phases"("phase_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestone_id_milestones_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("milestone_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_activity" ADD CONSTRAINT "file_activity_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_activity" ADD CONSTRAINT "file_activity_version_id_file_versions_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."file_versions"("version_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_collection_items" ADD CONSTRAINT "file_collection_items_collection_id_file_collections_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."file_collections"("collection_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_collection_items" ADD CONSTRAINT "file_collection_items_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_version_id_file_versions_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."file_versions"("version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_folders" ADD CONSTRAINT "file_folders_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_folders" ADD CONSTRAINT "file_folders_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_labels" ADD CONSTRAINT "file_labels_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_metrics" ADD CONSTRAINT "file_metrics_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_metrics" ADD CONSTRAINT "file_metrics_version_id_file_versions_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."file_versions"("version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_relations" ADD CONSTRAINT "file_relations_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_version_id_file_versions_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."file_versions"("version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_tags" ADD CONSTRAINT "file_tags_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_uploaded_by_users_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_file_folders_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."file_folders"("folder_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_activity" ADD CONSTRAINT "deliverable_activity_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_approvals" ADD CONSTRAINT "deliverable_approvals_session_id_deliverable_review_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."deliverable_review_sessions"("session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_approvals" ADD CONSTRAINT "deliverable_approvals_approver_id_users_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_files" ADD CONSTRAINT "deliverable_files_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_files" ADD CONSTRAINT "deliverable_files_revision_id_deliverable_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."deliverable_revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_files" ADD CONSTRAINT "deliverable_files_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_labels" ADD CONSTRAINT "deliverable_labels_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_reference_attachments" ADD CONSTRAINT "deliverable_reference_attachments_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_reference_attachments" ADD CONSTRAINT "deliverable_reference_attachments_converted_file_id_files_file_id_fk" FOREIGN KEY ("converted_file_id") REFERENCES "public"."files"("file_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_review_comments" ADD CONSTRAINT "deliverable_review_comments_thread_id_deliverable_review_threads_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."deliverable_review_threads"("thread_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_review_comments" ADD CONSTRAINT "deliverable_review_comments_author_id_users_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_review_sessions" ADD CONSTRAINT "deliverable_review_sessions_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_review_sessions" ADD CONSTRAINT "deliverable_review_sessions_revision_id_deliverable_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."deliverable_revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_review_threads" ADD CONSTRAINT "deliverable_review_threads_session_id_deliverable_review_sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."deliverable_review_sessions"("session_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_review_threads" ADD CONSTRAINT "deliverable_review_threads_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_revisions" ADD CONSTRAINT "deliverable_revisions_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_revisions" ADD CONSTRAINT "deliverable_revisions_requested_by_users_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_share_links" ADD CONSTRAINT "deliverable_share_links_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_share_links" ADD CONSTRAINT "deliverable_share_links_revision_id_deliverable_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."deliverable_revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverable_tags" ADD CONSTRAINT "deliverable_tags_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_milestone" ON "tasks" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_project_status" ON "tasks" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_tasks_parent" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_deleted" ON "tasks" USING btree ("task_id","deleted_at");--> statement-breakpoint
CREATE INDEX "idx_file_folders_project" ON "file_folders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_file_folders_parent" ON "file_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_file_relations_entity" ON "file_relations" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_file_versions_file" ON "file_versions" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_file_versions_hash" ON "file_versions" USING btree ("sha256_hash");--> statement-breakpoint
CREATE INDEX "idx_files_project" ON "files" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_files_folder" ON "files" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "idx_files_status" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_share_links_token" ON "deliverable_share_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_deliverables_project" ON "deliverables" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_deliverables_status" ON "deliverables" USING btree ("status");--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_activity" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_collection_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_collections" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_comments" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_folders" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_labels" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_metrics" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_relations" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_shares" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "file_versions" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "files" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_activity" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_approvals" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_files" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_labels" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_reference_attachments" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_review_comments" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_review_sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_review_threads" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_revisions" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_share_links" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverable_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "org_isolation_policy" ON "deliverables" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()));