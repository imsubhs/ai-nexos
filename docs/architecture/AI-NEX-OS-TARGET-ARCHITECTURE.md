# AI NEX OS — Target SaaS Technical Architecture

## Phase 1C: System Architecture & Technical Design Specification

---

## Document Control

| Attribute           | Detail                                                                                                                  |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------- |
| **Document Path**   | `docs/architecture/AI-NEX-OS-TARGET-ARCHITECTURE.md`                                                                    |
| **Version**         | 1.0.0 (Phase 1C Implementation Architecture)                                                                            |
| **Status**          | **APPROVED TECHNICAL DESIGN**                                                                                           |
| **Date**            | September 26, 2026                                                                                                      |
| **Architects**      | Principal Software Architect, Security Architect, Database Architect, SaaS Multi-Tenancy Architect                      |
| **Repository Root** | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`)                                                                        |
| **Target Branch**   | `phase-2-production-readiness`                                                                                          |
| **Scope**           | Complete target system architecture for transforming AI NEX OS into an agency-agnostic, multi-tenant B2B SaaS platform. |

---

## 1. Executive Summary & Architectural Objective

The primary objective of the **Phase 1C Technical Design** is to specify the precise implementation architecture required to transition **AI NEX OS** from its single-tenant origin (anchored to "AI Collective") into an enterprise-grade, multi-tenant B2B SaaS Operating System for creative execution.

### The Core Architectural Transition

```
CURRENT (SINGLE-TENANT TIGHT COUPLING):
Authentication Identity (auth.users)
          ↓ 1:1
   public.users (organization_id, role_id)
          ↓ 1:1
   public.organizations
          ↓
   public.roles (single per user across all contexts)

TARGET (DECOUPLED MULTI-TENANT SAAS):
Authentication Identity (auth.users)
          ↓ 1:1
Application User Identity (public.users) [Global Creator Profile]
          ↓ 1:N
Organization Membership (public.organization_memberships) [Active/Invited/Suspended]
          ↓ N:1
Organization (public.organizations) [Sovereign Tenant]
          ↓ 1:N
Role (public.roles) [Scoped strictly to Organization]
          ↓ 1:N
Permissions (Module × Action JSONB Profile)
          ↓
Capabilities (Resolved feature flags & execution gates)
```

### Absolute Implementation Invariants

1. **Zero Downtime & Zero Regression**: Existing production users, organizations, project codes, tasks, and workforce records must remain operational throughout all phases.
2. **The Tenant Is Never A Parameter**: No Server Action, Route Handler, or API endpoint may accept `organization_id` from client callers. Tenant context must be resolved strictly from the authenticated session and validated membership.
3. **No Direct RLS Assumptions on Server Drizzle**: The server-side Drizzle ORM client operates over PgBouncer as the table owner (`postgres` role) and bypasses PostgreSQL RLS. Multi-tenancy must be enforced via a Four-Layer Defense-in-Depth model.
4. **Strict Isolation of Client Reviewers**: Client portal callers are external tokenized guests (`external_identities`) governed by cryptographic HMAC share tokens, completely isolated from internal workspace identities and tables.
5. **No Production Mutation**: This document defines the implementation-grade blueprint; it does not execute migrations or alter runtime source code.

---

## 2. Independent Verification of Phase 1B.1 Claims

Before defining the target architecture, two foundational claims from Phase 1B.1 were independently audited against active repository code:

### Claim A: Drizzle Connection Role & RLS Bypass

- **Phase 1B.1 Claim**: "The server-side Drizzle connection uses a PostgreSQL superuser or schema-owner role that bypasses ordinary RLS."
- **Codebase Evidence**:
  - `src/db/index.ts` (L11): `NOTE: this connection runs as the postgres role and BYPASSES RLS.`
  - `database/migrations/0010_data_api_select_grants.sql` (L4-18): States that tables are "owned by `postgres`" and "writes continue to go through the Drizzle connection as the table owner."
  - In PostgreSQL, the table owner bypasses Row Level Security unless `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is set. No `FORCE ROW LEVEL SECURITY` directives exist in `database/migrations/`.
