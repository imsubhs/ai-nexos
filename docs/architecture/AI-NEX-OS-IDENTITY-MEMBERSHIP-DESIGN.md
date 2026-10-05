# AI NEX OS — Identity, Membership & Onboarding Architecture

## Phase 1C: Global Identity, Tenancy Membership & Lifecycle Design

---

## Document Control

| Attribute           | Detail                                                                                                                                                         |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Path**   | `docs/architecture/AI-NEX-OS-IDENTITY-MEMBERSHIP-DESIGN.md`                                                                                                    |
| **Version**         | 1.0.0 (Phase 1C Technical Design)                                                                                                                              |
| **Status**          | **APPROVED TECHNICAL DESIGN (DOCUMENTATION ONLY)**                                                                                                             |
| **Date**            | September 26, 2026                                                                                                                                             |
| **Architects**      | Principal Software Architect, Security Architect, Database Architect                                                                                           |
| **Repository Root** | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`)                                                                                                               |
| **Target Branch**   | `phase-2-production-readiness`                                                                                                                                 |
| **Scope**           | Decoupling global identity from tenancy, membership lifecycle, organization switching, role migration, invitations, onboarding states, and registration modes. |

---

## 1. Executive Summary & Identity Evolution

In the initial single-tenant architecture of AI NEX OS, user identity was fused directly to a single organization through mandatory columns on `public.users` (`organization_id`, `role_id`). While this was functional for a single agency ("AI Collective"), it prevents creative directors, freelance editors, and multi-studio agency owners from accessing multiple workspaces under a single set of credentials.

This document specifies the implementation-grade architecture to decouple **Global Application Identity** from **Organization Membership**, establishing an M:N relational bridge while maintaining absolute tenant isolation and zero regression for existing production users.

---

## 2. Global Application Identity (`public.users`)

### 2.1 The Concept of Global Creator Identity

In the target architecture, `public.users` represents the human creator as an individual entity across the entire AI NEX OS ecosystem:

- Authenticates once via Supabase Auth (`auth.users`).
- Holds personal profile attributes (Name, Personal Email, Avatar, Personal Timezone).
- Can be invited into multiple agency workspaces.
- Can create and own new agency workspaces.
- Retains their creator identity even if removed from all agency workspaces.

### 2.2 Target Field Composition

Following the decoupling migration, `public.users` retains exclusively global attributes:

```typescript
export const users = pgTable(
  "users",
  {
    userId: uuid("user_id").primaryKey(), // 1:1 with auth.users.id
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    timezone: text("timezone").notNull().default("UTC"), // Personal preference
    status: entityStatusEnum("status").notNull().default("active"),
    ...auditFields, // createdAt, updatedAt, deletedAt
  },
  (table) => [
    uniqueIndex("uq_users_email").on(table.email),
    index("idx_users_status").on(table.status),
  ],
);
```

---

## 3. Organization Membership Architecture (`organization_memberships`)

### 3.1 Relational Join Table Specification

The join table `public.organization_memberships` establishes the relationship between a global user and an agency workspace:

```typescript
export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    membershipId: uuid("membership_id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.organizationId, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.roleId, { onDelete: "restrict" }),
    departmentId: uuid("department_id").references(
      () => departments.departmentId,
      { onDelete: "set null" },
    ),
    designation: text("designation"),
    employmentType: employmentTypeEnum("employment_type")
      .notNull()
      .default("full_time"),
    workingHours: jsonb("working_hours").$type<WorkingHours>(),
    status: text("status").notNull().default("active"), // invited | active | suspended | removed
    isDefault: boolean("is_default").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    ...auditFields,
  },
  (table) => [
    uniqueIndex("uq_user_org_active")
      .on(table.userId, table.organizationId)
      .where(isNull(table.deletedAt)),
    index("idx_membership_user").on(table.userId),
    index("idx_membership_org").on(table.organizationId),
    index("idx_membership_role").on(table.roleId),
    index("idx_membership_status").on(table.organizationId, table.status),
  ],
);
```

### 3.2 Membership Cardinality & Active Semantics

- **0 Memberships**: Allowed. User has registered an account but has neither created nor been added to an agency workspace (State B: Authenticated Unaffiliated). Access to workspace routes (`/dashboard`, `/projects`) is blocked; user is routed to `/onboarding`.
- **1 Membership**: Standard baseline for single-agency employees.
- **N Memberships**: Supported. Creators, contractors, or agency executives can hold active memberships in multiple sovereign organizations.
- **Per-Organization Limit**: Exactly **1 active membership** per user per organization. A user cannot possess multiple simultaneous memberships in the same organization. Departmental reallocations update the existing membership record rather than creating a new row.

---

## 4. Active Organization Context & Resolution Strategy

### 4.1 Evaluation of Context Resolution Strategies

| Strategy                       | Architecture                             | Pros                                                                                  | Cons                                                                                     | Verdict                    |
| :----------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------- | :------------------------- |
| **A. Session JWT Claim**       | `tenant_id` baked into Supabase Auth JWT | Evaluated directly by Postgres RLS                                                    | Requires token refresh / re-authentication on every organization switch; JWT bloat       | **Rejected for MVP**       |
| **B. Secure Session Cookie**   | `nexos_active_org_id` (HttpOnly, Secure) | Clean dashboard URLs (`/projects`); instant switching via cookie update; no JWT churn | Requires server-side membership validation on every request                              | **ACCEPTED FOR MVP**       |
| **C. URL Path Prefix**         | `/org/[slug]/projects`                   | Deep-linkable; bookmarks preserve tenant context                                      | Clutters all route parameters; requires massive frontend link refactoring                | **Deferred to Phase 7**    |
| **D. Subdomain Tenancy**       | `[slug].ai-nexos.com`                    | Total browser origin isolation; white-label ready                                     | Complex wildcard DNS; SSL certificate automation overhead; cookie-sharing security risks | **Deferred to Enterprise** |
| **E. Database Preference**     | `users.default_organization_id` column   | Simple DB query                                                                       | Inflexible when user works simultaneously across multiple tabs                           | **Used only as Fallback**  |
| **F. Explicit Request Header** | `x-organization-id` header               | Standard for REST APIs                                                                | Browser page navigation cannot easily inject custom headers on GET                       | **Used for API/SDK only**  |

### 4.2 Target Context Resolution Flow (`requireTenantContext`)

```
Incoming Request
       │
       ▼
