-- ============================================================================
-- AI NEX OS — SECURITY DEFINER Search Path Hardening (Phase S5.1)
--
-- Objective:
--   Hardens all five SECURITY DEFINER functions in the `app` schema against
--   search_path manipulation and object-masking attacks (e.g. pg_temp shadowing).
--
-- Defense-in-Depth Specification:
--   1. Replaces `SET search_path = public` with `SET search_path = ''`.
--   2. Ensures 100% explicit schema-qualification for all relation references
--      (`public.users`, `public.roles`, `public.project_members`) and helper
--      calls (`auth.uid()`, `app.current_user_organization_id()`, `app.has_permission()`).
--   3. Explicitly schema-qualifies system catalog calls (`pg_catalog.current_setting`).
--   4. Preserves all function signatures, return types, behavioral contracts,
--      volatility ratings, and existing EXECUTE grants.
--   5. Preserves recursion-breaking semantics on `app.is_project_member(uuid)`.
--
-- Invariants:
--   - Additive, idempotent, non-destructive.
--   - Zero change to table definitions or RLS policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. app.current_user_organization_id()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT organization_id
  FROM public.users
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL
  LIMIT 1;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.current_user_organization_id() FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.current_user_organization_id() TO authenticated;--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 2. app.has_permission(p_module text, p_action text)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.has_permission(p_module text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
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
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.has_permission(text, text) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.has_permission(text, text) TO authenticated;--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 3. app.is_org_member(p_organization_id uuid)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.is_org_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT app.current_user_organization_id() = p_organization_id;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.is_org_member(uuid) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.is_org_member(uuid) TO authenticated;--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 4. app.is_project_member(p_project_id uuid)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.is_project_member(uuid) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.is_project_member(uuid) TO authenticated;--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 5. app.protect_privileged_user_fields()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.protect_privileged_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- The service role (workers, seeding) bypasses RLS and skips this guard.
  IF pg_catalog.current_setting('request.jwt.claims', true) IS NULL THEN
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
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION app.protect_privileged_user_fields() FROM public;--> statement-breakpoint

-- ----------------------------------------------------------------------------
-- 6. organization_invitations: Grant SELECT to authenticated so policy can run
-- ----------------------------------------------------------------------------
GRANT SELECT ON TABLE "organization_invitations" TO "authenticated";
