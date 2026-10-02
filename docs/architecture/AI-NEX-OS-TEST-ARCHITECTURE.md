# AI NEX OS — Test Architecture & Quality Assurance Framework
## Phase 1C: Multi-Tenant Test Pyramid & Security Verification Specifications

---

## Document Control

| Attribute | Detail |
| :--- | :--- |
| **Document Path** | `docs/architecture/AI-NEX-OS-TEST-ARCHITECTURE.md` |
| **Version** | 1.0.0 (Phase 1C Test Architecture) |
| **Status** | **APPROVED TECHNICAL DESIGN (DOCUMENTATION ONLY)** |
| **Date** | September 26, 2026 |
| **Architects** | Principal QA Architect, Security Architect, Software Architect |
| **Repository Root** | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`) |
| **Target Branch** | `phase-2-production-readiness` |
| **Scope** | End-to-end testing pyramid, tenant isolation verification suites, migration automated tests, authorization matrices, and CI/CD quality gates. |

---

## 1. Executive Summary & Testing Philosophy

In an enterprise multi-tenant B2B SaaS system, automated testing is the primary technical barrier against cross-tenant data leaks, privilege escalation, and migration regressions. 

The **AI NEX OS Test Architecture** enforces a strict, multi-tiered test pyramid comprising seven distinct test categories:
1. **Unit Tests**: Pure business logic, AST security gates, cryptographic tokens, work validation calculators.
2. **Integration Tests**: Repository query builders, transaction rollbacks, multi-tenant session cookie resolution.
3. **Authorization Tests**: Role-based access control matrices, module-action permission evaluation, Owner protection rules.
4. **Tenant Isolation Tests**: Explicit negative testing proving that User A cannot read or mutate Organization B.
5. **Migration Verification Tests**: Idempotency of backfill scripts, dual-write consistency assertions, zero data drift gates.
6. **Browser E2E Tests**: Playwright workflows for organization switching, invite redemption, and client review portals.
7. **Production Smoke Tests**: Post-deployment canary checks validating health, routing, and tenant sovereignty.

---

## 2. Multi-Tenant Test Pyramid

```
                                  ▲
                                 / \
                                /   \
                               /     \
                              /  PROD \  ◄── Canary Smoke Tests (Read-Only)
                             /  SMOKE  \
                            /───────────\
                           /   BROWSER   \  ◄── Playwright E2E User Journeys
                          /   E2E TESTS   \
                         /─────────────────\
                        /     MIGRATION     \  ◄── Backfill & Dual-Write Consistency
                       /  VERIFICATION TESTS \
                      /───────────────────────\
                     /    TENANT ISOLATION     \  ◄── Cross-Tenant Attack Scenarios
                    /       SECURITY TESTS      \
                   /─────────────────────────────\
                  /         AUTHORIZATION         \  ◄── RBAC Matrix (22 Modules × 15 Actions)
                 /          & PERMISSIONS          \
                /───────────────────────────────────\
               /             INTEGRATION             \  ◄── Repository Scoping & Transactions
              /                 TESTS                 \
             /─────────────────────────────────────────\
            /                    UNIT                   \  ◄── AST Gates, Validation, Math
           /                     TESTS                   \
          └───────────────────────────────────────────────┘
