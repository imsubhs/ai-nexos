# AI NEX OS — Target Database Design & Data Integrity Specification
## Phase 1C: Relational Schema Architecture & Integrity Invariants

---

## Document Control

| Attribute | Detail |
| :--- | :--- |
| **Document Path** | `docs/architecture/AI-NEX-OS-TARGET-DATABASE-DESIGN.md` |
| **Version** | 1.0.0 (Phase 1C Target Schema Design) |
| **Status** | **APPROVED TECHNICAL DESIGN (DOCUMENTATION ONLY)** |
| **Date** | September 26, 2026 |
| **Architects** | Principal Database Architect, SaaS Multi-Tenancy Architect, Security Architect |
| **Repository Root** | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`) |
| **Target Branch** | `phase-2-production-readiness` |
| **Scope** | Documentation-only relational schema design, table definitions, users table decomposition, sequence namespaces, and mandatory data integrity invariants. |

---

## 1. Schema Design Principles

1. **Documentation-Only Boundary**: No migrations are created or executed in this phase. This document serves as the implementation blueprint for upcoming migration phases.
2. **Reuse Existing Foundations**: AI NEX OS already possesses 52 relational tables with foreign keys to `organization_id`. The target schema preserves operational tables (`projects`, `tasks`, `deliverables`, `workforce`, `files`, `meetings`, `ai_conversations`) and introduces only the structural tables required for multi-tenant identity and membership.
3. **Additive-First Evolution**: All schema modifications in transitional stages must be strictly backward-compatible and additive. Columns are added as nullable or with defaults; destructive alterations (`DROP COLUMN`, `ALTER COLUMN NOT NULL`) are deferred to post-cutover deprecation phases.
4. **Normalized Relational Integrity**: Tenancy boundaries are enforced via PostgreSQL foreign keys, composite unique constraints, and check constraints, preventing orphaned records and cross-tenant leakage.

---

## 2. Public.Users Table Decomposition & Global Identity Model

### 2.1 The Current Single-Tenant Structure
Currently, `src/db/schema/users.ts` bundles global creator identity, workspace tenancy, role assignment, and employment details into a single table:
- `user_id` (UUID PK mirroring `auth.users.id`)
- `organization_id` (UUID NOT NULL FK → `organizations.organization_id`)
- `role_id` (UUID NOT NULL FK → `roles.role_id`)
- `department_id` (UUID FK → `departments.department_id`)
- `first_name`, `last_name`, `email`, `phone`, `avatar_url`
- `designation`, `timezone`, `working_hours`, `employment_type`, `joining_date`, `status`
- Unique Index: `uq_users_email` ON `(email)`

### 2.2 Field-by-Field Decomposition & Classification Matrix

Every existing column in `public.users` is classified according to its architectural home in the decoupled SaaS model:

| Field Name | Current Type | Target Classification | Target Destination Table | Architectural Rationale & Migration Treatment |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | **GLOBAL IDENTITY** | `public.users.user_id` | Remains Primary Key. Directly mirrors `auth.users.id` (Supabase Auth). |
| `email` | `text` | **GLOBAL IDENTITY** | `public.users.email` | Global account email. Unique index `uq_users_email` remains on `users` to identify human account. |
| `first_name` | `text` | **GLOBAL IDENTITY** | `public.users.first_name` | Human user's legal/display first name. Shared across workspaces. |
| `last_name` | `text` | **GLOBAL IDENTITY** | `public.users.last_name` | Human user's legal/display last name. Shared across workspaces. |
| `phone` | `text` | **GLOBAL IDENTITY** | `public.users.phone` | Personal contact number for SMS/2FA. |
| `avatar_url` | `text` | **GLOBAL IDENTITY** | `public.users.avatar_url` | Global creator profile avatar. Workspace-specific avatar override deferred to [FUTURE]. |
| `timezone` | `text` | **GLOBAL IDENTITY (PERSONAL)** | `public.users.timezone` | User's local personal timezone for UI rendering (e.g. notifications). Agency policy timezone lives on `organizations.timezone`. |
| `status` | `entity_status` | **GLOBAL IDENTITY** | `public.users.status` | Global account status (`active`, `suspended`). If suspended, user cannot access any workspace. |
| `created_at` | `timestamptz` | **GLOBAL IDENTITY** | `public.users.created_at` | Audit timestamp of initial registration. |
| `updated_at` | `timestamptz` | **GLOBAL IDENTITY** | `public.users.updated_at` | Audit timestamp of profile update. |
| `deleted_at` | `timestamptz` | **GLOBAL IDENTITY** | `public.users.deleted_at` | Soft delete flag for global user identity. |
| `organization_id` | `uuid` | **LEGACY / DEPRECATE** | `organization_memberships` | **Must migrate.** Becomes nullable in Phase 4; removed in Phase 8. Tenancy belongs exclusively to memberships. |
| `role_id` | `uuid` | **ROLE-SCOPED / DEPRECATE** | `organization_memberships` | **Must migrate.** A user can be `owner` in Agency A and `team_member` in Agency B. |
| `department_id` | `uuid` | **ORGANIZATION-SCOPED** | `organization_memberships` | **Must migrate.** Department affiliation is specific to an agency workspace. |
| `designation` | `text` | **ORGANIZATION-SCOPED** | `organization_memberships` | **Must migrate.** A user's job title (e.g., "Lead Editor") is agency-specific. |
| `working_hours` | `jsonb` | **ORGANIZATION-SCOPED** | `organization_memberships` | **Must migrate.** Shift schedules and expected working hours are agency-specific. |
| `employment_type`| `enum` | **ORGANIZATION-SCOPED** | `organization_memberships` | **Must migrate.** A user can be full-time in one studio and freelance in another. |
| `joining_date` | `date` | **ORGANIZATION-SCOPED** | `organization_memberships` | **Must migrate.** Joining date is an agency employment milestone. |

### 2.3 Target `public.users` Schema (Decoupled Global Profile)

```sql
-- Target DDL (Documentation Only)
CREATE TABLE public.users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  phone text,
  avatar_url text,
  timezone text NOT NULL DEFAULT 'UTC',
  status entity_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  
  -- Transitional legacy columns (Made nullable during Phase 4 migration)
  legacy_organization_id uuid REFERENCES public.organizations(organization_id) ON DELETE SET NULL,
  legacy_role_id uuid REFERENCES public.roles(role_id) ON DELETE SET NULL,
  
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX idx_users_status ON public.users (status) WHERE deleted_at IS NULL;
```

---

## 3. Comprehensive Target Table Specifications

The following section details the proposed relational structures required for multi-tenant identity, membership, settings, and invitations:

### 3.1 Table: `organization_memberships`
The definitive relational join table bridging global user identity to agency workspaces.

| Column | Type | Nullable | Default | PK | FK | Constraint / Index | RLS Consideration | App Authorization |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| `membership_id` | `uuid` | No | `gen_random_uuid()` | **PK** | None | Primary Key | `app.is_org_member(org_id)` | Authenticated User |
| `user_id` | `uuid` | No | None | No | `users(user_id)` ON DELETE CASCADE | Index: `idx_mem_user` | User can read own memberships | User / Admin |
| `organization_id`| `uuid` | No | None | No | `organizations(organization_id)` ON DELETE CASCADE | Index: `idx_mem_org` | Org members can view colleague memberships | Owner / Admin |
| `role_id` | `uuid` | No | None | No | `roles(role_id)` ON DELETE RESTRICT | Index: `idx_mem_role` | Evaluated for permissions | Owner / Super Admin |
| `department_id` | `uuid` | Yes | None | No | `departments(department_id)` ON DELETE SET NULL | Index: `idx_mem_dept` | Department filtering | Admin / HR |
| `designation` | `text` | Yes | None | No | None | None | Visible to org members | Admin / HR |
| `employment_type`| `employment_type_enum` | No | `'full_time'` | No | None | None | Visible to HR / Admin | Admin / HR |
| `working_hours` | `jsonb` | Yes | None | No | None | None | Used by Workforce validation | Admin / HR |
| `status` | `text` | No | `'active'` | No | None | Check: `IN ('invited','active','suspended','removed')` | Suspended members denied access | Admin / HR |
| `is_default` | `boolean` | No | `false` | No | None | Partial Index: `user_id WHERE is_default = true` | Fallback active tenant | User Profile |
| `joined_at` | `timestamptz` | Yes | `now()` | No | None | None | Historical reporting | System / Admin |
| `invited_at` | `timestamptz` | Yes | None | No | None | None | Historical reporting | System / Admin |
| `accepted_at` | `timestamptz` | Yes | None | No | None | None | Historical reporting | System / Admin |
| `suspended_at`| `timestamptz` | Yes | None | No | None | None | Audit log | System / Admin |
| `removed_at` | `timestamptz` | Yes | None | No | None | None | Audit log | System / Admin |
| `created_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |
| `updated_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |
| `deleted_at` | `timestamptz` | Yes | None | No | None | Partial unique index | Soft deletion | Admin |

**Table Constraints**:
- `CONSTRAINT uq_user_organization UNIQUE (user_id, organization_id)` (filtered `WHERE deleted_at IS NULL`).
- `CONSTRAINT chk_membership_status CHECK (status IN ('invited', 'active', 'suspended', 'removed'))`.

---

### 3.2 Table: `organizations` (Enhanced Sovereign Tenant)
The root operational tenant record. Existing structure in `src/db/schema/organizations.ts` is enhanced additively.

| Column | Type | Nullable | Default | PK | FK | Constraint / Index | RLS Consideration | App Authorization |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| `organization_id`| `uuid` | No | `gen_random_uuid()` | **PK** | None | Primary Key | Root tenant boundary | System |
| `organization_name`| `text` | No | None | No | None | None | Org members can view | Owner / Admin |
| `legal_name` | `text` | Yes | None | No | None | None | Invoice generation | Owner / Finance |
| `slug` | `text` | No | None | No | None | Unique: `uq_organizations_slug` | URL routing | Owner / Admin |
| `code_prefix` | `text` | No | `'NEX'` | No | None | Unique: `uq_organizations_code_prefix` | Sequential ID prefix | Owner / Admin |
| `logo_url` | `text` | Yes | None | No | None | None | White-label branding | Owner / Admin |
| `website` | `text` | Yes | None | No | None | None | Metadata | Owner / Admin |
| `industry` | `text` | Yes | None | No | None | None | Metadata | Owner / Admin |
| `timezone` | `text` | No | `'UTC'` | No | None | Valid IANA timezone | Policy attendance timezone | Owner / HR |
| `currency` | `text` | No | `'USD'` | No | None | ISO-4217 code | Financial reporting | Owner / Finance |
| `country` | `text` | Yes | None | No | None | ISO 3166-1 alpha-2 | Compliance | Owner / Admin |
| `address` | `text` | Yes | None | No | None | None | Billing address | Owner / Admin |
| `contact_email`| `text` | Yes | None | No | None | None | Administrative alerts | Owner / Admin |
| `contact_phone`| `text` | Yes | None | No | None | None | Administrative alerts | Owner / Admin |
| `brand_primary_color` | `text` | Yes | `'#0F172A'` | No | None | Hex color string | CSS custom property injection | Owner / Admin |
| `brand_secondary_color` | `text` | Yes | `'#38BDF8'` | No | None | Hex color string | CSS custom property injection | Owner / Admin |
| `status` | `entity_status` | No | `'active'` | No | None | Check: `active, suspended, archived` | Suspended org locks out all members | Platform Admin |
| `created_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |
| `updated_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |
| `deleted_at` | `timestamptz` | Yes | None | No | None | Soft delete | Organization archival | Platform Admin |

---

### 3.3 Table: `organization_invitations`
Governs tokenized team member invitations before account provisioning.

| Column | Type | Nullable | Default | PK | FK | Constraint / Index | RLS Consideration | App Authorization |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| `invitation_id`| `uuid` | No | `gen_random_uuid()` | **PK** | None | Primary Key | `app.is_org_member(org_id)` | Admin / HR |
| `organization_id`| `uuid` | No | None | No | `organizations(organization_id)` ON DELETE CASCADE | Index: `idx_inv_org` | Scoped to inviting tenant | Admin / HR |
| `email` | `text` | No | None | No | None | Lowercase check | Filtered search | Admin / HR |
| `role_id` | `uuid` | No | None | No | `roles(role_id)` ON DELETE RESTRICT | Index: `idx_inv_role` | Intended role | Admin / HR |
| `department_id` | `uuid` | Yes | None | No | `departments(department_id)` ON DELETE SET NULL | None | Intended department | Admin / HR |
| `token_hash` | `text` | No | None | No | None | Unique: `uq_invitations_token_hash` | SHA-256 hash of secret token | Public token redemption |
| `expires_at` | `timestamptz` | No | None | No | None | Check: `expires_at > created_at` | 7-day expiration | System / Public |
| `status` | `text` | No | `'pending'` | No | None | Check: `IN ('pending','accepted','expired','revoked','declined')` | Status transitions | System / Admin |
| `invited_by_user_id` | `uuid` | No | None | No | `users(user_id)` ON DELETE SET NULL | Index: `idx_inv_inviter` | Inviter audit | System / Admin |
| `accepted_by_user_id`| `uuid` | Yes | None | No | `users(user_id)` ON DELETE SET NULL | Index: `idx_inv_accepter` | Acceptance audit | System |
| `created_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |
| `updated_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |

**Table Constraints**:
- `CONSTRAINT uq_org_pending_email UNIQUE (organization_id, email, status)` where `status = 'pending'`. Prevents duplicate active invitations to the same email address in the same workspace.

---

### 3.4 Table: `organization_settings`
Isolates tenant-specific configuration, eliminating environment variable dependencies.

| Column | Type | Nullable | Default | PK | FK | Constraint / Index | RLS Consideration | App Authorization |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| `setting_id` | `uuid` | No | `gen_random_uuid()` | **PK** | None | Primary Key | `app.is_org_member(org_id)` | Admin |
| `organization_id`| `uuid` | No | None | No | `organizations(organization_id)` ON DELETE CASCADE | Unique: `uq_settings_org` | Exactly 1 settings row per tenant | Admin |
| `enforce_2fa` | `boolean` | No | `false` | No | None | None | Security policy | Owner |
| `allowed_auth_domains` | `jsonb` | No | `'[]'` | No | None | Domain whitelist for SSO | Security policy | Owner |
| `session_timeout_minutes`| `integer`| No | `1440` | No | None | Check: `> 15` | Session management | Admin |
| `max_storage_bytes`| `bigint` | No | `53687091200` | No | None | Default 50 GB | Storage quota check | Platform Admin |
| `ai_monthly_token_cap` | `integer`| No | `5000000` | No | None | Token budget | AI Cost Governance | Owner / Admin |
| `ai_cost_alert_threshold`| `decimal`| No | `0.80` | No | None | Alert at 80% usage | AI Cost Governance | Owner / Admin |
| `webhook_secret` | `text` | Yes | None | No | None | HMAC secret | Outbound webhook signing | Admin |
| `created_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |
| `updated_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |

---

### 3.5 Table: `organization_domains` [ENTERPRISE / FUTURE]
Supports custom agency domains (e.g., `creative.acmestudios.com`) and automated SSL routing.

| Column | Type | Nullable | Default | PK | FK | Constraint / Index | RLS Consideration | App Authorization |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| `domain_id` | `uuid` | No | `gen_random_uuid()` | **PK** | None | Primary Key | `app.is_org_member(org_id)` | Owner |
| `organization_id`| `uuid` | No | None | No | `organizations(organization_id)` ON DELETE CASCADE | Index: `idx_domains_org` | Scoped to tenant | Owner |
| `domain_name` | `text` | No | None | No | None | Unique: `uq_domain_name` | Lowercase hostname | Owner |
| `verification_token` | `text` | No | None | No | None | DNS TXT verification token | Security validation | System / Owner |
| `is_verified` | `boolean` | No | `false` | No | None | None | Routing activation flag | System |
| `ssl_status` | `text` | No | `'pending'` | No | None | Check: `pending, active, error` | SSL provisioning | System |
| `created_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |
| `updated_at` | `timestamptz` | No | `now()` | No | None | None | System timestamp | System |