Is Supabase session valid? ──(No)──► Redirect /login
       │ (Yes)
       ▼
Read `nexos_active_org_id` cookie
       │
       ├─► Cookie Present: Query `organization_memberships` for (auth.uid(), cookie_org_id, status='active')
       │         │
       │         ├─► Valid: Return TenantContext { userId, orgId, roleId, permissions, timezone }
       │         └─► Invalid: Clear cookie & proceed to Fallback
       │
       └─► Cookie Absent / Fallback:
                 │
                 ▼
Query `organization_memberships` for user's default active membership (`is_default = true`)
                 │
                 ├─► Found: Set cookie `nexos_active_org_id` & Return TenantContext
                 │
                 └─► None Found: Check if any active membership exists
                           │
                           ├─► Found (Oldest active): Set cookie & Return TenantContext
                           │
                           └─► None (Zero memberships): Redirect to `/onboarding`
```

---

## 5. Organization Switching Architecture

When a multi-organization user changes their active workspace:

### 5.1 Switching Workflow

1. **User Action**: User opens top-navigation Switcher and clicks "Acme Studios".
2. **Server Action Invocation**: Client calls `switchActiveOrganization(targetOrgId)`.
3. **Authorization Check**:
   ```sql
   SELECT membership_id, role_id, status
   FROM public.organization_memberships
   WHERE user_id = auth.uid()
     AND organization_id = $targetOrgId
     AND status = 'active'
     AND deleted_at IS NULL;
   ```
4. **Cookie Mutation**: Upon successful validation, the server sets:
   ```
   Set-Cookie: nexos_active_org_id=<targetOrgId>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000
   ```
5. **Audit Logging**: An immutable audit event is logged to `public.activity_logs`:
   `{ event: "auth.organization_switched", userId, fromOrgId, toOrgId }`.
6. **Client Refresh**: Server action returns `{ success: true }`. Client invokes `router.refresh()` and invalidates client-side React Query cache.

### 5.2 Elimination of Stale Context & Crossover Hazards

To guarantee that switching from Organization A to Organization B never leaks cached data:

- **React Cache Invalidation**: Server-side React `cache()` is scoped strictly to the lifetime of a single HTTP request. No cross-request in-memory state is shared between requests.
- **Client Cache Flush**: The client component executes `queryClient.clear()` immediately before triggering `router.refresh()`.
- **WebSocket Channel Reset**: The client disconnects from `supabase.channel("org:" + oldOrgId)` and establishes a new subscription to `"org:" + newOrgId`.
- **Server Action AST Gate**: Any attempt by a compromised client script to invoke an action with parameters referencing the previous organization is blocked by object-level tenant validation in `createTenantRepository`.

---

## 6. Role Migration Architecture

### 6.1 Transition Path

- **Current**: `public.users.role_id` (Rigid 1:1 role).
- **Target**: `public.organization_memberships.role_id` (Role scoped strictly to membership).

### 6.2 Standard System Roles Mapping

The platform supports 7 system roles (`src/features/permissions/constants.ts`):

1. **Owner (`owner`)**: Full platform control (`{"*": ["*"]}`).
2. **Super Admin (`super_admin`)**: Operational administration across all modules.
3. **HR (`hr`)**: Workforce oversight, attendance reviews, employee directory.
4. **Creative Director (`creative_director`)**: Quality control, deliverables approval, project and task oversight.
5. **Project Manager (`project_manager`)**: Project execution, client relationships, task allocation, timelines.
6. **Team Member (`team_member`)**: Baseline creative production role.
7. **Finance (`finance`)**: Financial records, client invoices, reports.

### 6.3 Missing Role & Fallback Rules

During migration or backfill:

- If a user row has a valid `role_id`, it is migrated directly to `organization_memberships.role_id`.
- If a user row has a dangling or null `role_id`, the migration falls back to the system `team_member` role for that organization.
- If an organization lacks an `owner` role during backfill, the migration script halts immediately and alerts the database administrator. Every organization must possess exactly one designated primary Owner.

---

## 7. Team Member Invitation Lifecycle

### 7.1 Invitation State Machine

```
     ┌───────────┐
     │  CREATED  │
     └─────┬─────┘
           │ Dispatch email with secure link
           ▼
     ┌───────────┐
     │   SENT    │
     └─────┬─────┘
           │ Invitee clicks link (/invite/[token])
           ▼
     ┌───────────┐         Token Expired (> 7 days)         ┌───────────┐
     │  OPENED   ├─────────────────────────────────────────►│  EXPIRED  │
     └─────┬─────┘                                          └───────────┘
           │ Invitee signs in & clicks "Accept"
           ▼
     ┌───────────┐         Admin revokes before acceptance   ┌───────────┐
     │ ACCEPTED  │◄─────────────────────────────────────────┤  REVOKED  │
     └───────────┘                                          └───────────┘
