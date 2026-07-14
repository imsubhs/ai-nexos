CREATE SCHEMA "events";
--> statement-breakpoint
CREATE TYPE "public"."action_item_status" AS ENUM('open', 'in_progress', 'blocked', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_confidence_threshold" AS ENUM('auto_execute', 'human_approval', 'abort');--> statement-breakpoint
CREATE TYPE "public"."agent_memory_type" AS ENUM('session', 'working', 'persistent', 'reflection');--> statement-breakpoint
CREATE TYPE "public"."agent_plan_status" AS ENUM('active', 'superseded', 'failed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."agent_state" AS ENUM('CREATED', 'PLANNING', 'WAITING_FOR_APPROVAL', 'READY', 'RUNNING', 'PAUSED', 'REPLANNING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."ai_approval_status" AS ENUM('pending_human', 'approved', 'rejected', 'bypassed', 'auto_approved');--> statement-breakpoint
CREATE TYPE "public"."ai_capability" AS ENUM('chat', 'text_generation', 'summarization', 'code_generation', 'data_extraction', 'vision', 'tool_use', 'reasoning', 'creative');--> statement-breakpoint
CREATE TYPE "public"."ai_memory_layer" AS ENUM('conversation', 'session', 'project', 'organization');--> statement-breakpoint
CREATE TYPE "public"."ai_message_role" AS ENUM('system', 'user', 'assistant', 'tool', 'function');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'anthropic', 'google', 'meta', 'cohere', 'custom');--> statement-breakpoint
CREATE TYPE "public"."annotation_type" AS ENUM('point', 'area', 'timestamp', 'text', 'drawing', 'attachment');--> statement-breakpoint
CREATE TYPE "public"."approval_cycle_status" AS ENUM('pending', 'in_progress', 'approved', 'rejected', 'conditional', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."approval_entity_type" AS ENUM('deliverable', 'file', 'brand_asset', 'creative_brief', 'contract', 'invoice', 'prompt_pack', 'campaign', 'ai_content');--> statement-breakpoint
CREATE TYPE "public"."approval_event_type" AS ENUM('cycle_started', 'stage_started', 'review_requested', 'review_submitted', 'review_delegated', 'cycle_approved', 'cycle_rejected', 'sla_reminder_1', 'sla_reminder_2', 'sla_escalated_pm', 'sla_escalated_admin');--> statement-breakpoint
CREATE TYPE "public"."approval_review_status" AS ENUM('pending', 'approved', 'rejected', 'approved_with_conditions', 'delegated', 'abstained');--> statement-breakpoint
CREATE TYPE "public"."approval_stage_status" AS ENUM('pending', 'active', 'completed', 'skipped', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."automation_action_type" AS ENUM('create', 'update', 'delete', 'notify', 'assign', 'generate', 'approve', 'reject', 'request_review', 'send_email', 'webhook', 'ai_workspace', 'compensation');--> statement-breakpoint
CREATE TYPE "public"."automation_execution_status" AS ENUM('queued', 'running', 'paused', 'completed', 'failed', 'cancelled', 'compensating', 'compensated');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger_type" AS ENUM('platform_event', 'schedule', 'webhook', 'manual', 'api');--> statement-breakpoint
CREATE TYPE "public"."automation_variable_type" AS ENUM('string', 'number', 'boolean', 'date', 'enum', 'json', 'secret_reference');--> statement-breakpoint
CREATE TYPE "public"."automation_workflow_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('open', 'pending', 'accepted', 'implemented', 'obsolete');--> statement-breakpoint
CREATE TYPE "public"."decision_type" AS ENUM('strategic', 'tactical', 'creative', 'technical', 'financial', 'resource', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('project', 'task', 'timeline', 'meeting', 'decision', 'action_item', 'deliverable', 'revision', 'approval', 'comment', 'mention', 'client', 'system');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."meeting_outcome_type" AS ENUM('decision', 'issue', 'risk', 'idea', 'question', 'blocker', 'action_item');--> statement-breakpoint
CREATE TYPE "public"."meeting_provider" AS ENUM('zoom', 'google_meet', 'teams', 'webex', 'otter', 'manual', 'custom');--> statement-breakpoint
CREATE TYPE "public"."meeting_recording_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."meeting_type" AS ENUM('kickoff', 'discovery', 'client_review', 'creative_review', 'internal_standup', 'sprint_planning', 'sprint_review', 'retrospective', 'approval_meeting', 'revision_meeting', 'production_meeting', 'qa_review', 'stakeholder_meeting', 'executive_review', 'finance', 'legal', 'vendor', 'emergency', 'other');--> statement-breakpoint
CREATE TYPE "public"."notification_activity_type" AS ENUM('clicked', 'hovered', 'expanded');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app', 'push', 'slack', 'teams', 'discord', 'whatsapp', 'sms', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('queued', 'processing', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_digest_frequency" AS ENUM('instant', 'hourly', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."notification_digest_status" AS ENUM('collecting', 'processing', 'sent');--> statement-breakpoint
CREATE TYPE "public"."notification_preference_level" AS ENUM('organization', 'project', 'user');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('critical', 'high', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."notification_queue_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'processing', 'delivered', 'read', 'archived', 'failed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."portal_session_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."portal_widget_type" AS ENUM('projects', 'approvals', 'deliverables', 'revisions', 'meetings', 'activity', 'notifications', 'custom');--> statement-breakpoint
CREATE TYPE "public"."revision_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."revision_status" AS ENUM('REQUESTED', 'CREATED', 'ASSIGNED', 'WIP', 'INTERNAL_REVIEW', 'QA', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'MERGED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."revision_type" AS ENUM('MINOR', 'MAJOR', 'CLIENT_REQUESTED', 'INTERNAL', 'CREATIVE', 'TECHNICAL', 'LEGAL', 'EMERGENCY', 'ROLLBACK', 'HOTFIX');--> statement-breakpoint
CREATE TYPE "public"."share_permission_level" AS ENUM('viewer', 'commenter', 'approver', 'reviewer', 'downloader');--> statement-breakpoint
CREATE TYPE "public"."share_session_status" AS ENUM('draft', 'published', 'paused', 'locked', 'expired', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."share_type" AS ENUM('deliverable_review', 'approval_request', 'revision_review', 'creative_feedback', 'internal_qa', 'vendor_review', 'legal_review', 'finance_review', 'public_showcase');--> statement-breakpoint
CREATE TABLE "approval_conditions" (
	"condition_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"condition_text" text NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "approval_cycles" (
	"cycle_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_type" "approval_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"workflow_id" uuid,
	"snapshot_data_json" jsonb NOT NULL,
	"snapshot_hash" text NOT NULL,
	"status" "approval_cycle_status" DEFAULT 'pending' NOT NULL,
	"current_stage_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"actor_id" uuid,
	"event_type" "approval_event_type" NOT NULL,
	"payload_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_stages" (
	"stage_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"name" text NOT NULL,
	"order_index" integer NOT NULL,
	"status" "approval_stage_status" DEFAULT 'pending' NOT NULL,
	"quorum_count" integer DEFAULT 1 NOT NULL,
	"sla_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_workflows" (
	"workflow_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"routing_rules_json" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"review_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"delegated_from_id" uuid,
	"external_email" text,
	"external_token" text,
	"status" "approval_review_status" DEFAULT 'pending' NOT NULL,
	"comments" text,
	"ai_recommendation_json" jsonb,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "revision_activity" (
	"activity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"user_id" uuid,
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
ALTER TABLE "revision_activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_assignments" (
	"assignment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "uq_revision_assignment" UNIQUE("revision_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "revision_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_changes" (
	"change_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"change_summary" text NOT NULL,
	"reason" text,
	"impact" text,
	"ai_difference_detection" jsonb,
	"ai_merge_recommendation" jsonb,
	"ai_risk_assessment" jsonb,
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
ALTER TABLE "revision_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_checklists" (
	"checklist_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"title" text NOT NULL,
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
ALTER TABLE "revision_checklists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_comments" (
	"comment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid,
	"content" jsonb NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
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
ALTER TABLE "revision_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_history" (
	"history_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"action_by" uuid,
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
ALTER TABLE "revision_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_items" (
	"item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"file_id" uuid,
	"action" text NOT NULL,
	"conflict_status" text,
	"conflict_resolution_metadata" jsonb,
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
ALTER TABLE "revision_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_labels" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "uq_revision_label" UNIQUE("revision_id","label_id")
);
--> statement-breakpoint
ALTER TABLE "revision_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_merge_previews" (
	"preview_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"preview_data" jsonb,
	"expires_at" timestamp with time zone,
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
ALTER TABLE "revision_merge_previews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_requests" (
	"request_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"revision_id" uuid,
	"requester_id" uuid,
	"client_requester_name" text,
	"request_details" text NOT NULL,
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
ALTER TABLE "revision_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_tags" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "uq_revision_tag" UNIQUE("revision_id","name")
);
--> statement-breakpoint
ALTER TABLE "revision_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revision_threads" (
	"thread_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
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
ALTER TABLE "revision_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "revisions" (
	"revision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"task_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"version_number" integer NOT NULL,
	"type" "revision_type" DEFAULT 'MINOR' NOT NULL,
	"status" "revision_status" DEFAULT 'CREATED' NOT NULL,
	"priority" "revision_priority" DEFAULT 'MEDIUM' NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"parent_revision_id" uuid,
	"branch_name" text,
	"is_main_branch" boolean DEFAULT true NOT NULL,
	"ai_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "uq_revision_branch" UNIQUE("deliverable_id","branch_name")
);
--> statement-breakpoint
ALTER TABLE "revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "decision_dependencies" (
	"dependency_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"depends_on_decision_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_decision_dependency" UNIQUE("decision_id","depends_on_decision_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_action_items" (
	"action_item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"outcome_id" uuid NOT NULL,
	"status" "action_item_status" DEFAULT 'open' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone,
	"estimated_duration_mins" integer,
	"promoted_to_task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "meeting_action_items_outcome_id_unique" UNIQUE("outcome_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_activity" (
	"activity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
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
CREATE TABLE "meeting_agenda" (
	"agenda_item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"time_allotted_mins" integer,
	"speaker_id" uuid,
	"is_completed" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "meeting_attendees" (
	"attendee_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"user_id" uuid,
	"external_email" text,
	"role" text DEFAULT 'participant',
	"rsvp_status" text DEFAULT 'pending',
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
CREATE TABLE "meeting_decision_approvals" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_decision_approval" UNIQUE("decision_id","cycle_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_decision_deliverables" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"deliverable_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_decision_deliverable" UNIQUE("decision_id","deliverable_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_decision_revisions" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_decision_revision" UNIQUE("decision_id","revision_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_decision_tasks" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_decision_task" UNIQUE("decision_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_decisions" (
	"decision_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"outcome_id" uuid NOT NULL,
	"decision_type" "decision_type" DEFAULT 'other' NOT NULL,
	"status" "decision_status" DEFAULT 'open' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"reason" text,
	"impact_description" text,
	"risk_level" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "meeting_decisions_outcome_id_unique" UNIQUE("outcome_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_followups" (
	"followup_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"description" text NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"escalation_level" integer DEFAULT 0 NOT NULL,
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
CREATE TABLE "meeting_labels" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_meeting_label" UNIQUE("meeting_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_outcomes" (
	"outcome_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"outcome_type" "meeting_outcome_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"raised_by_id" uuid,
	"owner_id" uuid,
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
CREATE TABLE "meeting_recordings" (
	"recording_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"storage_url" text NOT NULL,
	"file_size" integer,
	"duration_mins" integer,
	"status" "meeting_recording_status" DEFAULT 'pending' NOT NULL,
	"processing_progress" integer DEFAULT 0,
	"speaker_timeline_data" jsonb,
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
CREATE TABLE "meeting_tags" (
	"mapping_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "unique_meeting_tag_name" UNIQUE("meeting_id","name")
);
--> statement-breakpoint
CREATE TABLE "meeting_templates" (
	"template_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_type" "meeting_type",
	"agenda_template" jsonb,
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
CREATE TABLE "meeting_transcripts" (
	"transcript_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"meeting_id" uuid NOT NULL,
	"recording_id" uuid,
	"source_type" text DEFAULT 'manual' NOT NULL,
	"provider_name" "meeting_provider",
	"raw_text" text,
	"processed_segments" jsonb,
	"topics" jsonb,
	"keywords" jsonb,
	"transcript_embeddings_id" text,
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
CREATE TABLE "meetings" (
	"meeting_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"timeline_id" uuid,
	"template_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"meeting_type" "meeting_type" DEFAULT 'other' NOT NULL,
	"status" "meeting_status" DEFAULT 'scheduled' NOT NULL,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"timezone" text,
	"location" text,
	"meeting_url" text,
	"provider" "meeting_provider",
	"external_meeting_id" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"is_confidential" boolean DEFAULT false NOT NULL,
	"notes" jsonb,
	"ai_summary_id" uuid,
	"ai_summary_processing_status" text,
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
CREATE TABLE "events"."events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"global_sequence" bigserial NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"event_version" integer DEFAULT 1 NOT NULL,
	"correlation_id" uuid,
	"causation_id" uuid,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"actor_id" uuid,
	"ai_metadata" jsonb,
	"retained_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_events_aggregate_version" UNIQUE("aggregate_id","event_version")
);
--> statement-breakpoint
CREATE TABLE "notification_activity" (
	"activity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" "notification_activity_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"channel_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"channel_type" "notification_channel" NOT NULL,
	"provider_config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "notification_deliveries" (
	"delivery_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"status" "notification_delivery_status" DEFAULT 'queued' NOT NULL,
	"provider_message_id" text,
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
CREATE TABLE "notification_digest" (
	"digest_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"frequency" "notification_digest_frequency" NOT NULL,
	"status" "notification_digest_status" DEFAULT 'collecting' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"compiled_payload" jsonb,
	"locked_at" timestamp with time zone,
	"locked_by" text,
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
CREATE TABLE "notification_failures" (
	"failure_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"error_code" text NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone,
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
CREATE TABLE "notification_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"action" text NOT NULL,
	"log_data" jsonb,
	"hmac_signature" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"preference_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"level" "notification_preference_level" NOT NULL,
	"user_id" uuid,
	"project_id" uuid,
	"event_type_preferences" jsonb NOT NULL,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"digest_frequency" "notification_digest_frequency" DEFAULT 'instant' NOT NULL,
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
CREATE TABLE "notification_queue" (
	"queue_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "notification_queue_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "notification_queue_delivery_id_unique" UNIQUE("delivery_id")
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"template_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"subject_template" text NOT NULL,
	"body_template" text NOT NULL,
	"action_url_template" text,
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
CREATE TABLE "notification_webhooks" (
	"webhook_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"endpoint_url" text NOT NULL,
	"secret_key" text NOT NULL,
	"event_types" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "notifications" (
	"notification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"priority" "notification_priority" DEFAULT 'normal' NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"read_at" timestamp with time zone,
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
CREATE TABLE "external_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"company" varchar(255),
	"avatar_url" text,
	"last_ip" varchar(45),
	"last_user_agent" text,
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
CREATE TABLE "share_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"identity_id" uuid,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"device_fingerprint" varchar(255),
	"is_success" boolean NOT NULL,
	"failure_reason" varchar(255),
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
CREATE TABLE "share_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"identity_id" uuid,
	"activity_type" varchar(50) NOT NULL,
	"details" jsonb,
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
CREATE TABLE "share_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"comment_id" uuid,
	"type" "annotation_type" NOT NULL,
	"norm_x" real,
	"norm_y" real,
	"norm_width" real,
	"norm_height" real,
	"time_ms" integer,
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
CREATE TABLE "share_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"author_identity_id" uuid,
	"author_user_id" uuid,
	"parent_id" uuid,
	"content" text NOT NULL,
	"status" "feedback_status" DEFAULT 'open' NOT NULL,
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
CREATE TABLE "share_download_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"identity_id" uuid,
	"ip_address" varchar(45),
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
CREATE TABLE "share_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"emitted_at" timestamp with time zone DEFAULT now() NOT NULL,
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
CREATE TABLE "share_expiration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"max_views" integer,
	"current_views" integer DEFAULT 0 NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
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
CREATE TABLE "share_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"color" varchar(7),
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
CREATE TABLE "share_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"notify_on_view" boolean DEFAULT false NOT NULL,
	"notify_on_comment" boolean DEFAULT true NOT NULL,
	"notify_on_approval" boolean DEFAULT true NOT NULL,
	"target_user_ids" jsonb,
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
CREATE TABLE "share_passwords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"hashed_password" varchar(255) NOT NULL,
	"salt" varchar(255) NOT NULL,
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
CREATE TABLE "share_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"recipient_id" uuid,
	"level" "share_permission_level" NOT NULL,
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
CREATE TABLE "share_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"allow_downloads" boolean DEFAULT false NOT NULL,
	"require_password" boolean DEFAULT false NOT NULL,
	"require_watermark" boolean DEFAULT true NOT NULL,
	"expiration_days" integer,
	"max_views" integer,
	"allowed_ips" jsonb,
	"allowed_countries" jsonb,
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
CREATE TABLE "share_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"identity_id" uuid NOT NULL,
	"has_accessed" boolean DEFAULT false NOT NULL,
	"last_accessed_at" timestamp with time zone,
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
CREATE TABLE "share_security_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid,
	"event_category" varchar(100) NOT NULL,
	"ip_address" varchar(45),
	"details" jsonb,
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
CREATE TABLE "share_session_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"deliverable_id" uuid,
	"file_id" uuid,
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
CREATE TABLE "share_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"policy_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"share_type" "share_type" NOT NULL,
	"status" "share_session_status" DEFAULT 'draft' NOT NULL,
	"secure_token" varchar(255),
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "share_sessions_secure_token_unique" UNIQUE("secure_token")
);
--> statement-breakpoint
CREATE TABLE "share_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"tag" varchar(50) NOT NULL,
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
CREATE TABLE "share_token_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonce" varchar(255) NOT NULL,
	"session_id" uuid NOT NULL,
	"identity_id" uuid,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "share_token_nonces_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE "share_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"snapshot_data" jsonb NOT NULL,
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
CREATE TABLE "share_watermarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"content" text,
	"opacity" real DEFAULT 0.5 NOT NULL,
	"position" varchar(50) DEFAULT 'center' NOT NULL,
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
CREATE TABLE "client_portal_activity" (
	"activity_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"session_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" uuid,
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
CREATE TABLE "client_portal_dashboard_layout" (
	"layout_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"widget_type" "portal_widget_type" NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"display_order" integer NOT NULL,
	"config" jsonb,
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
CREATE TABLE "client_portal_devices" (
	"device_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"is_trusted" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
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
CREATE TABLE "client_portal_favorites" (
	"favorite_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
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
CREATE TABLE "client_portal_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"notification_id" uuid NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
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
CREATE TABLE "client_portal_preferences" (
	"preference_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"theme" text DEFAULT 'system',
	"notification_preferences" jsonb,
	"feature_flags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "client_portal_preferences_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "client_portal_security" (
	"security_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"allowed_ips" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "client_portal_security_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "client_portal_sessions" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"token" text NOT NULL,
	"status" "portal_session_status" DEFAULT 'active' NOT NULL,
	"device_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "client_portal_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ai_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"layer" "ai_memory_layer" NOT NULL,
	"project_id" uuid,
	"conversation_id" uuid,
	"limit_in_usd" numeric(12, 4) NOT NULL,
	"current_spend_in_usd" numeric(12, 4) DEFAULT '0' NOT NULL,
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
CREATE TABLE "ai_context_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"relevance_score" numeric(5, 4),
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
CREATE TABLE "ai_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"raw_context" jsonb,
	"compressed_context" jsonb,
	"total_tokens" integer,
	"budget_used" numeric(10, 4),
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
CREATE TABLE "ai_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_id" uuid,
	"project_id" uuid,
	"title" text,
	"summary" text,
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
CREATE TABLE "ai_cost_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"token_usage_id" uuid,
	"cost_in_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
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
CREATE TABLE "ai_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"provider" "ai_provider",
	"model_profile_id" uuid,
	"prompt_version_id" uuid,
	"parameters" jsonb,
	"latency_ms" integer,
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
CREATE TABLE "ai_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_positive" boolean NOT NULL,
	"comments" text,
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
CREATE TABLE "ai_guardrails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"rule_type" text NOT NULL,
	"pattern" text NOT NULL,
	"is_active" boolean DEFAULT true,
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
CREATE TABLE "ai_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"layer" "ai_memory_layer" NOT NULL,
	"conversation_id" uuid,
	"session_id" uuid,
	"project_id" uuid,
	"fact" text NOT NULL,
	"confidence" numeric(5, 4),
	"source_metadata" jsonb,
	"expires_at" timestamp with time zone,
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
CREATE TABLE "ai_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text,
	"name" text,
	"function_call" jsonb,
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
CREATE TABLE "ai_model_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"model_profile_id" uuid,
	"max_requests_per_minute" integer,
	"max_tokens_per_day" integer,
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
CREATE TABLE "ai_model_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"model_name" text NOT NULL,
	"capability" "ai_capability" NOT NULL,
	"context_window" integer NOT NULL,
	"cost_per_1k_prompt" numeric(12, 6),
	"cost_per_1k_completion" numeric(12, 6),
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
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
CREATE TABLE "ai_model_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"base_url" text,
	"is_active" boolean DEFAULT true,
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
CREATE TABLE "ai_model_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"model_profile_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"total_requests" integer DEFAULT 0,
	"total_errors" integer DEFAULT 0,
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
CREATE TABLE "ai_prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"owner_id" uuid,
	"is_active" boolean DEFAULT true,
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
CREATE TABLE "ai_prompt_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"prompt_version" text NOT NULL,
	"system_prompt" text NOT NULL,
	"variables_schema" jsonb,
	"is_approved" boolean DEFAULT false,
	"approved_by" uuid,
	"rollback_from" uuid,
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
CREATE TABLE "ai_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"score" integer NOT NULL,
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
CREATE TABLE "ai_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
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
CREATE TABLE "ai_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"capability" "ai_capability" NOT NULL,
	"prompt_template_id" uuid NOT NULL,
	"allowed_tools" jsonb,
	"allowed_models" jsonb,
	"permissions" jsonb,
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
CREATE TABLE "ai_token_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
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
CREATE TABLE "ai_tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"tool_id" uuid NOT NULL,
	"arguments" jsonb,
	"result" jsonb,
	"status" "ai_approval_status",
	"execution_time_ms" integer,
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
CREATE TABLE "ai_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"schema" jsonb NOT NULL,
	"permissions" jsonb,
	"timeout_ms" integer DEFAULT 5000,
	"cost_per_run" numeric(10, 4),
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
CREATE TABLE "ai_workspace_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
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
CREATE TABLE "ai_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
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
CREATE TABLE "automation_action_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"status" "automation_execution_status" DEFAULT 'queued' NOT NULL,
	"enqueued_at" timestamp with time zone DEFAULT now(),
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
CREATE TABLE "automation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"type" "automation_action_type" NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"compensation_action_id" uuid,
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
CREATE TABLE "automation_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"scopes" jsonb DEFAULT '[]' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "automation_api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "automation_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid,
	"action_name" varchar(255) NOT NULL,
	"changed_data" jsonb,
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
CREATE TABLE "automation_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"allowed_triggers" jsonb DEFAULT '[]' NOT NULL,
	"allowed_actions" jsonb DEFAULT '[]' NOT NULL,
	"required_permissions" jsonb DEFAULT '[]' NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"ai_available" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "automation_capabilities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "automation_condition_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"parent_group_id" uuid,
	"logical_operator" varchar(10) NOT NULL,
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
CREATE TABLE "automation_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"group_id" uuid,
	"operator" varchar(50) NOT NULL,
	"field" varchar(255),
	"value" jsonb,
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
CREATE TABLE "automation_dead_letter_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid,
	"step_id" uuid,
	"payload" jsonb NOT NULL,
	"error_message" text,
	"retries_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"is_terminal" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "automation_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid,
	"level" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
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
CREATE TABLE "automation_execution_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"status" "automation_execution_status" DEFAULT 'queued' NOT NULL,
	"idempotency_key" varchar(255),
	"trigger_source" varchar(255),
	"trigger_payload" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
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
CREATE TABLE "automation_execution_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"state_data" jsonb DEFAULT '{}' NOT NULL,
	"worker_id" varchar(255),
	"lease_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "automation_execution_state_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "automation_execution_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"action_id" uuid,
	"step_name" varchar(255) NOT NULL,
	"status" "automation_execution_status" NOT NULL,
	"result" jsonb,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
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
CREATE TABLE "automation_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"role_id" uuid,
	"user_id" uuid,
	"scope" varchar(255) NOT NULL,
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
CREATE TABLE "automation_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"limit_count" integer NOT NULL,
	"window_seconds" integer NOT NULL,
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
CREATE TABLE "automation_retry_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid,
	"action_id" uuid,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"backoff_strategy" varchar(50) DEFAULT 'exponential' NOT NULL,
	"initial_delay_seconds" integer DEFAULT 5 NOT NULL,
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
CREATE TABLE "automation_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"cron_expression" varchar(255) NOT NULL,
	"idempotency_key_prefix" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
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
CREATE TABLE "automation_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"metrics" jsonb DEFAULT '{}' NOT NULL,
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
CREATE TABLE "automation_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"body" text NOT NULL,
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
CREATE TABLE "automation_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"type" "automation_trigger_type" NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
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
CREATE TABLE "automation_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "automation_variable_type" NOT NULL,
	"value_raw" text,
	"is_required" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "automation_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"url_token" varchar(255) NOT NULL,
	"secret_hmac" varchar(255),
	"requires_nonce" boolean DEFAULT true NOT NULL,
	"requires_timestamp" boolean DEFAULT true NOT NULL,
	"expiration_window_seconds" integer DEFAULT 300 NOT NULL,
	"idempotency_key_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"is_archived" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "automation_webhooks_url_token_unique" UNIQUE("url_token")
);
--> statement-breakpoint
CREATE TABLE "automation_workflow_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"executable_plan" jsonb,
	"rules_compiled_at" timestamp with time zone,
	"is_valid" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "automation_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "automation_workflow_status" DEFAULT 'draft' NOT NULL,
	"current_version_id" uuid,
	"capability_id" uuid,
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
CREATE TABLE "ai_agent_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"capability_name" varchar(255) NOT NULL,
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
CREATE TABLE "ai_agent_checkpoint_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"plan_version_reference" uuid NOT NULL,
	"completed_steps" jsonb NOT NULL,
	"pending_steps" jsonb NOT NULL,
	"context_snapshot" jsonb NOT NULL,
	"automation_references" jsonb,
	"approval_references" jsonb,
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
CREATE TABLE "ai_agent_context" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"context_snapshot" jsonb NOT NULL,
	"is_immutable" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "ai_agent_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
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
CREATE TABLE "ai_agent_execution_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"session_id" uuid,
	"status" "agent_state" DEFAULT 'CREATED' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
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
CREATE TABLE "ai_agent_execution_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"plan_step_id" uuid NOT NULL,
	"status" "agent_state" DEFAULT 'CREATED' NOT NULL,
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
CREATE TABLE "ai_agent_explainability_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"goal_reference" uuid,
	"plan_version_reference" uuid,
	"context_reference" uuid,
	"tool_usage_reference" uuid,
	"automation_reference" varchar(255),
	"approval_reference" uuid,
	"outcome_summary" text,
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
CREATE TABLE "ai_agent_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"description" text NOT NULL,
	"success_criteria" jsonb,
	"constraints" jsonb,
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
CREATE TABLE "ai_agent_human_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"approver_id" uuid,
	"status" "agent_state" DEFAULT 'WAITING_FOR_APPROVAL' NOT NULL,
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
CREATE TABLE "ai_agent_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"max_tokens_per_run" integer,
	"max_cost_per_run" integer,
	"max_steps_per_run" integer,
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
CREATE TABLE "ai_agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid,
	"memory_type" "agent_memory_type" NOT NULL,
	"summary" text NOT NULL,
	"is_compacted" boolean DEFAULT false NOT NULL,
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
CREATE TABLE "ai_agent_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"result" jsonb,
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
CREATE TABLE "ai_agent_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"resource_type" varchar(255) NOT NULL,
	"action" varchar(255) NOT NULL,
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
CREATE TABLE "ai_agent_plan_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"action_name" varchar(255) NOT NULL,
	"dependencies" jsonb,
	"confidence_threshold" "agent_confidence_threshold" DEFAULT 'auto_execute' NOT NULL,
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
CREATE TABLE "ai_agent_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"plan_version" integer DEFAULT 1 NOT NULL,
	"status" "agent_plan_status" DEFAULT 'active' NOT NULL,
	"is_immutable" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "ai_agent_reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"outcome_summary" text NOT NULL,
	"improvements" text,
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
CREATE TABLE "ai_agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" uuid,
	"status" "agent_state" DEFAULT 'CREATED' NOT NULL,
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
CREATE TABLE "ai_agent_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"tool_name" varchar(255) NOT NULL,
	"permissions" jsonb,
	"approval_requirements" jsonb,
	"inputs" jsonb,
	"outputs" jsonb,
	"side_effects" jsonb,
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
CREATE TABLE "ai_agent_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"total_runs" integer DEFAULT 0 NOT NULL,
	"successful_runs" integer DEFAULT 0 NOT NULL,
	"failed_runs" integer DEFAULT 0 NOT NULL,
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
CREATE TABLE "ai_agent_tool_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"tool_name" varchar(255) NOT NULL,
	"input_payload" jsonb,
	"output_payload" jsonb,
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
CREATE TABLE "ai_agent_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"configuration" jsonb NOT NULL,
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
CREATE TABLE "ai_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
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
ALTER TABLE "approval_conditions" ADD CONSTRAINT "approval_conditions_review_id_reviews_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("review_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_conditions" ADD CONSTRAINT "approval_conditions_resolved_by_users_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_cycles" ADD CONSTRAINT "approval_cycles_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_cycles" ADD CONSTRAINT "approval_cycles_workflow_id_approval_workflows_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("workflow_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_cycles" ADD CONSTRAINT "approval_cycles_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_cycle_id_approval_cycles_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."approval_cycles"("cycle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_actor_id_users_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_stages" ADD CONSTRAINT "approval_stages_cycle_id_approval_cycles_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."approval_cycles"("cycle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_stage_id_approval_stages_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."approval_stages"("stage_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_delegated_from_id_users_user_id_fk" FOREIGN KEY ("delegated_from_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_activity" ADD CONSTRAINT "revision_activity_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_activity" ADD CONSTRAINT "revision_activity_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_assignments" ADD CONSTRAINT "revision_assignments_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_assignments" ADD CONSTRAINT "revision_assignments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_changes" ADD CONSTRAINT "revision_changes_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_checklists" ADD CONSTRAINT "revision_checklists_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_comments" ADD CONSTRAINT "revision_comments_thread_id_revision_threads_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."revision_threads"("thread_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_comments" ADD CONSTRAINT "revision_comments_author_id_users_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_history" ADD CONSTRAINT "revision_history_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_history" ADD CONSTRAINT "revision_history_action_by_users_user_id_fk" FOREIGN KEY ("action_by") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_items" ADD CONSTRAINT "revision_items_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_items" ADD CONSTRAINT "revision_items_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_labels" ADD CONSTRAINT "revision_labels_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_labels" ADD CONSTRAINT "revision_labels_label_id_labels_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("label_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_merge_previews" ADD CONSTRAINT "revision_merge_previews_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_requests" ADD CONSTRAINT "revision_requests_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_requests" ADD CONSTRAINT "revision_requests_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_requests" ADD CONSTRAINT "revision_requests_requester_id_users_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_tags" ADD CONSTRAINT "revision_tags_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_threads" ADD CONSTRAINT "revision_threads_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_dependencies" ADD CONSTRAINT "decision_dependencies_decision_id_meeting_decisions_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."meeting_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_dependencies" ADD CONSTRAINT "decision_dependencies_depends_on_decision_id_meeting_decisions_decision_id_fk" FOREIGN KEY ("depends_on_decision_id") REFERENCES "public"."meeting_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_outcome_id_meeting_outcomes_outcome_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."meeting_outcomes"("outcome_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_action_items" ADD CONSTRAINT "meeting_action_items_promoted_to_task_id_tasks_task_id_fk" FOREIGN KEY ("promoted_to_task_id") REFERENCES "public"."tasks"("task_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_activity" ADD CONSTRAINT "meeting_activity_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agenda" ADD CONSTRAINT "meeting_agenda_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agenda" ADD CONSTRAINT "meeting_agenda_speaker_id_users_user_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decision_approvals" ADD CONSTRAINT "meeting_decision_approvals_decision_id_meeting_decisions_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."meeting_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decision_approvals" ADD CONSTRAINT "meeting_decision_approvals_cycle_id_approval_cycles_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."approval_cycles"("cycle_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decision_deliverables" ADD CONSTRAINT "meeting_decision_deliverables_decision_id_meeting_decisions_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."meeting_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decision_deliverables" ADD CONSTRAINT "meeting_decision_deliverables_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decision_revisions" ADD CONSTRAINT "meeting_decision_revisions_decision_id_meeting_decisions_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."meeting_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decision_revisions" ADD CONSTRAINT "meeting_decision_revisions_revision_id_revisions_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."revisions"("revision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decision_tasks" ADD CONSTRAINT "meeting_decision_tasks_decision_id_meeting_decisions_decision_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."meeting_decisions"("decision_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decision_tasks" ADD CONSTRAINT "meeting_decision_tasks_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_decisions" ADD CONSTRAINT "meeting_decisions_outcome_id_meeting_outcomes_outcome_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."meeting_outcomes"("outcome_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_followups" ADD CONSTRAINT "meeting_followups_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_followups" ADD CONSTRAINT "meeting_followups_owner_id_users_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_labels" ADD CONSTRAINT "meeting_labels_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_labels" ADD CONSTRAINT "meeting_labels_label_id_labels_label_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("label_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_outcomes" ADD CONSTRAINT "meeting_outcomes_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_outcomes" ADD CONSTRAINT "meeting_outcomes_raised_by_id_users_user_id_fk" FOREIGN KEY ("raised_by_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_outcomes" ADD CONSTRAINT "meeting_outcomes_owner_id_users_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_templates" ADD CONSTRAINT "meeting_templates_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_transcripts" ADD CONSTRAINT "meeting_transcripts_meeting_id_meetings_meeting_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("meeting_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_transcripts" ADD CONSTRAINT "meeting_transcripts_recording_id_meeting_recordings_recording_id_fk" FOREIGN KEY ("recording_id") REFERENCES "public"."meeting_recordings"("recording_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_timeline_id_timelines_timeline_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("timeline_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_template_id_meeting_templates_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."meeting_templates"("template_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events"."events" ADD CONSTRAINT "events_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events"."events" ADD CONSTRAINT "events_actor_id_users_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_activity" ADD CONSTRAINT "notification_activity_notification_id_notifications_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("notification_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_activity" ADD CONSTRAINT "notification_activity_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("notification_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_channel_id_notification_channels_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("channel_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_digest" ADD CONSTRAINT "notification_digest_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_digest" ADD CONSTRAINT "notification_digest_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_failures" ADD CONSTRAINT "notification_failures_delivery_id_notification_deliveries_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_deliveries"("delivery_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_delivery_id_notification_deliveries_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_deliveries"("delivery_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_delivery_id_notification_deliveries_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."notification_deliveries"("delivery_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_webhooks" ADD CONSTRAINT "notification_webhooks_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_events_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"."events"("event_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_access_logs" ADD CONSTRAINT "share_access_logs_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_access_logs" ADD CONSTRAINT "share_access_logs_identity_id_external_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."external_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_activity" ADD CONSTRAINT "share_activity_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_activity" ADD CONSTRAINT "share_activity_identity_id_external_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."external_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_annotations" ADD CONSTRAINT "share_annotations_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_annotations" ADD CONSTRAINT "share_annotations_item_id_share_session_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."share_session_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_annotations" ADD CONSTRAINT "share_annotations_comment_id_share_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."share_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_comments" ADD CONSTRAINT "share_comments_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_comments" ADD CONSTRAINT "share_comments_item_id_share_session_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."share_session_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_comments" ADD CONSTRAINT "share_comments_author_identity_id_external_identities_id_fk" FOREIGN KEY ("author_identity_id") REFERENCES "public"."external_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_comments" ADD CONSTRAINT "share_comments_author_user_id_users_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_download_logs" ADD CONSTRAINT "share_download_logs_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_download_logs" ADD CONSTRAINT "share_download_logs_item_id_share_session_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."share_session_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_download_logs" ADD CONSTRAINT "share_download_logs_identity_id_external_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."external_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_events" ADD CONSTRAINT "share_events_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_expiration" ADD CONSTRAINT "share_expiration_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_labels" ADD CONSTRAINT "share_labels_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_notifications" ADD CONSTRAINT "share_notifications_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_passwords" ADD CONSTRAINT "share_passwords_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_permissions" ADD CONSTRAINT "share_permissions_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_permissions" ADD CONSTRAINT "share_permissions_recipient_id_share_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."share_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_policies" ADD CONSTRAINT "share_policies_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_policies" ADD CONSTRAINT "share_policies_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_recipients" ADD CONSTRAINT "share_recipients_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_recipients" ADD CONSTRAINT "share_recipients_identity_id_external_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."external_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_security_logs" ADD CONSTRAINT "share_security_logs_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_session_items" ADD CONSTRAINT "share_session_items_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_session_items" ADD CONSTRAINT "share_session_items_deliverable_id_deliverables_deliverable_id_fk" FOREIGN KEY ("deliverable_id") REFERENCES "public"."deliverables"("deliverable_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_session_items" ADD CONSTRAINT "share_session_items_file_id_files_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("file_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sessions" ADD CONSTRAINT "share_sessions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sessions" ADD CONSTRAINT "share_sessions_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_sessions" ADD CONSTRAINT "share_sessions_policy_id_share_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."share_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_tags" ADD CONSTRAINT "share_tags_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_token_nonces" ADD CONSTRAINT "share_token_nonces_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_token_nonces" ADD CONSTRAINT "share_token_nonces_identity_id_external_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."external_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_versions" ADD CONSTRAINT "share_versions_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_watermarks" ADD CONSTRAINT "share_watermarks_session_id_share_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."share_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_activity" ADD CONSTRAINT "client_portal_activity_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_activity" ADD CONSTRAINT "client_portal_activity_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_dashboard_layout" ADD CONSTRAINT "client_portal_dashboard_layout_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_dashboard_layout" ADD CONSTRAINT "client_portal_dashboard_layout_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_devices" ADD CONSTRAINT "client_portal_devices_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_devices" ADD CONSTRAINT "client_portal_devices_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_favorites" ADD CONSTRAINT "client_portal_favorites_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_favorites" ADD CONSTRAINT "client_portal_favorites_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_notifications" ADD CONSTRAINT "client_portal_notifications_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_notifications" ADD CONSTRAINT "client_portal_notifications_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_notifications" ADD CONSTRAINT "client_portal_notifications_notification_id_notifications_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("notification_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_preferences" ADD CONSTRAINT "client_portal_preferences_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_preferences" ADD CONSTRAINT "client_portal_preferences_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_security" ADD CONSTRAINT "client_portal_security_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_security" ADD CONSTRAINT "client_portal_security_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_sessions" ADD CONSTRAINT "client_portal_sessions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_portal_sessions" ADD CONSTRAINT "client_portal_sessions_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budgets" ADD CONSTRAINT "ai_budgets_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budgets" ADD CONSTRAINT "ai_budgets_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_budgets" ADD CONSTRAINT "ai_budgets_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_context_sources" ADD CONSTRAINT "ai_context_sources_context_id_ai_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."ai_contexts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_contexts" ADD CONSTRAINT "ai_contexts_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_session_id_ai_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" ADD CONSTRAINT "ai_cost_tracking_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cost_tracking" ADD CONSTRAINT "ai_cost_tracking_token_usage_id_ai_token_usage_id_fk" FOREIGN KEY ("token_usage_id") REFERENCES "public"."ai_token_usage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_execution_logs" ADD CONSTRAINT "ai_execution_logs_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_guardrails" ADD CONSTRAINT "ai_guardrails_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_memory" ADD CONSTRAINT "ai_memory_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_memory" ADD CONSTRAINT "ai_memory_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_memory" ADD CONSTRAINT "ai_memory_session_id_ai_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_memory" ADD CONSTRAINT "ai_memory_project_id_projects_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_limits" ADD CONSTRAINT "ai_model_limits_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_limits" ADD CONSTRAINT "ai_model_limits_model_profile_id_ai_model_profiles_id_fk" FOREIGN KEY ("model_profile_id") REFERENCES "public"."ai_model_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_profiles" ADD CONSTRAINT "ai_model_profiles_provider_id_ai_model_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_model_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_model_usage" ADD CONSTRAINT "ai_model_usage_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_prompt_templates" ADD CONSTRAINT "ai_prompt_templates_owner_id_users_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_prompt_versions" ADD CONSTRAINT "ai_prompt_versions_template_id_ai_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."ai_prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_prompt_versions" ADD CONSTRAINT "ai_prompt_versions_approved_by_users_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_ratings" ADD CONSTRAINT "ai_ratings_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_skills" ADD CONSTRAINT "ai_skills_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_skills" ADD CONSTRAINT "ai_skills_prompt_template_id_ai_prompt_templates_id_fk" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."ai_prompt_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_token_usage" ADD CONSTRAINT "ai_token_usage_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_token_usage" ADD CONSTRAINT "ai_token_usage_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_calls" ADD CONSTRAINT "ai_tool_calls_message_id_ai_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_calls" ADD CONSTRAINT "ai_tool_calls_tool_id_ai_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."ai_tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tools" ADD CONSTRAINT "ai_tools_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_workspace_preferences" ADD CONSTRAINT "ai_workspace_preferences_workspace_id_ai_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."ai_workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_workspaces" ADD CONSTRAINT "ai_workspaces_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_workspaces" ADD CONSTRAINT "ai_workspaces_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_action_queue" ADD CONSTRAINT "automation_action_queue_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_action_queue" ADD CONSTRAINT "automation_action_queue_run_id_automation_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_execution_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_action_queue" ADD CONSTRAINT "automation_action_queue_action_id_automation_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."automation_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_actions" ADD CONSTRAINT "automation_actions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_actions" ADD CONSTRAINT "automation_actions_version_id_automation_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."automation_workflow_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_api_keys" ADD CONSTRAINT "automation_api_keys_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_audit" ADD CONSTRAINT "automation_audit_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_audit" ADD CONSTRAINT "automation_audit_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_condition_groups" ADD CONSTRAINT "automation_condition_groups_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_condition_groups" ADD CONSTRAINT "automation_condition_groups_version_id_automation_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."automation_workflow_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_conditions" ADD CONSTRAINT "automation_conditions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_conditions" ADD CONSTRAINT "automation_conditions_version_id_automation_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."automation_workflow_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_dead_letter_queue" ADD CONSTRAINT "automation_dead_letter_queue_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_dead_letter_queue" ADD CONSTRAINT "automation_dead_letter_queue_run_id_automation_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_dead_letter_queue" ADD CONSTRAINT "automation_dead_letter_queue_step_id_automation_execution_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."automation_execution_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_run_id_automation_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_execution_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_step_id_automation_execution_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."automation_execution_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_runs" ADD CONSTRAINT "automation_execution_runs_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_runs" ADD CONSTRAINT "automation_execution_runs_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_runs" ADD CONSTRAINT "automation_execution_runs_version_id_automation_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."automation_workflow_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_state" ADD CONSTRAINT "automation_execution_state_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_state" ADD CONSTRAINT "automation_execution_state_run_id_automation_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_execution_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_steps" ADD CONSTRAINT "automation_execution_steps_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_steps" ADD CONSTRAINT "automation_execution_steps_run_id_automation_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_execution_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_execution_steps" ADD CONSTRAINT "automation_execution_steps_action_id_automation_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."automation_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_permissions" ADD CONSTRAINT "automation_permissions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_permissions" ADD CONSTRAINT "automation_permissions_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rate_limits" ADD CONSTRAINT "automation_rate_limits_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_retry_policy" ADD CONSTRAINT "automation_retry_policy_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_retry_policy" ADD CONSTRAINT "automation_retry_policy_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_retry_policy" ADD CONSTRAINT "automation_retry_policy_action_id_automation_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."automation_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_schedules" ADD CONSTRAINT "automation_schedules_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_schedules" ADD CONSTRAINT "automation_schedules_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_statistics" ADD CONSTRAINT "automation_statistics_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_statistics" ADD CONSTRAINT "automation_statistics_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_templates" ADD CONSTRAINT "automation_templates_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_triggers" ADD CONSTRAINT "automation_triggers_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_triggers" ADD CONSTRAINT "automation_triggers_version_id_automation_workflow_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."automation_workflow_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_variables" ADD CONSTRAINT "automation_variables_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_variables" ADD CONSTRAINT "automation_variables_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_webhooks" ADD CONSTRAINT "automation_webhooks_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_webhooks" ADD CONSTRAINT "automation_webhooks_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_versions" ADD CONSTRAINT "automation_workflow_versions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflow_versions" ADD CONSTRAINT "automation_workflow_versions_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_capability_id_automation_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."automation_capabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_capabilities" ADD CONSTRAINT "ai_agent_capabilities_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_capabilities" ADD CONSTRAINT "ai_agent_capabilities_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_checkpoint_ledger" ADD CONSTRAINT "ai_agent_checkpoint_ledger_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_checkpoint_ledger" ADD CONSTRAINT "ai_agent_checkpoint_ledger_run_id_ai_agent_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_checkpoint_ledger" ADD CONSTRAINT "ai_agent_checkpoint_ledger_plan_version_reference_ai_agent_plans_id_fk" FOREIGN KEY ("plan_version_reference") REFERENCES "public"."ai_agent_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_context" ADD CONSTRAINT "ai_agent_context_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_context" ADD CONSTRAINT "ai_agent_context_step_id_ai_agent_execution_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."ai_agent_execution_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_costs" ADD CONSTRAINT "ai_agent_costs_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_costs" ADD CONSTRAINT "ai_agent_costs_run_id_ai_agent_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_execution_runs" ADD CONSTRAINT "ai_agent_execution_runs_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_execution_runs" ADD CONSTRAINT "ai_agent_execution_runs_goal_id_ai_agent_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."ai_agent_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_execution_runs" ADD CONSTRAINT "ai_agent_execution_runs_session_id_ai_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_agent_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_execution_steps" ADD CONSTRAINT "ai_agent_execution_steps_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_execution_steps" ADD CONSTRAINT "ai_agent_execution_steps_run_id_ai_agent_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_execution_steps" ADD CONSTRAINT "ai_agent_execution_steps_plan_step_id_ai_agent_plan_steps_id_fk" FOREIGN KEY ("plan_step_id") REFERENCES "public"."ai_agent_plan_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_explainability_ledger" ADD CONSTRAINT "ai_agent_explainability_ledger_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_explainability_ledger" ADD CONSTRAINT "ai_agent_explainability_ledger_run_id_ai_agent_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_explainability_ledger" ADD CONSTRAINT "ai_agent_explainability_ledger_goal_reference_ai_agent_goals_id_fk" FOREIGN KEY ("goal_reference") REFERENCES "public"."ai_agent_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_explainability_ledger" ADD CONSTRAINT "ai_agent_explainability_ledger_plan_version_reference_ai_agent_plans_id_fk" FOREIGN KEY ("plan_version_reference") REFERENCES "public"."ai_agent_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_explainability_ledger" ADD CONSTRAINT "ai_agent_explainability_ledger_context_reference_ai_agent_context_id_fk" FOREIGN KEY ("context_reference") REFERENCES "public"."ai_agent_context"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_explainability_ledger" ADD CONSTRAINT "ai_agent_explainability_ledger_tool_usage_reference_ai_agent_tool_usage_id_fk" FOREIGN KEY ("tool_usage_reference") REFERENCES "public"."ai_agent_tool_usage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_explainability_ledger" ADD CONSTRAINT "ai_agent_explainability_ledger_approval_reference_ai_agent_human_approvals_id_fk" FOREIGN KEY ("approval_reference") REFERENCES "public"."ai_agent_human_approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_goals" ADD CONSTRAINT "ai_agent_goals_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_goals" ADD CONSTRAINT "ai_agent_goals_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_human_approvals" ADD CONSTRAINT "ai_agent_human_approvals_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_human_approvals" ADD CONSTRAINT "ai_agent_human_approvals_step_id_ai_agent_execution_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."ai_agent_execution_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_human_approvals" ADD CONSTRAINT "ai_agent_human_approvals_approver_id_users_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_limits" ADD CONSTRAINT "ai_agent_limits_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_limits" ADD CONSTRAINT "ai_agent_limits_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_memory" ADD CONSTRAINT "ai_agent_memory_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_memory" ADD CONSTRAINT "ai_agent_memory_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_memory" ADD CONSTRAINT "ai_agent_memory_session_id_ai_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_agent_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_observations" ADD CONSTRAINT "ai_agent_observations_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_observations" ADD CONSTRAINT "ai_agent_observations_step_id_ai_agent_execution_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."ai_agent_execution_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_permissions" ADD CONSTRAINT "ai_agent_permissions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_permissions" ADD CONSTRAINT "ai_agent_permissions_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_plan_steps" ADD CONSTRAINT "ai_agent_plan_steps_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_plan_steps" ADD CONSTRAINT "ai_agent_plan_steps_plan_id_ai_agent_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."ai_agent_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_plans" ADD CONSTRAINT "ai_agent_plans_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_plans" ADD CONSTRAINT "ai_agent_plans_run_id_ai_agent_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_reflections" ADD CONSTRAINT "ai_agent_reflections_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_reflections" ADD CONSTRAINT "ai_agent_reflections_run_id_ai_agent_execution_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_execution_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_sessions" ADD CONSTRAINT "ai_agent_sessions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_sessions" ADD CONSTRAINT "ai_agent_sessions_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_sessions" ADD CONSTRAINT "ai_agent_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_skills" ADD CONSTRAINT "ai_agent_skills_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_skills" ADD CONSTRAINT "ai_agent_skills_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_statistics" ADD CONSTRAINT "ai_agent_statistics_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_statistics" ADD CONSTRAINT "ai_agent_statistics_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_tool_usage" ADD CONSTRAINT "ai_agent_tool_usage_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_tool_usage" ADD CONSTRAINT "ai_agent_tool_usage_step_id_ai_agent_execution_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."ai_agent_execution_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_versions" ADD CONSTRAINT "ai_agent_versions_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_versions" ADD CONSTRAINT "ai_agent_versions_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_organization_id_organizations_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_approval_conditions_review_id" ON "approval_conditions" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "idx_approval_cycles_org_entity" ON "approval_cycles" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_approval_cycles_status" ON "approval_cycles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_approval_events_cycle_id" ON "approval_events" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "idx_approval_stages_cycle_id" ON "approval_stages" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "idx_approval_workflows_org_id" ON "approval_workflows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_approval_workflows_routing" ON "approval_workflows" USING gin ("routing_rules_json");--> statement-breakpoint
CREATE INDEX "idx_reviews_stage_id" ON "reviews" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_reviewer_id" ON "reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_external_token" ON "reviews" USING btree ("external_token");--> statement-breakpoint
CREATE INDEX "idx_revisions_project" ON "revisions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_revisions_deliverable" ON "revisions" USING btree ("deliverable_id");--> statement-breakpoint
CREATE INDEX "idx_mtg_activity_metadata" ON "meeting_activity" USING gin ("metadata");--> statement-breakpoint
CREATE INDEX "idx_meeting_attendees_meeting" ON "meeting_attendees" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_meeting_attendees_user" ON "meeting_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_meeting_outcomes_meeting" ON "meeting_outcomes" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_meeting_outcomes_type" ON "meeting_outcomes" USING btree ("outcome_type");--> statement-breakpoint
CREATE INDEX "idx_mtg_transcripts_segments" ON "meeting_transcripts" USING gin ("processed_segments");--> statement-breakpoint
CREATE INDEX "idx_mtg_transcripts_topics" ON "meeting_transcripts" USING gin ("topics");--> statement-breakpoint
CREATE INDEX "idx_mtg_transcripts_keywords" ON "meeting_transcripts" USING gin ("keywords");--> statement-breakpoint
CREATE INDEX "idx_meetings_project" ON "meetings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_timeline" ON "meetings" USING btree ("timeline_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_start_time" ON "meetings" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_events_org_type" ON "events"."events" USING btree ("organization_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_events_aggregate" ON "events"."events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "idx_events_correlation" ON "events"."events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "idx_events_created" ON "events"."events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notif_activity_notification" ON "notification_activity" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notif_channels_org_type" ON "notification_channels" USING btree ("organization_id","channel_type");--> statement-breakpoint
CREATE INDEX "idx_notif_deliveries_notification" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_notif_deliveries_status" ON "notification_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notif_digest_polling" ON "notification_digest" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_notif_digest_user" ON "notification_digest" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_notif_failures_delivery" ON "notification_failures" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "idx_notif_logs_delivery" ON "notification_logs" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "idx_notif_prefs_user" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notif_prefs_project" ON "notification_preferences" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_notif_prefs_org_level" ON "notification_preferences" USING btree ("organization_id","level");--> statement-breakpoint
CREATE INDEX "idx_notif_queue_polling" ON "notification_queue" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_notif_templates_org_event" ON "notification_templates" USING btree ("organization_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_notif_webhooks_org" ON "notification_webhooks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_status" ON "notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_event" ON "notifications" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_org" ON "notifications" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_external_identities_org_email" ON "external_identities" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "idx_share_access_logs_session" ON "share_access_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_share_activity_session" ON "share_activity" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_share_annotations_item" ON "share_annotations" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_share_annotations_session_created" ON "share_annotations" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_share_annotations_item_created" ON "share_annotations" USING btree ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_share_comments_item" ON "share_comments" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_share_comments_session" ON "share_comments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_share_comments_session_created" ON "share_comments" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_share_comments_item_created" ON "share_comments" USING btree ("item_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_share_permissions_session_recipient" ON "share_permissions" USING btree ("session_id","recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_share_recipients_unique" ON "share_recipients" USING btree ("session_id","identity_id");--> statement-breakpoint
CREATE INDEX "idx_share_recipients_session" ON "share_recipients" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_share_session_items_session" ON "share_session_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_share_sessions_org" ON "share_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_share_sessions_project" ON "share_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_share_sessions_token" ON "share_sessions" USING btree ("secure_token");--> statement-breakpoint
CREATE INDEX "idx_share_sessions_status" ON "share_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_share_token_nonces_nonce" ON "share_token_nonces" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "idx_cp_activity_client_id" ON "client_portal_activity" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cp_activity_resource" ON "client_portal_activity" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_cp_activity_client_created" ON "client_portal_activity" USING btree ("client_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_cp_layout_client_id" ON "client_portal_dashboard_layout" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cp_devices_client_id" ON "client_portal_devices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cp_devices_fingerprint" ON "client_portal_devices" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "idx_cp_favorites_client_id" ON "client_portal_favorites" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cp_notifications_client_id" ON "client_portal_notifications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cp_preferences_client_id" ON "client_portal_preferences" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cp_sessions_org_id" ON "client_portal_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_cp_sessions_client_id" ON "client_portal_sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_cp_sessions_token" ON "client_portal_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "ai_budgets_org_idx" ON "ai_budgets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_budgets_project_idx" ON "ai_budgets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_budgets_conv_idx" ON "ai_budgets" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_context_sources_ctx_idx" ON "ai_context_sources" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "ai_contexts_msg_idx" ON "ai_contexts" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_org_idx" ON "ai_conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_session_idx" ON "ai_conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_conversations_project_idx" ON "ai_conversations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_cost_tracking_org_idx" ON "ai_cost_tracking" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_cost_tracking_usage_idx" ON "ai_cost_tracking" USING btree ("token_usage_id");--> statement-breakpoint
CREATE INDEX "ai_execution_logs_msg_idx" ON "ai_execution_logs" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ai_execution_logs_model_idx" ON "ai_execution_logs" USING btree ("model_profile_id");--> statement-breakpoint
CREATE INDEX "ai_feedback_msg_idx" ON "ai_feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ai_feedback_user_idx" ON "ai_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_guardrails_org_idx" ON "ai_guardrails" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_memory_org_idx" ON "ai_memory" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_memory_conv_idx" ON "ai_memory" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_memory_session_idx" ON "ai_memory" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ai_memory_project_idx" ON "ai_memory" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ai_memory_expires_idx" ON "ai_memory" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ai_messages_conv_idx" ON "ai_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "ai_model_limits_org_idx" ON "ai_model_limits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_model_profiles_prov_idx" ON "ai_model_profiles" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ai_model_usage_org_idx" ON "ai_model_usage" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_model_usage_model_idx" ON "ai_model_usage" USING btree ("model_profile_id");--> statement-breakpoint
CREATE INDEX "ai_prompt_templates_org_idx" ON "ai_prompt_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_prompt_versions_tmpl_idx" ON "ai_prompt_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "ai_ratings_org_idx" ON "ai_ratings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_ratings_target_idx" ON "ai_ratings" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "ai_sessions_org_idx" ON "ai_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_sessions_user_idx" ON "ai_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_skills_org_idx" ON "ai_skills" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_token_usage_org_idx" ON "ai_token_usage" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_token_usage_msg_idx" ON "ai_token_usage" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ai_tool_calls_msg_idx" ON "ai_tool_calls" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "ai_tool_calls_tool_idx" ON "ai_tool_calls" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "ai_tools_org_idx" ON "ai_tools" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_workspace_prefs_ws_idx" ON "ai_workspace_preferences" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ai_workspaces_org_idx" ON "ai_workspaces" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_workspaces_user_idx" ON "ai_workspaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_automation_queue_run" ON "automation_action_queue" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_automation_queue_status" ON "automation_action_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_automation_dlq_run" ON "automation_dead_letter_queue" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_automation_dlq_next_retry" ON "automation_dead_letter_queue" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_automation_logs_run" ON "automation_execution_logs" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_automation_runs_idempotency" ON "automation_execution_runs" USING btree ("organization_id","workflow_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_automation_runs_workflow" ON "automation_execution_runs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_automation_runs_status" ON "automation_execution_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_automation_state_worker" ON "automation_execution_state" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "idx_automation_state_run" ON "automation_execution_state" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_automation_steps_run" ON "automation_execution_steps" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_automation_steps_status" ON "automation_execution_steps" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_automation_variables_name" ON "automation_variables" USING btree ("workflow_id","name");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_capabilities_org_id" ON "ai_agent_capabilities" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_capabilities_agent_id" ON "ai_agent_capabilities" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_checkpt_ledger_org_id" ON "ai_agent_checkpoint_ledger" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_checkpt_ledger_run_id" ON "ai_agent_checkpoint_ledger" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_context_org_id" ON "ai_agent_context" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_context_step_id" ON "ai_agent_context" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_costs_org_id" ON "ai_agent_costs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_costs_run_id" ON "ai_agent_costs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_runs_org_id" ON "ai_agent_execution_runs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_runs_goal_id" ON "ai_agent_execution_runs" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_runs_session_id" ON "ai_agent_execution_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_exec_steps_org_id" ON "ai_agent_execution_steps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_exec_steps_run_id" ON "ai_agent_execution_steps" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_exec_steps_plan_step_id" ON "ai_agent_execution_steps" USING btree ("plan_step_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_expl_ledger_org_id" ON "ai_agent_explainability_ledger" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_expl_ledger_run_id" ON "ai_agent_explainability_ledger" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_expl_ledger_plan_id" ON "ai_agent_explainability_ledger" USING btree ("plan_version_reference");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_expl_ledger_context_id" ON "ai_agent_explainability_ledger" USING btree ("context_reference");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_goals_org_id" ON "ai_agent_goals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_goals_agent_id" ON "ai_agent_goals" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_human_approvals_org_id" ON "ai_agent_human_approvals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_human_approvals_step_id" ON "ai_agent_human_approvals" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_limits_org_id" ON "ai_agent_limits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_limits_agent_id" ON "ai_agent_limits" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_memory_org_id" ON "ai_agent_memory" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_memory_agent_id" ON "ai_agent_memory" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_memory_session_id" ON "ai_agent_memory" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_observations_org_id" ON "ai_agent_observations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_observations_step_id" ON "ai_agent_observations" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_permissions_org_id" ON "ai_agent_permissions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_permissions_agent_id" ON "ai_agent_permissions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_plan_steps_org_id" ON "ai_agent_plan_steps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_plan_steps_plan_id" ON "ai_agent_plan_steps" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_plans_org_id" ON "ai_agent_plans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_plans_run_id" ON "ai_agent_plans" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_reflections_org_id" ON "ai_agent_reflections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_reflections_run_id" ON "ai_agent_reflections" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_sessions_org_id" ON "ai_agent_sessions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_sessions_agent_id" ON "ai_agent_sessions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_sessions_user_id" ON "ai_agent_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_skills_org_id" ON "ai_agent_skills" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_skills_agent_id" ON "ai_agent_skills" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_stats_org_id" ON "ai_agent_statistics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_stats_agent_id" ON "ai_agent_statistics" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tool_usage_org_id" ON "ai_agent_tool_usage" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_tool_usage_step_id" ON "ai_agent_tool_usage" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_versions_org_id" ON "ai_agent_versions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agent_versions_agent_id" ON "ai_agent_versions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agents_org_id" ON "ai_agents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_ai_agents_created_at" ON "ai_agents" USING btree ("created_at");--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_activity" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_assignments" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_changes" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_checklists" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_comments" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_history" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_labels" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_merge_previews" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revision_threads" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "project_isolation_policy" ON "revisions" AS PERMISSIVE FOR ALL TO "authenticated" USING (organization_id = (SELECT organization_id FROM users WHERE user_id = auth.uid()) AND project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));