---

### 3.6 Roles & Permissions Architecture: Relational vs. JSONB
The current platform stores role permissions in `public.roles.permissions` as a `jsonb` map (`Record<Module, Action[]>`), evaluated in Postgres via `app.has_permission(module, action)` and in TypeScript via `hasPermission()`.

**Architectural Evaluation**:
- *Option 1: Relational Normalization (`permissions` and `role_permissions` join tables)*: Requires 300+ permission rows and join overhead on every authorization check.
- *Option 2: JSONB Permission Profile (Current Production Model)*: Highly performant, validated in single database round-trip, supported by indexed operators (`?`, `?|`, `?&`), and directly compatible with existing PostgreSQL RLS helper functions.

**Architectural Decision**:
**Retain the JSONB Permission Profile Model (`roles.permissions`)**. Do not introduce redundant relational join tables (`role_permissions`). The JSONB structure is proven, type-safe via TypeScript `PermissionMap`, and zero-latency in PostgreSQL execution.

---

## 4. Organization Sequential Code Namespace Design

### 4.1 Requirement & Rationale
Currently, project codes (`AIC-2026-0001`), task codes (`AIC-T-2026-0001`), and employee codes (`AIC-0001`) hardcode the `AIC` prefix. In a multi-tenant SaaS, each agency requires a custom, recognizable code prefix (e.g. `ACME-2026-0001` or `OGILVY-2026-0001`).

