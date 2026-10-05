# AI NEX OS — Architecture Decision Register (ADR)

## Phase 1B.1: Architectural Consistency & SaaS Tenancy Specifications

---

## Document Control

| Attribute                 | Detail                                                                                                                                                                                      |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Document Path**         | `docs/product/AI-NEX-OS-ARCHITECTURE-DECISION-REGISTER.md`                                                                                                                                  |
| **Version**               | 1.0.0 (Phase 1B.1 Canonical Milestone)                                                                                                                                                      |
| **Status**                | **APPROVED ARCHITECTURAL BASELINE**                                                                                                                                                         |
| **Date**                  | September 26, 2026                                                                                                                                                                          |
| **Authors**               | Principal Software Architect, Security Architect, Database Architect                                                                                                                        |
| **Repository Root**       | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`)                                                                                                                                            |
| **Implementation Branch** | `phase-2-production-readiness`                                                                                                                                                              |
| **Scope**                 | Authoritative architecture decisions governing identity, multi-tenancy, authorization, routing, and data isolation for the transition of AI NEX OS to an agency-agnostic B2B SaaS platform. |

---

## Table of Decisions

- [ADR-001 — Identity vs Membership Decoupling](#adr-001--identity-vs-membership-decoupling)
- [ADR-002 — Organization Membership Data Model](#adr-002--organization-membership-data-model)
- [ADR-003 — Organization Switching & Session Context](#adr-003--organization-switching--session-context)
- [ADR-004 — Tenant Isolation Strategy & Defense-in-Depth](#adr-004--tenant-isolation-strategy--defense-in-depth)
- [ADR-005 — Drizzle ORM vs PostgreSQL RLS Boundary](#adr-005--drizzle-orm-vs-postgresql-rls-boundary)
- [ADR-006 — Organization Sequential Code Namespace](#adr-006--organization-sequential-code-namespace)
- [ADR-007 — Team Member Invitation Lifecycle](#adr-007--team-member-invitation-lifecycle)
- [ADR-008 — Self-Service Registration & Workspace Provisioning](#adr-008--self-service-registration--workspace-provisioning)
- [ADR-009 — Tenancy Routing & Domain Topology](#adr-009--tenancy-routing--domain-topology)
- [ADR-010 — Client Portal Zero-Login Identity & Scoping](#adr-010--client-portal-zero-login-identity--scoping)
- [ADR-011 — AI Context Window & Data Isolation](#adr-011--ai-context-window--data-isolation)
- [ADR-012 — AI Cost Attribution & Token Budget Governance](#adr-012--ai-cost-attribution--token-budget-governance)
- [ADR-013 — Public Marketing vs Internal App vs Client Portal Domains](#adr-013--public-marketing-vs-internal-app-vs-client-portal-domains)
- [ADR-014 — Schema Migration & Transitional Dual-Write Strategy](#adr-014--schema-migration--transitional-dual-write-strategy)
- [ADR-015 — Implementation Status & Verification Maturity Semantics](#adr-015--implementation-status--verification-maturity-semantics)

---

## ADR-001 — Identity vs Membership Decoupling

- **Status**: **ACCEPTED**
- **Context**: The existing implementation tightly couples user identity to a single organization. In `src/db/schema/users.ts`, `public.users` carries `organizationId: uuid("organization_id").notNull().references(() => organizations.organizationId)` and `roleId: uuid("role_id").notNull()`, with a global unique index `uq_users_email` on `email`. This makes it impossible for an individual creator or contractor to participate in more than one agency workspace using a single login.
- **Current State**: 1:1 rigid relationship between `auth.users` identity, `public.users` profile, and `public.organizations`.
- **Problem**: Multi-agency contractors, holding companies, freelance creative directors, and agency operators managing sister studios cannot switch between agency workspaces without creating separate credentials for every organization.
- **Options**:
  1. _Retain 1:1 model_: Force users to create unique email aliases (e.g., `user+agency1@domain.com`) for each agency. Rejected as unacceptable UX for an enterprise B2B SaaS platform.
  2. _Decouple Identity from Tenancy_: Establish `auth.users` and `public.users` as pure global identity and personal creator profile representations, moving all agency affiliations, roles, and status into an explicit membership model.
- **Decision**: Decouple User Identity from Organization Tenancy. `public.users` represents the human creator. All tenant affiliations, role assignments, department bindings, and employment statuses belong exclusively to `organization_memberships`.
- **Consequences**:
  - `public.users.organization_id` and `public.users.role_id` become deprecated and eventually nullable.
  - Queries resolving the current user must resolve the active membership rather than reading tenancy directly off `users`.
- **Security Impact**: Eliminates credential sharing and password sprawl; enables granular revocation of agency access without deleting the user's global account.
- **Migration Impact**: Phase 4 will introduce `organization_memberships` and backfill existing `users` rows before deprecating the direct columns on `public.users`.
- **Dependencies**: ADR-002, ADR-014.
- **Open Questions**: None.

---

## ADR-002 — Organization Membership Data Model

- **Status**: **ACCEPTED**
- **Context**: A normalized relational bridge is needed between `public.users` and `public.organizations`.
- **Current State**: Implicit membership embedded directly as columns in `public.users`.
- **Problem**: Need to model membership lifecycle (invited, active, suspended), role assignment per agency, department affiliation, and a designated default workspace.
- **Options**:
  1. _Relational join table `organization_memberships`_: Standard PostgreSQL join table with composite or UUID primary key.
  2. _Array/JSONB of tenant memberships inside `users`_: Store tenant memberships as a JSONB array on `users.memberships`. Rejected due to lack of foreign key referential integrity and complex index maintenance.
- **Decision**: Create an explicit relational table `public.organization_memberships`:
  - `membership_id` (UUID PK defaultRandom)
  - `user_id` (UUID FK → `public.users.user_id`, onDelete: cascade)
  - `organization_id` (UUID FK → `public.organizations.organization_id`, onDelete: cascade)
  - `role_id` (UUID FK → `public.roles.role_id`, onDelete: restrict)
  - `department_id` (UUID FK → `public.departments.department_id`, nullable, onDelete: set null)
  - `status` (`text` enum: `'invited' | 'active' | 'suspended'`, default: `'active'`)
  - `is_default` (`boolean`, default: `false`)
  - `created_at`, `updated_at`, `deleted_at` (audit timestamps)
  - Composite unique index on `[user_id, organization_id]` where `deleted_at IS NULL`.
- **Consequences**: Enables 1 user to hold N distinct memberships across N distinct organizations with N distinct roles.
- **Security Impact**: Enforces least privilege per tenant; suspending a membership locks the user out of only that tenant.
- **Migration Impact**: Forward-only migration `0016_multi_tenant_memberships.sql` in Phase 4.
- **Dependencies**: ADR-001.
- **Open Questions**: Should a user be permitted to have multiple distinct memberships within the _same_ organization (e.g. across multiple departments)? _Decision_: No, exactly 1 active membership per user per organization.

---

## ADR-003 — Organization Switching & Session Context

- **Status**: **ACCEPTED**
- **Context**: Users with multiple memberships need to switch between agency workspaces without re-authenticating.
- **Current State**: No organization switcher exists in UI or server logic. `getCurrentUser()` reads `users.organization_id` directly.
- **Problem**: How to securely persist and resolve the caller's "active organization" across server renders, Server Actions, and API requests.
- **Options**:
  1. _URL path prefix (`/org/[slug]/...`)_: All dashboard routes prefixed with the organization slug.
  2. _Subdomain routing (`[slug].ai-nexos.com`)_: Every organization isolated by subdomain.
  3. _Secure Session Cookie (`nexos_active_org_id`)_: HTTP-only, secure, SameSite=Lax cookie recording the selected active organization ID.
- **Decision**: Adopt Option 3 (Session Cookie `nexos_active_org_id`) for MVP / Phase 4, with fallback to the user's default membership (`is_default = true`).
  - The switcher component invokes a Server Action `switchActiveOrganization(targetOrgId)`.
  - The server verifies that the authenticated user possesses an `active` membership in `targetOrgId`.
  - If valid, the cookie is set, and the client router refreshes.
  - If invalid, the switch is rejected with an HTTP 403 Forbidden error.
- **Consequences**: Clean dashboard URLs (`/dashboard`, `/projects`, `/tasks`) without cluttering route segments with slugs.
- **Security Impact**: Server validates membership on every request; forging the cookie results in immediate rejection because the membership query verifies `auth.uid() = membership.user_id AND organization_id = cookie_org_id`.
- **Migration Impact**: Update `src/features/auth/current-user.ts` to inspect cookie and resolve membership.
- **Dependencies**: ADR-001, ADR-002.
- **Open Questions**: How should background workers resolve active organization? _Decision_: Background workers must always receive explicit `organization_id` from the triggering job payload.

---

## ADR-004 — Tenant Isolation Strategy & Defense-in-Depth

- **Status**: **ACCEPTED**
- **Context**: In a multi-tenant B2B SaaS system serving competing agencies, cross-tenant data leakage is an existential catastrophic risk.
- **Current State**: Strong static AST gate (`tests/unit/tenant-identity-surface.test.ts`) preventing caller-supplied tenant IDs, and manual query filtering in Drizzle actions via `eq(table.organizationId, user.organizationId)`.
- **Problem**: Drizzle ORM runs as the `postgres` superuser/admin role over the connection pooler, thereby completely bypassing PostgreSQL Row Level Security (RLS).
- **Options**:
  1. _Rely solely on application filtering_: Easy to implement, but vulnerable to developer error if a filter is omitted.
  2. _Four-Layer Defense-in-Depth_:
     - Layer 1: Static AST gate blocking caller-supplied tenant parameters.
     - Layer 2: Mandatory session resolution via `requireCurrentUser()`.
     - Layer 3: Application-level query predicates (`eq(table.organizationId, user.organizationId)`).
     - Layer 4: PostgreSQL RLS policies protecting direct Supabase client queries.
- **Decision**: Mandate the **Four-Layer Defense-in-Depth Model**.
  - All Server Actions must resolve the tenant strictly from `requireCurrentUser()`.
  - The static AST gate in `tests/unit/tenant-identity-surface.test.ts` remains a mandatory blocking CI check.
  - All Drizzle queries must include `eq(table.organizationId, user.organizationId)`.
  - Any Server Action that queries or mutates an object by ID must invoke object-level tenant validation before mutation (e.g., `validateProjectAccess(id, user)`).
- **Consequences**: Guarantees that "The tenant is never a parameter" remains strictly true across all execution paths.
- **Security Impact**: Eliminates IDOR and cross-tenant leakage vectors.
- **Migration Impact**: Ongoing maintenance of AST tests as new Server Actions are added.
- **Dependencies**: ADR-005.
- **Open Questions**: None.

---

## ADR-005 — Drizzle ORM vs PostgreSQL RLS Boundary

- **Status**: **ACCEPTED**
- **Context**: Architectural clarity is needed regarding which database queries are protected by PostgreSQL RLS versus application-level filtering.
- **Current State**:
  - `db` in `src/db/index.ts` connects via `DATABASE_URL` (PgBouncer transaction pooler) as the `postgres` role (table owner). **Live catalog privileges (`rolsuper`, `rolbypassrls`) are marked UNVERIFIED at the catalog level**, but application comments and migration `0010_data_api_select_grants.sql` confirm the connection operates as the table owner and bypasses RLS by default.
  - `createClient()` in `@/lib/supabase/server` connects using `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the user's session JWT. **This connection executes under PostgreSQL RLS.**
