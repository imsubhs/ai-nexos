-- ============================================================================
-- DRAFT — NOT PART OF THE MANAGED MIGRATION CHAIN. DO NOT APPLY AS-IS.
--
-- Quarantined during Phase 3 M0 (2026-07-14). This draft predates the
-- platform RLS conventions and is intentionally excluded from
-- database/migrations/ because:
--
--   1. It keys tenancy on current_setting('app.current_org_id'), a GUC that
--      is set NOWHERE in the codebase — applying it would enable RLS with
--      policies that never pass, locking out all JWT-path access to the
--      23 automation tables (created in 0007_remarkable_maximus).
--   2. Every managed RLS migration (0001–0005) uses app.is_org_member() +
--      app.has_permission() instead; this file must be rewritten to that
--      pattern before it can become a journaled migration.
--
-- When the Automation module is activated (post-Phase-3), rewrite these
-- policies to the platform pattern and land them via drizzle-kit as a
-- journaled migration with a chained snapshot (see 0001 for the precedent).
-- ============================================================================

-- Enable Row Level Security on all Automation Engine tables

-- automation_capabilities (Global, so no org ID RLS. Might be read-only for most users)
ALTER TABLE automation_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Capabilities are viewable by all authenticated users" ON automation_capabilities FOR SELECT USING (true);

-- For all org-specific tables:
DO $$
DECLARE
    t_name text;
    tables_list text[] := ARRAY[
        'automation_workflows',
        'automation_workflow_versions',
        'automation_triggers',
        'automation_conditions',
        'automation_condition_groups',
        'automation_actions',
        'automation_execution_runs',
        'automation_execution_state',
        'automation_execution_steps',
        'automation_execution_logs',
        'automation_action_queue',
        'automation_dead_letter_queue',
        'automation_schedules',
        'automation_webhooks',
        'automation_api_keys',
        'automation_variables',
        'automation_templates',
        'automation_rate_limits',
        'automation_retry_policy',
        'automation_permissions',
        'automation_statistics',
        'automation_audit'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_list
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t_name);
        
        -- Policy: Users can only see/modify rows where organization_id matches their current tenant context
        -- Assuming a function `current_setting('app.current_org_id')` or similar tenant isolation mechanism
        EXECUTE format('
            CREATE POLICY "Tenant Isolation Policy for %I" 
            ON %I 
            FOR ALL 
            USING (organization_id = current_setting(''app.current_org_id'', true)::uuid)
            WITH CHECK (organization_id = current_setting(''app.current_org_id'', true)::uuid);
        ', t_name, t_name);
    END LOOP;
END $$;
