-- ============================================================================
-- AI NEX OS — Security & RLS Foundation (Milestone 1)
-- Cross-schema constraints, org-aware RLS, audit triggers, realtime.
-- Every policy is organization-aware: nothing is hardcoded to a tenant.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Cross-schema / deferred foreign keys (not managed by Drizzle)
-- ----------------------------------------------------------------------------

-- users.user_id mirrors Supabase Auth identities.
ALTER TABLE "users"
  ADD CONSTRAINT "fk_users_auth_user"
  FOREIGN KEY ("user_id") REFERENCES auth.users(id) ON DELETE CASCADE;

-- departments.department_head → users (added here to break the creation cycle).
ALTER TABLE "departments"
  ADD CONSTRAINT "fk_departments_head_user"
  FOREIGN KEY ("department_head") REFERENCES "users"("user_id")
  ON DELETE SET NULL;

-- background_jobs pipeline chaining.
ALTER TABLE "background_jobs"
  ADD CONSTRAINT "fk_jobs_parent_job"
  FOREIGN KEY ("parent_job_id") REFERENCES "background_jobs"("job_id")
  ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 2. App helper schema — single home for permission logic (SDS §32, TRD §11)
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS app;

-- The organization the current authenticated user belongs to.
-- SECURITY DEFINER + fixed search_path so it can read public.users under RLS.
CREATE OR REPLACE FUNCTION app.current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.users
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- Permission check: role permissions are a module→actions JSONB map.
-- {"*": ["*"]} grants everything; {"projects": ["*"]} grants all project
-- actions; {"projects": ["read"]} grants a single action.
CREATE OR REPLACE FUNCTION app.has_permission(p_module text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON r.role_id = u.role_id
    WHERE u.user_id = auth.uid()
      AND u.status = 'active'
      AND u.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND (
        r.permissions -> '*' ? '*'
        OR r.permissions -> p_module ? '*'
        OR r.permissions -> p_module ? p_action
      )
  );
$$;

-- Convenience: is the current user an active internal member of this org?
CREATE OR REPLACE FUNCTION app.is_org_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app.current_user_organization_id() = p_organization_id;
$$;

REVOKE ALL ON FUNCTION app.current_user_organization_id() FROM public;
REVOKE ALL ON FUNCTION app.has_permission(text, text) FROM public;
REVOKE ALL ON FUNCTION app.is_org_member(uuid) FROM public;
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT EXECUTE ON FUNCTION app.current_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION app.has_permission(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION app.is_org_member(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Audit trigger — keep updated_at / version accurate on every write
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION app.touch_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_organizations BEFORE UPDATE ON "organizations"
  FOR EACH ROW EXECUTE FUNCTION app.touch_audit_fields();
CREATE TRIGGER trg_touch_departments BEFORE UPDATE ON "departments"
  FOR EACH ROW EXECUTE FUNCTION app.touch_audit_fields();
CREATE TRIGGER trg_touch_roles BEFORE UPDATE ON "roles"
  FOR EACH ROW EXECUTE FUNCTION app.touch_audit_fields();
CREATE TRIGGER trg_touch_users BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION app.touch_audit_fields();

-- ----------------------------------------------------------------------------
-- 4. Row Level Security — org isolation on every table (DBD §46)
--    Clients (share links) NEVER reach these tables; the portal goes through
--    service-layer endpoints using the service role with explicit filtering.
-- ----------------------------------------------------------------------------

ALTER TABLE "organizations"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "background_jobs" ENABLE ROW LEVEL SECURITY;

-- organizations: members read their own org; only org-admins update it.
CREATE POLICY org_select ON "organizations" FOR SELECT TO authenticated
  USING (app.is_org_member(organization_id));
CREATE POLICY org_update ON "organizations" FOR UPDATE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('organization', 'update'))
  WITH CHECK (app.is_org_member(organization_id));

-- departments
CREATE POLICY dept_select ON "departments" FOR SELECT TO authenticated
  USING (app.is_org_member(organization_id));
CREATE POLICY dept_insert ON "departments" FOR INSERT TO authenticated
  WITH CHECK (app.is_org_member(organization_id) AND app.has_permission('departments', 'create'));
CREATE POLICY dept_update ON "departments" FOR UPDATE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('departments', 'update'))
  WITH CHECK (app.is_org_member(organization_id));