- **Problem**: Documentation in PRD V1 ambiguously claimed that RLS protected all database operations, which is factually false for Drizzle queries.
- **Decision**: Formally document the dual data-access boundary:
  1. **Supabase Client Channel (`createClient()`)**: Runs under PostgreSQL RLS (`app.is_org_member()`). Used for session resolution in `src/features/auth/current-user.ts`, client-side Supabase Realtime subscriptions, and Supabase Storage operations.
  2. **Drizzle Client Channel (`db`)**: Connects as table owner, bypassing RLS. Isolation is enforced strictly at the application layer via mandatory `organization_id` predicates and verified session identity.
- **Consequences**: Engineering documentation must never state that Drizzle queries are protected by RLS.
- **Security Impact**: Code reviews and static gates must strictly scrutinize Drizzle query predicates.
- **Migration Impact**: None; preserves existing high-performance connection pooling architecture.
- **Dependencies**: ADR-004.
- **Open Questions**: Should we consider setting `SET LOCAL app.current_organization_id = ...` in transactions for Drizzle? _Decision_: Deferred to Phase 6; transaction pooler connection resets make session-level GUCs risky without rigorous wrapper abstractions.

---

## ADR-006 — Organization Sequential Code Namespace

- **Status**: **ACCEPTED**
- **Context**: Project codes (`AIC-2026-0001`), task codes (`AIC-T-2026-0001`), and employee codes (`AIC-0001`) currently hardcode the `AIC` prefix.
- **Current State**: `src/features/projects/real-actions.ts` hardcodes `AIC-`. `src/features/tasks/real-actions.ts` hardcodes `AIC-T-`. `organization_sequences` tracks monotonic increments per `[organization_id, entity_type]`.
- **Problem**: Transforming into a multi-tenant platform requires agency-specific prefixes (e.g. `ACME-2026-0001`) without breaking sequence counters or risking collisions.
- **Options**:
  1. _Global unique prefixes_: Force agencies to choose globally unique 3-4 letter prefixes across the entire platform.
  2. _Tenant-scoped prefixes_: Each organization configures a `code_prefix` (defaults to uppercase slug or `NEX`). Uniqueness is guaranteed because the sequential entity lives within the tenant boundary.
