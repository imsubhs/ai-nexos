# Security Remediation S2

## NEXOS-SEC-04 Cross-Tenant Project → Client Object-Level Authorization

**Date:** 2026-09-28  
**Author:** Application Security & Multi-Tenant SaaS Security Architecture  
**Status:** Remediated & Verified (Code Clean, Tests Passing, Non-Staged)  
**Classification:** HIGH (CWE-639: Authorization Bypass Through User-Controlled Key / Broken Object-Level Authorization)

---

## 1. Executive Summary

During the object-level authorization audit following Phase S1, finding **`NEXOS-SEC-04`** was confirmed: the `createProject()` server action in `src/features/projects/real-actions.ts` accepted an optional `clientId` parameter without verifying that the referenced client belonged to the authenticated user's active organization (`user.organizationId`). Although the project record itself was correctly anchored to `user.organizationId`, an authenticated caller with `projects.create` permission in Tenant A could bind their new project to a client belonging to Tenant B.

Phase S2 delivers the minimal, safe code-level remediation:

1. When `data.clientId` is supplied, an authoritative query against `clients` verifies that the client exists, is not soft-deleted (`deletedAt IS NULL`), and belongs strictly to `user.organizationId`.
2. If the check fails, execution aborts immediately with uniform not-found semantics (`"Client not found"`), preventing foreign tenant existence leakage.
3. If `data.clientId` is omitted, `null`, or `undefined`, existing project creation proceeds without interruption.
4. No database schema migration or table denormalization was introduced.
5. All 20 isolation regression tests (S1 + S2) and all 867 platform unit tests pass with zero regressions.

---

## 2. Original Finding

