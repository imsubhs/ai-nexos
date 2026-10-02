# AI NEX OS — Phase S5 PostgreSQL / Supabase RLS Inventory

**Generated**: 2026-09-28T06:27:59.824Z
**Database**: `nexos_s5_disposable` (PostgreSQL 17.11 local rehearsal)
**Migrations Evaluated**: 0000 → 0018
**Total Public Tables**: 204

## Executive Metrics

| Metric | Count |
| :--- | :--- |
| Total Tables (`public`) | 204 |
| RLS-Enabled Tables | 55 |
| Tables Without RLS | 149 |
| FORCE ROW LEVEL SECURITY | 0 |
| Total RLS Policies | 77 |
| Tables Granted to `anon` | 0 |
| Tables Granted to `authenticated` | 55 (SELECT only) |
| Tables Granted Write to `authenticated` | 0 |

## Table Inventory Analysis

### Table: `activity_logs`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| INSERT | `activity_insert` | `{authenticated}` | `(app.is_org_member(organization_id) AND (user_id = auth.uid()))` | app.is_org_member |
| SELECT | `activity_select` | `{authenticated}` | `app.is_org_member(organization_id)` | app.is_org_member |

### Table: `ai_agent_capabilities`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_checkpoint_ledger`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_context`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_costs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_execution_runs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_execution_steps`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_explainability_ledger`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_goals`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_human_approvals`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_limits`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_memory`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_observations`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_permissions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_plan_steps`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_plans`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_reflections`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_sessions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_skills`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_statistics`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_tool_usage`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agent_versions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_agents`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_budgets`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_context_sources`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_contexts`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_conversations`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_cost_tracking`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_execution_logs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_feedback`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_guardrails`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_memory`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_messages`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_model_limits`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_model_profiles`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_model_providers`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_model_usage`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_prompt_templates`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_prompt_versions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_ratings`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_sessions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_skills`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_token_usage`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_tool_calls`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_tools`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_workspace_preferences`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `ai_workspaces`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `approval_conditions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `approval_cycles`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `approval_events`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `approval_stages`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `approval_workflows`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `attendance_breaks`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `attendance_breaks_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND (EXISTS ( SELECT 1 FROM attendance_records r WHERE ((r.attendance_id = attendanc...` | app.is_org_member, app.has_permission |

### Table: `attendance_corrections`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `attendance_corrections_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND (((user_id = auth.uid()) AND app.has_permission('corrections'::text, 'read'::tex...` | app.is_org_member, app.has_permission |

### Table: `attendance_records`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `attendance_records_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND (((user_id = auth.uid()) AND app.has_permission('attendance'::text, 'read'::text...` | app.is_org_member, app.has_permission |

### Table: `automation_action_queue`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_actions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_api_keys`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_audit`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_capabilities`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_condition_groups`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_conditions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_dead_letter_queue`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_execution_logs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_execution_runs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_execution_state`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_execution_steps`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_permissions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_rate_limits`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_retry_policy`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_schedules`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_statistics`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_templates`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_triggers`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_variables`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_webhooks`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_workflow_versions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `automation_workflows`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `background_jobs`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `jobs_select` | `{authenticated}` | `app.is_org_member(organization_id)` | app.is_org_member |

### Table: `client_contacts`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| DELETE | `client_contacts_delete` | `{authenticated}` | `((EXISTS ( SELECT 1 FROM clients c WHERE ((c.client_id = client_contacts.client_id) AND app.is_org_member(c.organization...` | app.is_org_member, app.has_permission |
| INSERT | `client_contacts_insert` | `{authenticated}` | `((EXISTS ( SELECT 1 FROM clients c WHERE ((c.client_id = client_contacts.client_id) AND app.is_org_member(c.organization...` | app.is_org_member, app.has_permission |
| SELECT | `client_contacts_select` | `{authenticated}` | `((EXISTS ( SELECT 1 FROM clients c WHERE ((c.client_id = client_contacts.client_id) AND app.is_org_member(c.organization...` | app.is_org_member, app.has_permission |
| UPDATE | `client_contacts_update` | `{authenticated}` | `((EXISTS ( SELECT 1 FROM clients c WHERE ((c.client_id = client_contacts.client_id) AND app.is_org_member(c.organization...` | app.is_org_member, app.has_permission |