- **Decision**: Adopt **Tenant-Scoped Code Prefixes (Option 2)**.
  - Add additive column `code_prefix text NOT NULL DEFAULT 'NEX'` to `public.organizations` in Phase 3.
  - The sequence counter in `organization_sequences` continues to increment monotonically per `[organization_id, entity_type]`.
  - Project code format: `${org.codePrefix}-${year}-${String(nextValue).padStart(4, "0")}`.
  - Task code format: `${org.codePrefix}-T-${year}-${String(nextValue).padStart(4, "0")}`.
  - Employee code format: `${org.codePrefix}-${String(nextValue).padStart(4, "0")}`.
- **Consequences**: Existing projects retain historical `AIC-` codes; new projects adopt the tenant's configured prefix.
- **Security Impact**: Sequences remain strictly partitioned by `organization_id`.
- **Migration Impact**: Additive column on `organizations` table; zero disruption to existing records.
- **Dependencies**: None.
- **Open Questions**: None.

---

## ADR-007 — Team Member Invitation Lifecycle

- **Status**: **ACCEPTED**
- **Context**: Team member creation is currently disabled in real mode (`realEmployeeAdminRepository.create()` throws `"wired in Phase 7"`). Adding users requires an invitation system.
- **Current State**: Manual database seeding is the only mechanism to provision users.
- **Problem**: Multi-tenant agencies must be able to invite staff self-serve via email.
- **Options**:
  1. _Direct user creation with temporary passwords_: Admin creates account and sends plaintext password. Rejected as insecure.
  2. _Tokenized Invitation Lifecycle_: Admin creates invitation → system generates secure single-use token → email dispatched → invitee accepts token and joins workspace.
