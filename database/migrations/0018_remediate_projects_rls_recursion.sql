-- ============================================================================
-- AI NEX OS — Remediate Projects RLS Recursion (Phase 5D)
--
-- Fixes PostgreSQL error 42P17 (infinite recursion detected in policy for
-- relation "projects").
--
-- Cause:
--   projects.projects_select evaluated:
--     EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.project_id AND pm.user_id = auth.uid())
--   Under the "authenticated" role, this subquery triggered project_members_select:
--     EXISTS (SELECT 1 FROM projects p WHERE p.project_id = project_members.project_id AND app.is_org_member(p.organization_id))
--   which in turn re-invoked projects_select, causing a circular rewrite dependency.
--
-- Remediation:
--   1. Create helper function app.is_project_member(p_project_id uuid):
--      - Marked SECURITY DEFINER with fixed search_path = public so that the membership
--        lookup executes with table-owner privileges without re-entering RLS on project_members.
--      - Uses auth.uid() directly from the JWT context; user_id cannot be spoofed.
--      - Execution granted ONLY to "authenticated"; revoked from public/anon.
--   2. Re-create projects_select policy using app.is_project_member(project_id).
--
-- Rollback Instructions:
--   DROP POLICY IF EXISTS "projects_select" ON "projects";
--   CREATE POLICY projects_select ON "projects" FOR SELECT TO authenticated
--     USING (
--       app.is_org_member(organization_id)
--       AND app.has_permission('projects', 'read')
--       AND (
--         visibility != 'private'
--         OR app.has_permission('projects', '*')
--         OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.project_id AND pm.user_id = auth.uid())
--       )
--     );
--   REVOKE ALL ON FUNCTION app.is_project_member(uuid) FROM authenticated;
--   DROP FUNCTION IF EXISTS app.is_project_member(uuid);
-- ============================================================================

CREATE OR REPLACE FUNCTION app.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app.is_project_member(uuid) FROM public;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION app.is_project_member(uuid) TO authenticated;
--> statement-breakpoint

DROP POLICY IF EXISTS "projects_select" ON "projects";
--> statement-breakpoint

CREATE POLICY projects_select ON "projects" FOR SELECT TO authenticated
  USING (
    app.is_org_member(organization_id)
    AND app.has_permission('projects', 'read')
    AND (
      visibility != 'private'
      OR app.has_permission('projects', '*')
      OR app.is_project_member(project_id)
    )
  );
