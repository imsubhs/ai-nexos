-- ============================================================================
-- AI NEX OS — Row Level Security Hardening & PostgREST Defense-in-Depth (Phase S5)
--
-- Background:
--   - Migration 0016 introduced `public.organization_memberships` without RLS
--     and without PostgREST table grants, causing client/SSR Data API queries
--     in `src/features/auth/current-user.ts` to fail with 42501 (Permission Denied).
--   - Migration 0017 introduced `public.organization_invitations` without RLS.
--   - Server-side Drizzle operations execute as the table owner (bypassing RLS),
--     so RLS serves as critical defense-in-depth against client/Data API leaks.
--
-- Remediation:
--   1. Enable Row Level Security on `public.organization_memberships`.
--   2. Attach `organization_memberships_select` policy granting read access to:
--      - The member themselves (user_id = auth.uid()), enabling multi-tenant
--        organization context resolution & organization switching via PostgREST.
--      - Fellow active members of the organization (app.is_org_member(organization_id)),
--        enabling team member resolution and assignment pickers.
--   3. Grant SELECT on `public.organization_memberships` to `authenticated`.
--   4. Enable Row Level Security on `public.organization_invitations`.
--   5. Attach `organization_invitations_select` policy restricting visibility to
--      organization members possessing 'organization.update' administrative permission.
--
-- Invariants & Safety:
--   - Additive, non-destructive, transactionally safe.
--   - Deliberately does NOT grant INSERT/UPDATE/DELETE to authenticated or anon
--     (all mutations remain strictly mediated through server-side Drizzle actions).
--   - Deliberately does NOT grant any privileges to anon.
--   - Deliberately does NOT enable FORCE ROW LEVEL SECURITY (preserving Drizzle connection behavior).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. organization_memberships: Enable RLS, attach policy, grant SELECT
-- ----------------------------------------------------------------------------

ALTER TABLE "organization_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_memberships'
      AND policyname = 'organization_memberships_select'
  ) THEN
    CREATE POLICY organization_memberships_select ON "organization_memberships"
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR app.is_org_member(organization_id)
      );
  END IF;
END
$$;--> statement-breakpoint

GRANT SELECT ON TABLE "organization_memberships" TO "authenticated";--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 2. organization_invitations: Enable RLS, attach policy
-- ----------------------------------------------------------------------------

ALTER TABLE "organization_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_invitations'
      AND policyname = 'organization_invitations_select'
  ) THEN
    CREATE POLICY organization_invitations_select ON "organization_invitations"
      FOR SELECT TO authenticated
      USING (
        app.is_org_member(organization_id)
        AND app.has_permission('organization', 'update')
      );
  END IF;
END
$$;