- **Decision**: Adopt **Tokenized Invitation Lifecycle (Option 2)**:
  - Table: `public.organization_invitations` (`invitation_id`, `organization_id`, `email`, `role_id`, `department_id`, `token_hash`, `expires_at`, `status`, `invited_by_user_id`).
  - Token is a 32-byte cryptographically secure random string (HMAC-SHA256 hashed in database).
  - Expiration: 7 calendar days.
  - Redemption flow: Invitee navigates to `/invite/[token]`. If unauthenticated, they sign up or log in. Once authenticated, the system verifies `token_hash`, creates the `organization_memberships` row, marks the invitation as `consumed`, and redirects to `/dashboard`.
- **Consequences**: Admins can invite team members before they have registered an account.
- **Security Impact**: Single-use token prevents replay attacks; token hash in DB prevents leak via database snapshot exposure.
- **Migration Impact**: Phase 5 migration `0017_organization_invitations.sql`.
- **Dependencies**: ADR-001, ADR-002.
- **Open Questions**: What happens if the invitee signs in with an email different from the invitation email? _Decision_: The system requires the authenticated email to match the invited email, or requires explicit confirmation from the user and logs an audit security event.

---

## ADR-008 — Self-Service Registration & Workspace Provisioning

- **Status**: **OPEN PRODUCT DECISION (DEFERRED)**
- **Context**: Open question regarding whether public registration should immediately provision a live trial workspace or require approval gating.
- **Current State**: Registration is closed; `/signup` does not exist; unprovisioned accounts are halted at `/unprovisioned`.
- **Options**:
  - _Option A: Immediate Self-Service Trial_: Anyone can register, enter an agency name, and immediately enter an active 14-day trial workspace.
    - _Pros_: Maximum product growth velocity, frictionless time-to-value (< 60 seconds).
    - _Cons_: Vulnerable to spam organizations, automated resource abuse, and ghost database bloat.
  - _Option B: Email-Verified / Approval-Gated Access_: User registers, verifies email, and enters a waitlist or requires approval before workspace provisioning.
    - _Pros_: Controlled growth, spam mitigation, higher quality onboarding.
    - _Cons_: High signup friction, delayed time-to-value.