```

---

## 3. Mandatory Tenant Isolation Test Suite (`tests/tenant-isolation/`)

The following test suites must be implemented in upcoming phases to validate multi-tenant isolation under simulated adversarial conditions:

### 3.1 Test Case: Cross-Tenant Data Access (Read Rejection)
- **Identifier**: `TEST-ISO-001`
- **Objective**: Prove User A (Member of Org 1) cannot fetch or view resources belonging to Org 2.
- **Setup**:
  - Seed Organization 1 (`org_1`) with Project 1 (`proj_1`).
  - Seed Organization 2 (`org_2`) with Project 2 (`proj_2`).
  - Authenticate session as User A (`user_a`), active org `org_1`.
- **Execution**: Invoke `getProjectDetails(proj_2.id)`.
- **Assertion**:
  - Response must return `NOT_FOUND` (404) or `FORBIDDEN` (403).
  - Zero project attributes from `proj_2` are returned in the payload.
  - An unauthorized access attempt is recorded in `activity_logs`.

### 3.2 Test Case: Cross-Tenant Data Mutation (Write Rejection)
- **Identifier**: `TEST-ISO-002`
- **Objective**: Prove User A cannot update, archive, or delete resources in Org 2 by manipulating entity IDs.
- **Setup**: Authenticate as User A (Org 1). Target is `task_2` belonging to `org_2`.
- **Execution**: Invoke `updateTask(task_2.id, { title: "Hacked Title" })`.
- **Assertion**:
  - Server action throws `NOT_FOUND_OR_FORBIDDEN`.
  - Database verification confirms `task_2.title` remains unchanged.
  - Zero mutations occur in `org_2`.

### 3.3 Test Case: Multi-Org Role Containment
- **Identifier**: `TEST-ISO-003`
- **Objective**: Prove that an Owner in Org 1 does not retain administrative privileges when operating inside Org 2 as a Team Member.
- **Setup**: User A is `owner` in `org_1`, but only `team_member` in `org_2`.
- **Execution**:
  - Switch active context to `org_2`.
  - Attempt to invoke `deleteOrganization()` or `updateOrganizationSettings()`.
- **Assertion**:
  - Action throws `FORBIDDEN: Insufficient permissions for module 'organization'`.
  - Active permissions map strictly reflects `team_member` profile in `org_2`.

### 3.4 Test Case: Immediate Access Revocation upon Membership Suspension
- **Identifier**: `TEST-ISO-004`
- **Objective**: Prove that suspending a membership immediately revokes workspace access without waiting for session token expiration.
- **Setup**: User A is active in `org_1`. Admin sets User A's membership `status = 'suspended'`.
- **Execution**: User A immediately executes `listProjects()`.
- **Assertion**:
  - Server action rejects request with `NO_MEMBERSHIP: Membership suspended`.
  - User is redirected to `/onboarding`.

### 3.5 Test Case: Stale Cache Isolation upon Organization Switch
- **Identifier**: `TEST-ISO-005`
- **Objective**: Prove that switching from Org 1 to Org 2 completely invalidates client caches and never renders Org 1 data in Org 2's UI.
- **Setup**: User loads `/deliverables` in `org_1`. Switches active organization to `org_2`.
- **Execution**: Client components trigger background revalidation.
- **Assertion**:
  - React Query cache for `org_1` is completely purged.
  - Zero Deliverable cards from `org_1` appear in the DOM.

### 3.6 Test Case: Cross-Tenant Share Link Isolation
- **Identifier**: `TEST-ISO-006`
- **Objective**: Prove that a client review share token issued by Org 1 cannot be manipulated to stream assets from Org 2.
- **Setup**: Generate valid share token for `deliverable_1` (Org 1). Attempt to request `deliverable_2` (Org 2) using Org 1's share token session.
- **Execution**: Invoke `getSharedDeliverableAsset(deliverable_2.id)` with Token 1.
- **Assertion**:
  - Portal service rejects request with `FORBIDDEN: Deliverable not bound to this share session`.
  - Zero signed URLs are generated.

### 3.7 Test Case: AI Context Boundary Enforcement
- **Identifier**: `TEST-ISO-007`
- **Objective**: Prove that LLM prompt context compilation never injects documents or conversation history from another tenant.
- **Setup**:
  - Org 1 conversation discusses "Secret Project Alpha".
  - Org 2 user initiates AI query: "What is Project Alpha?"
- **Execution**: Execute `compileAIContext(org_2.id, query)`.
- **Assertion**:
  - Semantic vector search and context assembly return 0 results from `org_1`.
  - LLM response contains zero references to Org 1's confidential brief.

### 3.8 Test Case: Invitation Scope & Email Binding
- **Identifier**: `TEST-ISO-008`
- **Objective**: Prove an invitation issued for Org 1 cannot be accepted to gain membership in Org 2.
- **Setup**: Admin of Org 1 creates invitation token for `contractor@agency.com`.
- **Execution**: Invitee attempts to redeem token while supplying `targetOrgId = org_2`.
- **Assertion**:
  - Token redemption enforces `token.organization_id`. Membership is created strictly in `org_1`.
  - Zero records created in `org_2`.

---

## 4. Compile-Time AST Security Gating (`tests/unit/tenant-identity-surface.test.ts`)

The existing AST static security gate is a mandatory, blocking CI check:
- **Rule**: Every exported function in `"use server"` files is parsed into an Abstract Syntax Tree (AST).
- **Prohibited Identifiers**: No function signature may include parameter names matching:
  - `organizationId`
  - `orgId`
  - `tenantId`
  - `userId`
  - `currentUserId`
- **Enforcement**: Build immediately fails if an identity argument is exposed to the client.

---

## 5. Migration Automated Verification Test Suite

## 5. Phase 2: Tenant Foundation & Organization Code Prefix Verification

Implemented in `tests/unit/code-generation.test.ts` (22 tests, all passing):

| Test ID | Test Case | Target Invariant | Result |
| :--- | :--- | :--- | :--- |
| `TEST-P2-001` | Organization prefix validation | 2-8 char uppercase alphanumeric; trim and uppercase normalization | `PASS` |
| `TEST-P2-002` | Organization prefix uniqueness / reserved rejection | Rejects `SYS`, `ADMIN`, `NEXOS`, `API`, `ROOT`, `TEST`, `DEMO` case-insensitively | `PASS` |
| `TEST-P2-003` | Code generation formatting | Formats `{PREFIX}-{YYYY}-{XXXX}`, `{PREFIX}-T-{YYYY}-{XXXX}`, `COR-{XXXX}` | `PASS` |
| `TEST-P2-004` | Concurrent code generation simulation | Strictly unique, monotonic numbers under concurrent load (50 workers) | `PASS` |
| `TEST-P2-005` | Cross-tenant sequence isolation | Org A and Org B maintain independent sequence counters without cross-talk | `PASS` |
| `TEST-P2-006` | Unauthorized organization access | Missing or non-existent organization ID throws error | `PASS` |
| `TEST-P2-007` | Year rollover behavior | YYYY evaluates in tenant timezone; sequence increments monotonically across years | `PASS` |
| `TEST-P2-008` | Existing identifier compatibility | Legacy organization `AIC` produces `AIC-2026-0001` and `AIC-T-2026-0001` | `PASS` |
| `TEST-P2-009` | Transaction rollback compatibility | Generator participates in caller transaction scope (`tx`) | `PASS` |
| `TEST-P2-010` | Server-side organization derivation | `createProject` and `createTask` derive tenant from session, not client payload | `PASS` |
| `TEST-P2-011` | Client-supplied organizationId rejection | `code-generation.ts` is internal (no `"use server"`), blocking direct client RPC | `PASS` |
| `TEST-P2-012` | Code immutability | Output identifiers are deterministic and immutable strings | `PASS` |

---

## 6. Migration Verification & Data Integrity Test Matrix

During Phase 4 execution, automated verification scripts validate data integrity across each migration stage:

| Test Script | Objective | Success Criteria |
| :--- | :--- | :--- |
| `tests/migration/backfill-parity.test.ts` | Verify 100% of existing `users` rows were copied to `organization_memberships`. | `count(users WHERE org IS NOT NULL) === count(memberships)` |
| `tests/migration/dual-write-consistency.test.ts` | Verify that mutations write identical attributes to both tables. | Zero discrepancy between `users.role_id` and `memberships.role_id` |
| `tests/migration/idempotent-replay.test.ts` | Verify that re-running backfill scripts causes zero duplicate key errors. | Script runs 3 consecutive times with exit code 0 |
| `tests/migration/invariants-audit.test.ts` | Verify all 16 Data Integrity Invariants (INVAR-01 to INVAR-16). | Zero violations discovered across all operational tables |

---

## 6. End-to-End Browser Journey Verification (Playwright)

Playwright E2E suites validate core user workflows across multi-tenant boundaries:
1. **Journey 1: Organization Switcher Flow**: User logs in → views workspace A → selects switcher → selects workspace B → verifies header updates, sidebar navigation reflects B permissions, and URL remains `/dashboard`.
2. **Journey 2: Team Invitation & Acceptance**: Admin invites `newuser@test.local` → system generates invite link → user opens link in clean incognito browser → completes profile → lands on workspace dashboard as active member.
3. **Journey 3: Tri-State Onboarding**: Fresh Google OAuth login with unaffiliated email → user redirected to `/onboarding` → creates "New Horizon Studio" → seeds system roles → enters workspace as Owner.
4. **Journey 4: Zero-Login Client Portal**: Admin shares deliverable → external client opens link in mobile viewport → inputs review comment and pin annotation → approves deliverable → client cannot navigate to `/dashboard` or internal workspace routes.

---

## 7. Production Smoke & Canary Verification

Immediately following production deployments, non-mutating smoke tests verify live health:
- `GET https://app.ai-nexos.com/api/health`: Verifies database and Redis connectivity.
- `GET https://portal.ai-nexos.com/api/health`: Verifies portal routing and proxy health.
- `HEAD https://ai-nexos.com/`: Verifies public marketing landing page status 200.
- Authenticated Canary Check: Validates that read-only queries against smoke-test tenant return within SLA (< 200ms).