```

### 7.2 Cryptographic Token Security

1. **Token Generation**: The server generates 32 bytes of cryptographically secure pseudo-random entropy:
   `const rawToken = crypto.randomBytes(32).toString("hex");`
2. **Token Hashing**: The raw token is NEVER stored in the database. Only its HMAC-SHA256 digest is persisted:
   `const tokenHash = crypto.createHmac("sha256", APP_SECRET).update(rawToken).digest("hex");`
3. **URL Link**: The raw token is dispatched via email:
   `https://app.ai-nexos.com/invite/${rawToken}`
4. **Redemption Verification**:
   - The server computes the HMAC-SHA256 of the incoming path token and queries `public.organization_invitations` where `token_hash = computedHash`.
   - Verifies `status = 'pending'` and `expires_at > now()`.
   - Verifies authenticated user's email matches `invitation.email` (or prompts user for explicit confirmation).
   - Inserts `organization_memberships` row with `role_id` and `department_id` specified in the invitation.
   - Marks invitation `status = 'accepted'` and records `accepted_by_user_id`.

---

## 8. Tri-State Onboarding Architecture

To eliminate the dead-end `/unprovisioned` error route, the platform implements a structured onboarding decision matrix:

```
                                  Authenticated Caller
                                           │
                                           ▼
                      Does user have active memberships?
                                      /        \
                               (Yes) /          \ (No)
                                    /            \
                                   ▼              ▼
                     [STATE A: Existing Member]  Does user hold a pending invite?
                               │                        /          \
                               │                 (Yes) /            \ (No)
                               ▼                      /              \
                     Route to /dashboard             ▼                ▼
                                             [STATE C: Invitee] [STATE B: Unaffiliated]
                                                     │                  │
                                                     ▼                  ▼
                                            Show Invitation     Display Onboarding Wizard:
                                            Acceptance Screen   1. Create New Agency
                                                                2. Enter Invitation Code
```

### State Specifications

- **STATE A (Existing Member)**: User belongs to 1 or more active organizations. Automatically routed to `/dashboard` of their active or default organization.
- **STATE B (Authenticated Unaffiliated)**: User has verified email with Supabase Auth, but holds zero memberships and zero pending invitations. Routed to `/onboarding`.
  - Presented with two paths:
    1. **Create Agency Workspace**: User provisions a new organization (becoming Owner).
    2. **Join via Code**: User manually inputs an invitation code received outside of email.
- **STATE C (Pending Invitee)**: User arrived via `/invite/[token]` or authenticated with an email matching an open invitation.
  - Presented with the agency name, inviter details, and an "Accept & Join" action.

---

## 9. Self-Service Registration Architecture (`REGISTRATION_MODE`)

### 9.1 Open Product Decision Status

As determined in the Phase 1C audit, whether AI NEX OS permits open self-service registration or enforces approval-gated registration remains an **OPEN PRODUCT DECISION**.

### 9.2 Configurable Architecture (Supporting All Models)

The system introduces an environment and database-backed configuration flag: `REGISTRATION_MODE`.

| Mode Value              | Behavior                                                                                                                                               | Security & Operational Implications                                                                      |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| **`INVITE_ONLY`**       | Public `/signup` route redirects to marketing landing page. Users can only create accounts by redeeming a valid email invitation token.                | Maximum spam protection; lowest growth velocity; ideal for private enterprise alpha.                     |
| **`APPROVAL_REQUIRED`** | Public `/signup` allows registration, but workspace creation submits a request to the platform admin waitlist. User remains in State B until approved. | Strong spam protection; controlled onboarding quality; slight conversion friction.                       |
| **`SELF_SERVICE`**      | Public `/signup` allows anyone to register and immediately provisions an active 14-day trial organization with the creator as Owner.                   | Maximum growth velocity; requires strict rate-limiting, CAPTCHA, and automated trial expiration cleanup. |

### 9.3 Architectural Guarantee

The database schema, membership structures, and onboarding services are designed to support all three modes interchangeably without requiring schema modifications or code refactoring when the business selects its commercial strategy.