- **Decision**: **OPEN PRODUCT DECISION (DEFERRED)**. The technical architecture supports both immediate self-service and approval-gated onboarding via a configuration boundary (`REGISTRATION_MODE`: `INVITE_ONLY` | `APPROVAL_REQUIRED` | `SELF_SERVICE`). The technical architecture will implement an atomic provisioning pipeline `createOrganizationAndOwner(userId, orgData)` capable of immediate provisioning, but the public gateway route `/signup` will remain feature-flagged until commercial go-to-market alignment.
- **Consequences**: Architecture remains flexible to support either model without schema alteration.
- **Security Impact**: Rate-limiting and email verification must precede organization provisioning under both options.
- **Migration Impact**: Phase 5 implementation.
- **Dependencies**: ADR-001, ADR-002.
- **Open Questions**: Commercial pricing tier model, trial duration (14 vs 30 days), and automated teardown policy for abandoned trial workspaces.

---

## ADR-009 — Tenancy Routing & Domain Topology

- **Status**: **ACCEPTED**
- **Context**: How multi-tenant routing is structured across internal workspace domains, public marketing, and client portals.
- **Current State**: Dual-domain architecture in `src/proxy.ts`:
  - `app.<domain>` → Internal workspace (authenticated).
  - `portal.<domain>` → Client portal (rewritten to `/portal/*`, tokenized).
- **Problem**: How to support tenant resolution across thousands of SaaS agencies.
- **Options**:
  1. _Subdomain tenancy (`acme.ai-nexos.com`)_: Requires dynamic wildcard DNS, automated SSL certificate issuance, and cookie sharing across subdomains.
  2. _Path-based tenancy (`app.ai-nexos.com/org/acme/...`)_: Clutters all route parameters and requires updating every navigation link.
  3. _Consolidated App Domain with Session Tenant Resolution (`app.ai-nexos.com`)_: Single authenticated host, tenant resolved from secure session context cookie (ADR-003). Subdomains reserved for Enterprise tier.
- **Decision**: Adopt **Consolidated App Domain (Option 3)** for SaaS Core/MVP:
  - Internal Workspace: `https://app.ai-nexos.com/*` (tenant resolved via session cookie).
  - Client Portal: `https://portal.ai-nexos.com/s/{token}`.
  - Public Marketing Website: `https://ai-nexos.com/*` (or root domain).
  - Custom CNAME / Subdomains (`acme.ai-nexos.com`) deferred to Enterprise tier [FUTURE].
- **Consequences**: Zero DNS overhead for new agency signups; instantaneous workspace availability.
- **Security Impact**: Simpler cookie scope (`app.ai-nexos.com`), preventing subdomain cookie-tossing attacks.
- **Migration Impact**: Clean separation supported by existing Next.js proxy conventions.
- **Dependencies**: ADR-003, ADR-013.
- **Open Questions**: None.

---

## ADR-010 — Client Portal Zero-Login Identity & Scoping

