import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";
import {
  meetingTypeEnum,
  meetingStatusEnum,
  meetingOutcomeTypeEnum,
  decisionStatusEnum,
  decisionTypeEnum,
  actionItemStatusEnum,
  meetingRecordingStatusEnum,
  meetingProviderEnum,
  taskPriorityEnum,
} from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { timelines } from "./timelines";
import { users } from "./users";
import { tasks, labels } from "./tasks";
import { deliverables } from "./deliverables";
import { revisions } from "./revisions";
import { approvalCycles } from "./approvals";
import { auditFields } from "./_shared";

/**
 * MEETING TEMPLATES (Reserved)
 */
export const meetingTemplates = pgTable("meeting_templates", {
  templateId: uuid("template_id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.organizationId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  defaultType: meetingTypeEnum("default_type"),
  agendaTemplate: jsonb("agenda_template"), // Array of default agenda items
  ...auditFields,
});

/**
 * MEETings CORE
 */
export const meetings = pgTable(
  "meetings",
  {
    meetingId: uuid("meeting_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    timelineId: uuid("timeline_id").references(() => timelines.timelineId, {
      onDelete: "set null",
    }), // Link to display on timeline
    templateId: uuid("template_id").references(
      () => meetingTemplates.templateId,
      { onDelete: "set null" },
    ),

    title: text("title").notNull(),
    description: text("description"),
    meetingType: meetingTypeEnum("meeting_type").notNull().default("other"),
    status: meetingStatusEnum("status").notNull().default("scheduled"),

    // Scheduling
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    timezone: text("timezone"),

    // Location / Links
    location: text("location"),
    meetingUrl: text("meeting_url"), // Provider agnostic
    provider: meetingProviderEnum("provider"), // e.g., "zoom", "google_meet", "teams", "custom"
    externalMeetingId: text("external_meeting_id"),

    // Security / Visibility
    isPrivate: boolean("is_private").notNull().default(false),
    isConfidential: boolean("is_confidential").notNull().default(false),

    // Notes & AI (Reserved)
    notes: jsonb("notes"), // Rich text notes
    aiSummaryId: uuid("ai_summary_id"), // Reserved for AI
    aiSummaryProcessingStatus: text("ai_summary_processing_status"), // Reserved for AI

    ...auditFields,
  },
  (table) => [
    index("idx_meetings_project").on(table.projectId),
    index("idx_meetings_timeline").on(table.timelineId),
    index("idx_meetings_start_time").on(table.startTime),
  ],
);

/**
 * MEETING ATTENDEES
 */
export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    attendeeId: uuid("attendee_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.meetingId, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.userId, {
      onDelete: "cascade",
    }), // Can be null if external contact
    externalEmail: text("external_email"), // For non-OS users
    role: text("role").default("participant"), // e.g., "organizer", "participant", "optional"
    rsvpStatus: text("rsvp_status").default("pending"), // "accepted", "declined", "tentative", "pending"
    ...auditFields,
  },
  (table) => [
    index("idx_meeting_attendees_meeting").on(table.meetingId),
    index("idx_meeting_attendees_user").on(table.userId),
  ],
);

/**
 * MEETING AGENDA
 */
