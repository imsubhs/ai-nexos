-- ============================================================================
-- AI NEX OS — revoke the Data API default privileges (Sprint 2.3)
--
-- Migration 0001 now ends with:
--
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
--
-- Migration 0011 revoked the blanket grant from the 202 tables that existed at
-- the time, but a default-privilege rule is not a grant — it is a standing
-- instruction that re-applies to every table created afterwards. Left in place,
-- the next `CREATE TABLE` in public silently hands anon full read/write on it,
-- and 0011's cleanup quietly stops being true.
--
-- Default ACLs are per-owner. This targets the rule owned by `postgres`, which
-- is the role migrations run as and therefore the owner of every application
-- table. Supabase's own baseline rule (owned by supabase_admin) is left alone:
-- it governs objects the platform creates, and editing it would fight the
-- managed service.
--
-- Ordering note: 0001 grants, 0011 revokes the tables, 0012 revokes the
-- standing rule. Replaying the history from empty therefore lands in the same
-- state as this database is in now.
--
-- Idempotent — revoking a privilege that is not held is a no-op.
-- ============================================================================

ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
  REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
  REVOKE ALL ON TABLES FROM "authenticated";

-- Sequences and functions were never part of the hand-run grant, but the same
-- standing-rule hazard applies, so make the intent explicit rather than relying
-- on them happening to be unset.
ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
  REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
  REVOKE ALL ON SEQUENCES FROM "authenticated";