- **Status**: **ACCEPTED**
- **Context**: External clients review and approve creative deliverables without internal accounts.
- **Current State**: Implemented via `PortalServiceLayer.ts` and signed share tokens on `portal.<domain>/s/{token}`.
- **Problem**: Need to ensure client portal callers can never elevate privileges or access internal workspace data.
- **Decision**: Maintain strict **Zero-Login Client Identity Isolation**:
  - Client reviewers are never rows in `public.users` and never possess `auth.users` identities.
  - The cryptographic share token (`share_tokens`) _is_ the complete authorization credential.
  - Every portal request validates token signature, expiration (`share_expiration`), password verification (`share_passwords`), and single-use nonce status (`share_token_nonces`).
  - Portal responses expose only sanitized public DTOs (e.g. deliverable title, review threads, media streaming URL). Internal workspace metadata, budgets, tasks, and attendance are strictly omitted from portal queries.
- **Consequences**: Preserves zero-friction client review experience while maintaining absolute isolation from internal agency operations.
- **Security Impact**: Client token compromise is scoped strictly to the shared deliverable; cannot reach internal database tables.
- **Migration Impact**: None; validates existing implementation.
- **Dependencies**: None.
- **Open Questions**: None.

---

## ADR-011 — AI Context Window & Data Isolation

- **Status**: **ACCEPTED**
- **Context**: The platform integrates AI capabilities (meeting summarization, revision changelogs, task breakdown).
- **Current State**: Relational tables in `src/db/schema/ai-workspace.ts`: `aiConversations`, `aiMessages`, `aiContexts`, `aiContextSources`.
- **Problem**: Ensure AI prompt construction never cross-contaminates data between competing agency tenants.
- **Decision**: Mandate **Multi-Tenant AI Context Isolation**:
  - Every AI conversation, context snapshot, and prompt assembly must carry mandatory `organization_id NOT NULL`.
  - `ContextBuilder` in `src/lib/ai/context-builder.ts` must validate that all injected source documents (`aiContextSources`) belong strictly to the caller's active organization.
  - Prompts sent to external LLM providers (OpenAI, Anthropic, Gemini) must explicitly omit cross-tenant data.
  - LLM provider calls must use zero-data-retention APIs where applicable to protect agency intellectual property.
- **Consequences**: Agency creative briefs and proprietary client discussions are completely isolated.
- **Security Impact**: Prevents cross-tenant prompt injection and data leakage.
- **Migration Impact**: Audit context builder queries in Phase 6.
- **Dependencies**: ADR-004.
- **Open Questions**: None.

---

## ADR-012 — AI Cost Attribution & Token Budget Governance

- **Status**: **ACCEPTED**
- **Context**: Generative AI queries incur third-party API costs that must be attributed and controlled per tenant.
- **Current State**: Implemented via `public.ai_cost_tracking`, `public.ai_budgets`, and `AICostGovernance` class in `src/lib/ai/governance.ts`.
- **Problem**: Uncapped AI usage by one tenant can cause denial-of-wallet exhaustion for the platform.
- **Decision**: Enforce **Tenant-Level AI Cost Attribution & Budget Caps**:
  - `ai_cost_tracking` logs every model execution with `organization_id`, `user_id`, `model_name`, `input_tokens`, `output_tokens`, and calculated USD cost.
  - `AICostGovernance.checkBudget(organizationId)` evaluates the organization's monthly token consumption against their subscription tier allowance prior to dispatching LLM calls.
  - If budget is exceeded, the request is throttled with a typed `AIBudgetExceededError`.
- **Consequences**: Protects platform operating margins and enables tier-based AI plan monetization.
- **Security Impact**: Mitigates denial-of-wallet attacks.
- **Migration Impact**: Validates existing `src/lib/ai/governance.ts` architecture.
- **Dependencies**: ADR-004.
- **Open Questions**: None.

---

## ADR-013 — Public Marketing vs Internal App vs Client Portal Domains

- **Status**: **ACCEPTED**
- **Context**: The root URL `/` currently redirects immediately to `/dashboard` (if authenticated) or `/login` (if unauthenticated). There is no marketing landing page.
- **Current State**: `src/app/page.tsx` executes `redirect("/dashboard")`. `src/proxy.ts` redirects unauthenticated traffic to `/login`.
- **Problem**: The platform needs a public SaaS marketing presence with landing pages, pricing, and SEO infrastructure without compromising app authentication.
- **Options**:
  1. _Host marketing on external CMS (e.g. Webflow, Framer)_: Requires maintaining two codebases and cross-domain auth redirects.
  2. _Unified Next.js App Router Architecture with Route Groups_:
     - Root `/` serves marketing landing page (public, SEO-indexed).
     - Marketing pages: `/features`, `/pricing`, `/security`, `/about`, `/contact`.
     - Auth pages: `/login`, `/signup`, `/auth/*` (public internal).
     - Workspace: `/(dashboard)/*` (authenticated, gated by proxy and `requireCurrentUser()`).
     - Client Portal: `/portal/*` (rewritten from `portal.<domain>` or accessed via `/s/{token}`).