CREATE POLICY dept_delete ON "departments" FOR DELETE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('departments', 'delete'));

-- roles: is_system appears in WITH CHECK as well as USING so a custom role
-- can neither be created as a system role nor promoted into one.
CREATE POLICY roles_select ON "roles" FOR SELECT TO authenticated
  USING (app.is_org_member(organization_id));
CREATE POLICY roles_insert ON "roles" FOR INSERT TO authenticated
  WITH CHECK (app.is_org_member(organization_id) AND app.has_permission('roles', 'create') AND is_system = false);
CREATE POLICY roles_update ON "roles" FOR UPDATE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('roles', 'update') AND is_system = false)
  WITH CHECK (app.is_org_member(organization_id) AND is_system = false);
CREATE POLICY roles_delete ON "roles" FOR DELETE TO authenticated
  USING (app.is_org_member(organization_id) AND app.has_permission('roles', 'delete') AND is_system = false);

-- users: the org sees its team directory; self-update allowed for one's own
-- profile; user administration requires the users module permission.
CREATE POLICY users_select ON "users" FOR SELECT TO authenticated
  USING (app.is_org_member(organization_id));
CREATE POLICY users_insert ON "users" FOR INSERT TO authenticated
  WITH CHECK (app.is_org_member(organization_id) AND app.has_permission('users', 'create'));
CREATE POLICY users_update ON "users" FOR UPDATE TO authenticated
  USING (
    app.is_org_member(organization_id)
    AND (user_id = auth.uid() OR app.has_permission('users', 'update'))
  )
  WITH CHECK (app.is_org_member(organization_id));

-- RLS policies cannot compare OLD vs NEW, so privileged columns are guarded
-- by a trigger: without users.update permission a user cannot change any
-- row's role_id / organization_id / status / employment fields — closing the
-- self-service privilege-escalation path (assigning oneself the Owner role).
CREATE OR REPLACE FUNCTION app.protect_privileged_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The service role (workers, seeding) bypasses RLS and skips this guard.
  IF current_setting('request.jwt.claims', true) IS NULL THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.role_id IS DISTINCT FROM OLD.role_id
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.employment_type IS DISTINCT FROM OLD.employment_type
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by
  ) AND NOT app.has_permission('users', 'update') THEN
    RAISE EXCEPTION 'insufficient_privilege: privileged user fields require users.update permission'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_users_privileged BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION app.protect_privileged_user_fields();

-- activity_logs: append-only. No UPDATE/DELETE policies exist on purpose.
CREATE POLICY activity_select ON "activity_logs" FOR SELECT TO authenticated
  USING (app.is_org_member(organization_id));
CREATE POLICY activity_insert ON "activity_logs" FOR INSERT TO authenticated
  WITH CHECK (app.is_org_member(organization_id) AND user_id = auth.uid());

-- background_jobs: internal visibility; workers use the service role.
CREATE POLICY jobs_select ON "background_jobs" FOR SELECT TO authenticated
  USING (app.is_org_member(organization_id));

-- ----------------------------------------------------------------------------
-- 5. Realtime — broadcast changes for live dashboards (TRD §56)
--    All foundation tables join the publication (realtime is platform-wide);
--    every M2+ module table joins in its own migration. Realtime respects
--    RLS, so subscribers only receive rows their policies allow.
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE "organizations";
ALTER PUBLICATION supabase_realtime ADD TABLE "departments";
ALTER PUBLICATION supabase_realtime ADD TABLE "roles";
ALTER PUBLICATION supabase_realtime ADD TABLE "users";
ALTER PUBLICATION supabase_realtime ADD TABLE "activity_logs";
ALTER PUBLICATION supabase_realtime ADD TABLE "background_jobs";