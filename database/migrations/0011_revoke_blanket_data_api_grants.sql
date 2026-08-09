-- ============================================================================
-- AI NEX OS — revoke the blanket Data API grants (Sprint 2.3)
--
-- A `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated` was run
-- against this project by hand while diagnosing the 42501 errors that
-- migration 0010 addresses properly. It left both roles holding arwdDxtm — the
-- full privilege set — on all 202 public tables.
--
-- On the 52 tables with RLS that was contained: policies target `authenticated`
-- only, so `anon` still matched nothing. On the 150 tables WITHOUT RLS there is
-- no row filter at all, so any holder of the publishable key — which ships to
-- browsers by design — could read and write them. They were empty at the time,
-- so this closes the hole before it holds data rather than after.
--
-- This migration returns the surface to the reviewed minimum:
--   · REVOKE everything from anon and authenticated on public tables, including
--     the TRUNCATE/REFERENCES/TRIGGER defaults. `anon` needs nothing: no code
--     path reads as an unauthenticated Data API caller.
--   · re-apply migration 0010's grant, so the end state is identical whether
--     the history is replayed on a fresh database or applied to this one.
--
-- `service_role` is deliberately untouched: it never received the blanket DML
-- (its ACL is Dxtm), and the portal layer relies on it bypassing RLS through
-- its own Supabase client rather than through table privileges.
--
-- Both statements are idempotent, so re-running is safe. On a fresh database
-- the REVOKE is a no-op.
-- ============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon";
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "authenticated";

-- Restore the reviewed grant from 0010 — SELECT only, and only on tables whose
-- rows are already constrained by an RLS policy.
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
