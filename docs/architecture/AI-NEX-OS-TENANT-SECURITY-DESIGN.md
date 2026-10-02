# AI NEX OS — Multi-Tenant Security & Isolation Architecture
## Phase 1C: Security Boundaries, Tenant Enforcement & Access Control

---

## Document Control

| Attribute | Detail |
| :--- | :--- |
| **Document Path** | `docs/architecture/AI-NEX-OS-TENANT-SECURITY-DESIGN.md` |
| **Version** | 1.0.0 (Phase 1C Technical Design) |
| **Status** | **APPROVED TECHNICAL DESIGN (DOCUMENTATION ONLY)** |
| **Date** | September 26, 2026 |
| **Architects** | Principal Security Architect, Database Architect, Software Architect |
| **Repository Root** | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`) |
| **Target Branch** | `phase-2-production-readiness` |
| **Scope** | Authoritative security architecture, defense-in-depth model, Drizzle vs RLS boundaries, tenant-bound repositories, authorization evaluation, AI tenancy, client portal isolation, and failure taxonomy. |

---

## 1. Executive Summary & Core Security Posture

In a multi-tenant B2B SaaS operating system serving competing creative agencies, video production companies, and brand consultancies, cross-tenant data leakage is an existential catastrophic risk. Competitor agencies must never view each other's client rosters, unreleased campaign deliverables, financial margins, employee attendance records, or proprietary AI prompts.

This document establishes the definitive **Multi-Tenant Security Architecture** for AI NEX OS. It defines the formal security boundaries across all data access pathways, mandates a Four-Layer Defense-in-Depth model, and establishes strict architectural guardrails so developers cannot accidentally omit tenant scoping.

---

## 2. Independent Audit & Verification of Phase 1B.1 Security Claims

### 2.1 Claim A: Drizzle Connection Role & RLS Bypass
- **Audit Verification**: **UNVERIFIED (CATALOG PRIVILEGES)**.
- **Static Code Evidence**:
  - `src/db/index.ts` states: `NOTE: this connection runs as the postgres role and BYPASSES RLS.`
  - `database/migrations/0010_data_api_select_grants.sql` confirms tables are owned by `postgres`.
  - In PostgreSQL, table owners bypass Row Level Security by default.
  - However, live catalog attributes (`pg_roles.rolsuper` and `pg_roles.rolbypassrls`) cannot be audited without live database introspection.
- **Architectural Policy**:
  - The security architecture explicitly assumes that **Drizzle ORM queries bypass PostgreSQL RLS**.
  - RLS must NEVER be cited as the security barrier for server-side Drizzle operations.
  - Tenant isolation for Drizzle operations rests entirely on verified application-layer scoping.

### 2.2 Claim B: Self-Service Registration Decision Status
- **Audit Verification**: **OPEN PRODUCT DECISION**.
- **Architectural Policy**:
  - The security architecture treats registration mode as configurable (`INVITE_ONLY`, `APPROVAL_REQUIRED`, `SELF_SERVICE`).
  - Security gates (email verification, IP rate limiting, CSRF protection, and atomic transaction provisioning) are enforced identically regardless of which registration mode the business enables.

---

## 3. The Dual-Channel Data Access Security Boundary

AI NEX OS operates two distinct database access channels with diametrically opposed security mechanisms:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                INCOMING USER / CLIENT HTTP REQUEST                          │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
┌──────────────────────────────────────────────┐ ┌────────────────────────────────────────────┐
│ CHANNEL 1: SERVER ACTION / WORKSPACE SERVICE │ │ CHANNEL 2: SUPABASE CLIENT & DATA API      │
│ `db` in `@/db` (Drizzle ORM over PgBouncer) │ │ `createClient()` in `@/lib/supabase/server` │
├──────────────────────────────────────────────┤ ├────────────────────────────────────────────┤
│ • Transport: Transaction Pooler (Port 6543)  │ │ • Transport: PostgREST / Supabase REST API │
│ • Database Role: `postgres` (Table Owner)    │ │ • Database Role: `authenticated` / `anon`  │
│ • PostgreSQL RLS: BYPASSES RLS               │ │ • PostgreSQL RLS: STRICTLY ACTIVE          │
│ • Authoritative Boundary: APPLICATION LAYER  │ │ • Authoritative Boundary: POSTGRESQL RLS   │
│   (AST Gate + Tenant Context + Repositories) │ │   (Security Definer `app.is_org_member`)   │
│ • Operations: All Business Logic Mutations,  │ │ • Operations: `getCurrentUser()` Session,  │
│   Projects, Tasks, Deliverables, Workforce   │ │   Supabase Realtime, Storage Policies      │
└──────────────────────────────────────────────┘ └────────────────────────────────────────────┘
```

### Authoritative Responsibility Mapping