- **Decision**: Adopt **Unified Next.js App Router Architecture (Option 2)**:
  - In Phase 2, update `src/proxy.ts` so that `/` and marketing routes are recognized as public paths.
  - Replace `src/app/page.tsx` redirect with the high-converting SaaS landing page.
  - Internal workspace routes remain protected under `/(dashboard)/`.
- **Consequences**: Single repository, shared design tokens, zero cross-domain latency, unified deployment pipeline.
- **Security Impact**: Strict path matching in `src/proxy.ts` ensures unauthenticated visitors can access marketing pages but are stopped at `/dashboard/*`.
- **Migration Impact**: Phase 2 implementation.
- **Dependencies**: None.
- **Open Questions**: None.

---

## ADR-014 — Schema Migration & Transitional Dual-Write Strategy

- **Status**: **ACCEPTED**
- **Context**: Transitioning from single-tenant `users.organization_id` to `organization_memberships` must occur with zero downtime and zero data loss on production.
- **Current State**: Production host `https://ai-nexos.antideploy.com` is actively configured with live data.
- **Problem**: A naive migration dropping `users.organization_id` would immediately break running server instances and lock out existing users.
- **Decision**: Mandate **Three-Stage Additive Migration**:
  1. _Stage 1 (Additive Schema - Phase 4)_: Create `organization_memberships` table via forward migration `0016_multi_tenant_memberships.sql`. Backfill existing `public.users` rows into `organization_memberships` (`is_default = true`, `status = 'active'`).
  2. _Stage 2 (Dual-Read / Dual-Write - Phase 4)_: Update application code: reads check `organization_memberships`; user creation writes to both `users` and `organization_memberships`.
  3. _Stage 3 (Deprecation & Relaxation - Phase 5+)_: Relax `users.organization_id` and `users.role_id` to nullable; drop global `uq_users_email` index in favor of membership-scoped resolution; update `getCurrentUser()` to read exclusively from memberships.
- **Consequences**: Zero downtime; completely reversible at Stage 1 and Stage 2 without database rollback.
- **Security Impact**: Prevents session invalidation and administrative lockout during deployment.
- **Migration Impact**: Forward-only, non-destructive migrations.
- **Dependencies**: ADR-001, ADR-002.
- **Open Questions**: None.

---

## ADR-015 — Implementation Status & Verification Maturity Semantics

- **Status**: **ACCEPTED**
- **Context**: Prior documentation used binary `[IMPLEMENTED]` vs `[PLANNED]` status, leading to ambiguity where "code exists in a file" was conflated with "verified in production".
- **Current State**: 725+ unit tests pass, but some features (e.g. employee creation) exist as stubs in real repositories.
- **Problem**: Need an objective, engineering-accurate classification for platform capabilities to prevent premature deployment assumptions.
- **Decision**: Adopt a **5-Tier Verification Maturity Scale**:
  1. `[IMPLEMENTED]`: Source code and data models exist in the repository, but end-to-end integration is pending or partial.
  2. `[VERIFIED]`: Feature is covered by passing automated unit and integration tests.
  3. `[PRODUCTION VERIFIED]`: Feature is verified live in production environment under real user sessions.
  4. `[PLANNED]`: Feature is formally architected and scheduled for an upcoming phase (Phase 2–6).
  5. `[FUTURE]`: Feature is on the long-term conceptual roadmap (Phase 7+).
- **Consequences**: PRD V2 and all audit reports must use these precise status tiers.
- **Security Impact**: Prevents security assumptions based on unverified code.
- **Migration Impact**: Immediate documentation alignment.
- **Dependencies**: None.
- **Open Questions**: None.

---