- **Architectural Verification Finding**: **UNVERIFIED (AT LIVE CATALOG LEVEL)**. While application code comments and migration documentation establish that the Drizzle connection runs as the table owner (`postgres`) and is designed to bypass RLS, live catalog attributes (`pg_roles.rolsuper` and `pg_roles.rolbypassrls`) cannot be verified via static code inspection. Therefore, architecture must treat Drizzle RLS bypass as an **Application-Level Fact**, and mark the exact PostgreSQL engine privilege as **UNVERIFIED**. RLS must never be assumed to protect Drizzle queries.

### Claim B: Self-Service Registration Decision Status

- **Phase 1B.1 Claim**: "ADR-008 describes self-service registration as deferred/admin approval."
- **Codebase Evidence**:
  - `docs/product/AI-NEX-OS-ARCHITECTURE-DECISION-REGISTER.md` (ADR-008): Status is explicitly set to `DEFERRED`.
  - PRD V2 §82 (AR-030) defines atomic provisioning pipelines but does not mandate a closed approval gate over instant self-service trials.
- **Architectural Verification Finding**: **OPEN PRODUCT DECISION**. No formal executive decision has accepted an approval-only onboarding gate. The target technical architecture must be configurable to support `INVITE_ONLY`, `APPROVAL_REQUIRED`, and `SELF_SERVICE` via configuration flags (`REGISTRATION_MODE`) without requiring architectural redesign.

---

## 3. Conceptual Entity Model & Boundaries

The target architecture defines seven discrete entities forming the tenancy hierarchy:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. AUTH IDENTITY (auth.users)                                               │
│    • Global authentication credentials (Email/Password, Google OAuth, OTP) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:1
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. APPLICATION USER (public.users)                                          │
│    • Global creator profile: ID, Email, Display Name, Avatar, Timezone      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 1:N
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ORGANIZATION MEMBERSHIP (public.organization_memberships)                │
│    • Tenant Bridge: user_id, organization_id, role_id, department_id        │
│    • Lifecycle Status: invited | active | suspended | removed               │
└──────────────────┬──────────────────────────────────────┬───────────────────┘
                   │ N:1                                  │ N:1
                   ▼                                      ▼
┌──────────────────────────────────────┐┌─────────────────────────────────────┐
│ 4. ORGANIZATION (organizations)      ││ 5. ROLE (public.roles)              │
│    • Sovereign commercial tenant     ││    • Tenant-scoped authorization    │
│    • Settings, code_prefix, brand    ││    • System & custom role profiles  │
└──────────────────┬───────────────────┘└──────────────────┬──────────────────┘
                   │                                       │ 1:N
                   │                                       ▼
                   │                    ┌─────────────────────────────────────┐
                   │                    │ 6. PERMISSION (Module × Action)     │
                   │                    │    • Granular operational rights    │
                   │                    └──────────────────┬──────────────────┘
                   │                                       │
                   ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. CAPABILITIES & TENANT RESOURCES                                          │
│    • Projects, Tasks, Deliverables, DAM Files, Workforce, AI Sessions       │
│    • Scoped exclusively to organization_id                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Entity Specifications