export const meetingAgenda = pgTable("meeting_agenda", {
  agendaItemId: uuid("agenda_item_id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.meetingId, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  timeAllottedMins: integer("time_allotted_mins"),
  speakerId: uuid("speaker_id").references(() => users.userId, {
    onDelete: "set null",
  }),
  isCompleted: boolean("is_completed").notNull().default(false),
  ...auditFields,
});

/**
 * MEETING OUTCOMES
 * A generic bucket for anything that comes out of a meeting.
 */
export const meetingOutcomes = pgTable(
  "meeting_outcomes",
  {
    outcomeId: uuid("outcome_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.meetingId, { onDelete: "cascade" }),

    outcomeType: meetingOutcomeTypeEnum("outcome_type").notNull(), // decision, issue, risk, idea, question, blocker, action_item
    title: text("title").notNull(),
    description: text("description"),

    raisedById: uuid("raised_by_id").references(() => users.userId, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id").references(() => users.userId, {
      onDelete: "set null",
    }),

    ...auditFields,
  },
  (table) => [
    index("idx_meeting_outcomes_meeting").on(table.meetingId),
    index("idx_meeting_outcomes_type").on(table.outcomeType),
  ],
);

/**
 * MEETING DECISIONS (Linked 1:1 with an Outcome of type 'decision')
 */
export const meetingDecisions = pgTable("meeting_decisions", {
  decisionId: uuid("decision_id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  outcomeId: uuid("outcome_id")
    .notNull()
    .references(() => meetingOutcomes.outcomeId, { onDelete: "cascade" })
    .unique(),

  decisionType: decisionTypeEnum("decision_type").notNull().default("other"),
  status: decisionStatusEnum("status").notNull().default("open"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),

  reason: text("reason"),
  impactDescription: text("impact_description"),
  riskLevel: text("risk_level"),

  ...auditFields,
});

/**
 * DECISION DEPENDENCIES (Reserved)
 */
export const decisionDependencies = pgTable(
  "decision_dependencies",
  {
    dependencyId: uuid("dependency_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => meetingDecisions.decisionId, { onDelete: "cascade" }),
    dependsOnDecisionId: uuid("depends_on_decision_id")
      .notNull()
      .references(() => meetingDecisions.decisionId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_decision_dependency").on(
      table.decisionId,
      table.dependsOnDecisionId,
    ),
  ],
);

/**
 * MEETING ACTION ITEMS (Linked 1:1 with an Outcome of type 'action_item')
 */
export const meetingActionItems = pgTable("meeting_action_items", {
  actionItemId: uuid("action_item_id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  outcomeId: uuid("outcome_id")
    .notNull()
    .references(() => meetingOutcomes.outcomeId, { onDelete: "cascade" })
    .unique(),

  status: actionItemStatusEnum("status").notNull().default("open"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  estimatedDurationMins: integer("estimated_duration_mins"),

  // Explicit Promotion Linkage
  promotedToTaskId: uuid("promoted_to_task_id").references(() => tasks.taskId, {
    onDelete: "set null",
  }),

  ...auditFields,
});

/**
 * MEETING RECORDINGS
 */
export const meetingRecordings = pgTable("meeting_recordings", {
  recordingId: uuid("recording_id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.meetingId, { onDelete: "cascade" }),

  mediaType: text("media_type").notNull(), // "video", "audio"
  storageUrl: text("storage_url").notNull(),
  fileSize: integer("file_size"),
  durationMins: integer("duration_mins"),

  status: meetingRecordingStatusEnum("status").notNull().default("pending"),
  processingProgress: integer("processing_progress").default(0), // 0-100

  speakerTimelineData: jsonb("speaker_timeline_data"),

  ...auditFields,
});

/**
 * MEETING TRANSCRIPTS
 * Transcript ingestion supports Provider or Manual Upload through a provider abstraction.
 */
export const meetingTranscripts = pgTable(
  "meeting_transcripts",
  {
    transcriptId: uuid("transcript_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.meetingId, { onDelete: "cascade" }),
    recordingId: uuid("recording_id").references(
      () => meetingRecordings.recordingId,
      { onDelete: "set null" },
    ),

    sourceType: text("source_type").notNull().default("manual"), // "provider", "manual"
    providerName: meetingProviderEnum("provider_name"), // e.g. "otter", "zoom", "custom"

    rawText: text("raw_text"),
    processedSegments: jsonb("processed_segments"), // { speaker, timecode, text }
    topics: jsonb("topics"),
    keywords: jsonb("keywords"),

    // Reserved AI fields
    transcriptEmbeddingsId: text("transcript_embeddings_id"), // pointer to vector store if separated

    ...auditFields,
  },
  (table) => [
    index("idx_mtg_transcripts_segments").using("gin", table.processedSegments),
    index("idx_mtg_transcripts_topics").using("gin", table.topics),
    index("idx_mtg_transcripts_keywords").using("gin", table.keywords),
  ],
);

/**
 * MEETING FOLLOW UPS
 */
export const meetingFollowUps = pgTable("meeting_followups", {
  followUpId: uuid("followup_id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  meetingId: uuid("meeting_id")
    .notNull()
    .references(() => meetings.meetingId, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),

  description: text("description").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, acknowledged, resolved
  escalationLevel: integer("escalation_level").notNull().default(0),

  ...auditFields,
});

/**
 * MEETING ACTIVITY LOG
 */
export const meetingActivity = pgTable(
  "meeting_activity",
  {
    activityId: uuid("activity_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.meetingId, { onDelete: "cascade" }),

    eventType: text("event_type").notNull(), // meeting_created, outcome_added, decision_approved, recording_processed
    metadata: jsonb("metadata"),

    ...auditFields,
  },
  (table) => [index("idx_mtg_activity_metadata").using("gin", table.metadata)],
);

/**
 * MEETING LABELS & TAGS
 */
export const meetingLabels = pgTable(
  "meeting_labels",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.meetingId, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.labelId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_meeting_label").on(table.meetingId, table.labelId),
  ],
);

export const meetingTags = pgTable(
  "meeting_tags",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    projectId: uuid("project_id").notNull(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.meetingId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...auditFields,
  },
  (table) => [
    unique("unique_meeting_tag_name").on(table.meetingId, table.name),
  ],
);

/**
 * DECISION LINKAGES (Junction Tables)
 */
export const meetingDecisionTasks = pgTable(
  "meeting_decision_tasks",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => meetingDecisions.decisionId, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.taskId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_decision_task").on(table.decisionId, table.taskId),
  ],
);

export const meetingDecisionDeliverables = pgTable(
  "meeting_decision_deliverables",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => meetingDecisions.decisionId, { onDelete: "cascade" }),
    deliverableId: uuid("deliverable_id")
      .notNull()
      .references(() => deliverables.deliverableId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_decision_deliverable").on(
      table.decisionId,
      table.deliverableId,
    ),
  ],
);

export const meetingDecisionRevisions = pgTable(
  "meeting_decision_revisions",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => meetingDecisions.decisionId, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => revisions.revisionId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_decision_revision").on(table.decisionId, table.revisionId),
  ],
);

export const meetingDecisionApprovals = pgTable(
  "meeting_decision_approvals",
  {
    mappingId: uuid("mapping_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => meetingDecisions.decisionId, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => approvalCycles.cycleId, { onDelete: "cascade" }),
    ...auditFields,
  },
  (table) => [
    unique("unique_decision_approval").on(table.decisionId, table.cycleId),
  ],
);
