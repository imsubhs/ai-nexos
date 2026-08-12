-- ============================================================================
-- AI NEX OS — Row Level Security for the workforce tables (Sprint 3 closeout)
--
-- Migration 0001 turned RLS on for the six tables that existed then, and every
-- later table was expected to follow the same convention. The three workforce
-- tables did not: `attendance_records` and `attendance_breaks` arrived in 0008
-- and `attendance_corrections` in 0009, all three after 0001, and none of them
-- ever got `ENABLE ROW LEVEL SECURITY` or a policy. They are also absent from
-- the 0010/0011 grant list, so `authenticated` holds no privilege on them at
-- all — which is why nothing has leaked, and also why nothing has been tested.
--
-- Consequence today: attendance is read and written through the Drizzle
-- connection, which runs as the table owner and BYPASSES RLS. Organization
-- isolation on these three tables therefore rests entirely on the repository's
-- `organization_id` predicate — one layer, in application code. Every other
-- tenant-scoped table in this schema has two.
--
-- This migration adds the second layer. It is additive only:
--
--   · ENABLE ROW LEVEL SECURITY on the three tables (idempotent).
--   · SELECT policies following 0001's conventions — `app.is_org_member()` for
--     the tenant boundary and `app.has_permission()` for the self-vs-team split.
--   · GRANT SELECT to `authenticated` on those three tables, matching the
--     posture 0010 established: a grant is only ever given to a table whose rows
--     are already constrained by a policy.
--
-- It creates no table, drops nothing, alters no column, and touches no row.
-- Applying it cannot change what the application reads or writes, because the
-- owner connection is not subject to policies; what it changes is what a holder
-- of the publishable key could reach if a read path ever moved to PostgREST.
--
-- Deliberately NOT granted, exactly as in 0010: INSERT / UPDATE / DELETE. Writes
-- continue through the owner connection, so write policies would be unreachable
-- and therefore unproven. With RLS enabled and no write policy, a Data API write
-- is denied by default — which is the intended answer.
--
-- Every statement is guarded or inherently idempotent, so replaying this
-- migration on a database that already has it is a no-op, and replaying the
-- whole history from empty lands in the same state.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enable RLS (idempotent — enabling twice is not an error)
-- ----------------------------------------------------------------------------

ALTER TABLE "attendance_records"     ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attendance_breaks"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attendance_corrections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 2. SELECT policies
--
-- CREATE POLICY has no IF NOT EXISTS, and the alternative — DROP then CREATE —
-- would put a destructive verb in a migration that is meant to be purely
-- additive. Each policy is therefore guarded on pg_policies instead.
--
-- The shape in all three cases is: tenant boundary AND (own row with the self
-- read permission OR the team-scope permission). `auth.uid()` is null on the
-- owner connection, so the self branch simply never matches there — the owner
-- bypasses RLS anyway and never reaches this predicate.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- attendance_records: an employee sees their own days with `attendance.read`;
  -- seeing anyone else's requires `attendance.view_team`.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_records'
      AND policyname = 'attendance_records_select'
  ) THEN
    CREATE POLICY attendance_records_select ON "attendance_records"
      FOR SELECT TO authenticated
      USING (
        app.is_org_member(organization_id)
        AND (
          (user_id = auth.uid() AND app.has_permission('attendance', 'read'))
          OR app.has_permission('attendance', 'view_team')
        )
      );
  END IF;

  -- attendance_breaks: a break is a child of a day and carries no user_id of
  -- its own, so visibility is inherited from the parent record rather than
  -- guessed. The EXISTS repeats the parent's own predicate: were it to check
  -- only org membership, breaks would be readable for days that are not.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_breaks'
      AND policyname = 'attendance_breaks_select'
  ) THEN
    CREATE POLICY attendance_breaks_select ON "attendance_breaks"
      FOR SELECT TO authenticated
      USING (
        app.is_org_member(organization_id)
        AND EXISTS (
          SELECT 1
          FROM public.attendance_records r
          WHERE r.attendance_id = "attendance_breaks".attendance_id
            AND r.organization_id = "attendance_breaks".organization_id
            AND (
              (r.user_id = auth.uid() AND app.has_permission('attendance', 'read'))
              OR app.has_permission('attendance', 'view_team')
            )
        )
      );
  END IF;

  -- attendance_corrections: the requester sees their own with `corrections.read`;
  -- a reviewer sees the queue with `corrections.review`. This mirrors the
  -- owner-or-reviewer rule the CO-4 action already enforces (policy 10.3), so
  -- the database and the application agree rather than each having an opinion.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_corrections'
      AND policyname = 'attendance_corrections_select'
  ) THEN
    CREATE POLICY attendance_corrections_select ON "attendance_corrections"
      FOR SELECT TO authenticated
      USING (
        app.is_org_member(organization_id)
        AND (
          (user_id = auth.uid() AND app.has_permission('corrections', 'read'))
          OR app.has_permission('corrections', 'review')
        )
      );
  END IF;
END
$$;--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 3. Data API read grants
--
-- PostgreSQL checks table privileges BEFORE row policies, so without this the
-- policies above would be unreachable — the exact defect migration 0010 was
-- written to fix on the other 52 tables. GRANT is idempotent.
-- ----------------------------------------------------------------------------

GRANT SELECT ON TABLE
  "attendance_records",
  "attendance_breaks",
  "attendance_corrections"
TO "authenticated";