| Entity                      | Purpose                                             | Identifier                                                     | Ownership                              | Lifecycle                                                    | Security Boundary                             | Uniqueness                                                               | Foreign Keys                                                                                            | Deletion / Archival                                             | Audit Requirements                                   |
| :-------------------------- | :-------------------------------------------------- | :------------------------------------------------------------- | :------------------------------------- | :----------------------------------------------------------- | :-------------------------------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------- | :--------------------------------------------------- |
| **Auth Identity**           | Authentication credentials and session tokens       | Supabase `auth.users.id` (UUID)                                | Supabase Auth Engine                   | Managed by Supabase Auth; created on signup                  | Global auth perimeter; validated via PKCE/JWT | Unique `id`, Unique `email`                                              | None (Supabase internal)                                                                                | Soft delete via Supabase Auth; cascades to profile              | Supabase Auth logs                                   |
| **Application User**        | Global human creator profile independent of tenants | `public.users.user_id` (UUID PK)                               | 1:1 mirror of `auth.users.id`          | Created on initial login/signup; survives tenant removal     | Global application perimeter                  | Global Unique `email`                                                    | `user_id → auth.users.id` (onDelete: cascade)                                                           | Soft delete via `deleted_at`; preserved for audit trail         | Profile update logged to `activity_logs`             |
| **Organization Membership** | M:N bridge binding a user to an agency workspace    | `membership_id` (UUID PK defaultRandom)                        | Owned by Organization; references User | `invited` → `active` → `suspended` → `removed`               | Primary tenant authorization gate             | Composite Unique `(user_id, organization_id)` where `deleted_at IS NULL` | `user_id → users.user_id`, `organization_id → organizations.organization_id`, `role_id → roles.role_id` | Soft delete via `deleted_at` & `removed_at`; never hard deleted | Membership state changes logged to `activity_logs`   |
| **Organization**            | Sovereign agency tenant owning all operational data | `organization_id` (UUID PK defaultRandom)                      | Commercial subscriber                  | `trial` → `active` → `delinquent` → `suspended` → `archived` | Sovereign tenant data boundary                | Unique `slug`, Unique `code_prefix`                                      | None (Root entity)                                                                                      | Soft delete via `deleted_at`; data retention policy             | Organization configuration changes logged            |
| **Role**                    | Tenancy-bound permission bundle                     | `role_id` (UUID PK defaultRandom)                              | Owned by Organization                  | Created during tenant provisioning or admin action           | Tenant-scoped authorization boundary          | Unique `(organization_id, role_key)`                                     | `organization_id → organizations.organization_id`                                                       | System roles protected; custom roles soft deleted               | Role permission mutations logged                     |
| **Permission**              | Module-by-action capability atom                    | String tuple `(module, action)`                                | System catalog & Role assignment       | Static platform catalog; dynamically assigned                | Fine-grained operation gate                   | Unique within role JSONB map                                             | Embedded in `roles.permissions`                                                                         | Immutable platform actions                                      | Evaluated per request; authorization failures logged |
| **Capability**              | Feature flag and resource allowance gate            | Feature key string (e.g., `ai_advanced`, `workforce_tracking`) | Subscription plan & Organization       | Resolved dynamically from subscription & tenant state        | Feature gating boundary                       | Unique per organization entitlement                                      | Mapped to Subscription Tier                                                                             | Revoked on subscription downgrade                               | Plan upgrades and threshold breaches logged          |

---

## 4. End-to-End Request & Data Access Boundary

AI NEX OS maintains two distinct database access channels with completely different trust and security characteristics:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INCOMING USER REQUEST                                    │
│                              https://app.ai-nexos.com/projects                              │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. EDGE / PROXY PERIMETER (`src/proxy.ts` on Node.js Runtime)                               │
│    • Validates host: app.<domain> vs portal.<domain> vs root marketing                     │
│    • Checks Supabase Auth session token existence (optimistic route protection)             │
│    • Attaches per-request CSP nonces; handles redirect to /login or /onboarding             │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. SERVER ACTION / ROUTE HANDLER ENTRY PERIMETER                                            │
│    • AST Gate (`tests/unit/tenant-identity-surface.test.ts`) guarantees NO caller org_id   │
│    • Entrypoint invokes: `const context = await requireTenantContext();`                    │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
┌────────────────────────────────────────────────┐ ┌──────────────────────────────────────────┐
│ CHANNEL A: SUPABASE CLIENT (Direct / RLS)      │ │ CHANNEL B: DRIZZLE ORM (Server Service)  │
│ `createClient()` in `@/lib/supabase/server`    │ │ `db` in `@/db` via PgBouncer Pooler      │
├────────────────────────────────────────────────┤ ├──────────────────────────────────────────┤
│ • Auth: Caller JWT with `anon` key             │ │ • Auth: `DATABASE_URL` as Table Owner    │
│ • Database Role: `authenticated`               │ │ • Database Role: `postgres`              │
│ • PostgreSQL RLS: ACTIVE                       │ │ • PostgreSQL RLS: COMPLETELY BYPASSED    │
│ • Enforced via: `app.is_org_member(org_id)`    │ │ • Enforced via: MANDATORY APP PREDICATES │
│ • Primary Use: `getCurrentUser()` session      │ │ • Primary Use: All Workspace/Workforce   │
│   resolution, Supabase Storage, Realtime       │ │   Server Actions and mutations           │
└────────────────────────────────────────────────┘ └──────────────────────────────────────────┘
```

### The 8-Step Protected Server Action Execution Contract

Every protected mutation or data fetch in the application layer must execute according to the following sequential contract:

```
1. authenticate()
   └─ Validate Supabase session JWT via `supabase.auth.getUser()`.
   └─ If invalid: throw UNAUTHENTICATED error.