### Table: `client_portal_activity`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `client_portal_dashboard_layout`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `client_portal_devices`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `client_portal_favorites`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `client_portal_notifications`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `client_portal_preferences`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `client_portal_security`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `client_portal_sessions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `clients`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| DELETE | `clients_delete` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('clients'::text, 'delete'::text))` | app.is_org_member, app.has_permission |
| INSERT | `clients_insert` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('clients'::text, 'create'::text))` | app.is_org_member, app.has_permission |
| SELECT | `clients_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('clients'::text, 'read'::text))` | app.is_org_member, app.has_permission |
| UPDATE | `clients_update` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('clients'::text, 'update'::text))` | app.is_org_member, app.has_permission |

### Table: `decision_dependencies`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `deliverable_activity`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_approvals`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_files`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_labels`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_reference_attachments`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_review_comments`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_review_sessions`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_review_threads`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_revisions`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_share_links`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverable_tags`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `deliverables`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `departments`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| DELETE | `dept_delete` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('departments'::text, 'delete'::text))` | app.is_org_member, app.has_permission |
| INSERT | `dept_insert` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('departments'::text, 'create'::text))` | app.is_org_member, app.has_permission |
| SELECT | `dept_select` | `{authenticated}` | `app.is_org_member(organization_id)` | app.is_org_member |
| UPDATE | `dept_update` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('departments'::text, 'update'::text))` | app.is_org_member, app.has_permission |

### Table: `external_identities`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `file_activity`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_collection_items`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_collections`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_comments`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_folders`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_labels`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_metrics`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_relations`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_shares`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_tags`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `file_versions`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `files`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `org_isolation_policy` | `{authenticated}` | `(organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid())))` | None |

### Table: `labels`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_action_items`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_activity`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_agenda`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_attendees`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_decision_approvals`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_decision_deliverables`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_decision_revisions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_decision_tasks`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_decisions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_followups`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_labels`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_outcomes`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_recordings`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_tags`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_templates`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meeting_transcripts`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `meetings`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `MEDIUM (Drizzle-only, no Data API grant, but RLS recommended)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `milestones`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `milestones_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND (EXISTS ( SELECT 1 FROM (timelines t JOIN projects p ON ((t.project_id = p.proje...` | app.is_org_member, app.has_permission |

### Table: `notification_activity`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_channels`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_deliveries`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_digest`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_failures`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_logs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_preferences`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_queue`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_templates`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notification_webhooks`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `notifications`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `MEDIUM (Drizzle-only, no Data API grant, but RLS recommended)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `organization_invitations`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `HIGH (Sensitive Tenant Auth Table lacking RLS)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `organization_memberships`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `HIGH (Sensitive Tenant Auth Table lacking RLS)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `organization_sequences`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `organizations`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `org_select` | `{authenticated}` | `app.is_org_member(organization_id)` | app.is_org_member |
| UPDATE | `org_update` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('organization'::text, 'update'::text))` | app.is_org_member, app.has_permission |

### Table: `project_members`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW (Hardened in 0018 via app.is_project_member, verified recursion-free)`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| DELETE | `project_members_delete` | `{authenticated}` | `((EXISTS ( SELECT 1 FROM projects p WHERE ((p.project_id = project_members.project_id) AND app.is_org_member(p.organizat...` | app.is_org_member, app.has_permission |
| INSERT | `project_members_insert` | `{authenticated}` | `((EXISTS ( SELECT 1 FROM projects p WHERE ((p.project_id = project_members.project_id) AND app.is_org_member(p.organizat...` | app.is_org_member, app.has_permission |
| SELECT | `project_members_select` | `{authenticated}` | `((EXISTS ( SELECT 1 FROM projects p WHERE ((p.project_id = project_members.project_id) AND app.is_org_member(p.organizat...` | app.is_org_member, app.has_permission |
| UPDATE | `project_members_update` | `{authenticated}` | `((EXISTS ( SELECT 1 FROM projects p WHERE ((p.project_id = project_members.project_id) AND app.is_org_member(p.organizat...` | app.is_org_member, app.has_permission |

