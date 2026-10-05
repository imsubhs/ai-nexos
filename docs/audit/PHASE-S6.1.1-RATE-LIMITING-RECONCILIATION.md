# AI NEX OS — Phase S6.1.1: Rate-Limiting Inventory Corrective Reconciliation

**Audit Phase**: S6.1.1 (Corrective Reconciliation)  
**Target Repository**: `AIC NEXOS/ai-nexos`  
**Branch**: `phase-2-production-readiness`  
**Audit Type**: Local / Read-Only Forensic Reconciliation  
**Auditor**: Senior Application Security Engineer (Forensic Review)  
**Date**: September 28, 2026  
**Status**: COMPLETE — READY FOR S6.2 POLICY SPECIFICATION

---

## 1. Executive Summary

### 1.1 Purpose & Scope

This audit performs a corrective forensic reconciliation of [PHASE-S6.1-RATE-LIMITING-INVENTORY.md](file:///Users/subhamsaha/Downloads/My%20Docs%20/WebsiteCreation/NEXOS%20Comb%20/AIC%20NEXOS/ai-nexos/docs/audit/PHASE-S6.1-RATE-LIMITING-INVENTORY.md). The objective of Phase S6.1.1 is **NOT** to design or implement the rate-limiting architecture (which is reserved for Phase S6.2), but to verify, calibrate, and reconcile the forensic inventory so that Phase S6.2 can establish a robust, mathematically and architecturally sound rate-limiting policy.

### 1.2 Environment & Safety Status

All forensic verification activities were executed under strict read-only constraints:

- **Supabase Production Project** (`gsgseacjcalkhhmunjhx`): **PAUSED** (0 connections, 0 queries, 0 mutations).
- **Supabase Staging Project** (`shnzzbbtydmvfhgeoysg`): **PAUSED** (0 connections, 0 queries, 0 mutations).
- **Codebase & Schema**: 0 code modifications, 0 migrations executed, 0 package installations, 0 git commits, 0 git pushes.
- **Verification Media**: Local Next.js build artifacts (`.next/server/server-reference-manifest.json`), TypeScript AST inspection, schema definitions, and static call graph analysis.

### 1.3 Key Forensic Findings Summary

1. **Entry-Point Counts Reconciled**:
   - Total Route Handlers: **5** (4 rate-limited, 1 unlimited health check).
   - Total `"use server"` Modules: **62** (25 wrappers, 23 real implementations, 8 mock modules, 6 standalone modules).
   - Total Exported Server Action Functions: **404** across all 62 modules.
   - Distinct Production Business Actions: **189** (excluding demo-login; 190 including demo-login).
   - S6.1 Catalog Reconciliation: The S6.1 count of 192 actions in `scratch/actions_inventory.json` is reconciled: 171 real actions + 18 standalone actions + 2 query wrapper functions (`notifications/queries.ts`) + 1 demo login (`demoLoginAction`) = **192**.
2. **Dual-Export Server Action Finding: CONFIRMED**:
   - Inspection of `.next/server/server-reference-manifest.json` confirms that Next.js registers **316** server action endpoints across 47 files.
   - Both `features/<slice>/actions.ts` AND `features/<slice>/real-actions.ts` receive distinct, independently callable Action IDs in the compiled build.
   - Wrapping only `actions.ts` does **not** protect `real-actions.ts` from direct invocations by an adversary armed with the compiled Action ID.
3. **Direct PostgREST Claim: CORRECTED**:
   - The Next.js application contains **0** client-side `supabase.from(...)`, `supabase.rpc(...)`, or `supabase.storage(...)` calls. `src/lib/supabase/client.ts` is imported by **0** application files.
   - Direct PostgREST is an external Supabase infrastructure surface governed by PostgreSQL Row Level Security (RLS) and Supabase platform rate limiting, not an application code bypass.
4. **IP Trust Model (`X-Forwarded-For`): PARTIALLY CONFIRMED / TOPOLOGY-DEPENDENT**:
   - `getClientIp` in `src/lib/security/request.ts` parses the forwarded header from right to left using `chain.length - trustedHops`.
   - It is **not** vulnerable to naive leftmost header spoofing. However, security depends directly on deployment topology matching `TRUSTED_PROXY_HOPS` (default: 1).
5. **High-Risk Surfaces: CONFIRMED**:
   - All 6 critical surfaces identified in S6.1 (`createOrganizationAction`, `previewInvitationAction`, `globalSearch`, `getWorkforceReportAction`, `initializeFileUpload`, `inviteMemberAction`) are verified with severe resource/abuse vulnerabilities.
6. **Numeric Limits**:
   - All numeric thresholds cited in S6.1 are formally classified as **PROVISIONAL — REQUIRES S6.2 POLICY DECISION**.

---

## 2. Counting Reconciliation & Methodology

### 2.1 Counting Methodology & Categorization

To eliminate ambiguity, entry points are categorized according to rigorous compiler and architectural definitions:

- **Route Handlers**: Distinct endpoints defined by `route.ts` / `route.tsx` files inside `src/app/`.
- **"use server" Modules**: Distinct source files carrying the top-level directive `"use server"`.
- **Exported Server Functions**: Every named function or const exported from a `"use server"` module. In Next.js App Router, every such export is assigned an internal Action ID and exposed as an HTTP POST endpoint.
- **Wrapper Modules / Actions**: Slice entry points (`features/<slice>/actions.ts`, `queries.ts`) that inspect `isDemoMode()` and dynamically dispatch to real vs. mock modules.
- **Real Implementation Modules / Actions**: Core business logic modules (`features/<slice>/real-actions.ts`, `real-queries.ts`, `real-index.ts`) that interact with Drizzle ORM and Supabase.
- **Mock Modules / Actions**: In-memory demo simulation modules (`mock-actions.ts`, `mock-queries.ts`, `mock-index.ts`).
- **Standalone Modules / Actions**: Specialized server action files not following the wrapper/real/mock split (e.g., `onboarding-actions.ts`, `form-actions.ts`, `search/actions.ts`, `policy-actions.ts`, `demo-login.ts`).
- **Distinct Production Actions**: Independent business operations that execute production logic (Real Exports + Standalone Production Exports).

### 2.2 Reconciled Entry-Point Inventory

```
+-------------------------------------------------------------------------+
| Entry-Point Category                              | Count               |
+-------------------------------------------------------------------------+
| Route Handlers (route.ts)                         | 5                   |
| Total "use server" Modules                        | 62                  |
|   - Wrapper Modules                               | 25                  |
|   - Real Implementation Modules                   | 23                  |
|   - Mock Modules                                  | 8                   |
|   - Standalone Modules                            | 6                   |
| Total Exported Server Action Functions (Compiler) | 404                 |
|   - Wrapper Exports                               | 175                 |
|   - Real Exports                                  | 171                 |
|   - Mock Exports                                  | 41                  |
|   - Standalone Exports                            | 17                  |
| Distinct Production Server Actions                | 189 (190 with demo) |
+-------------------------------------------------------------------------+
```

### 2.3 Reconciliation of S6.1 Inventory Count (192 Actions)

In Phase S6.1, `scratch/actions_inventory.json` cataloged **192** actions across 31 files. The forensic breakdown reconciles the exact mathematical delta:

```
  171 Real Actions (from 23 real-actions.ts / real-queries.ts modules)
+  18 Standalone Production Actions:
      - 6 in src/features/organizations/onboarding-actions.ts
      - 2 in src/features/workforce/attendance/read-model-actions.ts
      - 4 in src/features/workforce/attendance/form-actions.ts
      - 4 in src/features/workforce/corrections/form-actions.ts
      - 1 in src/features/search/actions.ts
      - 1 in src/features/workforce/shared/policy-actions.ts
+   2 Query Actions from src/features/notifications/queries.ts (re-exporting real-queries.ts)
+   1 Demo Action (demoLoginAction in src/features/auth/actions/demo-login.ts)
-------------------------------------------------------------------------
= 192 Actions Cataloged in Phase S6.1
```

### 2.4 Authentication, Authorization & Rate-Limiting Tally

| Metric                                      | Server Actions                                        | Route Handlers                                   | Total |
| :------------------------------------------ | :---------------------------------------------------- | :----------------------------------------------- | :---- |
| **Total Callable Production Endpoints**     | 189 (+1 demo)                                         | 5                                                | 195   |
| **Anonymous (Unauthenticated)**             | 2 (`previewInvitationAction`, `demoLoginAction`)      | 4 (`health`, `verify`, `session`, `callback`)    | 6     |
| **Authenticated (Session Required)**        | 188                                                   | 1 (`portal/dashboard`)                           | 189   |
| **Authorization Enforced (RBAC/Ownership)** | 186                                                   | 1 (`portal/dashboard`)                           | 187   |
| **Authorization Bypassed / Absent**         | 3 (`previewInvitation`, `demoLogin`, `createOrg`*)    | 4 (`health`, `verify`, `session`, `callback`)    | 7     |
| **Rate-Limited**                            | 2 (`signInWithPasswordAction`, `sendMagicLinkAction`) | 4 (`callback`, `verify`, `session`, `dashboard`) | 6     |
| **Rate-Unlimited**                          | 187                                                   | 1 (`api/health`)                                 | 188   |

_\*Note: `createOrganizationAction` requires authentication, but allows unbounded creation of new organizations without requiring prior organization-level RBAC._

---

## 3. Authorization vs Rate Limiting Terminology

### 3.1 Terminology Correction

Phase S6.1 occasionally utilized the colloquial shorthand _"unprotected action"_ to refer to an endpoint lacking a rate limiter. This conflates **Authorization** with **Rate Limiting**.

An endpoint can have strict, flaw-free authentication and authorization (e.g., verifying multi-tenant membership and requiring `files:upload` permission) while being entirely **unbounded** in call frequency, allowing an authenticated attacker to exhaust system memory, connection pools, or storage budgets.

Henceforth, AI NEX OS audits must evaluate endpoints across three **orthogonal dimensions**:

```
+------------------------------------------------------------------------------------+
| 1. Authorization Dimension                                                         |
|    - Protected:   Caller session authenticated; RBAC/ownership enforced.          |
|    - Unprotected: Callable anonymously without session or credential.             |
+------------------------------------------------------------------------------------+
| 2. Rate-Limiting Dimension                                                         |
|    - Limited:     Guarded by sliding-window rate limiter (Redis / MemoryStore).    |
|    - Unlimited:   Zero call-frequency restriction enforced by application code.    |
+------------------------------------------------------------------------------------+
| 3. Resource Control Dimension                                                      |
|    - Bounded:     Input strings, arrays, pagination, and payloads strictly capped. |
|    - Unbounded:   Missing length checks, unbounded arrays, unclamped pagination.   |
+------------------------------------------------------------------------------------+
```

### 3.2 Corrected Posture Matrix

```
                          RATE-LIMITED             RATE-UNLIMITED
                     +-----------------------+-----------------------+
   AUTHORIZATION-    | signInWithPassword    | 186 Production Actions|
     PROTECTED       | sendMagicLink         | (e.g., createTask,    |
                     | portal/dashboard      |  initializeFileUpload,|
                     |                       |  getWorkforceReport)  |
                     +-----------------------+-----------------------+
   AUTHORIZATION-    | auth/callback         | previewInvitation     |
    UNPROTECTED      | approvals/verify      | api/health            |
                     | portal/auth/session   |                       |
                     +-----------------------+-----------------------+
```

---

## 4. Server Action Dual-Export Verification

### 4.1 Investigation & Manifest Inspection

In Phase S6.1, a finding was raised that the dual presence of `"use server"` in both `features/<slice>/actions.ts` and `features/<slice>/real-actions.ts` causes Next.js to compile separate, independently reachable Server Action IDs for both files.

To verify this without contacting remote servers, we examined the local compiled Next.js build artifact:
[server-reference-manifest.json](file:///Users/subhamsaha/Downloads/My%20Docs%20/WebsiteCreation/NEXOS%20Comb%20/AIC%20NEXOS/ai-nexos/.next/server/server-reference-manifest.json).

### 4.2 Forensic Proof from Build Artifact

The manifest contains **316** active action registrations across **47** files. Both wrapper and implementation modules are independently registered:

```json
// From .next/server/server-reference-manifest.json:

// 1. Wrapper Action Entry:
"7fc181b519fa...": {
  "filename": "src/features/approvals/actions.ts",
  "exportedName": "createApprovalCycle"
}

// 2. Real Implementation Entry:
"402aec70b241...": {
  "filename": "src/features/approvals/real-actions.ts",
  "exportedName": "createApprovalCycle"
}

// 3. Mock Implementation Entry:
"000b21a81156...": {
  "filename": "src/features/organizations/mock-actions.ts",
  "exportedName": "createOrganization"
}
```

### 4.3 Security Impact & Exploit Path

- **Vulnerability Mechanism**: In Next.js App Router, clients invoke server actions by sending an HTTP POST request carrying the header `Next-Action: <ActionId>`.
- If a security control (such as rate limiting, request validation, or CAPTCHA) is applied **only** inside `src/features/approvals/actions.ts`, an attacker who inspects the client JavaScript bundle or brute-forces the Action ID can send a POST request targeting `402aec70b241...` (`real-actions.ts`).
- Next.js will route the request directly to the implementation function inside `real-actions.ts`, completely circumventing the wrapper logic in `actions.ts`.

### 4.4 Affected Modules

This vulnerability affects **all 22 slices** that utilize wrapper + real module pairs:

1. `src/features/approvals/` (`actions.ts` & `real-actions.ts`)
2. `src/features/auth/` (`actions.ts` & `real-actions.ts`)
3. `src/features/calendar/` (`actions.ts` & `real-actions.ts`)
4. `src/features/clients/` (`actions.ts` & `real-actions.ts`)
5. `src/features/deliverables/` (`actions.ts` & `real-actions.ts`)
6. `src/features/files/` (`actions.ts` & `real-actions.ts`)
7. `src/features/meetings/` (`actions.ts` & `real-actions.ts`)
8. `src/features/meetings/` (`queries.ts` & `real-queries.ts`)
9. `src/features/notifications/` (`actions.ts` & `real-actions.ts`)
10. `src/features/organizations/` (`actions.ts` & `real-actions.ts`)
11. `src/features/organizations/departments/` (`actions.ts` & `real-actions.ts`)
12. `src/features/projects/` (`actions.ts` & `real-actions.ts`)
13. `src/features/revisions/` (`actions.ts` & `real-actions.ts`)
14. `src/features/shares/actions/` (`index.ts` & `real-index.ts`)
15. `src/features/tasks/` (`actions.ts` & `real-actions.ts`)
16. `src/features/timelines/` (`actions.ts` & `real-actions.ts`)
17. `src/features/users/` (`actions.ts` & `real-actions.ts`)
18. `src/features/users/admin/` (`actions.ts` & `real-actions.ts`)
19. `src/features/workforce/attendance/` (`actions.ts` & `real-actions.ts`)
20. `src/features/workforce/corrections/` (`actions.ts` & `real-actions.ts`)
21. `src/features/workforce/employees/` (`actions.ts` & `real-actions.ts`)
22. `src/lib/agents/` & `src/lib/automation/` (`actions.ts` & `real-actions.ts`)

### 4.5 Final Classification

**CONFIRMED**.  
_Architectural Mandate for S6.2_: Rate limiting must be implemented at the shared execution layer (e.g., inside the service layer or via a unified higher-order wrapper) or the dual `"use server"` directive must be removed from `real-actions.ts`.

---

## 5. Direct PostgREST Surface Analysis

### 5.1 Static Analysis of Client-Side Supabase Calls

A complete static search was performed across all TypeScript source files in `src/`:

- `supabase.from(...)`: **0 occurrences**.
- `supabase.rpc(...)`: **0 occurrences**.
- `supabase.storage...`: **0 occurrences**.
- `supabase.auth...`: **5 occurrences** (all strictly server-side: `src/proxy.ts`, `src/app/auth/callback/route.ts`, `src/features/auth/membership-service.ts`, `src/features/auth/real-actions.ts`, `src/features/auth/current-user.ts`).
- `createBrowserClient` (`src/lib/supabase/client.ts`): Imported by **0** application files.

All application database operations are executed via server-side Drizzle ORM (`@/db`).

### 5.2 Correcting the S6.1 PostgREST Claim

Phase S6.1 claimed that direct PostgREST calls represent an unrate-limited application bypass. This claim is **CORRECTED**:

```
+---------------------------------------------------------------------------------+
| ARCHITECTURAL REALITY OF SUPABASE POSTGREST                                     |
+---------------------------------------------------------------------------------+
| 1. The web application does NOT make direct browser PostgREST queries.          |
| 2. PostgREST is an external HTTP API exposed by Supabase cloud infrastructure    |
|    at `https://<project-ref>.supabase.co/rest/v1/`.                             |
| 3. If an adversary issues direct PostgREST HTTP requests using the public anon  |
|    key, the request hits Kong / Cloudflare / Supabase, NOT the Next.js server.  |
| 4. Security Boundary: Postgres Row Level Security (RLS) policies.              |
|    (RLS was comprehensively audited and hardened in Phase S5 / S5.1 / S5.2).    |
| 5. Next.js application rate limiters (src/lib/security/rate-limit.ts) have zero |
|    jurisdiction over external Supabase infrastructure endpoints.                |
+---------------------------------------------------------------------------------+
```

### 5.3 Classification: DIRECT DATA API SURFACE

- **Table / Function**: Public Supabase PostgREST endpoints.
- **Role**: `anon` (unauthenticated) or `authenticated` (valid Supabase JWT).
- **RLS Dependency**: Complete (RLS is the sole barrier against unauthorized data read/write).
- **Application Rate Limiter**: None (handled by Supabase API gateway / Kong).
- **Resource Risk**: Supabase connection pool exhaustion if high-concurrency PostgREST requests bypass Cloudflare/Kong throttling.

---

## 6. Current Rate-Limit Implementation Verification

### 6.1 Architecture of `src/lib/security/rate-limit.ts`

The existing rate-limiting system implements a **weighted sliding window** algorithm. For any request arriving at instant $t$ within window $[W_{start}, W_{start} + W_{size}]$, the effective request count is computed as:

$$ ext{effectiveCount} = C_{	ext{current}} + C_{	ext{previous}} 	imes \max\left(0, 1 - rac{t - W_{start}}{W_{size}}
ight)$$

### 6.2 Current Rate-Limit Policy Matrix

| Policy Key | Policy Name | Limit | Window | Store | Fail-Open? | Scope | Tenant-Aware? | Call Site / Consumer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `loginByIp` | `login:ip` | 10 | 300s | Redis / Mem | Yes | IP | No | `signInWithPasswordAction` |
| `loginByAccount` | `login:account` | 5 | 900s | Redis / Mem | Yes | Account | No | `signInWithPasswordAction` |
| `magicLinkByAccount` | `magiclink:account` | 3 | 900s | Redis / Mem | Yes | Account | No | `sendMagicLinkAction` |
| `magicLinkByIp` | `magiclink:ip` | 10 | 900s | Redis / Mem | Yes | IP | No | `sendMagicLinkAction` |
| `authCallbackByIp` | `authcallback:ip` | 30 | 300s | Redis / Mem | Yes | IP | No | `src/app/auth/callback/route.ts` |
| `approvalVerifyByIp` | `approval:verify:ip` | 20 | 300s | Redis / Mem | Yes | IP | No | `src/app/api/approvals/verify/route.ts` |
| `portalSessionByIp` | `portal:session:ip` | 20 | 300s | Redis / Mem | Yes | IP | No | `src/app/api/v1/portal/auth/session/route.ts` |
| `portalReadBySession` | `portal:read:session`| 120 | 60s | Redis / Mem | Yes | Session | No | `src/app/api/v1/portal/dashboard/route.ts` |
| `sharePasswordBySession` | `share:password:session` | 5 | 900s | Redis / Mem | Yes | Session | No | `verifySharePassword` in `shares/utils/security.ts` |

### 6.3 Redis Store vs. In-Memory Fallback Evaluation
* **RedisStore**: Employs an atomic pipeline with `INCR` and `EXPIRE` (TTL set to $2 	imes 	ext{window}$). Required for distributed cluster deployments.
* **MemoryStore**: Process-local LRU map bounded at 20,000 entries.
* **Fail-Open Policy**: If Redis is unreachable, `consumeRateLimit` catches the error, logs `ratelimit.store_failed`, and degrades to `memoryStore` rather than dropping legitimate traffic.
* **Redis Configuration Status**:
  * **Development / Test**: Optional (uses in-memory store cleanly).
  * **Production**: **Required for safety**. Behind multiple Next.js server instances or serverless containers, process memory is isolated; an attacker spraying requests across $N$ instances receives $N 	imes 	ext{limit}$ attempts.

---

## 7. IP Trust Model & Topology Dependency

### 7.1 Algorithm in `src/lib/security/request.ts`
The client IP extraction logic in [request.ts](file:///Users/subhamsaha/Downloads/My%20Docs%20/WebsiteCreation/NEXOS%20Comb%20/AIC%20NEXOS/ai-nexos/src/lib/security/request.ts#L54-L75) operates as follows:

```typescript
function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  const parsed = raw === undefined || raw === "" ? 1 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (chain.length > 0) {
      const hops = trustedProxyHops();
      const index = Math.max(0, chain.length - Math.max(1, hops));
      const candidate = chain[index];
      if (candidate) return normaliseIp(candidate);
    }
  }
  const real = headers.get("x-real-ip");
  if (real) return normaliseIp(real);
  return UNKNOWN_CLIENT_IP;
}
```

### 7.2 Forensic Assessment of Header Spoofing
* **S6.1 Claim**: S6.1 claimed that `getClientIp` is vulnerable to spoofing.
* **Forensic Verification**:
  1. Standard reverse proxies (Vercel, Cloudflare, AWS ALB) append the connecting client IP to the **right-hand end** of `X-Forwarded-For`.
  2. If an adversary sends `X-Forwarded-For: 1.1.1.1` from real IP `203.0.113.195`, the proxy forwards `1.1.1.1, 203.0.113.195`.
  3. With `TRUSTED_PROXY_HOPS=1`, `index = 2 - 1 = 1`, which evaluates to `203.0.113.195`. The spoofed IP `1.1.1.1` is **ignored**.
  4. However, if the deployment topology involves 2 reverse proxies (e.g. Cloudflare -> AWS ALB -> Next.js) and `TRUSTED_PROXY_HOPS` remains 1, Next.js extracts Cloudflare's IP instead of the client's.
  5. If the application is deployed directly to the public internet with no proxy (`hops=0`), an attacker can spoof the single entry in the list.
* **Classification**: **PARTIALLY CONFIRMED / TOPOLOGY-DEPENDENT**.
  The code is sound against spoofing provided that `TRUSTED_PROXY_HOPS` is accurately configured to match the production proxy architecture.

---

## 8. High-Risk Surface Verification

Six core operations were subjected to independent static analysis:

```
+-------------------------------------------------------------------------------------------------------+
| 1. createOrganizationAction (src/features/organizations/onboarding-actions.ts)                        |
+-------------------------------------------------------------------------------------------------------+
| Authentication:      Required (getCurrentIdentity() resolves session authUserId).                     |
| Authorization:       None (caller does not need existing org membership; creates new org).           |
| Rate Limiting:       NONE (unlimited calls permitted).                                                |
| Resource Limits:     Zod schema lacks max length bounds on organizationName.                          |
| DB Query Behavior:   Executes slug uniqueness query, code prefix query, and multi-step transaction:   |
|                      inserts organizations, seeds 5 system roles, inserts user, inserts membership.   |
| External Impact:     None directly; heavy Postgres table bloat and sequence consumption.              |
| Tenant Scope:        Cross-tenant (spawns new tenant workspaces).                                     |
| Abuse Scenario:      Authenticated attacker loops 1,000 times, creating 1,000 orgs and 5,000 roles,   |
|                      exhausting database storage and connection pool.                                 |
| Severity:            HIGH                                                                             |
+-------------------------------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------------------------------+
| 2. previewInvitationAction (src/features/organizations/onboarding-actions.ts)                         |
+-------------------------------------------------------------------------------------------------------+
| Authentication:      NONE (unauthenticated, public callable server action).                           |
| Authorization:       NONE.                                                                            |
| Rate Limiting:       NONE (unlimited calls permitted).                                                |
| Resource Limits:     rawToken validated as string.                                                   |
| DB Query Behavior:   Computes SHA-256 hash, executes 3-table INNER JOIN across organization_           |
|                      invitations, organizations, and roles.                                           |
| External Impact:     Reveals target email, organization name, slug, role name, and role key.          |
| Tenant Scope:        Global / Unauthenticated.                                                        |
| Abuse Scenario:      Anonymous token brute-forcing / enumeration and CPU/database denial-of-service.  |
| Severity:            HIGH                                                                             |
+-------------------------------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------------------------------+
| 3. globalSearch (src/features/search/actions.ts)                                                      |
+-------------------------------------------------------------------------------------------------------+
| Authentication:      Required (session resolved per sub-action).                                      |
| Authorization:       Sub-actions catch permission errors via tolerate().                              |
| Rate Limiting:       NONE.                                                                            |
| Resource Limits:     Term has query.length >= 2, but NO MAXIMUM LENGTH check.                         |
| DB Query Behavior:   Executes 6 PARALLEL database queries using ILIKE '%query%' pattern matching      |
|                      across projects, clients, employees, deliverables, files, and tasks.             |
| External Impact:     Severe PostgreSQL CPU saturation due to unindexed full-table substring scans.    |
| Tenant Scope:        Current tenant.                                                                  |
| Abuse Scenario:      Rapid automated keystroke simulation (e.g., 50 req/sec) triggers 300 concurrent  |
|                      wildcard database queries, locking the connection pool.                          |
| Severity:            HIGH                                                                             |
+-------------------------------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------------------------------+
| 4. getWorkforceReportAction (src/features/workforce/attendance/read-model-actions.ts)                 |
+-------------------------------------------------------------------------------------------------------+
| Authentication:      Required (requireCurrentUser()).                                                 |
| Authorization:       Required (requirePermission("attendance", "view_team")).                         |
| Rate Limiting:       NONE.                                                                            |
| Resource Limits:     ALL_ROWS_PAGE_SIZE = 10_000. Fetches up to 10k rows and filters in Node memory.  |
| DB Query Behavior:   Full scan of attendance rows for the organization up to 10,000 records.          |
| External Impact:     Node.js V8 heap spike, garbage collection pauses, DB egress bandwidth burn.      |
| Tenant Scope:        Current tenant.                                                                  |
| Abuse Scenario:      Repeated requests over wide date ranges induce high memory consumption and       |
|                      potential container OOM termination.                                             |
| Severity:            HIGH                                                                             |
+-------------------------------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------------------------------+
| 5. initializeFileUpload (src/features/files/real-actions.ts)                                          |
+-------------------------------------------------------------------------------------------------------+
| Authentication:      Required (requireCurrentUser()).                                                 |
| Authorization:       Required (requirePermission("files", "upload")).                                 |
| Rate Limiting:       NONE.                                                                            |
| Resource Limits:     10GB max size per file, 500GB org quota, but NO FREQUENCY LIMIT.                 |
| DB Query Behavior:   Runs SELECT SUM(total_size_bytes) aggregation across all files in organization;  |
|                      inserts files record, file_versions record, updates version ID, writes audit.    |
| External Impact:     Calls storageService.createPreSignedUploadUrl (external S3 / storage provider).  |
| Tenant Scope:        Current tenant / project.                                                        |
| Abuse Scenario:      Attacker scripts rapid creation of 10,000 upload sessions without uploading,    |
|                      minting 10k presigned URLs, creating 10k database rows, and burning storage APIs.|
| Severity:            HIGH                                                                             |
+-------------------------------------------------------------------------------------------------------+