2. resolveUser()
   └─ Load global creator record from `public.users` where `user_id = auth.uid()`.
   └─ If not found: redirect to `/onboarding`.

3. resolveActiveOrganization()
   └─ Read `nexos_active_org_id` cookie from request.
   └─ If missing: resolve user's default membership (`is_default = true`).
   └─ If user has zero active memberships: redirect to `/onboarding`.

4. resolveMembership()
   └─ Query `public.organization_memberships` for `(user.id, activeOrgId)`.
   └─ Verify `status = 'active'` and `deleted_at IS NULL`.
   └─ If not found or inactive: throw NO_MEMBERSHIP / TENANT_MISMATCH error.

5. resolveRoleAndPermissions()
   └─ Load role and `permissions` JSONB map bound to the resolved membership.
   └─ Evaluate `hasPermission(permissions, targetModule, targetAction)`.
   └─ If unauthorized: throw FORBIDDEN error.

6. validateInput()
   └─ Validate incoming parameters against Zod schema.
   └─ Reject any caller-supplied `organization_id` or `user_id`.

7. executeTenantScopedOperation()
   └─ Instantiate `createTenantRepository(context)`.
   └─ Execute Drizzle query injecting `eq(table.organizationId, context.organizationId)`.
   └─ For ID lookups, perform object-level validation: target record must match `context.organizationId`.

8. audit()
   └─ Insert structured audit record into `public.activity_logs`.
   └─ Commit transaction and return sanitized DTO to caller.
```

---

## 5. Active Organization Context & Switching Architecture

### Context Storage Strategy: Secure Session Cookie

To preserve clean, professional dashboard URLs (`/projects`, `/tasks`, `/dashboard`) without forcing redundant URL slugs (`/org/acme/projects`), the application adopts **Secure Session Cookie Resolution (`nexos_active_org_id`)** for SaaS MVP:

- **Cookie Name**: `nexos_active_org_id`
- **Security Attributes**: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`
- **Fallback Rule**: If the cookie is absent or invalid, the server automatically selects the user's marked default membership (`is_default = true`), or the oldest active membership.

### Organization Switching Workflow (Tenant A → Tenant B)

When a user with multiple memberships selects a different workspace in the top-navigation organization switcher:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Browser Client
    participant Action as switchActiveOrganization()
    participant DB as Postgres (Memberships)
    participant Cache as React Cache / Cookies

    User->>Browser: Selects "Studio B" in Switcher
    Browser->>Action: invoke(targetOrgId = "org_b_uuid")
    Action->>Action: Validate caller authenticated
    Action->>DB: SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = "org_b_uuid" AND status = 'active'
    alt Valid Active Membership
        DB-->>Action: Record Exists (Status: active, Role: Project Manager)
        Action->>Cache: Set-Cookie: nexos_active_org_id=org_b_uuid; HttpOnly; Secure; SameSite=Lax
        Action->>DB: INSERT INTO activity_logs (event: "organization.switched", from: "org_a", to: "org_b")
        Action-->>Browser: { success: true }
        Browser->>Browser: Invalidate React Query caches & router.refresh()
        Browser->>Browser: Re-subscribe WebSockets to org_b channels
    else Invalid or Inactive Membership
        DB-->>Action: No active record
        Action-->>Browser: HTTP 403 Forbidden: "Unauthorized organization context"
        Browser->>User: Display alert: "Access to workspace denied"
    end