**Implementation Status (Phase 2):** `[IMPLEMENTED - PHASE 2]`. Schema column `codePrefix` added to `src/db/schema/organizations.ts`, unique index `uq_organizations_code_prefix` defined, centralized service `src/features/organizations/code-generation.ts` wired to project, task, and meeting actions, and migration `database/migrations/0015_organization_code_prefix.sql` prepared.

### 4.2 Column Definition: `organizations.code_prefix`
- **Data Type**: `text NOT NULL`
- **Default Value**: `'NEX'` (For new agencies) / `'AIC'` (For existing seed organization)
- **Allowed Characters**: Uppercase alphanumeric characters only (`^[A-Z0-9]{2,8}$`).
- **Maximum Length**: 8 characters. Minimum length: 2 characters.
- **Reserved Prefixes**: `SYS`, `ADMIN`, `NEXOS`, `API`, `ROOT`, `TEST`, `DEMO`.
- **Normalization**: Automatically trimmed and converted to uppercase upon creation/update.
- **Uniqueness Constraint**: Unique across all organizations (`CONSTRAINT uq_organizations_code_prefix UNIQUE (code_prefix)`).

### 4.3 Monotonic Sequence Generation & Concurrency Locking
Sequential codes are tracked per tenant using `public.organization_sequences` (composite PK `[organization_id, entity_type]`):

