-- ============================================================================
-- AI NEX OS — Organization Code Prefix (Phase 2 Tenant Foundation)
--
-- Adds sovereign tenant code prefix (`code_prefix`) to `public.organizations`
-- to decouple entity code generation (projects, tasks, corrections) from the
-- legacy hardcoded 'AIC' prefix while preserving 100% backward compatibility
-- for existing production and seed records.
--
-- Rules:
--   1. Additive column `code_prefix text NOT NULL DEFAULT 'NEX'`
--   2. Backfill existing legacy organization with 'AIC' so existing identifiers
--      (AIC-YYYY-XXXX, AIC-T-YYYY-XXXX) retain continuous prefix alignment.
--   3. Unique index `uq_organizations_code_prefix` enforcing global prefix uniqueness.
--
-- Reversible, non-destructive, transactionally safe.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'code_prefix'
  ) THEN
    ALTER TABLE "organizations" ADD COLUMN "code_prefix" text DEFAULT 'NEX' NOT NULL;
  END IF;
END
$$;--> statement-breakpoint

-- Backfill legacy AI Collective organization with 'AIC' to preserve continuity
UPDATE "organizations"
SET "code_prefix" = 'AIC'
WHERE ("slug" = 'ai-collective' OR "organization_name" = 'AI Collective')
  AND "code_prefix" = 'NEX';--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'organizations'
      AND indexname = 'uq_organizations_code_prefix'
  ) THEN
    CREATE UNIQUE INDEX "uq_organizations_code_prefix" ON "organizations" USING btree ("code_prefix");
  END IF;
END
$$;