```

### Critical Tenant Crossover Protections during Switching

1. **Never Trust Cookie In isolation**: The cookie is treated as an _untrusted request hint_. The server must execute an authenticated SQL check verifying `organization_memberships` for every server action and page render.
2. **Client-Side Cache Invalidation**: Switching workspaces must trigger `queryClient.clear()` in `@tanstack/react-query` to prevent in-memory caching of deliverables, clients, or tasks from Tenant A into Tenant B's UI.
3. **Realtime Re-subscription**: All active Supabase Realtime channel subscriptions (`projects:org_a`, `notifications:org_a`) must be explicitly closed and re-opened for `org_b`.
4. **Background Job Context**: Asynchronous workers and queue processors never read session cookies; they must receive an explicit, immutable `organization_id` embedded inside the job payload.

---

## 6. Tenant-Bound Repository Architecture

To prevent developer errors where engineers forget to append `eq(table.organizationId, orgId)` to Drizzle queries, the application defines a **Tenant-Bound Repository Factory**:

```typescript
/**
 * Conceptual Type Contract for Tenant Context
 * (Documentation Only - Not Implemented in Phase 1C)
 */
export type TenantContext = {
  readonly userId: string;
  readonly organizationId: string;
  readonly membershipId: string;
  readonly roleKey: string;
  readonly permissions: PermissionMap;
  readonly organizationTimezone: string;
};

/**
 * Conceptual Tenant-Bound Repository Pattern
 */