| Component / Layer | Channel | Authoritative Security Mechanism | Failure Mode if Omitted |
| :--- | :--- | :--- | :--- |
| **Workspace Data Fetching** | Channel 1 (Drizzle) | `createTenantRepository` injecting `eq(table.organizationId, orgId)` | Cross-tenant data exposure (IDOR) |
| **Workspace Data Mutation** | Channel 1 (Drizzle) | Object-level tenant ownership validation before `UPDATE`/`DELETE` | Cross-tenant data tampering |
| **Session Profile Read** | Channel 2 (Supabase) | PostgreSQL RLS policy on `public.users` (`auth.uid() = user_id`) | PostgREST 42501 error / session failure |
| **File Storage Upload** | Channel 2 (Storage) | Supabase Storage RLS policies evaluating `/{organization_id}/*` prefix | Cross-tenant media tampering |
| **File Storage Download** | Channel 2 (Storage) | Signed URLs with 15-minute TTL issued after membership verification | Cross-tenant media download |
| **Realtime WebSockets** | Channel 2 (Realtime) | PostgreSQL RLS evaluating channel topic against `app.is_org_member` | Cross-tenant notification eavesdropping |

---

## 4. The Four-Layer Defense-in-Depth Model

To guarantee tenant isolation when Drizzle queries bypass PostgreSQL RLS, the platform enforces four redundant layers of protection:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: STATIC AST COMPILE-TIME GATE                                       │
│ • Automated AST test (`tests/unit/tenant-identity-surface.test.ts`)         │
│ • Scans all `"use server"` files in CI.                                     │
│ • Fails build if any action accepts `organizationId` or `userId`.          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pass
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: VERIFIED SERVER-SIDE CONTEXT RESOLUTION                            │
│ • `requireTenantContext()` resolves active session & membership.            │
│ • Validates `status = 'active'` in `organization_memberships`.              │
│ • Tenant context is constructed in trusted server memory; client is ignored.│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pass
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: TENANT-BOUND REPOSITORY SCOPING                                    │
│ • Queries execute via `createTenantRepository(context)`.                     │
│ • Scoping predicate `eq(table.organizationId, context.organizationId)`      │
│   is injected automatically by the repository factory.                      │
│ • Mutations perform object-level validation before updating target row.     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Pass
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: POSTGRESQL RLS (DEFENSE-IN-DEPTH FOR DATA API)                     │
│ • Active on all tables for direct Supabase Client queries.                  │
│ • Evaluates `app.is_org_member(organization_id)` via security definer.      │
│ • Guarantees that any direct PostgREST or Supabase SDK call is constrained. │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tenant-Bound Repository Architecture

### 5.1 Design Objective
Never rely on developer memory to append `eq(table.organizationId, orgId)` to Drizzle queries. The repository architecture must make tenant omission difficult or impossible.

### 5.2 Repository Factory Specification

```typescript
/**
 * Conceptual Architecture (Documentation Only - Phase 1C)
 */
export interface TenantContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly membershipId: string;
  readonly roleKey: string;
  readonly permissions: PermissionMap;
  readonly organizationTimezone: string;
}

export class TenantRepository {
  private readonly orgId: string;
  private readonly userId: string;

  constructor(context: TenantContext) {
    if (!context.organizationId || !context.userId) {
      throw new Error("SECURITY_VIOLATION: Invalid TenantContext supplied to repository");
    }
    this.orgId = context.organizationId;
    this.userId = context.userId;
  }

  // Helper for applying tenant predicate
  private withTenantScope<T extends { organizationId: any }>(table: T) {
    return eq(table.organizationId, this.orgId);
  }

  // Example: Tenant-Scoped Projects Repository
  public readonly projects = {
    findMany: async (filter?: SQL) => {
      const conditions = [
        eq(projects.organizationId, this.orgId),
        isNull(projects.deletedAt),
      ];
      if (filter) conditions.push(filter);
      return db.query.projects.findMany({
        where: and(...conditions),
      });
    },

    findById: async (projectId: string) => {
      return db.query.projects.findFirst({
        where: and(
          eq(projects.projectId, projectId),
          eq(projects.organizationId, this.orgId),
          isNull(projects.deletedAt),
        ),
      });
    },

    create: async (data: Omit<InsertProject, "organizationId" | "createdBy">) => {
      const [record] = await db.insert(projects)
        .values({
          ...data,
          organizationId: this.orgId, // Injected by repository closure
          createdBy: this.userId,
        })
        .returning();
      return record;
    },

    update: async (projectId: string, data: Partial<UpdateProject>) => {
      // Step 1: Object-level tenant verification
      const existing = await this.projects.findById(projectId);
      if (!existing) {
        throw new Error("NOT_FOUND_OR_FORBIDDEN: Target project does not exist in tenant");
      }

      // Step 2: Tenant-scoped mutation
      const [updated] = await db.update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
          eq(projects.projectId, projectId),
          eq(projects.organizationId, this.orgId),
        ))
        .returning();
      return updated;
    },
  };
}
```

---

## 6. Granular Authorization Model

