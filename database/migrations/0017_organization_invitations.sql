-- ============================================================================
-- AI NEX OS — Organization Invitations Foundation (Phase 4.1)
--
-- Adds public.organization_invitations table and invitation_status enum to
-- support secure, tokenized multi-tenant team member onboarding without
-- storing plaintext tokens.
--
-- Reversible, non-destructive, transactionally safe.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');
  END IF;
END
$$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "organization_invitations" (
  "invitation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("organization_id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role_id" uuid NOT NULL REFERENCES "roles"("role_id") ON DELETE RESTRICT,
  "department_id" uuid REFERENCES "departments"("department_id") ON DELETE SET NULL,
  "token_hash" text NOT NULL,
  "status" "invitation_status" DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "invited_by_user_id" uuid NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
  "accepted_at" timestamp with time zone,
  "accepted_by_user_id" uuid REFERENCES "users"("user_id") ON DELETE SET NULL,
  "revoked_at" timestamp with time zone,
  "revoked_by_user_id" uuid REFERENCES "users"("user_id") ON DELETE SET NULL,
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
      AND tablename = 'organization_invitations'
      AND indexname = 'uq_invitations_token_hash'
  ) THEN
    CREATE UNIQUE INDEX "uq_invitations_token_hash" ON "organization_invitations" USING btree ("token_hash");
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_invitations'
      AND indexname = 'idx_invitations_org'
  ) THEN
    CREATE INDEX "idx_invitations_org" ON "organization_invitations" USING btree ("organization_id");
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_invitations'
      AND indexname = 'idx_invitations_email'
  ) THEN
    CREATE INDEX "idx_invitations_email" ON "organization_invitations" USING btree ("email");
  END IF;
END
$$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organization_invitations'
      AND indexname = 'idx_invitations_org_status'
  ) THEN
    CREATE INDEX "idx_invitations_org_status" ON "organization_invitations" USING btree ("organization_id", "status");
  END IF;
END
$$;
