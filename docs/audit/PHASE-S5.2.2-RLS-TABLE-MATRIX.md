# AI NEX OS — PHASE S5.2.2 RLS TABLE & GRANT CLASSIFICATION MATRIX

**Date:** September 28, 2026  
**Target Staging Database:** `shnzzbbtydmvfhgeoysg` (PostgreSQL 17)  
**Total Public Ordinary Tables:** 204  
**RLS-Enabled Tables:** 204  
**FORCE RLS Tables:** 0  
**Total RLS Policies:** 79  
**Tables with Policies:** 57  
**Tables with 0 Policies (Default-Deny):** 147

---

## 1. Executive Summary & Classification Model

This matrix presents the exhaustive classification of all **204 public ordinary tables** in the AI NEX OS PostgreSQL database on Staging (`shnzzbbtydmvfhgeoysg`).

### Core Security Invariants Verified:

1. **Zero Client Write Privileges:** Exactly **0** tables provide `INSERT`, `UPDATE`, or `DELETE` grants to `anon` or `authenticated`. All write mutations in AI NEX OS occur strictly through server-side Drizzle actions connecting as `postgres`.
2. **Zero Anonymous Access:** Exactly **0** tables provide any grant to role `anon`. Unauthenticated PostgREST ingress is universally rejected at the PostgreSQL grant layer.
3. **Exclusively Policed PostgREST Reads:** Exactly **57 tables** possess an `authenticated:SELECT` grant. Every single one of these 57 tables possesses active Row-Level Security policies. No table is granted without being policed.
4. **Dual-Layer Hardening for 147 Policy-Less Tables:** Exactly **147 tables** have 0 policies. Every one of these 147 tables has **ZERO grants** to `anon` and **ZERO grants** to `authenticated`. Direct client access through PostgREST is blocked at two independent security boundaries: (1) PostgreSQL role-table privilege failure (`42501`), and (2) PostgreSQL RLS default-deny.
5. **Zero Data API Access to Policy-Less Tables:** Static analysis of all application source code confirmed that the PostgREST Data API client (`supabase.from`) is **NEVER** called for any of the 147 policy-less tables. The only tables queried via `supabase.from` in application code are `users` and `organization_memberships`, both of which have active RLS policies.

---

## 2. Complete 204-Table Master Matrix