AI NEX OS strictly enforces that:
$$\text{Authentication} \neq \text{Membership} \neq \text{Role} \neq \text{Permission} \neq \text{Capability}$$

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. AUTHENTICATION (Who are you?)                                            │
│    • Verified via Supabase Auth session token (`auth.users.id`).            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. MEMBERSHIP (Are you affiliated with this agency?)                        │
│    • Verified via `organization_memberships` (`status = 'active'`).          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ROLE ASSIGNMENT (What is your standing in this agency?)                  │
│    • Resolved from `organization_memberships.role_id` (e.g., Creative Dir). │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. PERMISSION EVALUATION (Are you allowed to perform this action?)          │
│    • Evaluated via `hasPermission(role.permissions, "deliverables", "approve")│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. CAPABILITY GATING (Is this feature enabled on the agency's plan?)        │
│    • Evaluated via subscription plan features & usage caps (e.g. AI token cap)│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authorization Evaluation Order
Every protected operation evaluates security in strict ascending sequence:
1. `authenticate()`: Verifies caller possesses valid cryptographic session.
2. `resolveUser()`: Loads `public.users` global profile.
3. `resolveActiveOrganization()`: Resolves active organization from secure cookie.
4. `resolveMembership()`: Validates caller holds an active membership in the active organization.
5. `resolveRole()`: Resolves the role assigned to that specific membership.
6. `resolvePermission()`: Evaluates module-action authorization (`requirePermission(user, module, action)`).
7. `resolveCapability()`: Verifies organization has not breached storage or token quotas.
8. `executeOperation()`: Executes tenant-scoped repository command.

---

## 7. AI Subsystem Security Architecture

The AI subsystem processes sensitive agency intelligence, brand guidelines, and creative prompts. Cross-tenant leakage in AI contexts is strictly blocked:

### 7.1 Entity Ownership Hierarchy
- `ai_sessions`: Owned by `(organization_id, user_id)`.
- `ai_conversations`: Owned by `(organization_id, session_id)`. Optional FK to `projects.project_id` (must match `organization_id`).
- `ai_messages`: Owned by `conversation_id`.
- `ai_contexts`: Owned by `message_id`. Context assembly is strictly filtered:
  ```sql
  SELECT source_id, raw_context 
  FROM public.ai_contexts c
  JOIN public.ai_messages m ON m.id = c.message_id
  JOIN public.ai_conversations conv ON conv.id = m.conversation_id
  WHERE conv.organization_id = :activeOrgId;
  ```
- `ai_cost_tracking`: Owned by `organization_id`. Tracks token consumption per tenant.

### 7.2 Context Assembly Isolation
The `ContextBuilder` (`src/lib/ai/context-builder.ts`) must enforce that any resource (deliverable, brief, file, or transcript) attached to an LLM prompt belongs to `context.organizationId`. Any attachment failing this check is immediately discarded and logged as a security alert.

### 7.3 Cost Governance Gating
`AICostGovernance` intercepts inference requests prior to dispatching to external LLM providers (OpenAI, Anthropic, Google Gemini). If `ai_cost_tracking` indicates the tenant has consumed $\ge 100\%$ of its `ai_monthly_token_cap`, the request is refused with `AI_BUDGET_EXCEEDED`.

---

## 8. Client Review Portal Security Model

### 8.1 Zero-Login Guest Principle
External clients who review and approve creative deliverables (`portal.<domain>/s/{token}`) never receive accounts in `auth.users` or `public.users`. Their access is governed entirely by high-entropy cryptographic share tokens.

### 8.2 Token Verification Gates
Every portal request must pass four consecutive security checks:
1. **Signature Validity**: Token HMAC-SHA256 digest matches `deliverable_share_links.token_hash`.
2. **Temporal Validity**: `deliverable_share_links.expires_at > now()`.
3. **Revocation Check**: `share_token_nonces.is_revoked = false`.
4. **Password Gating**: If `has_password = true`, caller must provide a valid session passphrase verified via bcrypt.

### 8.3 Projection Isolation
Portal endpoints return sanitized Data Transfer Objects (DTOs) only. Queries omit:
- Internal employee identities and attendance records.
- Agency profit margins, billable rates, and task hourly logs.
- Other agency projects, clients, or deliverables.

---

## 9. Standard Failure Taxonomy

To maintain consistent error handling and prevent information disclosure across tenant boundaries, all Server Actions and Route Handlers must throw or return standard error codes:

| Error Code | HTTP Status | Description | Security Disclosure Safeguard |
| :--- | :---: | :--- | :--- |
| `UNAUTHENTICATED` | 401 | Missing or invalid Supabase Auth session token. | Never reveals whether email exists. |
| `UNPROVISIONED` | 403 | User authenticated with Supabase but lacks `public.users` row. | Routes user to `/onboarding`. |
| `NO_MEMBERSHIP` | 403 | User lacks an active membership in the requested organization. | Never reveals organization existence. |
| `FORBIDDEN` | 403 | User's role lacks the required permission for this action. | Names module and action; logs attempt. |
| `NOT_FOUND` | 404 | Target entity does not exist OR belongs to another organization. | **Returns 404 for cross-tenant entities (preventing existence probing).** |
| `TENANT_MISMATCH` | 403 | Request attempted to associate entities across two different organizations. | Immediately halts transaction and logs audit event. |
| `VALIDATION_ERROR` | 422 | Input parameters failed Zod schema validation. | Returns input field validation errors. |