+-------------------------------------------------------------------------------------------------------+
| 6. inviteMemberAction (src/features/organizations/onboarding-actions.ts)                              |
+-------------------------------------------------------------------------------------------------------+
| Authentication:      Required (requireCurrentUser()).                                                 |
| Authorization:       Required (requirePermission("users", "create")).                                 |
| Rate Limiting:       NONE.                                                                            |
| Resource Limits:     Validates email format via Zod.                                                  |
| DB Query Behavior:   Validates role belonging to org, generates crypto token, inserts row into        |
|                      organization_invitations.                                                        |
| External Impact:     Outbound email dispatch vector (in future mail integration) and table bloat.     |
| Tenant Scope:        Current tenant.                                                                  |
| Abuse Scenario:      Admin user loops 5,000 email addresses, generating spam invitations and database |
|                      bloat.                                                                           |
| Severity:            MEDIUM                                                                           |
+-------------------------------------------------------------------------------------------------------+
```

---

## 9. Resource-Limit Verification

| Resource Control | Verified State in Codebase | Finding Classification |
| :--- | :--- | :--- |
| **A. String Max Lengths** | 69+ Zod string fields lack `.max()` constraints (e.g. `companyName`, `notes`, `address`, `search`). | **CONFIRMED** |
| **B. Array Lengths** | Arrays in schemas (`tags`, `conditions`, `filesToOverwrite`) have no `.max()` bounds. | **CONFIRMED** |
| **C. JSONB Bounds** | Route handlers enforce 100KB via `parseJsonBody`, but Server Actions bypass it completely. | **CONFIRMED** |
| **D. Pagination Limits** | Query parameters such as `getTaskComments(taskId, limit)` pass `limit` directly to SQL `.limit(limit)` without `Math.min(limit, MAX)` clamping. | **CONFIRMED** |
| **E. Upload Size Limits** | Capped at 10GB per file (`MAX_UPLOAD_BYTES`) and 500GB per org. | **CONFIRMED** (Bounded) |
| **F. Upload Frequency** | 0 rate limiting on upload initialization calls. | **CONFIRMED** (Unbounded) |
| **G. Report Query Limits** | Attendance report loads up to 10,000 rows into Node memory (`ALL_ROWS_PAGE_SIZE = 10_000`) and filters via JS `.filter()`. | **CONFIRMED** |
| **H. Search Query Cost** | `globalSearch` runs 6 concurrent `ILIKE` wildcard database queries without debounce or rate limit. | **CONFIRMED** |
| **I. Payload Limits** | Server Action body size limit unconfigured in `next.config.ts`, defaulting to Next.js 1MB. | **CONFIRMED** |

---

## 10. Numeric-Limit Status

The numeric thresholds referenced in Phase S6.1 are designated as:

$$\mathbf{PROVISIONAL	ext{ }—	ext{ }REQUIRES	ext{ }S6.2	ext{ }POLICY	ext{ }DECISION}$$

| Proposed Action / Route | S6.1 Example Number | Reconciled Status | S6.2 Required Evaluation Factors |
| :--- | :--- | :--- | :--- |
| `createOrganizationAction` | 5 / 24h | **Provisional** | Legitimate agency multi-org onboarding vs. bot sybil resistance. |
| `previewInvitationAction` | 20 / 15m (per IP) | **Provisional** | Public onboarding UX vs. automated token search space exhaustion. |
| `globalSearch` | 30 / 1m | **Provisional** | Typeahead UX latency vs. PostgreSQL connection pool capacity. |
| `getWorkforceReportAction` | 10 / 1m | **Provisional** | Executive reporting workflows vs. heap footprint. |
| `initializeFileUpload` | 50 / 10m | **Provisional** | Bulk creative asset uploads (video/raw assets) vs. presigned URL exhaustion. |
| `inviteMemberAction` | 30 / 1h | **Provisional** | Initial agency team setup vs. email reputation / outbound quotas. |

---

## 11. Test Coverage Audit

### 11.1 Current Test Suite Status
Current unit test coverage resides exclusively in [tests/unit/rate-limit.test.ts](file:///Users/subhamsaha/Downloads/My%20Docs%20/WebsiteCreation/NEXOS%20Comb%20/AIC%20NEXOS/ai-nexos/tests/unit/rate-limit.test.ts).
* **Covered**:
  * Basic single-process `MemoryStore` sliding-window increment and refusal.
  * Separate budget partitioning per identifier and policy.
  * Sliding-window boundary weighting (preventing $2	imes$ burst across boundaries).
  * Mock Redis client pipeline execution (`INCR` + `EXPIRE`).
  * In-memory fallback degradation upon simulated Redis failure.
* **Uncovered / Missing (Mandated for Phase S6.3)**:
  * Zero tests verifying Server Action rate-limiting integration.
  * Zero tests verifying Route Handler rate-limiting integration.
  * Zero tests evaluating distributed multi-node Redis behavior.
  * Zero tests validating IP trust / proxy hop extraction (`getClientIp` spoofing).
  * Zero tests evaluating anonymous abuse defense (`previewInvitationAction`).
  * Zero tests evaluating tenant-partitioned rate limits (`organizationId` isolation).

---

## 12. Finding Reconciliation Matrix

| # | Finding Topic | S6.1 Claim | Verification Status | Final Classification | S6.2 Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Organization Creation | Unprotected action creating database bloat. | Auth required; org-level RBAC absent; rate limit absent; multi-step DB transaction. | **CONFIRMED** | Must establish per-user daily org creation rate limit. |
| **2** | Invitation Preview | Unprotected token guessing surface. | Anonymous; 3-table join query; exposes metadata; zero rate limit. | **CONFIRMED** | Must enforce strict per-IP rate limit. |
| **3** | Global Search | Heavy unbounded query. | Auth required; 6 parallel `ILIKE` queries; string max length missing; zero rate limit. | **CONFIRMED** | Must add string length cap and per-user typeahead rate limit. |
| **4** | Workforce Report | Heavy in-memory query. | Auth required; fetches 10,000 rows into heap; zero rate limit. | **CONFIRMED** | Must clamp date range and enforce report rate limit. |
| **5** | Upload Initialization | Unbounded presigned URL generation. | Auth required; `SUM()` table aggregation; presigned URL generation; zero rate limit. | **CONFIRMED** | Must enforce per-user upload rate limit. |
| **6** | Invitation Issuance | Unbounded email sending. | Auth required (`users:create`); inserts invitation row; zero rate limit. | **CONFIRMED** | Must establish tenant-level invitation rate limit. |
| **7** | Redis Optional | Optional in development. | Correct; `MemoryStore` used when `REDIS_URL` unset. Warns in production. | **CONFIRMED** | Architecture must treat Redis as production-mandatory. |
| **8** | Memory Fallback | Degrades to memory on error. | Correct; catches Redis errors and falls back to local `MemoryStore`. | **CONFIRMED** | Maintain fail-open resiliency with security alerting. |
| **9** | Dual Server-Action Export | Both `actions.ts` and `real-actions.ts` callable. | Next.js build manifest confirms 316 distinct action IDs registered across 47 files. | **CONFIRMED** | Rate limiter must be placed in service layer or wrap all IDs. |
| **10** | Direct PostgREST | PostgREST bypasses rate limits. | Web app has 0 client PostgREST calls; PostgREST is external infrastructure protected by RLS. | **CORRECTED** | PostgREST is out of Next.js scope; governed by Supabase RLS. |
| **11** | X-Forwarded-For | Vulnerable to IP spoofing. | Right-to-left parsing `chain.length - hops` blocks spoofing if `TRUSTED_PROXY_HOPS` matches topology. | **PARTIALLY CONFIRMED** | Must document and verify edge reverse proxy hops. |
| **12** | Missing String Limits | Many Zod schemas allow arbitrary strings. | 69+ Zod string fields lack `.max()` constraints. | **CONFIRMED** | S6.2 must require schema-level `.max()` enforcement. |
| **13** | Unbounded Arrays/JSONB | Unbounded input sizes. | Arrays (`tags`, `conditions`) have no length caps; Server Actions take up to 1MB. | **CONFIRMED** | S6.2 must enforce array size bounds. |
| **14** | Pagination Limits | Unclamped `limit` in queries. | `limit` parameters passed directly to SQL without clamping. | **CONFIRMED** | Enforce global clamping (`Math.min(limit, 100)`). |
| **15** | Server-Action Body Limits | Default 1MB limit. | `bodySizeLimit` unconfigured in `next.config.ts`. | **CONFIRMED** | Evaluate configuring explicit `serverActions.bodySizeLimit`. |

---

## 13. S6.2 Inputs & Architectural Gates

Phase S6.2 must adhere to the following verified architectural requirements:

1. **Gate 1: Architectural Placement of Rate Limiting**:
   Because Next.js compiles distinct Action IDs for both `actions.ts` and `real-actions.ts`, rate-limiting checks must **not** be placed solely inside `features/<slice>/actions.ts`. Rate-limiting guards must reside either:
   * Inside the underlying service layer (e.g. `organization-service.ts`, `file-service.ts`), OR
   * Wrapped around all callable entry points via a shared higher-order utility (`withRateLimit`), OR
   * The `"use server"` directive must be removed from `real-actions.ts` (requiring build verification).
2. **Gate 2: Multi-Dimensional Key Derivation**:
   Rate-limit keys must incorporate tenant isolation:
   $$	ext{key} = 	ext{policyName} + ":" + 	ext{organizationId} + ":" + 	ext{userId}$$
   Anonymous endpoints must key on validated client IP:
   $$	ext{key} = 	ext{policyName} + ":" + 	ext{clientIp}$$
3. **Gate 3: Standardized Rate-Limit Response Protocol**:
   Server actions that exceed rate limits must return a structured response:
   ```typescript
   { success: false, error: "RATE_LIMITED", retryAfterSeconds: number }
   ```
   Route handlers must return HTTP 429 with standard headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`).