```sql
-- Sequence Generation Contract (Documentation Only)
CREATE OR REPLACE FUNCTION app.generate_next_entity_code(
  p_organization_id uuid,
  p_entity_type text,
  p_year integer DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next_val integer;
  v_code text;
BEGIN
  -- 1. Fetch and validate tenant code_prefix
  SELECT code_prefix INTO v_prefix
  FROM public.organizations
  WHERE organization_id = p_organization_id AND deleted_at IS NULL;
  
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'ORGANIZATION_NOT_FOUND_OR_DELETED';
  END IF;

  -- 2. Concurrency Lock: Monotonic increment with row-level lock
  INSERT INTO public.organization_sequences (organization_id, entity_type, next_value)
  VALUES (p_organization_id, p_entity_type, 2)
  ON CONFLICT (organization_id, entity_type)
  DO UPDATE SET next_value = organization_sequences.next_value + 1
  RETURNING next_value - 1 INTO v_next_val;

  -- 3. Format according to entity type
  IF p_entity_type = 'project' THEN
    v_code := v_prefix || '-' || p_year::text || '-' || lpad(v_next_val::text, 4, '0');
  ELSIF p_entity_type = 'task' THEN
    v_code := v_prefix || '-T-' || p_year::text || '-' || lpad(v_next_val::text, 4, '0');
  ELSIF p_entity_type = 'employee' THEN
    v_code := v_prefix || '-' || lpad(v_next_val::text, 4, '0');
  ELSE
    v_code := v_prefix || '-' || upper(p_entity_type) || '-' || lpad(v_next_val::text, 4, '0');
  END IF;

  RETURN v_code;
END;
$$;
```

