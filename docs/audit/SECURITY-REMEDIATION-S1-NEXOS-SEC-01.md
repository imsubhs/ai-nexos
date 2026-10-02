# Security Remediation S1
## NEXOS-SEC-01 Client Contact IDOR

**Date:** 2026-09-28  
**Author:** Application Security & Multi-Tenant SaaS Security Architecture  
**Status:** Remediated & Verified (Code Clean, Tests Passing, Non-Staged)  
**Classification:** HIGH (CWE-639: Authorization Bypass Through User-Controlled Key / IDOR)  

---

## 1. Original Finding

* **Finding Identifier:** `NEXOS-SEC-01`
* **Severity:** HIGH (CVSS 8.5 — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:N`)
* **Affected File:** `src/features/clients/real-actions.ts`
* **Affected Server Actions:**
  * `createContact(data)`
  * `updateContact(contactId, clientId, data)`
  * `archiveContact(contactId, clientId)`
* **Vulnerability Description:**
  In `createContact`, `updateContact`, and `archiveContact`, operations were performed without validating that the targeted contact or its parent client belonged to the authenticated user's active organization (`user.organizationId`). Any authenticated user holding `clients.update` permissions in Tenant A could inject foreign UUIDs (e.g., Tenant B `clientId` or Tenant B `contactId`), enabling cross-tenant client contact insertion, modification, and soft-deletion (archive).

---

## 2. Root Cause

1. **`createContact`**:
   * Resolved identity and validated `clients.update` permission correctly via `requireCurrentUser()` and `requirePermission()`.
   * Directly inserted `parsed.clientId` into `client_contacts` without querying the `clients` table to verify that `clients.clientId === parsed.clientId`, `clients.organizationId === user.organizationId`, and `clients.deletedAt IS NULL`.
   * Client-supplied `clientId` was trusted as proof of ownership.

2. **`updateContact` & `archiveContact`**:
   * Evaluated `contactId` exclusively via `.where(eq(clientContacts.contactId, contactId))`.
   * Received `clientId` as a function parameter but failed to bind it in the query predicates.
   * Lacked any relational join or verification against `clients.organizationId = user.organizationId`.
   * Allowed any authenticated tenant possessing another tenant's `contactId` to overwrite or archive that contact.

---

## 3. Existing Security Architecture

AI NEX OS enforces a multi-layered security model across server actions:
1. **Server-Side Identity & Tenant Resolution (`requireCurrentUser`)**:
   * Extracts user identity from cryptographic session tokens (`app_session_token`).
   * Resolves active organization context server-side (`user.organizationId`). Client-supplied `organizationId` headers or payload fields are strictly ignored.
2. **Role-Based Permission Gate (`requirePermission`)**:
   * Evaluates granular capabilities (e.g., `requirePermission(user.permissions, "clients", "update")`).
3. **Relational Tenancy Model (Transitive Inheritance)**:
   * The `clients` table carries `organization_id` directly.
   * Child table `client_contacts` inherits tenant ownership transitively through foreign key `client_contacts.client_id -> clients.client_id`.
   * The canonical pattern observed in other child features (such as `client deliverables` in `src/features/deliverables/real-actions.ts:76-90`) performs a parent-table ownership lookup against `user.organizationId`.

---

## 4. Remediation Design

Following the principle of smallest safe code-level change without schema alterations:

* **Design Decision:** Pattern A + C (Parent-Client Ownership Verification + Scoped Mutation).
* **Schema Modifications:** **NONE**. `client_contacts` does not require an added `organization_id` column; denormalization would introduce migration drift and violate transitive ownership invariants.
* **Error Semantics & Zero Information Disclosure:**
  * If a target `clientId` does not exist or belongs to another organization in `createContact`, the server throws `"Client not found"`.
  * If a target `contactId` does not exist, belongs to another organization, does not match `clientId`, or is archived in `updateContact`/`archiveContact`, the server throws `"Contact not found"`.
  * Using uniform not-found errors prevents attackers from enumerating valid foreign tenant UUIDs via error response differentiation.

### Implementation Details in `src/features/clients/real-actions.ts`

1. **`createContact`**:
   * Pre-insertion verification:
     ```ts
     const [client] = await db
       .select({ clientId: clients.clientId })
       .from(clients)
       .where(
         and(
           eq(clients.clientId, parsed.clientId),
           eq(clients.organizationId, user.organizationId),
           isNull(clients.deletedAt),
         ),
       )
       .limit(1);

     if (!client) throw new Error("Client not found");
     ```

2. **`updateContact`**:
   * Pre-mutation ownership join verification:
     ```ts
     const [existing] = await db
       .select({
         contactId: clientContacts.contactId,
         clientId: clientContacts.clientId,
       })
       .from(clientContacts)
       .innerJoin(clients, eq(clientContacts.clientId, clients.clientId))
       .where(
         and(
           eq(clientContacts.contactId, contactId),
           eq(clientContacts.clientId, clientId),
           eq(clients.organizationId, user.organizationId),
           isNull(clients.deletedAt),
           isNull(clientContacts.deletedAt),
         ),
       )
       .limit(1);

     if (!existing) throw new Error("Contact not found");
     ```
   * Scoped mutation update query:
     ```ts
     .where(
       and(
         eq(clientContacts.contactId, contactId),
         eq(clientContacts.clientId, existing.clientId),
         isNull(clientContacts.deletedAt),
       ),
     )
     ```

3. **`archiveContact`**:
   * Applies the exact same pre-mutation join verification and scoped soft-delete update.

---

## 5. Files Changed

* `src/features/clients/real-actions.ts`:
  * Added parent client tenant check to `createContact`.
  * Added parent client inner join tenant verification and scoped update to `updateContact`.
  * Added parent client inner join tenant verification and scoped update to `archiveContact`.
* `tests/unit/client-contacts-tenant-isolation.test.ts` *(New Regression Suite)*:
  * Comprehensive 10-point test matrix verifying same-tenant success, cross-tenant denial, tampered parameters, RBAC enforcement, and unauthenticated denial.

---

## 6. Exact Authorization Invariant

An authenticated user $U$ is permitted to mutate a client contact $C$ with parent client $P$ if and only if:
1. $\text{hasPermission}(U.\text{permissions}, \text{"clients"}, \text{"update"}) = \text{true}$
2. $P \text{ exists and } P.\text{deletedAt IS NULL}$
3. $P.\text{organizationId} = U.\text{organizationId}$ (server-derived, untrusted from client input)
4. For updates and archiving:
   * $C \text{ exists and } C.\text{deletedAt IS NULL}$
   * $C.\text{clientId} = P.\text{clientId}$
   * Mutation is strictly scoped to $C.\text{contactId} \land C.\text{clientId}$

---

## 7. Test Matrix

| Test ID | Scenario | Expected Outcome | Actual Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TEST 1** | Org A user creates contact for Org A client | SUCCESS (contact inserted and linked) | SUCCESS | PASS |
| **TEST 2** | Org A user attempts `createContact` using Org B `clientId` | DENIED (`"Client not found"`) | DENIED (`"Client not found"`) | PASS |
| **TEST 3** | Org A user updates Org A contact | SUCCESS (contact fields modified) | SUCCESS | PASS |
| **TEST 4** | Org A user updates Org B contact | DENIED (`"Contact not found"`) | DENIED (`"Contact not found"`) | PASS |
| **TEST 5** | Org A user archives Org A contact | SUCCESS (`deletedAt` populated) | SUCCESS | PASS |
| **TEST 6** | Org A user archives Org B contact | DENIED (`"Contact not found"`) | DENIED (`"Contact not found"`) | PASS |
| **TEST 7** | Tampered `organizationId` supplied in payload / context | IGNORED (server-derived context enforced) | IGNORED / PROCESSED SAFELY | PASS |
| **TEST 8** | User without `clients.update` permission attempts mutation | DENIED (`PermissionDeniedError`) | DENIED (`PermissionDeniedError`) | PASS |
| **TEST 9** | Unauthenticated caller attempts mutation | DENIED (`Authentication required`) | DENIED (`Authentication required`) | PASS |
| **TEST 10** | Existing same-tenant contact workflow (create -> update -> archive) | PASS (full lifecycle succeeds in tenant) | PASS | PASS |

---

## 8. Test Results

Execution output from `npx vitest run tests/unit/client-contacts-tenant-isolation.test.ts`:
```
 ✓ tests/unit/client-contacts-tenant-isolation.test.ts (10 tests) 25ms
   ✓ NEXOS-SEC-01: Cross-Tenant Client Contact Mutation Regression Suite (10)
     ✓ TEST 1: Organization A user creates contact for Organization A client -> SUCCESS 5ms
     ✓ TEST 2: Organization A user attempts createContact using Organization B clientId -> DENIED 4ms
     ✓ TEST 3: Organization A user updates Organization A contact -> SUCCESS 2ms
     ✓ TEST 4: Organization A user updates Organization B contact -> DENIED 1ms
     ✓ TEST 5: Organization A user archives Organization A contact -> SUCCESS 2ms
     ✓ TEST 6: Organization A user archives Organization B contact -> DENIED 1ms
     ✓ TEST 7: Tampered organizationId is supplied -> Ignored / rejected 3ms
     ✓ TEST 8: User without clients.update permission attempts mutation -> DENIED 0ms
     ✓ TEST 9: Unauthenticated request attempts mutation -> DENIED 1ms
     ✓ TEST 10: Existing same-tenant contact workflow remains unchanged -> PASS 5ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

---

## 9. Cross-Tenant Regression Results

1. **Target Isolation**:
   * Attempting to inject `CLIENT_B_ID` into `createContact` resulted in an immediate abort before any `client_contacts` insert query was executed.
   * Attempting to mutate `CONTACT_B_ID` from Tenant A resulted in zero rows modified; execution aborted prior to the `UPDATE` query.
2. **Audit Script Verification**:
   * `npm run audit:authz` was executed:
     ```
     ✓ Every exported server action reaches an authorization guard.
     ✓ Static tenant isolation gate verified: No untrusted client organizationId parameters.
     ```

---

## 10. Existing Security Regression Results

* **Full Unit Test Suite (`npm test`)**:
  * **Test Files:** 56 passed (56 total)
  * **Tests:** 857 passed (857 total)
  * **Duration:** 8.15s
  * No regressions detected in existing auth, organization, client, deliverable, or project workflows.
* **TypeScript Compilation (`npm run typecheck` / `tsc --noEmit`)**:
  * Passed with 0 errors.
* **Code Linting (`npx eslint src/features/clients/real-actions.ts tests/unit/client-contacts-tenant-isolation.test.ts`)**:
  * Passed with 0 errors and 0 warnings.

---

## 11. Remaining Risks & Discovered Child Resource Audit

During the child resource verification audit of other client-related actions, the following items were analyzed:
* **Client Deliverables (`src/features/deliverables/real-actions.ts`)**: Secure. Lines 76–90 query the `clients` table with `eq(clients.organizationId, user.organizationId)` when `data.clientId` is provided.
* **Client Activity Logs (`src/features/clients/real-actions.ts`)**: Secure. Activity queries filter directly by `eq(activityLogs.organizationId, user.organizationId)`.
* **Client Files**: Files are scoped directly to the organization and do not accept untrusted foreign client bindings.

### Concrete Finding Discovered: `NEXOS-SEC-04` (Pending S2)
* **Location:** `src/features/projects/real-actions.ts` (`createProject`)
* **Finding:** `createProject` accepts an optional `clientId` in its payload. While `projects.organizationId` is correctly populated with `user.organizationId`, the action does not check whether the provided `data.clientId` belongs to `user.organizationId`. An attacker in Tenant A can associate their new project with Tenant B's `clientId`.
* **Action Taken:** Per instructions, **this unrelated code was NOT modified in S1**. It has been recorded as finding `NEXOS-SEC-04` for prioritized remediation in a future phase.

---

## 12. Production Impact

* **Production Environment:** **UNTOUCHED**
* **Database Mutations:** 0
* **Deployments:** 0
* **Migrations Executed:** 0
* **Environment Variables Altered:** 0

---

## 13. Staging Impact

* **Staging Environment:** **UNTOUCHED**
* **Database Mutations:** 0
* **Deployments:** 0
* **Migrations Executed:** 0

---

## 14. Git Status

All changes remain strictly local and unstaged. No commits or pushes have been made.

```bash
$ git status
On branch phase-2-production-readiness
Your branch is up to date with 'origin/phase-2-production-readiness'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/features/clients/real-actions.ts
    ...

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/audit/SECURITY-REMEDIATION-S1-NEXOS-SEC-01.md
	tests/unit/client-contacts-tenant-isolation.test.ts
    ...

no changes added to commit (use "git add" and/or "git commit -a")
```

```bash
$ git diff --stat src/features/clients/real-actions.ts
 src/features/clients/real-actions.ts | 73 ++++++++++++++++++++++++++++++++---
 1 file changed, 68 insertions(+), 5 deletions(-)
```

---

## 15. Final Assessment

Remediation Phase S1 is **COMPLETE and CERTIFIED**:
* The root cause of `NEXOS-SEC-01` has been eliminated.
* Minimal safe server-action verification was implemented without database schema alterations.
* Complete tenant isolation for client contacts is verified via unit and regression suites.
* All 857 unit tests, static authorization gates, and TypeScript checks pass without errors.
* Production, staging, Git history, RLS policies, rate-limiting configs, and Next.js dependencies were left completely intact and untouched.

---

# Separately Documented Security Items

### NEXT-SEC-01: Next.js Version Dependency Advisories
* **Advisories:** Known Next.js 16.3.0 security advisories require dependency review (e.g., AVIF image optimization memory corruption/RCE advisory and Windows-hosted RCE advisory affecting versions below 16.3.3).
* **Current Status:** Not upgraded in Phase S1. AI NEX OS is hosted on Linux runtimes, mitigating Windows-specific path vectors, but AVIF handling warrants an upgrade to Next.js `>=16.3.3` in a dedicated dependency review window.
* **Phase S1 Action:** Do not upgrade Next.js in this phase; tracked as separate dependency remediation item `NEXT-SEC-01`.

### NEXOS-SEC-02: RLS Defense-in-Depth on Memberships & Invitations
* **Observation:** Migrations `0016_organization_memberships.sql` and `0017_organization_invitations.sql` do not define explicit Row Level Security (RLS) policies.
* **Current Safeguard:** Direct client access to Supabase is constrained via privilege revocation (`REVOKE ALL ON organization_memberships FROM anon, authenticated`). All access occurs via trusted server actions using the service role / connection pooler.
* **Phase S1 Action:** Do NOT modify `0016` or `0017` or add RLS policies blindly in S1. A separate RLS defense-in-depth architecture review will be scheduled.

### NEXOS-SEC-03: Rate Limiting in Multi-Instance Environments
* **Observation:** `src/lib/security/rate-limit.ts` uses an in-memory token bucket rate limiter. In clustered or serverless deployments, rate limiting state is not synchronized across instances.
* **Phase S1 Action:** Do NOT modify `rate-limit.ts` in S1. Documented for future Redis/Upstash backing in Phase S3.