| Table Name                          |  RLS   |  FORCE  | Policies | anon SEL | auth SEL | anon WR | auth WR | service_role Privileges       | SecDef Ref | Code Ref | Access Mechanism    | Classification            |
| :---------------------------------- | :----: | :-----: | :------: | :------: | :------: | :-----: | :-----: | :---------------------------- | :--------: | :------: | :------------------ | :------------------------ |
| `activity_logs`                     | `true` | `false` |    2     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `ai_agent_capabilities`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_checkpoint_ledger`        | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_context`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_costs`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_execution_runs`           | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_execution_steps`          | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_explainability_ledger`    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_goals`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_human_approvals`          | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_limits`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_memory`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_observations`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_permissions`              | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_plan_steps`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_plans`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_reflections`              | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_sessions`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_skills`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_statistics`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_tool_usage`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agent_versions`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_agents`                         | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_budgets`                        | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_context_sources`                | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_contexts`                       | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_conversations`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_cost_tracking`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_execution_logs`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_feedback`                       | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_guardrails`                     | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_memory`                         | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_messages`                       | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_model_limits`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_model_profiles`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_model_providers`                | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_model_usage`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_prompt_templates`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_prompt_versions`                | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_ratings`                        | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_sessions`                       | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_skills`                         | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_token_usage`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_tool_calls`                     | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_tools`                          | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_workspace_preferences`          | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `ai_workspaces`                     | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `approval_conditions`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `approval_cycles`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `approval_events`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `approval_stages`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `approval_workflows`                | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `attendance_breaks`                 | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `attendance_corrections`            | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `attendance_records`                | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `automation_action_queue`           | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_actions`                | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_api_keys`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_audit`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_capabilities`           | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_condition_groups`       | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_conditions`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_dead_letter_queue`      | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_execution_logs`         | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_execution_runs`         | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_execution_state`        | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_execution_steps`        | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_permissions`            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_rate_limits`            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_retry_policy`           | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_schedules`              | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_statistics`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_templates`              | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_triggers`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_variables`              | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_webhooks`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_workflow_versions`      | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `automation_workflows`              | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `background_jobs`                   | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `client_contacts`                   | `true` | `false` |    4     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `client_portal_activity`            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `client_portal_dashboard_layout`    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `client_portal_devices`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `client_portal_favorites`           | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `client_portal_notifications`       | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `client_portal_preferences`         | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `client_portal_security`            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `client_portal_sessions`            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `clients`                           | `true` | `false` |    4     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `decision_dependencies`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `deliverable_activity`              | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_approvals`             | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_files`                 | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_labels`                | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_reference_attachments` | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_review_comments`       | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_review_sessions`       | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_review_threads`        | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_revisions`             | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_share_links`           | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverable_tags`                  | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `deliverables`                      | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `departments`                       | `true` | `false` |    4     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `external_identities`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `file_activity`                     | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_collection_items`             | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_collections`                  | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_comments`                     | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_folders`                      | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_labels`                       | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_metrics`                      | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_relations`                    | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_shares`                       | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_tags`                         | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `file_versions`                     | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `files`                             | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `labels`                            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_action_items`              | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_activity`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_agenda`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_attendees`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_decision_approvals`        | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_decision_deliverables`     | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_decision_revisions`        | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_decision_tasks`            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_decisions`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_followups`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_labels`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_outcomes`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_recordings`                | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_tags`                      | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_templates`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meeting_transcripts`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `meetings`                          | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `milestones`                        | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `notification_activity`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_channels`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_deliveries`           | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_digest`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_failures`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_logs`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_preferences`          | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_queue`                | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_templates`            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notification_webhooks`             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `notifications`                     | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `organization_invitations`          | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `organization_memberships`          | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | both                | **DATA-API-REQUIRED**     |
| `organization_sequences`            | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `organizations`                     | `true` | `false` |    2     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `project_members`                   | `true` | `false` |    4     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |   `true`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `project_phases`                    | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `projects`                          | `true` | `false` |    4     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `reviews`                           | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `revision_activity`                 | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_assignments`              | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_changes`                  | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_checklists`               | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_comments`                 | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_history`                  | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_items`                    | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_labels`                   | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_merge_previews`           | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_requests`                 | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_tags`                     | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revision_threads`                  | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `revisions`                         | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `roles`                             | `true` | `false` |    4     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |   `true`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `share_access_logs`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_activity`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_annotations`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_comments`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_download_logs`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_events`                      | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_expiration`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_labels`                      | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_notifications`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_passwords`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_permissions`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_policies`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_recipients`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_security_logs`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_session_items`               | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_sessions`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_tags`                        | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_token_nonces`                | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_versions`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `share_watermarks`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_activity`                     | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_assignees`                    | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_attachments`                  | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_checklist_items`              | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_checklists`                   | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_comments`                     | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_dependencies`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_labels`                       | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_tags`                         | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_time_entries`                 | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `task_watchers`                     | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `tasks`                             | `true` | `false` |    0     | `false`  | `false`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY**           |
| `timeline_dependencies`             | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `timeline_versions`                 | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `timelines`                         | `true` | `false` |    1     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |  `false`   |  `true`  | server-side Drizzle | **SERVER-ONLY (Policed)** |
| `users`                             | `true` | `false` |    3     | `false`  |  `true`  | `false` | `false` | `REFERENCES,TRIGGER,TRUNCATE` |   `true`   |  `true`  | both                | **DATA-API-REQUIRED**     |

---

## 3. Focused 147 Policy-Less Tables Grant & RLS Matrix

For all 147 tables with `relrowsecurity = true` and `policy_count = 0`:

| Table                            |  RLS   | Policies | anon grants | authenticated grants | App Data API usage | Classification  |
| :------------------------------- | :----: | :------: | :---------: | :------------------: | :----------------: | :-------------- |
| `ai_agent_capabilities`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_checkpoint_ledger`     | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_context`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_costs`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_execution_runs`        | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_execution_steps`       | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_explainability_ledger` | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_goals`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_human_approvals`       | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_limits`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_memory`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_observations`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_permissions`           | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_plan_steps`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_plans`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_reflections`           | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_sessions`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_skills`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_statistics`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_tool_usage`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agent_versions`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_agents`                      | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_budgets`                     | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_context_sources`             | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_contexts`                    | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_conversations`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_cost_tracking`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_execution_logs`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_feedback`                    | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_guardrails`                  | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_memory`                      | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_messages`                    | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_model_limits`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_model_profiles`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_model_providers`             | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_model_usage`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_prompt_templates`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_prompt_versions`             | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_ratings`                     | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_sessions`                    | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_skills`                      | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_token_usage`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_tool_calls`                  | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_tools`                       | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_workspace_preferences`       | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `ai_workspaces`                  | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `approval_conditions`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `approval_cycles`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `approval_events`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `approval_stages`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `approval_workflows`             | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_action_queue`        | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_actions`             | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_api_keys`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_audit`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_capabilities`        | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_condition_groups`    | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_conditions`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_dead_letter_queue`   | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_execution_logs`      | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_execution_runs`      | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_execution_state`     | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_execution_steps`     | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_permissions`         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_rate_limits`         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_retry_policy`        | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_schedules`           | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_statistics`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_templates`           | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_triggers`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_variables`           | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_webhooks`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_workflow_versions`   | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `automation_workflows`           | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `client_portal_activity`         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `client_portal_dashboard_layout` | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `client_portal_devices`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `client_portal_favorites`        | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `client_portal_notifications`    | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `client_portal_preferences`      | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `client_portal_security`         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `client_portal_sessions`         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `decision_dependencies`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `external_identities`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `labels`                         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_action_items`           | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_activity`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_agenda`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_attendees`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_decision_approvals`     | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_decision_deliverables`  | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_decision_revisions`     | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_decision_tasks`         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_decisions`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_followups`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_labels`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_outcomes`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_recordings`             | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_tags`                   | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_templates`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meeting_transcripts`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `meetings`                       | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_activity`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_channels`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_deliveries`        | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_digest`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_failures`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_logs`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_preferences`       | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_queue`             | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_templates`         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notification_webhooks`          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `notifications`                  | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `organization_sequences`         | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `reviews`                        | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_access_logs`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_activity`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_annotations`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_comments`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_download_logs`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_events`                   | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_expiration`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_labels`                   | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_notifications`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_passwords`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_permissions`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_policies`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_recipients`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_security_logs`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_session_items`            | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_sessions`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_tags`                     | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_token_nonces`             | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_versions`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `share_watermarks`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_activity`                  | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_assignees`                 | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_attachments`               | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_checklist_items`           | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_checklists`                | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_comments`                  | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_dependencies`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_labels`                    | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_tags`                      | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_time_entries`              | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `task_watchers`                  | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |
| `tasks`                          | `true` |    0     |   `NONE`    |        `NONE`        |      `false`       | **SERVER-ONLY** |

---

## 4. Policy Breakdown on 57 Policed Tables

| Table Name                          | Policy Count | Policy Names & Commands                                                                                                            |
| :---------------------------------- | :----------: | :--------------------------------------------------------------------------------------------------------------------------------- |
| `activity_logs`                     |      2       | activity_insert (INSERT), activity_select (SELECT)                                                                                 |
| `attendance_breaks`                 |      1       | attendance_breaks_select (SELECT)                                                                                                  |
| `attendance_corrections`            |      1       | attendance_corrections_select (SELECT)                                                                                             |
| `attendance_records`                |      1       | attendance_records_select (SELECT)                                                                                                 |
| `background_jobs`                   |      1       | jobs_select (SELECT)                                                                                                               |
| `client_contacts`                   |      4       | client_contacts_delete (DELETE), client_contacts_insert (INSERT), client_contacts_select (SELECT), client_contacts_update (UPDATE) |
| `clients`                           |      4       | clients_delete (DELETE), clients_insert (INSERT), clients_select (SELECT), clients_update (UPDATE)                                 |
| `deliverable_activity`              |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_approvals`             |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_files`                 |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_labels`                |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_reference_attachments` |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_review_comments`       |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_review_sessions`       |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_review_threads`        |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_revisions`             |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_share_links`           |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverable_tags`                  |      1       | org_isolation_policy (ALL)                                                                                                         |
| `deliverables`                      |      1       | org_isolation_policy (ALL)                                                                                                         |
| `departments`                       |      4       | dept_delete (DELETE), dept_insert (INSERT), dept_select (SELECT), dept_update (UPDATE)                                             |
| `file_activity`                     |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_collection_items`             |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_collections`                  |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_comments`                     |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_folders`                      |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_labels`                       |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_metrics`                      |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_relations`                    |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_shares`                       |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_tags`                         |      1       | org_isolation_policy (ALL)                                                                                                         |
| `file_versions`                     |      1       | org_isolation_policy (ALL)                                                                                                         |
| `files`                             |      1       | org_isolation_policy (ALL)                                                                                                         |
| `milestones`                        |      1       | milestones_select (SELECT)                                                                                                         |
| `organization_invitations`          |      1       | organization_invitations_select (SELECT)                                                                                           |
| `organization_memberships`          |      1       | organization_memberships_select (SELECT)                                                                                           |
| `organizations`                     |      2       | org_select (SELECT), org_update (UPDATE)                                                                                           |
| `project_members`                   |      4       | project_members_delete (DELETE), project_members_insert (INSERT), project_members_select (SELECT), project_members_update (UPDATE) |
| `project_phases`                    |      1       | project_phases_select (SELECT)                                                                                                     |
| `projects`                          |      4       | projects_delete (DELETE), projects_insert (INSERT), projects_select (SELECT), projects_update (UPDATE)                             |
| `revision_activity`                 |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_assignments`              |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_changes`                  |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_checklists`               |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_comments`                 |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_history`                  |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_items`                    |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_labels`                   |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_merge_previews`           |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_requests`                 |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_tags`                     |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revision_threads`                  |      1       | project_isolation_policy (ALL)                                                                                                     |
| `revisions`                         |      1       | project_isolation_policy (ALL)                                                                                                     |
| `roles`                             |      4       | roles_delete (DELETE), roles_insert (INSERT), roles_select (SELECT), roles_update (UPDATE)                                         |
| `timeline_dependencies`             |      1       | timeline_dependencies_select (SELECT)                                                                                              |
| `timeline_versions`                 |      1       | timeline_versions_select (SELECT)                                                                                                  |
| `timelines`                         |      1       | timelines_select (SELECT)                                                                                                          |
| `users`                             |      3       | users_insert (INSERT), users_select (SELECT), users_update (UPDATE)                                                                |