---

## 5. Mandatory Data Integrity Invariants

The target architecture enforces the following unbreakable relational and operational invariants:

### 5.1 Tenancy & Membership Invariants
1. **INVAR-01 (Strict Membership Sovereignty)**: A user cannot read, query, or mutate resources in an organization without possessing an `active` row in `organization_memberships` where `deleted_at IS NULL`.
2. **INVAR-02 (Foreign Key Completeness)**: Every `organization_memberships` row must reference an existing `public.users(user_id)` and an existing `public.organizations(organization_id)`.
3. **INVAR-03 (Single Active Membership Per Org)**: A user may hold at most ONE active membership in a given organization. Re-inviting an existing active member must be rejected.
4. **INVAR-04 (Role Tenancy Parity)**: The `role_id` assigned to an `organization_memberships` row must belong to the *same* `organization_id` as the membership itself (`roles.organization_id = organization_memberships.organization_id`).

### 5.2 Workspace & Resource Invariants
5. **INVAR-05 (Sovereign Resource Ownership)**: A project, client, task, file, meeting, or deliverable must belong to exactly ONE organization. No operational entity may have a `null` `organization_id`.
6. **INVAR-06 (Parent-Child Tenancy Parity)**: A task cannot belong to a project from a different organization (`tasks.organization_id = projects.organization_id`).
7. **INVAR-07 (Deliverable Tenancy Parity)**: A deliverable revision or approval cannot reference a parent deliverable from a different organization.
8. **INVAR-08 (Department Tenancy Parity)**: A user cannot be assigned a `department_id` belonging to an organization different from the active workspace.