4. **Gate 4: Production Redis Mandate**:
   Multi-instance production deployments must enforce Redis connectivity; single-process fallback must trigger high-severity alerts.

---

## 14. Safety Verification

```
+-------------------------------------------------------------------------+
| Local & Cloud Safety Invariants                                         |
+-------------------------------------------------------------------------+
| Supabase Production (gsgseacjcalkhhmunjhx):    PAUSED                   |
| Supabase Staging (shnzzbbtydmvfhgeoysg):       PAUSED                   |
| Remote Supabase Connections Established:       0                        |
| Database Queries Executed Against Supabase:    0                        |
| Database Mutations Executed:                   0                        |
| Migrations Applied:                            0                        |
| Code Files Modified:                           0                        |
| Packages Installed:                            0                        |
| Git Commits Created:                           0                        |
| Git Pushes Attempted:                          0                        |
+-------------------------------------------------------------------------+
```

---

## 15. Final Decision

All S6.1 inventory findings have been forensically re-enumerated, calibrated, and reconciled. The dual-export compiler phenomenon is confirmed via build manifests, PostgREST boundaries have been accurately scoped, the IP trust model has been mathematically characterized, and all critical attack surfaces have been cataloged with precise risk metrics.

$$\mathbf{S6.1.1	ext{ }RECONCILIATION	ext{ }PASSED	ext{ }—	ext{ }READY	ext{ }FOR	ext{ }S6.2}$$

---
*End of Phase S6.1.1 Reconciliation Report.*
$$
