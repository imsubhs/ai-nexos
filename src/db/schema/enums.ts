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

export const clientStatusEnum = pgEnum("client_status", [
  "active",
  "prospect",
  "archived",
]);

export const clientHealthEnum = pgEnum("client_health", [
  "good",
  "at_risk",
  "critical",
]);

export const contactTypeEnum = pgEnum("contact_type", [
  "primary",
  "billing",
  "marketing",
  "technical",
  "legal",
]);

export const communicationPreferenceEnum = pgEnum("preferred_communication", [
  "email",
  "slack",
  "whatsapp",
  "phone",
]);

export const projectPriorityEnum = pgEnum("project_priority", ["critical", "high", "medium", "low"]);
export const projectHealthEnum = pgEnum("project_health", ["on_track", "at_risk", "delayed", "blocked", "completed"]);
export const projectVisibilityEnum = pgEnum("project_visibility", ["private", "internal", "client_shared"]);
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "research",
  "brief_received",
  "in_progress",
  "internal_review",
  "client_review",
  "revision",
  "approved",
  "completed",
  "on_hold",
  "cancelled",
  "archived",
]);

export const timelineStatusEnum = pgEnum("timeline_status", [
  "planning",
  "research",
  "ready",
  "in_progress",
  "blocked",
  "review",
  "client_review",
  "revision",
  "approved",
  "completed",
  "cancelled",
  "archived",
]);

export const projectPhaseNameEnum = pgEnum("project_phase_name", [
  "planning",
  "pre_production",
  "production",
  "post_production",
  "delivery",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "not_started",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
]);

export const dependencyTypeEnum = pgEnum("dependency_type", ["FS", "SS", "FF", "SF"]);