### 5.3 Client Portal & Share Invariants
9. **INVAR-09 (Client Identity Isolation)**: Client reviewers are never inserted into `public.users` or `auth.users`. All portal actions are attributed strictly to `external_identities`.
10. **INVAR-10 (Zero Share Leakage)**: A share token (`deliverable_share_links`) cannot expose or stream media assets outside the organization that issued the share session.
11. **INVAR-11 (Single-Use Nonce Revocation)**: Revoking a share token or exceeding the token expiration date immediately invalidates all active reviewer sessions.

### 5.4 AI Subsystem Invariants
12. **INVAR-12 (Cross-Tenant AI Context Immunity)**: No prompt compilation or vector search query may retrieve `ai_contexts` or `ai_context_sources` from another organization.
13. **INVAR-13 (Cost Attribution Sovereignty)**: Every token consumed through the AI gateway must be attributed to the active `organization_id` in `ai_cost_tracking`.
14. **INVAR-14 (Hard Budget Enforcement)**: If an organization exceeds its configured `ai_monthly_token_cap`, all further LLM inference requests must be refused with HTTP 429.

### 5.5 Invitation Invariants
15. **INVAR-15 (Targeted Redemption)**: An invitation cannot be redeemed to grant access to an organization other than the one that generated the token.
16. **INVAR-16 (Token Hash Security)**: Raw invitation secrets are never stored in the database. Only HMAC-SHA256 digests (`token_hash`) are persisted.
