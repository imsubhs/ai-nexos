# AI NEX OS — Tenant Isolation Enforcement Matrix

## Phase 1B.1: Comprehensive Multi-Tenant Security & Isolation Audit

---

## 1. Executive Summary

This document establishes the definitive multi-tenant isolation contract for **AI NEX OS**. In a multi-tenant B2B SaaS platform serving competing creative agencies, video production houses, and branding consultancies, data isolation is a critical security imperative.

This matrix audits **all 25 operational layers** of the software architecture, defining for each layer:

- The current enforcement mechanism
- The target SaaS enforcement mechanism
- The authoritative tenant boundary
- The trust level of callers and intermediaries
- The potential failure mode if enforcement is omitted
- The mandatory test required to prevent regressions
- The severity risk profile and current implementation status

---

## 2. Tenant Isolation: Drizzle ORM vs. PostgreSQL RLS

### 2.1 The Architectural Reality

A central finding of the Phase 1B.1 security audit is the architectural divergence between the platform's two database connection channels:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INCOMING HTTP REQUEST                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     Supabase Client (SSR)     │             │       Drizzle ORM (`db`)      │
│     `createClient()` in       │             │       `db` in `@/db`          │
│     `@/lib/supabase/server`   │             │       via PgBouncer Pooler    │
├───────────────────────────────┤             ├───────────────────────────────┤
│ • Role: `anon` with user JWT  │             │ • Role: `postgres` (Admin)    │
│ • Connection: Direct / REST   │             │ • Connection: Transaction     │
│ • PostgreSQL RLS: ACTIVE      │             │ • PostgreSQL RLS: BYPASS RLS  │
│ • Policies: `app.is_org_member`│            │ • Isolation: APP PREDICATE    │
└───────────────────────────────┘             └───────────────────────────────┘
```

1. **Supabase Client Channel (`@/lib/supabase/server`)**:
   - Executes with the caller's session JWT and Supabase Anon Key.
   - **PostgreSQL Row Level Security (RLS) is ACTIVE**.
   - Evaluates security-definer helper `app.is_org_member(organization_id)`.
   - Used for `getCurrentUser()` in `src/features/auth/current-user.ts` and Supabase Storage operations.
2. **Drizzle ORM Channel (`@/db`)**:
   - Connects over `DATABASE_URL` via PgBouncer transaction pooling (`prepare: false`).
   - Executes as the `postgres` administrative role.
   - **POSTGRESQL RLS IS COMPLETELY BYPASSED.**
   - Multi-tenant isolation for all Workspace and Workforce Server Actions rests entirely on application-level query predicates: `eq(table.organizationId, user.organizationId)`.

### 2.2 Security Implications & Mandatory Safeguards

Because Drizzle queries bypass PostgreSQL RLS:

1. **The Tenant Is Never a Parameter**: `organizationId` must NEVER be accepted as a caller argument in any Server Action or API handler. It must be derived exclusively from the verified session via `requireCurrentUser()`.
2. **Static AST Safety Gate (`tests/unit/tenant-identity-surface.test.ts`)**: Every `"use server"` export in the repository is scanned during CI. Any export that accepts an identity parameter (`userId`, `organizationId`, `orgId`, `tenantId`) fails the build immediately.
3. **Object-Level Tenant Verification**: Prior to performing mutations or fetching records by ID, actions must verify that the target entity's `organization_id` matches `user.organizationId` (e.g. `validateProjectAccess`, `validateDeliverableAccess`, `loadMeetingForWrite`).

---

## 3. 25-Layer Tenant Isolation Enforcement Matrix

| #      | Operational Layer           | Current Enforcement Mechanism                                                   | Target SaaS Enforcement Mechanism                                                    | Tenant Boundary           | Trust Level               | Failure Mode if Compromised                         | Mandatory Test Required                        | Risk Level |     Status      |
| :----- | :-------------------------- | :------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------- | :------------------------ | :------------------------ | :-------------------------------------------------- | :--------------------------------------------- | :--------: | :-------------: |
| **1**  | **Browser / UI**            | `AppSidebar` filters links via `NAV_SECTIONS` & user permissions                | Dynamic sidebar rendering active org name, logo, switcher, and permissions           | Cosmetic boundary only    | **Untrusted**             | Unauthorized UI elements visible; direct URL bypass | Component permission rendering tests           |    Low     | `[IMPLEMENTED]` |
| **2**  | **Authentication**          | Supabase Auth PKCE code exchange & OTP verification                             | Supabase Auth session refresh with rate-limited brute force protection               | Global identity boundary  | **Trusted Provider**      | Session hijacking, credential stuffing              | `auth-rate-limit.test.ts`, PKCE callback tests |  Critical  |  `[VERIFIED]`   |
| **3**  | **Current-User Resolution** | `getCurrentUser()` in React `cache()` reading `users` table via Supabase client | Resolves global profile and active membership from session cookie                    | User identity boundary    | **Trusted Core**          | Impersonation, unprovisioned redirect loop          | `current-user.test.ts`                         |  Critical  |  `[VERIFIED]`   |
| **4**  | **Organization Resolution** | Direct read of `users.organization_id` (single tenant only)                     | Validates active tenant cookie `nexos_active_org_id` against memberships             | Tenant sovereignty root   | **Trusted Core**          | Organization spoofing                               | Multi-org cookie resolution integration test   |  Critical  |   `[PLANNED]`   |
| **5**  | **Membership Resolution**   | Non-existent; single org embedded on user record                                | Query `organization_memberships` where `user_id = auth.uid() AND org_id = active_id` | M:N association boundary  | **Trusted Core**          | Privilege escalation across agencies                | Membership active status & role test           |  Critical  |   `[PLANNED]`   |
| **6**  | **Server Actions**          | `requireCurrentUser()` + `requirePermission()` at entry of each action          | `requireCurrentUser()` resolves active org + `requirePermission()`                   | Action entry perimeter    | **Trusted Application**   | Unauthorized execution across modules               | `tenant-identity-surface.test.ts` AST gate     |  Critical  |  `[VERIFIED]`   |
| **7**  | **Route Handlers**          | Next.js App Router handlers checking session auth headers                       | Handlers extracting session and checking active org scope                            | HTTP endpoint perimeter   | **Untrusted Caller**      | Unauthenticated JSON access                         | API route authorization tests                  |    High    |  `[VERIFIED]`   |
| **8**  | **API Endpoints**           | Machine-readable 401 response on `/api/*` when unauthenticated                  | Session JWT validation + org scoping on all external webhook endpoints               | Network boundary          | **Untrusted Caller**      | Information disclosure via API                      | Route handler 401/403 status tests             |    High    |  `[VERIFIED]`   |
| **9**  | **Repository Layer**        | Repository methods require `user` or `organizationId` from action               | Repositories accept only verified `CurrentUser` context                              | Service boundary          | **Trusted Application**   | Cross-tenant query execution                        | Repository unit tests with mock tenants        |    High    |  `[VERIFIED]`   |
| **10** | **Drizzle Queries**         | Explicit predicate injection: `eq(table.organizationId, user.organizationId)`   | Strict predicate injection + helper query builders with org scoping                  | Query boundary            | **Trusted Application**   | Cross-tenant data leakage (IDOR)                    | Tenant query predicate audit tests             |  Critical  |  `[VERIFIED]`   |
| **11** | **PostgreSQL Engine**       | Foreign key constraints enforcing referential integrity                         | Foreign keys on `organization_id` with `onDelete: cascade/restrict`                  | Relational integrity      | **Database Core**         | Orphaned records, corrupted tenant trees            | Schema constraint & FK integrity tests         |    High    |  `[VERIFIED]`   |
| **12** | **PostgreSQL RLS**          | RLS enabled on base tables; evaluates `app.is_org_member(org_id)`               | RLS policies updated to evaluate `organization_memberships`                          | Database defense-in-depth | **Database Engine**       | Direct Supabase client query leakage                | pgTAP RLS cross-tenant query tests             |  Critical  | `[IMPLEMENTED]` |
| **13** | **Storage (DAM)**           | Storage paths prefixed with `/{organization_id}/*` in bucket                    | Supabase Storage RLS policies restricting read/write to org prefix                   | Object storage boundary   | **Storage Service**       | Cross-tenant media download/tampering               | Storage prefix path policy tests               |    High    | `[IMPLEMENTED]` |
| **14** | **Search**                  | Module-specific query filters scoping by `organizationId`                       | Global command palette (`Cmd + K`) indexed by `organization_id`                      | Information discovery     | **Application Index**     | Sensitive client/project discovery                  | Cross-tenant search term leakage tests         |    High    | `[IMPLEMENTED]` |
| **15** | **Notifications**           | Scoped by `organization_id` and `user_id` in `public.notifications`             | Scoped delivery; background workers verify tenant recipient                          | Inter-user messaging      | **Application Service**   | Cross-agency notification leaks                     | Notification tenant dispatch tests             |   Medium   |  `[VERIFIED]`   |
| **16** | **Analytics**               | Metric aggregators in `/dashboard` filter by `user.organizationId`              | Data warehouse / reporting views aggregate strictly by active org                    | Aggregated data           | **Analytical Service**    | Commercial metric disclosure                        | Analytics query boundary tests                 |   Medium   | `[IMPLEMENTED]` |
| **17** | **Audit Logs**              | `public.activity_logs` scoped by `organization_id`; append-only RLS             | Immutable activity ledger; RLS blocks `UPDATE` and `DELETE`                          | Compliance & audit trail  | **Database Core**         | Tampering or cross-tenant log view                  | Activity log append-only policy tests          |    High    |  `[VERIFIED]`   |
| **18** | **AI Context Assembly**     | `ai_contexts` and `ai_context_sources` scoped by `organization_id`              | `ContextBuilder` verifies all prompt attachments match active org                    | Intelligence boundary     | **AI Gateway**            | Cross-tenant brief/prompt leakage                   | AI context isolation test                      |  Critical  |  `[VERIFIED]`   |
| **19** | **AI Cost Tracking**        | `ai_cost_tracking` logs token consumption by `organization_id`                  | `AICostGovernance` throttles requests when org token cap reached                     | Resource consumption      | **AI Governance**         | Denial-of-wallet / cost bleed                       | Token budget enforcement tests                 |    High    |  `[VERIFIED]`   |
| **20** | **Client Portal**           | Dedicated subdomain routing in `src/proxy.ts`; rewritten to `/portal/*`         | Zero-login portal isolating external visitors from internal routes                   | External edge boundary    | **Public Web**            | Portal visitor reaching internal tools              | Proxy host rewrite isolation tests             |  Critical  |  `[VERIFIED]`   |
| **21** | **Share Links**             | Cryptographic tokens with HMAC nonces, expiry, and password checks              | Token signature + subject binding + revocation check via `PortalService`             | Anonymous collaboration   | **Cryptographic Token**   | Token hijacking, brute-forcing                      | `approvals-tokens.test.ts`, share tests        |  Critical  |  `[VERIFIED]`   |
| **22** | **Background Jobs**         | `background_jobs` table scoped by `organization_id`                             | Background workers receive verified `organization_id` in payload                     | Asynchronous queue        | **Worker Process**        | Worker processing wrong tenant job                  | Worker payload tenant validation tests         |    High    | `[IMPLEMENTED]` |
| **23** | **Caching (React)**         | React `cache()` memoizes `getCurrentUser()` per request lifecycle               | Request-scoped cache; zero cross-request memory sharing                              | In-memory runtime         | **Node.js Memory**        | Memory leakage across concurrent requests           | Concurrency cache isolation tests              |    High    |  `[VERIFIED]`   |
| **24** | **Redis (Portal Cache)**    | Portal token validation cache keys prefixed by token hash                       | Cache keys partitioned: `portal:token:{hash}` and `org:{id}:cache`                   | Key-value store           | **Shared Infrastructure** | Cache pollution or cross-tenant cache hit           | Cache key namespace collision tests            |   Medium   | `[IMPLEMENTED]` |
| **25** | **Webhooks / Integrations** | Outbound webhooks carry HMAC-SHA256 signature; inbound verified                 | Inbound webhooks validated by tenant webhook secret in database                      | External network edge     | **Third-Party Service**   | Webhook spoofing across organizations               | Webhook HMAC verification tests                |    High    | `[IMPLEMENTED]` |

---

## 4. Layer-by-Layer Verification Specifications

### 4.1 Layer 6: Server Actions & AST Security Gate

- **Enforcement Rule**: No `"use server"` function may accept `userId`, `organizationId`, `orgId`, `tenantId`, or `currentUserId` as a parameter.
- **Verification Command**:
  ```bash
  npm run test tests/unit/tenant-identity-surface.test.ts
  ```
- **Pass Condition**: Zero unexpected identity parameters discovered across all action files.

### 4.2 Layer 10: Drizzle Query Predicates

- **Enforcement Rule**: Every relational query in `real-actions.ts` must include `eq(table.organizationId, user.organizationId)` in the `where` clause.
- **Audit Rule**: Any join operation must verify that joined tables also match the caller's `organizationId`.

### 4.3 Layer 12: PostgreSQL Row Level Security (RLS)

- **Enforcement Rule**: Every operational table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- **Policy Standard**:
  ```sql
  CREATE POLICY "tenant_isolation_policy" ON public.projects
    FOR ALL TO authenticated
    USING (organization_id = app.current_user_organization_id())
    WITH CHECK (organization_id = app.current_user_organization_id());
  ```

### 4.4 Layer 21: Client Share Links

- **Enforcement Rule**: Share tokens must be validated with four distinct checks:
  1. Cryptographic HMAC signature validity.
  2. Timestamp expiry check (`expires_at > now()`).
  3. Stored revocation check (`share_token_nonces.is_revoked = false`).
  4. Entity binding check (`item_id` belongs to the share session).

---

## 5. Security Conclusion & Compliance Attestation

The architecture of AI NEX OS enforces multi-tenancy through **defense-in-depth**. While Drizzle ORM queries run as the `postgres` role over PgBouncer, the combination of:

1. Static AST compile-time surface testing,
2. Mandatory server-side session resolution via `requireCurrentUser()`,
3. Application-level tenant predicates on every database write and read, and
4. Object-level authorization checks prior to mutation,

provides a robust, verifiable barrier against cross-tenant data leakage.