export function createTenantRepository(context: TenantContext) {
  const { organizationId, userId } = context;

  return {
    projects: {
      async findById(projectId: string) {
        return db.query.projects.findFirst({
          where: and(
            eq(projects.projectId, projectId),
            eq(projects.organizationId, organizationId),
            isNull(projects.deletedAt),
          ),
        });
      },
      async list(options: { limit?: number; offset?: number } = {}) {
        return db.query.projects.findMany({
          where: and(
            eq(projects.organizationId, organizationId),
            isNull(projects.deletedAt),
          ),
          limit: options.limit ?? 50,
          offset: options.offset ?? 0,
        });
      },
      async create(data: InsertProjectData) {
        return db
          .insert(projects)
          .values({
            ...data,
            organizationId, // Enforced by closure; impossible to override
            createdBy: userId,
          })
          .returning();
      },
      async update(projectId: string, data: UpdateProjectData) {
        // Enforces object-level tenant scoping before mutation
        const result = await db
          .update(projects)
          .set({ ...data, updatedAt: new Date() })
          .where(
            and(
              eq(projects.projectId, projectId),
              eq(projects.organizationId, organizationId),
              isNull(projects.deletedAt),
            ),
          )
          .returning();
        if (!result.length) throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
        return result[0];
      },
    },
  };
}
```

---

## 7. AI Subsystem Multi-Tenancy Architecture

The AI subsystem represents significant platform value (prompts, brand voice guidelines, creative briefs, automated workflow agents, and token usage budgets). Tenancy boundaries must be absolute:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. AI SESSION & CONVERSATION OWNERSHIP                                      │
│    • `ai_sessions.organization_id` (Mandatory FK → organizations)           │
│    • `ai_conversations.organization_id` (Mandatory FK → organizations)      │
│    • `ai_conversations.project_id` (Optional FK → projects within same org) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. CONTEXT COMPILER & PROMPT RETRIEVAL                                      │
│    • `ai_contexts` and `ai_context_sources` assembled via `ContextBuilder`  │
│    • Vector & semantic search queries MUST include tenant filter:           │
│      `WHERE metadata->>'organization_id' = :activeOrgId`                    │
│    • System prompt attachments from DAM files or project briefs must be     │
│      verified against `context.organizationId` before injection into LLM    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. TOKEN USAGE & COST GOVERNANCE                                            │
│    • `ai_cost_tracking.organization_id` logs every execution event          │
│    • `AICostGovernance` checks tenant monthly token limits BEFORE inference │
│    • If monthly spend exceeds tenant threshold: execution rejected with     │
│      `AI_BUDGET_EXCEEDED` error, protecting agency from runaway costs       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Client Portal & External Review Security Model

AI NEX OS provides external creative review portals (`portal.<domain>/s/{token}`) for clients to review, annotate, and approve deliverables without requiring internal employee accounts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CLIENT REVIEWER (ZERO-LOGIN GUEST)                                          │
│ • No `auth.users` record                                                    │
│ • No `public.users` record                                                  │
│ • Identity captured as `external_identities` (email, company, IP, UserAgent)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Access via https://portal.<domain>/s/{token}
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CRYPTOGRAPHIC SHARE TOKEN (`deliverable_share_links` / `shares.ts`)         │
│ • 32-byte high-entropy token cryptographically hashed in DB                 │
│ • Enforces 4 validation gates:                                              │
│   1. Signature & Hash verification                                          │
│   2. Expiration check (`expires_at > now()`)                                │
│   3. Revocation status (`is_revoked = false`)                               │
│   4. Optional password verification via bcrypt / argon2                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Validated Session
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SANITIZED PUBLIC DTO PROJECTION LAYER                                       │
│ • Exposes strictly: Deliverable title, media preview URL, review comments   │
│ • Strictly EXCLUDES: Agency financial margins, internal employee names,    │
│   task budgets, attendance data, or other tenant deliverables               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Tenant Isolation Across Distributed Components

| Subsystem                 | Tenant Key / Partitioning Scheme    | Isolation Mechanism                                                             | Stale Data / Leakage Risk Mitigation                                              |
| :------------------------ | :---------------------------------- | :------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------- |
| **Search Engine**         | `org:{orgId}:idx:{module}`          | Lucene / Postgres FTS queries strictly filter `WHERE organization_id = :orgId`  | Command palette (`Cmd+K`) indexes include `organization_id` in document ID prefix |
| **Redis Cache**           | `org:{orgId}:{resource}:{id}`       | Key namespacing per tenant; no shared global keys                               | Organization switch purges request-scoped Redis keys; TTL capped at 300s          |
| **Client Portal Cache**   | `portal:token:{tokenHash}`          | Token-specific cache entries; zero tenant metadata exposed                      | Token revocation immediately deletes Redis cache entry                            |
| **Supabase Storage**      | `/{organizationId}/{bucket}/{path}` | Supabase Storage RLS policies validating caller organization prefix             | Signed download URLs capped at 15-minute expiration; direct public URLs disabled  |
| **WebSockets (Realtime)** | `org:{orgId}:events`                | Topic authorization via Postgres `app.is_org_member()`                          | Browser disconnects and clears channels upon workspace switch                     |
| **Background Jobs**       | Payload: `{ organizationId, ... }`  | Worker runtime initializes `TenantContext` from job payload before running task | Worker rejects tasks missing valid `organization_id`                              |
| **Outbound Webhooks**     | Signed with tenant secret           | HMAC-SHA256 signature calculated using `organization_settings.webhook_secret`   | Webhook dispatch verifies payload belongs strictly to sending organization        |

---

## 10. Observability, Telemetry & Security Forensics

All application logging, error capturing, and security forensics must carry standardized correlation metadata while strictly censoring sensitive credentials:

### Mandatory Correlation Context

Every log message must structure JSON telemetry with:

- `req_id`: Unique request UUID generated at the edge proxy
- `tenant_id`: Active `organization_id` (or `null` if unauthenticated)
- `user_id`: Authenticated `user_id` (or `null` if unauthenticated)
- `membership_id`: Active `membership_id`
- `role_key`: Active role key

### Strictly Redacted Information (Zero Logging)

The following fields must NEVER appear in server logs, Sentry captures, or audit records:

- Plaintext passwords and OTP tokens
- Invitation tokens and share link secrets
- Supabase session cookies and JWT bearer tokens
- Database connection strings or API keys
- Raw credit card or banking details

---

## 11. Technical Architecture Sign-Off & Implementation Gate

This target architecture specification forms the authoritative foundation for Phase 2, Phase 3, Phase 4, and Phase 5 development.

**Implementation Constraint**:
No engineer or autonomous agent may modify application source code or create production database migrations until Phase 1C design documentation is fully ratified.