export const taskStatusEnum = pgEnum("task_status", [
  "backlog",
  "todo",
  "ready",
  "in_progress",
  "blocked",
  "waiting",
  "review",
  "client_review",
  "approved",
  "completed",
  "cancelled",
  "archived",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const taskTypeEnum = pgEnum("task_type", [
  "creative",
  "design",
  "video_editing",
  "motion_graphics",
  "prompt_engineering",
  "ai_generation",
  "qa",
  "review",
  "documentation",
  "meeting",
  "development",
  "research",
  "marketing",
  "other",
]);

export const taskDependencyTypeEnum = pgEnum("task_dependency_type", [
  "finish_to_start",
  "start_to_start",
  "finish_to_finish",
  "start_to_finish",
  "blocking",
  "related"
]);

export const taskActivityEventEnum = pgEnum("task_activity_event", [
  "created",
  "updated",
  "status_changed",
  "assigned",
  "unassigned",
  "comment_added",
  "attachment_added",
  "checklist_added",
  "time_logged",
  "deleted",
]);

export const fileLifecycleStatusEnum = pgEnum("file_lifecycle_status", [
  "draft",
  "uploading",
  "uploaded",
  "queued",
  "scanning",
  "metadata_extraction",
  "thumbnail_generation",
  "ready",
  "published",
  "archived",
  "deleted",
]);

export const fileTypeEnum = pgEnum("file_type", [
  "image",
  "video",
  "audio",
  "document",
  "archive",
  "3d_model",
  "font",
  "code",
  "other",
]);

export const fileRelationTypeEnum = pgEnum("file_relation_type", [
  "task",
  "milestone",
  "project",
  "client",
  "meeting",
  "deliverable",
  "comment",
  "approval",
  "prompt",
  "brand_asset",
]);

export const fileShareAccessEnum = pgEnum("file_share_access", [
  "preview",
  "download",
  "metadata",
  "comment",
  "version_upload",
  "delete"
]);

export const fileActivityEventEnum = pgEnum("file_activity_event", [
  "uploaded",
  "version_added",
  "downloaded",
  "shared",
  "moved",
  "renamed",
  "deleted",
  "restored",
]);

export const deliverableTypeEnum = pgEnum("deliverable_type", [
  "storyboard",
  "script",
  "prompt_pack",
  "prompt_collection",
  "moodboard",
  "character_sheet",
  "character_pack",
  "scene_pack",
  "image_set",
  "video_draft",
  "final_video",
  "voice_over",
  "audio_mix",
  "animation",
  "presentation",
  "brand_identity",
  "logo_package",
  "marketing_campaign",
  "social_media_kit",
  "website",
  "landing_page",
  "documentation",
  "contract",
  "invoice",
  "proposal",
  "other",
]);

export const deliverableStatusEnum = pgEnum("deliverable_status", [
  "draft",
  "preparing",
  "internal_review",
  "creative_review",
  "qa",
  "ready_for_client",
  "client_review",
  "revision_requested",
  "approved",
  "rejected",
  "delivered",
  "archived",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "approved_with_comments",
  "rejected",
  "expired",
  "cancelled",
]);

export const reviewTypeEnum = pgEnum("review_type", [
  "internal_review",
  "creative_director",
  "qa",
  "legal",
  "client_review",
  "executive_review",
  "final_approval",
]);

export const shareLinkAccessLevelEnum = pgEnum("share_link_access_level", [
  "view_only",
  "comment_only",
  "approval_only",
]);

export const approvalEntityTypeEnum = pgEnum("approval_entity_type", [
  "deliverable",
  "file",
  "brand_asset",
  "creative_brief",
  "contract",
  "invoice",
  "prompt_pack",
  "campaign",
  "ai_content",
]);

export const approvalCycleStatusEnum = pgEnum("approval_cycle_status", [
  "pending",
  "in_progress",
  "approved",
  "rejected",
  "conditional",
  "cancelled",
]);

export const approvalStageStatusEnum = pgEnum("approval_stage_status", [
  "pending",
  "active",
  "completed",
  "skipped",
  "rejected",
]);

export const approvalReviewStatusEnum = pgEnum("approval_review_status", [
  "pending",
  "approved",
  "rejected",
  "approved_with_conditions",
  "delegated",
  "abstained",
]);

export const approvalEventTypeEnum = pgEnum("approval_event_type", [
  "cycle_started",
  "stage_started",
  "review_requested",
  "review_submitted",
  "review_delegated",
  "cycle_approved",
  "cycle_rejected",
  "sla_reminder_1",
  "sla_reminder_2",
  "sla_escalated_pm",
  "sla_escalated_admin",
]);

export const revisionTypeEnum = pgEnum("revision_type", [
  "MINOR",
  "MAJOR",
  "CLIENT_REQUESTED",
  "INTERNAL",
  "CREATIVE",
  "TECHNICAL",
  "LEGAL",
  "EMERGENCY",
  "ROLLBACK",
  "HOTFIX"
]);

export const revisionStatusEnum = pgEnum("revision_status", [
  "REQUESTED",
  "CREATED",
  "ASSIGNED",
  "WIP",
  "INTERNAL_REVIEW",
  "QA",
  "READY_FOR_APPROVAL",
  "APPROVED",
  "REJECTED",
  "MERGED",
  "ARCHIVED"
]);

export const revisionPriorityEnum = pgEnum("revision_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT"
]);

export const meetingTypeEnum = pgEnum("meeting_type", [
  "kickoff",
  "discovery",
  "client_review",
  "creative_review",
  "internal_standup",
  "sprint_planning",
  "sprint_review",
  "retrospective",
  "approval_meeting",
  "revision_meeting",
  "production_meeting",
  "qa_review",
  "stakeholder_meeting",
  "executive_review",
  "finance",
  "legal",
  "vendor",
  "emergency",
  "other"
]);

export const meetingStatusEnum = pgEnum("meeting_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "postponed",
  "archived"
]);

export const meetingOutcomeTypeEnum = pgEnum("meeting_outcome_type", [
  "decision",
  "issue",
  "risk",
  "idea",
  "question",
  "blocker",
  "action_item"
]);

export const decisionStatusEnum = pgEnum("decision_status", [
  "open",
  "pending",
  "accepted",
  "implemented",
  "obsolete"
]);

export const decisionTypeEnum = pgEnum("decision_type", [
  "strategic",
  "tactical",
  "creative",
  "technical",
  "financial",
  "resource",
  "other"
]);

export const actionItemStatusEnum = pgEnum("action_item_status", [
  "open",
  "in_progress",
  "blocked",
  "completed",
  "cancelled"
]);

export const meetingRecordingStatusEnum = pgEnum("meeting_recording_status", [
  "pending",
  "processing",
  "completed",
  "failed"
]);

export const meetingProviderEnum = pgEnum("meeting_provider", [
  "zoom",
  "google_meet",
  "teams",
  "webex",
  "otter",
  "manual",
  "custom"
]);

// Module 12: Notification & Event Engine

export const eventTypeEnum = pgEnum("event_type", [
  "project",
  "task",
  "timeline",
  "meeting",
  "decision",
  "action_item",
  "deliverable",
  "revision",
  "approval",
  "comment",
  "mention",
  "client",
  "system"
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "critical",
  "high",
  "normal",
  "low"
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "processing",
  "delivered",
  "read",
  "archived",
  "failed",
  "dismissed"
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "in_app",
  "push",
  "slack",
  "teams",
  "discord",
  "whatsapp",
  "sms",
  "webhook"
]);

