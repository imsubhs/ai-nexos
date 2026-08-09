-- ============================================================================
-- AI NEX OS — Data API read grants for `authenticated` (Sprint 2.3)
--
-- Migrations 0000–0009 created 202 tables owned by `postgres` and enabled RLS
-- with 74 policies on 52 of them, but never granted a single privilege to the
-- Supabase Data API roles. PostgreSQL checks table privileges *before* row
-- policies, so every one of those policies was unreachable: RLS was enabled
-- but had never once been evaluated, and `getCurrentUser()` — which reads
-- `users`/`roles`/`organizations` through PostgREST under the caller's JWT —
-- received 42501 and returned null for every real user.
--
-- This grants SELECT only, and only on the 52 tables that already have RLS
-- enabled and policies attached. Row visibility is therefore still decided
-- entirely by those policies; this migration decides only that they get to run.
--
-- Deliberately NOT granted here:
--   · INSERT/UPDATE/DELETE — writes continue to go through the Drizzle
--     connection as the table owner. The write policies stay unproven until
--     the read policies are verified against real rows first.
--   · anything on the 150 tables without RLS — no policy means no row filter,
--     so a grant there would expose them wholesale. They stay unreachable.
--   · anon — unauthenticated callers get nothing.
--
-- GRANT is idempotent, so re-running this migration is safe.
-- ============================================================================

GRANT SELECT ON TABLE
  "activity_logs",
  "background_jobs",
  "client_contacts",
  "clients",
  "deliverable_activity",
  "deliverable_approvals",
  "deliverable_files",
  "deliverable_labels",
  "deliverable_reference_attachments",
  "deliverable_review_comments",
  "deliverable_review_sessions",
  "deliverable_review_threads",
  "deliverable_revisions",
  "deliverable_share_links",
  "deliverable_tags",
  "deliverables",
  "departments",
  "file_activity",
  "file_collection_items",
  "file_collections",
  "file_comments",
  "file_folders",
  "file_labels",
  "file_metrics",
  "file_relations",
  "file_shares",
  "file_tags",
  "file_versions",
  "files",
  "milestones",
  "organizations",
  "project_members",
  "project_phases",
  "projects",
  "revision_activity",
  "revision_assignments",
  "revision_changes",
  "revision_checklists",
  "revision_comments",
  "revision_history",
  "revision_items",
  "revision_labels",
  "revision_merge_previews",
  "revision_requests",
  "revision_tags",
  "revision_threads",
  "revisions",
  "roles",
  "timeline_dependencies",
  "timeline_versions",
  "timelines",
  "users"
TO "authenticated";