- **Finding Identifier:** `NEXOS-SEC-04`
- **Severity:** HIGH (CVSS 7.8 — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`)
- **Affected File:** `src/features/projects/real-actions.ts`
- **Affected Server Action:** `createProject(data)`
- **Vulnerability Description:**
  `createProject` accepts an optional `data.clientId`. The project's `organizationId` was correctly populated from the authenticated session (`user.organizationId`). However, the supplied `clientId` was inserted directly into the `projects` table without verifying that `clients.organizationId === user.organizationId`. Consequently, a tenant user with `projects.create` could forge associations to foreign tenant clients by providing a known foreign `clientId`.

---

## 3. Root Cause

In `src/features/projects/real-actions.ts`:

- Caller authentication (`requireCurrentUser()`) and permission checking (`requirePermission(user.permissions, "projects", "create")`) were correctly applied.
- However, the database transaction immediately proceeded to invoke `generateProjectCode` and execute `tx.insert(projects).values({ ...data, ... })`.
- No relational gate queried the `clients` table before insertion to enforce that `data.clientId` belonged to `user.organizationId` and was active (`deletedAt IS NULL`).

---

## 4. Existing Security Architecture

AI NEX OS maintains a strict server-authoritative tenancy model:

1. **Server-Derived Context:** User identity and active organization are resolved from cryptographic session cookies (`requireCurrentUser()`). Client-supplied `organizationId` parameters are discarded or overwritten.
2. **Relational Tenancy Verification:** For child or associated resources, the parent entity must be verified against `user.organizationId`. As demonstrated in `src/features/deliverables/real-actions.ts:76-91`, when an optional `clientId` is provided, a transactional query validates that `clients.organizationId = user.organizationId` and `clients.deletedAt IS NULL`.
3. **Defense-in-Depth Transactionality:** Authorizations must execute inside the database transaction (`tx`) prior to stateful actions (such as sequence increments or activity logging) so that unverified mutations fail closed with automatic rollback.

---

## 5. Remediation Design

Following the principle of smallest safe change with zero schema impact:

- **Design Pattern:** Authoritative Parent Existence & Tenancy Gate (Transaction-Scoped).
- **Schema Modifications:** **0 (None)**. `projects` and `clients` already maintain proper foreign keys and index structures.
- **Error Semantics & Zero Information Disclosure:**
  - When `data.clientId` does not exist, belongs to another tenant, or is soft-deleted, the server throws `"Client not found"`.
  - The error response does not distinguish between a non-existent client ID and a foreign tenant client ID, eliminating oracle enumeration vectors.

### Implementation in `src/features/projects/real-actions.ts`

```ts
export async function createProject(data: z.infer<typeof insertProjectSchema>) {
  const user = await requireCurrentUser();
  requirePermission(user.permissions, "projects", "create");

  const project = await db.transaction(async (tx) => {
    // If a client is specified, verify it exists, is not deleted, and belongs to caller's organization
    if (data.clientId) {
      const [client] = await tx
        .select({ clientId: clients.clientId })
        .from(clients)
        .where(
          and(
            eq(clients.clientId, data.clientId),
            eq(clients.organizationId, user.organizationId),
            isNull(clients.deletedAt),
          ),
        )
        .limit(1);

      if (!client) {
        throw new Error("Client not found");
      }
    }

    const projectCode = await generateProjectCode(user.organizationId, tx);
    // ... insert project and log activity ...
```

---

## 6. Files Changed

- `src/features/projects/real-actions.ts`:
  - Imported `clients` from `@/db/schema`.
  - Added transactional client ownership and soft-delete verification before `generateProjectCode` and project insertion in `createProject()`.
  - Cleaned unused imports (`sql`).
- `tests/unit/project-client-tenant-isolation.test.ts` _(New Regression Suite)_:
  - 10-point test matrix verifying no-client success, same-tenant success, cross-tenant denial, tampered parameters, RBAC enforcement, soft-deletion handling, and unauthenticated denial.

---

## 7. Exact Authorization Invariant

An authenticated user $U$ is permitted to create a project $P$ with optional associated client $C$ if and only if:

1. $\text{hasPermission}(U.\text{permissions}, \text{"projects"}, \text{"create"}) = \text{true}$
2. $P.\text{organizationId} = U.\text{organizationId}$ (derived exclusively from server session)
3. If $C$ is provided ($P.\text{clientId} \neq \text{null}$):
   - $C \text{ exists}$
   - $C.\text{deletedAt IS NULL}$
   - $C.\text{organizationId} = U.\text{organizationId}$
4. If $C$ is omitted/null/undefined:
   - $P$ is created without client linkage ($P.\text{clientId} = \text{null}$).

---

## 8. Test Matrix

| Test ID     | Scenario                                                                 | Expected Outcome                                          | Actual Outcome                         | Status   |
| :---------- | :----------------------------------------------------------------------- | :-------------------------------------------------------- | :------------------------------------- | :------- |
| **TEST 1**  | Authenticated Org A user creates project without `clientId`              | SUCCESS (`clientId: null`, `orgId: Org A`)                | SUCCESS                                | **PASS** |
| **TEST 2**  | Authenticated Org A user creates project with Org A `clientId`           | SUCCESS (`clientId: Client A`, `orgId: Org A`)            | SUCCESS                                | **PASS** |
| **TEST 3**  | Authenticated Org A user attempts project creation with Org B `clientId` | DENIED (`"Client not found"`)                             | DENIED (`"Client not found"`)          | **PASS** |
| **TEST 4**  | After TEST 3, verify no project was created with Org B `clientId`        | PASS (0 projects associated with Org B client)            | PASS (0 rows inserted)                 | **PASS** |
| **TEST 5**  | Authenticated Org A user supplies tampered `organizationId`              | Server-derived organization remains authoritative         | Org A enforced, tampered Org B ignored | **PASS** |
| **TEST 6**  | User without `projects.create` permission attempts project creation      | DENIED (`PermissionDeniedError`)                          | DENIED (`PermissionDeniedError`)       | **PASS** |
| **TEST 7**  | Unauthenticated caller attempts project creation                         | DENIED (`Authentication required`)                        | DENIED (`Authentication required`)     | **PASS** |
| **TEST 8**  | Soft-deleted same-tenant client supplied                                 | DENIED (`"Client not found"`)                             | DENIED (`"Client not found"`)          | **PASS** |
| **TEST 9**  | Nonexistent `clientId` supplied                                          | DENIED without information leakage (`"Client not found"`) | DENIED (`"Client not found"`)          | **PASS** |
| **TEST 10** | Existing project creation lifecycle remains unchanged                    | PASS (projectCode generated, activity log created)        | PASS                                   | **PASS** |

---

## 9. Cross-Tenant Regression Results

Execution output from `npx vitest run tests/unit/project-client-tenant-isolation.test.ts`:

```
 ✓ tests/unit/project-client-tenant-isolation.test.ts (10 tests) 18ms
   ✓ NEXOS-SEC-04: Cross-Tenant Project -> Client Authorization Gate (10)
     ✓ TEST 1: Authenticated Org A user creates project without clientId -> SUCCESS 1ms
     ✓ TEST 2: Authenticated Org A user creates project with Org A clientId -> SUCCESS 5ms
     ✓ TEST 3: Authenticated Org A user attempts project creation with Org B clientId -> DENIED 3ms
     ✓ TEST 4: After TEST 3, verify no project was created with Org B clientId -> PASS 1ms
     ✓ TEST 5: Authenticated Org A user supplies tampered organizationId -> Server-derived authoritative 1ms
     ✓ TEST 6: User without project-create permission attempts project creation -> DENIED 0ms
     ✓ TEST 7: Unauthenticated caller attempts project creation -> DENIED 0ms
     ✓ TEST 8: Soft-deleted same-tenant client supplied -> DENIED 2ms
     ✓ TEST 9: Nonexistent clientId supplied -> DENIED without information leakage 2ms
     ✓ TEST 10: Existing project creation lifecycle remains unchanged -> PASS 1ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

Static tenant isolation gate:

```bash
$ npm run audit:authz
✓ Every exported server action reaches an authorization guard.
✓ Static tenant isolation gate verified: No untrusted client organizationId parameters.
```

---

## 10. Real Database Results & Testing Limitation Disclosure

- **Safety Policy:** Direct execution against configured staging or production databases was strictly avoided in adherence to the safety gate (`0 mutations, 0 deployments`).
- **Environment Guard Constraints:** As codified in `tests/integration/guard.ts`, the repository's integration test suite executes against live cloud Supabase environments when configured and throws `IntegrationGuardError` to fail-closed against production.
- **Testing Limitation:** No disposable local containerized PostgreSQL instance was running in the environment during S2. Verification was executed via deep in-memory mock-recording regression suites (`recording-db.ts`) simulating exact Drizzle ORM SQL predicates and transactional semantics.
- **Integrity Certification:** Production-grade assurance cannot be asserted on mocked tests alone; a dedicated staging environment rehearsal on an isolated ephemeral database should be scheduled before production release.

---

## 11. Full Regression Results

- **Complete Unit Test Suite (`npm test`):**
  - **Test Files:** 57 passed (57 total)
  - **Tests:** 867 passed (867 total)
  - **Duration:** 9.39s (100% green)
- **TypeScript Compilation (`npm run typecheck` / `tsc --noEmit`):**
  - Passed with 0 errors.
- **Code Linting (`npx eslint`):**
  - 0 errors, 0 warnings on modified and newly created files (`src/features/projects/real-actions.ts` and `tests/unit/project-client-tenant-isolation.test.ts`).

---

## 12. S1 Regression Results

The S1 test suite was re-executed to guarantee no regression of `NEXOS-SEC-01`:

```bash
$ npx vitest run tests/unit/client-contacts-tenant-isolation.test.ts
 ✓ tests/unit/client-contacts-tenant-isolation.test.ts (10 tests) 25ms
   ✓ NEXOS-SEC-01: Cross-Tenant Client Contact Mutation Regression Suite (10)
     ✓ TEST 1 to TEST 10: All passed (10/10)
```

Combined tenant isolation run:

```bash
$ npx vitest run tests/unit/project-client-tenant-isolation.test.ts tests/unit/client-contacts-tenant-isolation.test.ts
 Test Files  2 passed (2)
      Tests  20 passed (20)
```

---

## 13. Remaining Security Findings (Documented Separately)

During the object-level authorization audit of project-related actions, the following items were identified:

### NEXOS-SEC-05: `updateProject` Missing Client Ownership Verification

- **Location:** `src/features/projects/real-actions.ts:81-110`
- **Finding:** `updateProject` accepts `data: z.infer<typeof updateProjectSchema>`. If `data.clientId` is provided in an update request, it is updated directly without checking whether `data.clientId` belongs to `user.organizationId` and is active.
- **Action:** Per scope instructions, this was NOT modified in S2. Logged as finding `NEXOS-SEC-05` for remediation in Phase S3.

### NEXOS-SEC-06: `createProject` & `updateProject` Unvalidated Member User References

- **Location:** `src/features/projects/real-actions.ts`
- **Finding:** `createProject` accepts optional `projectManager` and `creativeDirector` user UUIDs. While `addProjectMember` explicitly checks that target `userId` belongs to `user.organizationId`, `createProject` does not validate that `projectManager` or `creativeDirector` belongs to the tenant.
- **Action:** Logged as finding `NEXOS-SEC-06` for future remediation.

---

## 14. Production Impact

- **Production Environment:** **UNTOUCHED**
- **Database Mutations:** 0
- **Deployments:** 0
- **Migrations Executed:** 0
- **Environment Variables Altered:** 0

---

## 15. Staging Impact

- **Staging Environment:** **UNTOUCHED**
- **Database Mutations:** 0
- **Deployments:** 0
- **Migrations Executed:** 0

---

## 16. Git Status

All changes remain local, unstaged, and uncommitted.

```bash
$ git diff --stat src/features/projects/real-actions.ts
 src/features/projects/real-actions.ts | 70 +++++++++++++++++++----------------
 1 file changed, 38 insertions(+), 32 deletions(-)
```

Untracked files created for verification and audit:

- `tests/unit/project-client-tenant-isolation.test.ts`
- `docs/audit/SECURITY-REMEDIATION-S2-NEXOS-SEC-04.md`

---

## 17. Final Assessment

Remediation Phase S2 is **COMPLETE and CERTIFIED**:

- The root cause of `NEXOS-SEC-04` has been eliminated in `createProject()`.
- The tenant boundary between projects and clients is now strictly enforced.
- S1 client-contact protections remain fully active and regression-tested.
- All unit tests (867), tenant isolation tests (20), static authorization gates, and TypeScript type checks pass with zero errors.
- Production, staging, RLS migrations, rate-limiting, and dependencies were left untouched.

---

# Separately Documented Security Items

### NEXT-SEC-01: Next.js Version Dependency Advisories

- **Advisories:** Current codebase uses Next.js 16.3.0. Upstream CVEs and advisories include:
  1. AVIF image optimization memory corruption / RCE (affected versions `<16.3.3`)
  2. Windows-hosted RCE (affected versions `<16.3.3`)
  3. September 22, 2026 `next/og` ImageResponse RCE (patched in `16.3.6`)
- **Status:** Must be handled in a dedicated dependency-remediation phase with end-to-end SSR/SSG regression testing. Next.js was **not** upgraded in S2.

### NEXOS-SEC-02: RLS Defense-in-Depth on Memberships & Invitations

- **Observation:** Migrations `0016_organization_memberships.sql`, `0017_organization_invitations.sql`, and `0018_remediate_projects_rls_recursion.sql` do not define explicit RLS on membership and invitation tables. Direct client access is mitigated via revoked PostgreSQL privileges (`REVOKE ALL FROM anon, authenticated`).
- **Status:** No RLS migrations were modified or added in S2. Tracked for formal RLS policy review.

### NEXOS-SEC-03: Multi-Instance Rate Limiting

- **Observation:** `src/lib/security/rate-limit.ts` uses an in-memory token bucket. In serverless or multi-instance deployments, counters are node-local.
- **Status:** Not modified in S2. Tracked for Redis/Upstash implementation.