export const notificationDigestFrequencyEnum = pgEnum("notification_digest_frequency", [
  "instant",
  "hourly",
  "daily",
  "weekly"
]);

export const notificationDeliveryStatusEnum = pgEnum("notification_delivery_status", [
  "queued",
  "processing",
  "sent",
  "delivered",
  "failed"
]);

export const notificationQueueStatusEnum = pgEnum("notification_queue_status", [
  "pending",
  "processing",
  "completed",
  "failed"
]);

export const notificationDigestStatusEnum = pgEnum("notification_digest_status", [
  "collecting",
  "processing",
  "sent"
]);

export const notificationActivityTypeEnum = pgEnum("notification_activity_type", [
  "clicked",
  "hovered",
  "expanded"
]);

export const notificationPreferenceLevelEnum = pgEnum("notification_preference_level", [
  "organization",
  "project",
  "user"
]);

// Module 13: Client Share & Collaboration Engine
export const shareTypeEnum = pgEnum("share_type", [
  "deliverable_review",
  "approval_request",
  "revision_review",
  "creative_feedback",
  "internal_qa",
  "vendor_review",
  "legal_review",
  "finance_review",
  "public_showcase"
]);

export const shareSessionStatusEnum = pgEnum("share_session_status", [
  "draft",
  "published",
  "paused",
  "locked",
  "expired",
  "closed",
  "archived"
]);

export const sharePermissionLevelEnum = pgEnum("share_permission_level", [
  "viewer",
  "commenter",
  "approver",
  "reviewer",
  "downloader"
]);

export const annotationTypeEnum = pgEnum("annotation_type", [
  "point",
  "area",
  "timestamp",
  "text",
  "drawing",
  "attachment"
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "open",
  "resolved"
]);

// Module 14: Client Portal
export const portalSessionStatusEnum = pgEnum("portal_session_status", [
  "active",
  "revoked",
  "expired"
]);

export const portalWidgetTypeEnum = pgEnum("portal_widget_type", [
  "projects",
  "approvals",
  "deliverables",
  "revisions",
  "meetings",
  "activity",
  "notifications",
  "custom"
]);

// Module 16: AI Workspace
export const aiCapabilityEnum = pgEnum("ai_capability", [
  "chat",
  "text_generation",
  "summarization",
  "code_generation",
  "data_extraction",
  "vision",
  "tool_use",
  "reasoning",
  "creative"
]);

export const aiProviderEnum = pgEnum("ai_provider", [
  "openai",
  "anthropic",
  "google",
  "meta",
  "cohere",
  "custom"
]);

export const aiMemoryLayerEnum = pgEnum("ai_memory_layer", [
  "conversation",
  "session",
  "project",
  "organization"
]);

export const aiMessageRoleEnum = pgEnum("ai_message_role", [
  "system",
  "user",
  "assistant",
  "tool",
  "function"
]);

export const aiApprovalStatusEnum = pgEnum("ai_approval_status", [
  "pending_human",
  "approved",
  "rejected",
  "bypassed",
  "auto_approved"
]);

// Module 17: Automation Engine
export const automationTriggerTypeEnum = pgEnum("automation_trigger_type", [
  "platform_event",
  "schedule",
  "webhook",
  "manual",
  "api"
]);

export const automationActionTypeEnum = pgEnum("automation_action_type", [
  "create",
  "update",
  "delete",
  "notify",
  "assign",
  "generate",
  "approve",
  "reject",
  "request_review",
  "send_email",
  "webhook",
  "ai_workspace",
  "compensation"
]);

export const automationWorkflowStatusEnum = pgEnum("automation_workflow_status", [
  "draft",
  "active",
  "paused",
  "archived"
]);

export const automationExecutionStatusEnum = pgEnum("automation_execution_status", [
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
  "compensating",
  "compensated"
]);

export const automationVariableTypeEnum = pgEnum("automation_variable_type", [
  "string",
  "number",
  "boolean",
  "date",
  "enum",
  "json",
  "secret_reference"
]);

// Module 19: AI Agents
export const agentStateEnum = pgEnum("agent_state", [
  "CREATED",
  "PLANNING",
  "WAITING_FOR_APPROVAL",
  "READY",
  "RUNNING",
  "PAUSED",
  "REPLANNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export const agentConfidenceThresholdEnum = pgEnum("agent_confidence_threshold", [
  "auto_execute",
  "human_approval",
  "abort"
]);

export const agentMemoryTypeEnum = pgEnum("agent_memory_type", [
  "session",
  "working",
  "persistent",
  "reflection"
]);

export const agentPlanStatusEnum = pgEnum("agent_plan_status", [
  "active",
  "superseded",
  "failed",
  "completed"
]);