### Table: `project_phases`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `project_phases_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND (EXISTS ( SELECT 1 FROM (timelines t JOIN projects p ON ((t.project_id = p.proje...` | app.is_org_member, app.has_permission |

### Table: `projects`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW (Hardened in 0018 via app.is_project_member, verified recursion-free)`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| DELETE | `projects_delete` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('projects'::text, 'delete'::text))` | app.is_org_member, app.has_permission |
| INSERT | `projects_insert` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('projects'::text, 'create'::text))` | app.is_org_member, app.has_permission |
| SELECT | `projects_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('projects'::text, 'read'::text) AND ((visibility <> 'private'...` | app.is_org_member, app.has_permission, app.is_project_member |
| UPDATE | `projects_update` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('projects'::text, 'update'::text))` | app.is_org_member, app.has_permission |

### Table: `reviews`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `revision_activity`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_assignments`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_changes`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_checklists`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_comments`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_history`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_items`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_labels`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_merge_previews`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_requests`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_tags`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revision_threads`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `revisions`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| ALL | `project_isolation_policy` | `{authenticated}` | `((organization_id = ( SELECT users.organization_id FROM users WHERE (users.user_id = auth.uid()))) AND (project_id IN ( ...` | None |

### Table: `roles`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| DELETE | `roles_delete` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('roles'::text, 'delete'::text) AND (is_system = false))` | app.is_org_member, app.has_permission |
| INSERT | `roles_insert` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('roles'::text, 'create'::text) AND (is_system = false))` | app.is_org_member, app.has_permission |
| SELECT | `roles_select` | `{authenticated}` | `app.is_org_member(organization_id)` | app.is_org_member |
| UPDATE | `roles_update` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('roles'::text, 'update'::text) AND (is_system = false))` | app.is_org_member, app.has_permission |

### Table: `share_access_logs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_activity`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_annotations`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_comments`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_download_logs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_events`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_expiration`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_labels`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_notifications`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_passwords`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_permissions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_policies`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_recipients`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_security_logs`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_session_items`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_sessions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_tags`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_token_nonces`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_versions`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `share_watermarks`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_activity`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_assignees`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_attachments`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_checklist_items`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_checklists`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_comments`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_dependencies`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_labels`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_tags`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_time_entries`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `task_watchers`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `LOW (Internal worker / AI agent / ledger table; zero Data API grants)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `tasks`

- **RLS Enabled**: `false`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: NONE
  - `service_role`: NONE
- **Risk Classification**: `MEDIUM (Drizzle-only, no Data API grant, but RLS recommended)`

*No RLS policies attached. Direct Data API access blocked by absence of table grants (returns 42501).*

### Table: `timeline_dependencies`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `timeline_dependencies_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND (EXISTS ( SELECT 1 FROM (timelines t JOIN projects p ON ((t.project_id = p.proje...` | app.is_org_member, app.has_permission |

### Table: `timeline_versions`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `timeline_versions_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND (EXISTS ( SELECT 1 FROM (timelines t JOIN projects p ON ((t.project_id = p.proje...` | app.is_org_member, app.has_permission |

### Table: `timelines`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| SELECT | `timelines_select` | `{authenticated}` | `(app.is_org_member(organization_id) AND (EXISTS ( SELECT 1 FROM projects p WHERE ((p.project_id = timelines.project_id) ...` | app.is_org_member, app.has_permission |

### Table: `users`

- **RLS Enabled**: `true`
- **FORCE RLS**: `false`
- **Privileges**: 
  - `anon`: NONE
  - `authenticated`: SELECT
  - `service_role`: NONE
- **Risk Classification**: `LOW`

| Command | Policy Name | Roles | Definition (USING / WITH CHECK) | Dependencies / Helper Functions |
| :--- | :--- | :--- | :--- | :--- |
| INSERT | `users_insert` | `{authenticated}` | `(app.is_org_member(organization_id) AND app.has_permission('users'::text, 'create'::text))` | app.is_org_member, app.has_permission |
| SELECT | `users_select` | `{authenticated}` | `app.is_org_member(organization_id)` | app.is_org_member |
| UPDATE | `users_update` | `{authenticated}` | `(app.is_org_member(organization_id) AND ((user_id = auth.uid()) OR app.has_permission('users'::text, 'update'::text)))` | app.is_org_member, app.has_permission |

