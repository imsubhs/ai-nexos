-- ============================================================================
-- AI NEX OS — Organization Memberships & Multi-Tenant Identity Foundation (Phase 3)
--
-- Decouples global user identity (`public.users`) from tenant workspaces
-- (`public.organizations`) by establishing `public.organization_memberships`.
--
-- Rules:
--   1. Additive table `organization_memberships` with foreign keys to users,
--      organizations, roles, and departments.
--   2. Enforces unique (user_id, organization_id) to prevent duplicate memberships.
--   3. Indexes on organization_id, user_id, role_id, and composite status indexes.
--   4. Idempotent, deterministic backfill of existing active users into memberships.
--   5. Legacy columns `users.organization_id` and `users.role_id` remain intact
--      for backward compatibility.
--
-- Reversible, non-destructive, transactionally safe.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
    CREATE TYPE "membership_status" AS ENUM ('active', 'invited', 'suspended', 'pending');
  END IF;
END
$$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "organization_memberships" (
  "membership_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("organization_id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "roles"("role_id") ON DELETE RESTRICT,
  "department_id" uuid REFERENCES "departments"("department_id") ON DELETE SET NULL,
  "designation" text,
  "employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
  "working_hours" jsonb,
  "status" "membership_status" DEFAULT 'active' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "joined_at" timestamp with time zone DEFAULT now(),
  "invited_at" timestamp with time zone,
  "accepted_at" timestamp with time zone,
  "suspended_at" timestamp with time zone,
  "removed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "is_archived" boolean DEFAULT false NOT NULL,
  "version" integer DEFAULT 1 NOT NULL
);--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_memberships'
      AND indexname = 'uq_user_organization'
  ) THEN
    CREATE UNIQUE INDEX "uq_user_organization" ON "organization_memberships" USING btree ("user_id", "organization_id");
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_memberships'
      AND indexname = 'idx_memberships_org'
  ) THEN
    CREATE INDEX "idx_memberships_org" ON "organization_memberships" USING btree ("organization_id");
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_memberships'
      AND indexname = 'idx_memberships_user'
  ) THEN
    CREATE INDEX "idx_memberships_user" ON "organization_memberships" USING btree ("user_id");
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_memberships'
      AND indexname = 'idx_memberships_role'
  ) THEN
    CREATE INDEX "idx_memberships_role" ON "organization_memberships" USING btree ("role_id");
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_memberships'
      AND indexname = 'idx_memberships_org_status'
  ) THEN
    CREATE INDEX "idx_memberships_org_status" ON "organization_memberships" USING btree ("organization_id", "status");
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_memberships'
      AND indexname = 'idx_memberships_user_status'
  ) THEN
    CREATE INDEX "idx_memberships_user_status" ON "organization_memberships" USING btree ("user_id", "status");
  END IF;
END
$$;--> statement-breakpoint

-- Stage B: Deterministic & Idempotent Backfill for existing users
INSERT INTO "organization_memberships" (
  "membership_id",
  "user_id",
  "organization_id",
  "role_id",
  "department_id",
  "designation",
  "employment_type",
  "working_hours",
  "status",
  "is_default",
  "joined_at",
  "created_at",
  "updated_at",
  "deleted_at",
  "deleted_by"
)
SELECT
  gen_random_uuid(),
  u."user_id",
  u."organization_id",
  u."role_id",
  u."department_id",
  u."designation",
  u."employment_type",
  u."working_hours",
  CASE
    WHEN u."status" = 'active' AND u."deleted_at" IS NULL THEN 'active'::"membership_status"
    ELSE 'suspended'::"membership_status"
  END,
  true,
  COALESCE(u."created_at", now()),
  COALESCE(u."created_at", now()),
  now(),
  u."deleted_at",
  u."deleted_by"
FROM "users" u
WHERE u."organization_id" IS NOT NULL
  AND u."role_id" IS NOT NULL
ON CONFLICT ("user_id", "organization_id") DO NOTHING;
