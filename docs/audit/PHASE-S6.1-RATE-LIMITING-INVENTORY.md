# AI NEX OS — PHASE S6.1 FORENSIC RATE-LIMITING & ABUSE-PROTECTION INVENTORY

**Author**: Senior Application Security Engineer  
**Date**: September 28, 2026  
**Repository**: `AIC NEXOS/ai-nexos`  
**Branch**: `phase-2-production-readiness`  
**Audit Phase**: S6.1 (Local / Read-Only Forensic Inventory)  
**Security Posture**: Read-Only / Zero Modifications / Zero Network Calls  
**Environment State**: Production & Staging Supabase Projects PAUSED

---

## 1. Executive Summary

This forensic inventory provides an exhaustive, code-level analysis of the attack surface, rate limiting posture, resource consumption vectors, and abuse potential of the **AI NEX OS** enterprise multi-tenant platform.

The audit evaluated all **Route Handlers**, **Server Actions**, **Database Mutations**, **Storage Operations**, and **External Integrations** against OWASP Top 10 API Security Risks (specifically **API4: Unrestricted Resource Consumption**, **API6: Unrestricted Access to Sensitive Business Flows**, and **API2: Broken Authentication**).

### Primary Forensic Findings

1. **Critical Coverage Asymmetry**:
   - **Route Handlers**: 5 Route Handlers exist in the codebase. 3 routes (`auth/callback`, `approvals/verify`, `portal/auth/session` POST, plus `portal/dashboard`) have rate limiting applied. 2 route handlers (`portal/auth/session` DELETE and `api/health`) have **zero** rate limiting.
   - **Server Actions**: Out of **192 distinct production server actions** across 31 backend modules (and 404 total exported functions across wrapper, mock, and real files), **ONLY 2 actions** (`signInWithPassword` and `signInWithMagicLink` in `src/features/auth/real-actions.ts`) enforce rate limiting. **190 server actions are completely unthrottled**.
2. **High-Impact Abuse Vectors Discovered**:
   - **Unbounded Organization Workspace Creation (`createOrganizationAction`)**: Any authenticated user can repeatedly create unlimited organizations. Each creation triggers a multi-table database transaction inserting the organization, 5 custom system roles, owner membership, and sequence counters.
   - **Public Invitation Token Probing (`previewInvitationAction`)**: Unauthenticated, public endpoint accessible at `/invite/[token]`. While raw tokens possess 256 bits of entropy, the endpoint has zero IP rate limiting, permitting automated database query hammering and token validity enumeration.
   - **Unbounded Team Member Invitations (`inviteMemberAction`)**: Any user with `users:create` can mint thousands of invitations without cooldown or volume constraints.
   - **Global Search Multi-Query Starvation (`globalSearch`)**: A single call fires 6 concurrent, un-indexed `ILIKE '%term%'` queries across 6 core tables (`projects`, `clients`, `users`, `deliverables`, `files`, `tasks`). Unthrottled calls from fast typing or malicious scripts will rapidly exhaust Postgres connection poolers and CPU.
   - **Workforce Report Memory Exhaustion (`getWorkforceReportAction`)**: Unbounded read query that pulls up to 10,000 attendance records across an organization into Node.js process memory for in-memory date range filtering.
   - **Unbounded Upload Pre-signed URL Minting (`initializeFileUpload`)**: Validates file size (10 GB) and organization quota (500 GB), but enforces **zero frequency throttling**. An attacker can mint thousands of signed upload URLs and file version records.
   - **Distributed Multi-Instance Multiplier**: `REDIS_URL` is optional. When unconfigured (or during Redis failure), the platform degrades to an in-process `MemoryStore`. In multi-instance or serverless deployments, rate-limit budgets are multiplied by the number of active node instances ($N \times \text{limit}$).
   - **Dual Server Action Export Bypass**: Both `actions.ts` and `real-actions.ts` declare `"use server"`. Next.js generates distinct action IDs for both files, allowing callers to directly invoke `real-actions.ts` endpoints.

---

## 2. Scope & Methodology

### 2.1 Target Repository & Constraints

- **Target Repository**: `AIC NEXOS/ai-nexos`
- **Branch**: `phase-2-production-readiness`
- **Execution Mode**: Local read-only static code analysis and AST/identifier call-graph inspection.
- **Strict Prohibition Adherence**:
  - Supabase Production (`gsgseacjcalkhhmunjhx`) remained **PAUSED**.
  - Supabase Staging (`shnzzbbtydmvfhgeoysg`) remained **PAUSED**.
  - Network requests to Supabase or external APIs: **0**.
  - Database migrations, schema changes, DDL, DML: **0**.
  - Source code modifications: **0**.
  - Package installations: **0**.
  - Git commits or pushes: **0**.

### 2.2 Forensic Inspection Checklist

The investigation systematically analyzed:

1. Server entry points (Route Handlers, Server Actions, Supabase RPC/Auth, External APIs).
2. Authentication and account recovery abuse surfaces.
3. Invitation, onboarding, and multi-tenant isolation lifecycle.
4. Project, task, timeline, meeting, deliverable, and workforce execution pipelines.
5. Storage, folder, and file upload systems.
6. Email and third-party cost surfaces.
7. Next.js App Router proxy/middleware behaviors (`src/proxy.ts`).
8. Existing rate limiter mechanics (`src/lib/security/rate-limit.ts`).
9. Multi-instance and distributed state failure models.
10. Payload bounds, array limits, string lengths, and pagination caps.
11. Bypass vectors and sensitive business flow controls.

---

## 3. Server Entry Points Inventory

### 3.1 Next.js Route Handlers

The application defines exactly **5 Route Handlers** in `src/app`:

| Route Path                    | HTTP Methods | Auth Type                | Rate Limiting Policy                              | Enforcement Location                             |
| ----------------------------- | ------------ | ------------------------ | ------------------------------------------------- | ------------------------------------------------ |
| `/auth/callback`              | `GET`        | Anonymous / OTP / Code   | `RATE_LIMITS.authCallbackByIp` (30 req / 300s)    | `src/app/auth/callback/route.ts:56`              |
| `/api/approvals/verify`       | `POST`       | Anonymous / Bearer Token | `RATE_LIMITS.approvalVerifyByIp` (20 req / 300s)  | `src/app/api/approvals/verify/route.ts:53`       |
| `/api/v1/portal/auth/session` | `POST`       | Anonymous / Share Token  | `RATE_LIMITS.portalSessionByIp` (20 req / 300s)   | `src/app/api/v1/portal/auth/session/route.ts:50` |
| `/api/v1/portal/auth/session` | `DELETE`     | Session Cookie           | **NONE**                                          | Unprotected                                      |
| `/api/v1/portal/dashboard`    | `GET`        | Portal Session Cookie    | `RATE_LIMITS.portalReadBySession` (120 req / 60s) | `src/app/api/v1/portal/dashboard/route.ts:40`    |
| `/api/health`                 | `GET`        | Public / Anonymous       | **NONE** (Liveness/Readiness probe)               | Unprotected                                      |

### 3.2 Server Actions

- Total files containing `"use server"`: **63 files**.
- Total exported functions from `"use server"` modules: **404 functions**.
- Total distinct production server actions (real actions, onboarding, and queries): **192 actions across 31 files**.
- Server actions with existing rate limiting: **2 actions** (`signInWithPassword`, `signInWithMagicLink`).
- Server actions without rate limiting: **190 actions**.

### 3.3 Server-Side Mutations Summary

High-impact mutation groups identified:

- `create*`: 32 actions (`createProject`, `createTask`, `createFolder`, `createMeeting`, `createOrganizationAction`, `createDeliverable`, etc.)
- `update*`: 28 actions (`updateProject`, `updateTask`, `updateFolder`, `updateOrganization`, `updateUserRole`, etc.)
- `delete*`: 14 actions (`deleteTask`, `deleteFolder`, `deleteFile`, `archiveProject`, etc.)
- `invite*` / `accept*` / `revoke*`: 5 actions (`inviteMemberAction`, `acceptInvitationAction`, `revokeInvitationAction`, etc.)
- `upload*` / `initialize*` / `finalize*`: 3 actions (`initializeFileUpload`, `finalizeFileUpload`, `createPreSignedUploadUrl`)
- `approve*` / `reject*` / `submit*`: 11 actions (`submitExternalApprovalAction`, `submitCorrectionAction`, `submitExternalCommentAction`, etc.)
- `trigger*` / `publish*` / `run*`: 6 actions (`triggerManualWorkflow`, `publishWorkflowVersion`, `startAgentRunAction`, etc.)

### 3.4 Supabase API Usage

- **Auth**: `supabase.auth.signInWithPassword`, `signInWithOtp`, `signInWithOAuth`, `signOut`, `getUser`, `exchangeCodeForSession`, `verifyOtp`.
- **Storage**: `supabase.storage.from(bucket).createSignedUploadUrl`, `createSignedUrl`, `remove`.
- **PostgREST (`supabase.from`)**: Not used directly in application runtime code; all core application reads and writes route through Drizzle ORM connecting to PostgreSQL transaction pooler (`DATABASE_URL`).

### 3.5 External Integrations & Egress

- **Email Delivery**: Delegated to Supabase Auth email triggers (`signInWithOtp`). Abstracted `EmailChannel` in notifications currently logs to console.
- **Storage Egress**: Supabase Storage REST API (S3 compatible) for presigned upload/download URLs.
- **SSRF Outbound Egress**: `src/lib/security/egress.ts` implements `safeFetch` with IP resolution, private address blocking (`169.254.169.254`, loopbacks, private CIDRs), and host allowlists (`EGRESS_ALLOWED_HOSTS`).
- **AI Models**: `src/lib/ai/provider-factory.ts` currently contains fallback execution abstractions simulating provider calls.

---

## 4. Authentication / Account Abuse Surface

| Operation             | Auth State    | Current Rate Limiting                                          | Abuse Impact                                                        | Recommended Limiter Dimension       | Severity         |
| --------------------- | ------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------- | ---------------- |
| `signInWithPassword`  | Anonymous     | **YES** (`loginByIp`: 10/5m, `loginByAccount`: 5/15m)          | Credential stuffing, brute force password guessing, account lockout | IP + Account (Normalized Email)     | High (Guarded)   |
| `signInWithMagicLink` | Anonymous     | **YES** (`magicLinkByIp`: 10/15m, `magicLinkByAccount`: 3/15m) | Outbound email flooding, SMTP quota burn, domain reputation loss    | IP + Account (Normalized Email)     | High (Guarded)   |
| `signInWithGoogle`    | Anonymous     | **NONE**                                                       | OAuth state generation loop, memory exhaustion                      | Client IP (20 req / 5m)             | Medium           |
| `GET /auth/callback`  | Anonymous     | **YES** (`authCallbackByIp`: 30/5m)                            | Token hash brute forcing, code exchange guessing                    | Client IP (30 req / 5m)             | Medium (Guarded) |
| `signOut`             | Authenticated | **NONE**                                                       | Session invalidation flood                                          | Authenticated User ID (30 req / 5m) | Low              |
| `enterDemoWorkspace`  | Anonymous     | Guarded by `isDemoMode()`                                      | Forbidden in production by boot-time assertion                      | Not applicable in production        | Low              |
| Account Enumeration   | Anonymous     | Mitigated by constant generic error messages                   | Attacker distinguishes registered vs unregistered emails            | Maintained generic timing & text    | Medium           |
| Session Refresh       | Authenticated | **NONE** (In `src/proxy.ts`)                                   | Every internal HTTP request calls `supabase.auth.getUser()`         | Proxy session cache / TTL           | Medium           |

### Analysis of Current Protections

1. **Password Sign-in**: Keyed on both client IP and lowercased email. When throttled, emits a generic error (`"Too many attempts. Please wait a few minutes and try again."`) to prevent account existence disclosure.
2. **Magic Link Sign-in**: Enforces 3 requests per 15 minutes per account. Returns identical success text regardless of whether the account exists, preventing email enumeration.
3. **Critical Gap**: `signInWithGoogle` has no rate limiting; an attacker can generate millions of OAuth redirects.

---

## 5. Invitation Abuse Surface

| Operation                 | Auth State                     | Current Protection | Abuse Potential                                                                        | Recommended Dimension              | Severity |
| ------------------------- | ------------------------------ | ------------------ | -------------------------------------------------------------------------------------- | ---------------------------------- | -------- |
| `inviteMemberAction`      | Authenticated (`users:create`) | **NONE**           | Malicious admin floods organization with 100,000 pending invitations, bloating DB      | Org ID + User ID (e.g., 30/hour)   | **HIGH** |
| `previewInvitationAction` | **Anonymous** (Public)         | **NONE**           | Attacker probes raw invitation tokens in a loop to find active links or enumerate orgs | Client IP (e.g., 15/5m)            | **HIGH** |
| `acceptInvitationAction`  | Authenticated (`users`)        | **NONE**           | Automated acceptance scripts, rapid replay attacks                                     | Client IP + Account (e.g., 10/15m) | **HIGH** |
| `revokeInvitationAction`  | Authenticated (`users:delete`) | **NONE**           | Admin spams revocations, invalidating valid team tokens                                | Org ID + User ID (e.g., 50/hour)   | Medium   |

### Token Security & Cryptographic Invariants

- Invitations generate 32 bytes of cryptographically secure random entropy (64 hex characters).
- Raw tokens are hashed with SHA-256 before storage (`organization_invitations.token_hash`). Database snapshots do not reveal usable tokens.
- Acceptance strictly enforces email identity binding (`EMAIL_MISMATCH` error if authenticated email does not match invited email).
- **Missing Defense**: Because `previewInvitationAction` is reachable anonymously at `/invite/[token]`, an automated adversary can submit hundreds of thousands of random token hashes to the database without encountering an IP-based throttle.

---

## 6. Organization / Tenant Abuse Surface

| Operation                           | Auth State                        | Current Protection | Abuse Potential                                                                                         | Recommended Dimension                   | Severity     |
| ----------------------------------- | --------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------ |
| `createOrganizationAction`          | Authenticated                     | **NONE**           | Authenticated user creates 10,000 workspaces in a loop, each writing org, roles, memberships, sequences | User ID (e.g., 5 per 24h) + IP (10/day) | **CRITICAL** |
| `switchOrganizationAction`          | Authenticated                     | **NONE**           | Rapid switching of active tenant cookie, spamming cache revalidations                                   | User ID (60/min)                        | Medium       |
| `updateOrganization`                | Authenticated (`settings:update`) | **NONE**           | Rapid profile mutations, database update spam                                                           | Org ID + User ID (30/min)               | Medium       |
| `updateUserRole`                    | Authenticated (`users:update`)    | **NONE**           | Rapid permission recalculation, cache thrashing                                                         | Org ID + User ID (30/min)               | Medium       |
| `deactivateUser` / `reactivateUser` | Authenticated (`users:delete`)    | **NONE**           | Rapid state toggling of team members                                                                    | Org ID + User ID (30/min)               | Medium       |

### Organization Workspace Creation Vulnerability

In `src/features/organizations/organization-service.ts:71`, `createOrganization` performs:

1. Validation of organization name and code prefix.
2. Insertion into `organizations`.
3. Bulk insertion of **5 system roles** into `roles` (`owner`, `admin`, `project_manager`, `team_member`, `client`).
4. Insertion into `organization_memberships` granting the caller `owner`.
5. Insertion into `organization_sequences` for sequence number generation.
6. Updates to `users` table.
   All operations execute within a database transaction. Without rate limiting or a per-user workspace quota, an attacker with a single valid login can exhaust database disk space and sequence limits.

---

## 7. Project & Production Operations Surface

| Feature Domain   | Operation                            | Impact Level | Resource Cost Vectors                                          | Abuse Potential                          |
| ---------------- | ------------------------------------ | ------------ | -------------------------------------------------------------- | ---------------------------------------- |
| **Search**       | `globalSearch`                       | **CRITICAL** | 6 parallel `ILIKE` queries across 6 tables simultaneously      | Denial of Service via DB CPU exhaustion  |
| **Workforce**    | `getWorkforceReportAction`           | **HIGH**     | Queries up to 10,000 attendance records into Node.js memory    | Node.js OOM, connection saturation       |
| **Workforce**    | `getWorkforceDashboardMetricsAction` | **HIGH**     | Queries up to 10,000 records + correction review queues        | DB pooler connection exhaustion          |
| **Files**        | `initializeFileUpload`               | **HIGH**     | Outbound Supabase Storage API call + Drizzle writes            | Storage quota spam, orphaned versions    |
| **Automation**   | `triggerManualWorkflow`              | **HIGH**     | Direct insertion of execution runs with unbounded JSON payload | Job queue flooding, worker exhaustion    |
| **AI Agents**    | `startAgentRunAction`                | **HIGH**     | Creates AI session, execution run, and state transitions       | Execution engine resource exhaustion     |
| **Projects**     | `createProject`                      | **MEDIUM**   | Project code generation, audit log, revalidation               | DB table bloat, sequence exhaustion      |
| **Projects**     | `getProjects`                        | **MEDIUM**   | Join query with client and manager (`limit` not capped)        | High memory consumption if limit > 1,000 |
| **Tasks**        | `createTask`                         | **MEDIUM**   | Task code sequence, JSONB description insert                   | Task table bloat                         |
| **Tasks**        | `getTasks`                           | **MEDIUM**   | Milestone task queries (`limit` parameter unclamped)           | DB read memory load                      |
| **Deliverables** | `createDeliverable`                  | **MEDIUM**   | Deliverable insert, project relation verification              | Deliverable table bloat                  |
| **Revisions**    | `createRevision`                     | **MEDIUM**   | Version branching and status tracking                          | Revision tree complexity explosion       |
| **Timelines**    | `createMilestone`                    | **MEDIUM**   | Milestone order calculations and dependency updates            | Timeline structure thrashing             |
| **Meetings**     | `createMeeting`                      | **MEDIUM**   | Meeting schedule, attendees, agenda inserts                    | Calendar table bloat                     |

---

## 8. File & Storage Abuse Surface

### 8.1 Existing Storage Safeguards

- **Maximum File Size**: Hard limit of **10 GB** (`10 * 1024 * 1024 * 1024` bytes) enforced in `initializeFileUpload`.
- **Organization Storage Quota**: Hard limit of **500 GB** (`500 * 1024 * 1024 * 1024` bytes) enforced via SQL aggregation:
  ```sql
  SELECT SUM(total_size_bytes) as total_used FROM files WHERE organization_id = $1 AND status != 'deleted'
  ```
- **Folder Tree Depth**: Recursively validated to a maximum depth of **10 levels**.
- **Path Isolation**: Storage paths strictly namespaced: `{organizationId}/{projectId}/{fileId}/{versionId}.{extension}`.

### 8.2 Critical Storage & Upload Gaps

1. **Zero Frequency Limiting on Upload Initialization**: A caller with `files:upload` can call `initializeFileUpload` 10,000 times per minute with `sizeBytes: 1`. This does not trip the 500GB quota but:
   - Issues 10,000 outbound signed URL generation requests to Supabase Storage.
   - Inserts 10,000 rows into `files` and `file_versions`.
   - Runs 10,000 `SUM(total_size_bytes)` aggregate queries on Postgres.
2. **Unbounded Folder Breadth**: While depth is capped at 10, there is no limit on the number of sibling folders at any level.
3. **No Concurrent Upload Limit**: A single user can initiate hundreds of simultaneous multi-gigabyte uploads.

---

## 9. Email & Third-Party Cost Surface

| Integration / Outbound Path  | Caller Identity    | Triggering Action         | Cost / Reputation Risk                                  | Existing Protection                                                | Recommended Protection          |
| ---------------------------- | ------------------ | ------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------- |
| **Supabase Auth Magic Link** | Anonymous          | `signInWithMagicLink`     | Outbound email volume, inbox spam, SMTP reputation loss | `RATE_LIMITS.magicLinkByIp` (10/15m), `magicLinkByAccount` (3/15m) | **Active** (Sufficient)         |
| **Supabase Storage API**     | Authenticated      | `initializeFileUpload`    | API request count, signed URL minting overhead          | None                                                               | Per-user + Org limiter (50/10m) |
| **Outbound Webhooks**        | Automated / Engine | `safeFetch` (`egress.ts`) | SSRF, loopback access, cloud metadata theft             | IP resolution, private CIDR block, host allowlist                  | **Active** (Sufficient)         |
| **AI Provider Fallback**     | Authenticated      | `executeProvider`         | LLM API token billing, model inference cost             | Currently stubbed; no runtime token budget                         | Token bucket per organization   |
| **Team Member Invitations**  | Authenticated      | `inviteMemberAction`      | Potential future email triggers, database storage bloat | None                                                               | Org limiter (30/hour)           |

---

## 10. Complete Server Action Rate-Limiting Inventory

Below is the exhaustive inventory of all **192 distinct production server actions** across the 31 backend modules of AI NEX OS:

| #   | Action                                | Module Path                                  | Auth Required     | Permission             | Current Limiter     | Mutation Type | Resource Cost                                        | Abuse Risk                                  | Recommended Dimension           |
| --- | ------------------------------------- | -------------------------------------------- | ----------------- | ---------------------- | ------------------- | ------------- | ---------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| 1   | `createApprovalCycle`                 | `approvals/real-actions.ts`                  | Authenticated     | `approvals:create`     | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 2   | `submitReview`                        | `approvals/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 3   | `delegateReview`                      | `approvals/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 4   | `resolveCondition`                    | `approvals/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 5   | `getPendingApprovalsCount`            | `approvals/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 6   | `signInWithPassword`                  | `auth/real-actions.ts`                       | Anonymous / Token | `none`                 | YES (`RATE_LIMITS`) | WRITE         | LOW (DB read)                                        | LOW (protected)                             | IP + Account (Strict)           |
| 7   | `signInWithMagicLink`                 | `auth/real-actions.ts`                       | Anonymous / Token | `none`                 | YES (`RATE_LIMITS`) | WRITE         | LOW (DB read)                                        | LOW (protected)                             | IP + Account (Strict)           |
| 8   | `signInWithGoogle`                    | `auth/real-actions.ts`                       | Anonymous / Token | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | IP + Account (Strict)           |
| 9   | `signOut`                             | `auth/real-actions.ts`                       | Anonymous / Token | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | IP + Account (Strict)           |
| 10  | `enterDemoWorkspace`                  | `auth/actions/demo-login.ts`                 | Anonymous / Token | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | IP + Account (Strict)           |
| 11  | `getCalendarMonthAction`              | `calendar/real-actions.ts`                   | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 12  | `getClients`                          | `clients/real-actions.ts`                    | Authenticated     | `clients:read`         | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 13  | `getClientById`                       | `clients/real-actions.ts`                    | Authenticated     | `clients:read`         | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 14  | `getClientActivity`                   | `clients/real-actions.ts`                    | Authenticated     | `clients:read`         | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 15  | `createClient`                        | `clients/real-actions.ts`                    | Authenticated     | `clients:create`       | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 16  | `updateClient`                        | `clients/real-actions.ts`                    | Authenticated     | `clients:update`       | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 17  | `archiveClient`                       | `clients/real-actions.ts`                    | Authenticated     | `clients:delete`       | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 18  | `createContact`                       | `clients/real-actions.ts`                    | Authenticated     | `clients:update`       | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 19  | `updateContact`                       | `clients/real-actions.ts`                    | Authenticated     | `clients:update`       | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 20  | `archiveContact`                      | `clients/real-actions.ts`                    | Authenticated     | `clients:update`       | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 21  | `getClientsCount`                     | `clients/real-actions.ts`                    | Authenticated     | `clients:read`         | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 22  | `createDeliverable`                   | `deliverables/real-actions.ts`               | Authenticated     | `projects:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 23  | `startReviewSession`                  | `deliverables/real-actions.ts`               | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 24  | `approveRevision`                     | `deliverables/real-actions.ts`               | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 25  | `requestRevision`                     | `deliverables/real-actions.ts`               | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 26  | `generateShareLink`                   | `deliverables/real-actions.ts`               | Authenticated     | `deliverables:read`    | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 27  | `getDeliverables`                     | `deliverables/real-actions.ts`               | Authenticated     | `deliverables:read`    | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 28  | `getDeliverableById`                  | `deliverables/real-actions.ts`               | Authenticated     | `deliverables:read`    | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 29  | `getReviewSessions`                   | `deliverables/real-actions.ts`               | Authenticated     | `deliverables:read`    | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 30  | `getDeliverableApprovals`             | `deliverables/real-actions.ts`               | Authenticated     | `deliverables:read`    | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 31  | `getDeliverableShareLinks`            | `deliverables/real-actions.ts`               | Authenticated     | `deliverables:read`    | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 32  | `getDeliverableActivity`              | `deliverables/real-actions.ts`               | Authenticated     | `deliverables:read`    | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 33  | `searchDeliverables`                  | `deliverables/real-actions.ts`               | Authenticated     | `deliverables:read`    | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 34  | `createFolder`                        | `files/real-actions.ts`                      | Authenticated     | `files:create`         | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 35  | `updateFolder`                        | `files/real-actions.ts`                      | Authenticated     | `files:update`         | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 36  | `deleteFolder`                        | `files/real-actions.ts`                      | Authenticated     | `files:delete`         | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 37  | `updateFile`                          | `files/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 38  | `deleteFile`                          | `files/real-actions.ts`                      | Authenticated     | `files:upload`         | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 39  | `initializeFileUpload`                | `files/real-actions.ts`                      | Authenticated     | `files:upload`         | **NONE**            | WRITE         | HIGH (external API / crypto)                         | HIGH (presigned URL minting / DB bloat)     | User ID + Org ID (e.g. 50/10m)  |
| 40  | `finalizeFileUpload`                  | `files/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | HIGH (external API / crypto)                         | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 41  | `linkFileToEntity`                    | `files/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 42  | `generateShareLink`                   | `files/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 43  | `promoteFileVersion`                  | `files/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 44  | `getFiles`                            | `files/real-actions.ts`                      | Authenticated     | `files:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 45  | `getFolder`                           | `files/real-actions.ts`                      | Authenticated     | `files:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 46  | `getProjectFolders`                   | `files/real-actions.ts`                      | Authenticated     | `files:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 47  | `getFileVersions`                     | `files/real-actions.ts`                      | Authenticated     | `files:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 48  | `getFileShares`                       | `files/real-actions.ts`                      | Authenticated     | `files:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 49  | `getFileActivity`                     | `files/real-actions.ts`                      | Authenticated     | `files:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 50  | `searchFiles`                         | `files/real-actions.ts`                      | Authenticated     | `files:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 51  | `createMeeting`                       | `meetings/real-actions.ts`                   | Authenticated     | `meetings:create`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 52  | `updateMeeting`                       | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 53  | `cancelMeeting`                       | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 54  | `completeMeeting`                     | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 55  | `addMeetingAttendee`                  | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 56  | `updateMeetingAttendee`               | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 57  | `removeMeetingAttendee`               | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 58  | `addAgendaItem`                       | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 59  | `updateAgendaItem`                    | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 60  | `removeAgendaItem`                    | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 61  | `createDecision`                      | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 62  | `createActionItem`                    | `meetings/real-actions.ts`                   | Authenticated     | `meetings:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 63  | `promoteActionItemToTask`             | `meetings/real-actions.ts`                   | Authenticated     | `tasks:create`         | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 64  | `getMeetingsForProject`               | `meetings/real-queries.ts`                   | Authenticated     | `meetings:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 65  | `getMeetingById`                      | `meetings/real-queries.ts`                   | Authenticated     | `meetings:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 66  | `getMeetingDecisions`                 | `meetings/real-queries.ts`                   | Authenticated     | `meetings:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 67  | `getMeetings`                         | `meetings/real-queries.ts`                   | Authenticated     | `meetings:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 68  | `getMeetingAttendees`                 | `meetings/real-queries.ts`                   | Authenticated     | `meetings:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 69  | `getMeetingAgenda`                    | `meetings/real-queries.ts`                   | Authenticated     | `meetings:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 70  | `getMeetingOutcomes`                  | `meetings/real-queries.ts`                   | Authenticated     | `meetings:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 71  | `getMeetingActivity`                  | `meetings/real-queries.ts`                   | Authenticated     | `meetings:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 72  | `getMeetingActionItems`               | `meetings/real-queries.ts`                   | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 73  | `getNotificationsAction`              | `notifications/real-actions.ts`              | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 74  | `getNotificationFeedAction`           | `notifications/real-actions.ts`              | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 75  | `markNotificationReadAction`          | `notifications/real-actions.ts`              | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 76  | `markNotificationUnreadAction`        | `notifications/real-actions.ts`              | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 77  | `markAllNotificationsReadAction`      | `notifications/real-actions.ts`              | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 78  | `updateNotificationPreferencesAction` | `notifications/real-actions.ts`              | Authenticated     | `none`                 | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 79  | `getNotificationsQuery`               | `notifications/real-queries.ts`              | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 80  | `getNotificationPreferencesQuery`     | `notifications/real-queries.ts`              | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 81  | `listDepartmentsAction`               | `organizations/departments/real-actions.ts`  | Authenticated     | `departments:read`     | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 82  | `getDepartmentAction`                 | `organizations/departments/real-actions.ts`  | Authenticated     | `departments:read`     | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 83  | `createOrganizationAction`            | `organizations/onboarding-actions.ts`        | Authenticated     | `none`                 | **NONE**            | WRITE         | CRITICAL (writes org, roles, memberships, sequences) | CRITICAL (tenant explosion / DB saturation) | User ID (e.g. 5/day) + IP       |
| 84  | `acceptInvitationAction`              | `organizations/onboarding-actions.ts`        | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 85  | `previewInvitationAction`             | `organizations/onboarding-actions.ts`        | Authenticated     | `users:create`         | **NONE**            | WRITE         | LOW (DB read)                                        | HIGH (unauthenticated token brute force)    | IP (e.g. 15/5m)                 |
| 86  | `switchOrganizationAction`            | `organizations/onboarding-actions.ts`        | Authenticated     | `users:create`         | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 87  | `inviteMemberAction`                  | `organizations/onboarding-actions.ts`        | Authenticated     | `users:create`         | **NONE**            | WRITE         | LOW (DB read)                                        | HIGH (invite flood / storage abuse)         | Org ID + User ID (e.g. 30/hour) |
| 88  | `revokeInvitationAction`              | `organizations/onboarding-actions.ts`        | Authenticated     | `users:delete`         | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 89  | `getOrganization`                     | `organizations/real-actions.ts`              | Authenticated     | `organization:read`    | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 90  | `updateOrganization`                  | `organizations/real-actions.ts`              | Authenticated     | `organization:update`  | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 91  | `getRoles`                            | `organizations/real-actions.ts`              | Authenticated     | `roles:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 92  | `getOrganizationMembers`              | `organizations/real-actions.ts`              | Authenticated     | `users:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 93  | `updateUserRole`                      | `organizations/real-actions.ts`              | Authenticated     | `roles:update`         | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 94  | `deactivateUser`                      | `organizations/real-actions.ts`              | Authenticated     | `users:update`         | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 95  | `reactivateUser`                      | `organizations/real-actions.ts`              | Authenticated     | `users:update`         | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 96  | `createProject`                       | `projects/real-actions.ts`                   | Authenticated     | `projects:create`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 97  | `updateProject`                       | `projects/real-actions.ts`                   | Authenticated     | `projects:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 98  | `getProjects`                         | `projects/real-actions.ts`                   | Authenticated     | `projects:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 99  | `getProjectById`                      | `projects/real-actions.ts`                   | Authenticated     | `projects:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 100 | `archiveProject`                      | `projects/real-actions.ts`                   | Authenticated     | `projects:delete`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 101 | `getProjectDashboardSummary`          | `projects/real-actions.ts`                   | Authenticated     | `projects:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 102 | `addProjectMember`                    | `projects/real-actions.ts`                   | Authenticated     | `projects:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 103 | `updateProjectMemberRole`             | `projects/real-actions.ts`                   | Authenticated     | `projects:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 104 | `removeProjectMember`                 | `projects/real-actions.ts`                   | Authenticated     | `projects:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 105 | `getActiveProjectsCount`              | `projects/real-actions.ts`                   | Authenticated     | `projects:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 106 | `createRevisionRequest`               | `revisions/real-actions.ts`                  | Authenticated     | `revisions:create`     | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 107 | `createRevision`                      | `revisions/real-actions.ts`                  | Authenticated     | `revisions:create`     | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 108 | `updateRevisionStatus`                | `revisions/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 109 | `assignRevision`                      | `revisions/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 110 | `mergeRevision`                       | `revisions/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 111 | `rollbackRevision`                    | `revisions/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 112 | `globalSearch`                        | `search/actions.ts`                          | Authenticated     | `none`                 | **NONE**            | WRITE         | CRITICAL (6 parallel ilike queries)                  | HIGH (DB CPU starvation via regex/ilike)    | User ID + IP (e.g. 30/min)      |
| 113 | `createShareSessionAction`            | `shares/actions/real-index.ts`               | Authenticated     | `share_links:create`   | **NONE**            | WRITE         | HIGH (external API / crypto)                         | MEDIUM (state mutation flood)               | Share Token + IP (e.g. 60/min)  |
| 114 | `resolveExternalIdentityAction`       | `shares/actions/real-index.ts`               | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | Share Token + IP (e.g. 60/min)  |
| 115 | `submitExternalCommentAction`         | `shares/actions/real-index.ts`               | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | Share Token + IP (e.g. 60/min)  |
| 116 | `submitExternalAnnotationAction`      | `shares/actions/real-index.ts`               | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | Share Token + IP (e.g. 60/min)  |
| 117 | `submitExternalApprovalAction`        | `shares/actions/real-index.ts`               | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | Share Token + IP (e.g. 60/min)  |
| 118 | `requestShareMeetingAction`           | `shares/actions/real-index.ts`               | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | Share Token + IP (e.g. 60/min)  |
| 119 | `createTask`                          | `tasks/real-actions.ts`                      | Authenticated     | `projects:create`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 120 | `updateTask`                          | `tasks/real-actions.ts`                      | Authenticated     | `tasks:delete`         | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 121 | `deleteTask`                          | `tasks/real-actions.ts`                      | Authenticated     | `tasks:delete`         | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 122 | `assignTask`                          | `tasks/real-actions.ts`                      | Authenticated     | `tasks:update`         | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 123 | `unassignTask`                        | `tasks/real-actions.ts`                      | Authenticated     | `tasks:update`         | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 124 | `getTaskAssignees`                    | `tasks/real-actions.ts`                      | Authenticated     | `comments:create`      | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 125 | `addTaskComment`                      | `tasks/real-actions.ts`                      | Authenticated     | `comments:create`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 126 | `getTaskComments`                     | `tasks/real-actions.ts`                      | Authenticated     | `tasks:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 127 | `getTaskActivity`                     | `tasks/real-actions.ts`                      | Authenticated     | `tasks:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 128 | `searchTasks`                         | `tasks/real-actions.ts`                      | Authenticated     | `tasks:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 129 | `getTasks`                            | `tasks/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 130 | `startTaskTimer`                      | `tasks/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 131 | `getActiveTaskTimer`                  | `tasks/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 132 | `stopTaskTimer`                       | `tasks/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 133 | `addTaskDependency`                   | `tasks/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 134 | `getMyOpenTasksCount`                 | `tasks/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 135 | `createTimeline`                      | `timelines/real-actions.ts`                  | Authenticated     | `projects:read`        | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 136 | `getProjectTimeline`                  | `timelines/real-actions.ts`                  | Authenticated     | `projects:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 137 | `getTimelines`                        | `timelines/real-actions.ts`                  | Authenticated     | `timeline:read`        | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 138 | `getTimelineMilestones`               | `timelines/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 139 | `getTimelineDependencies`             | `timelines/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 140 | `createMilestone`                     | `timelines/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 141 | `addTimelineDependency`               | `timelines/real-actions.ts`                  | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 142 | `createEmployeeAction`                | `users/admin/real-actions.ts`                | Authenticated     | `none`                 | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 143 | `updateEmployeeAction`                | `users/admin/real-actions.ts`                | Authenticated     | `none`                 | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 144 | `setEmployeeStatusAction`             | `users/admin/real-actions.ts`                | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 145 | `archiveEmployeeAction`               | `users/admin/real-actions.ts`                | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 146 | `restoreEmployeeAction`               | `users/admin/real-actions.ts`                | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 147 | `assignDepartmentAction`              | `users/admin/real-actions.ts`                | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 148 | `assignManagerAction`                 | `users/admin/real-actions.ts`                | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 149 | `getMyProfile`                        | `users/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 150 | `updateMyProfile`                     | `users/real-actions.ts`                      | Authenticated     | `none`                 | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 151 | `submitClockIn`                       | `workforce/attendance/form-actions.ts`       | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 152 | `submitClockOut`                      | `workforce/attendance/form-actions.ts`       | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 153 | `submitStartBreak`                    | `workforce/attendance/form-actions.ts`       | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 154 | `submitEndBreak`                      | `workforce/attendance/form-actions.ts`       | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 155 | `getWorkforceDashboardMetricsAction`  | `workforce/attendance/read-model-actions.ts` | Authenticated     | `attendance:view_team` | **NONE**            | READ          | HIGH (up to 10k rows loaded)                         | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 156 | `getWorkforceReportAction`            | `workforce/attendance/read-model-actions.ts` | Authenticated     | `attendance:view_team` | **NONE**            | READ          | HIGH (up to 10k rows loaded)                         | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 157 | `clockInAction`                       | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 158 | `clockOutAction`                      | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 159 | `startBreakAction`                    | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 160 | `endBreakAction`                      | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 161 | `getTodayAttendanceAction`            | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 162 | `getAttendanceTimelineAction`         | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 163 | `listAttendanceAction`                | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 164 | `getAttendanceAction`                 | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 165 | `getAttendanceHistoryAction`          | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 166 | `getTeamAttendanceAction`             | `workforce/attendance/real-actions.ts`       | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 167 | `submitCorrection`                    | `workforce/corrections/form-actions.ts`      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 168 | `cancelCorrection`                    | `workforce/corrections/form-actions.ts`      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 169 | `markUnderReview`                     | `workforce/corrections/form-actions.ts`      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 170 | `decideCorrection`                    | `workforce/corrections/form-actions.ts`      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 171 | `submitCorrectionAction`              | `workforce/corrections/real-actions.ts`      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 172 | `cancelCorrectionAction`              | `workforce/corrections/real-actions.ts`      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 173 | `markCorrectionUnderReviewAction`     | `workforce/corrections/real-actions.ts`      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 174 | `reviewCorrectionAction`              | `workforce/corrections/real-actions.ts`      | Authenticated     | `none`                 | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 175 | `listMyCorrectionsAction`             | `workforce/corrections/real-actions.ts`      | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 176 | `getCorrectionAction`                 | `workforce/corrections/real-actions.ts`      | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 177 | `listCorrectionReviewQueueAction`     | `workforce/corrections/real-actions.ts`      | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 178 | `getCorrectionReviewContextAction`    | `workforce/corrections/real-actions.ts`      | Authenticated     | `none`                 | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 179 | `listEmployeesAction`                 | `workforce/employees/real-actions.ts`        | Authenticated     | `users:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 180 | `getEmployeeAction`                   | `workforce/employees/real-actions.ts`        | Authenticated     | `users:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 181 | `listDirectReportsAction`             | `workforce/employees/real-actions.ts`        | Authenticated     | `users:read`           | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 182 | `getWorkforcePolicyAction`            | `workforce/shared/policy-actions.ts`         | Authenticated     | `attendance:read`      | **NONE**            | READ          | LOW (DB read)                                        | MEDIUM (unbounded scrape / memory load)     | User ID + Org ID (e.g. 180/min) |
| 183 | `createAgentAction`                   | `agents/real-actions.ts`                     | Authenticated     | `ai:create`            | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 184 | `startAgentRunAction`                 | `agents/real-actions.ts`                     | Authenticated     | `ai:create`            | **NONE**            | WRITE         | LOW (DB read)                                        | HIGH (run/session explosion)                | User ID + Org ID (e.g. 180/min) |
| 185 | `pauseAgentRunAction`                 | `agents/real-actions.ts`                     | Authenticated     | `ai:update`            | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 186 | `resumeAgentRunAction`                | `agents/real-actions.ts`                     | Authenticated     | `ai:update`            | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 187 | `cancelAgentRunAction`                | `agents/real-actions.ts`                     | Authenticated     | `ai:update`            | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 188 | `createWorkflow`                      | `automation/real-actions.ts`                 | Authenticated     | `settings:create`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 60/min)  |
| 189 | `publishWorkflowVersion`              | `automation/real-actions.ts`                 | Authenticated     | `settings:update`      | **NONE**            | WRITE         | MEDIUM (DB write + revalidate)                       | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 190 | `triggerManualWorkflow`               | `automation/real-actions.ts`                 | Authenticated     | `settings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | HIGH (run/session explosion)                | User ID + Org ID (e.g. 180/min) |
| 191 | `cancelExecutionRun`                  | `automation/real-actions.ts`                 | Authenticated     | `settings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |
| 192 | `replayDlqItem`                       | `automation/real-actions.ts`                 | Authenticated     | `settings:update`      | **NONE**            | WRITE         | LOW (DB read)                                        | MEDIUM (state mutation flood)               | User ID + Org ID (e.g. 180/min) |

---

## 11. Next.js Middleware / Proxy Inventory

### 11.1 Inspection of `src/proxy.ts`

The platform uses Next.js 16 file convention `src/proxy.ts` (successor to `middleware.ts`).

### 11.2 Proxy Responsibilities

1. **Dual-Domain Routing**:
   - `app.<domain>`: Internal agency dashboard.
   - `portal.<domain>`: Client share portal, rewritten to `/portal/*`.
2. **Session Verification**:
   - Calls `supabase.auth.getUser()` for all internal routes.
   - Redirects unauthenticated traffic to `/login` (or returns 401 for `/api/*`).
3. **Content-Security-Policy (CSP)**:
   - Injects per-request unguessable cryptographic nonce (`x-nonce`).
4. **Public Internal Paths Bypass**:
   - Explicit bypass list: `["/login", "/auth", "/unprovisioned", "/onboarding", "/invite", "/api/health"]`.

### 11.3 Proxy Security Assessment for Rate Limiting

- **Zero Rate Limiting in Proxy**: `src/proxy.ts` performs **no request throttling, IP counting, or rate limiting whatsoever**.
- **Server Action Behavior**: In Next.js App Router, Server Actions POST to the current route carrying the `Next-Action` header. If the user is authenticated, `proxy.ts` permits the request through immediately. If on a public path (such as `/onboarding` or `/invite`), unauthenticated calls pass through directly.
- **Suitability for Rate Limiting**: Coarse edge/IP rate limiting can be mounted at the proxy level for unauthenticated public routes (`/login`, `/invite`, `/api/health`), but **cannot replace action-level rate limiting** because the proxy cannot inspect Server Action function payloads or know whether an action is read-heavy vs write-heavy.

---

## 12. Current Rate-Limiting Implementation Analysis

### 12.1 Engine Overview (`src/lib/security/rate-limit.ts`)

The application contains a purpose-built rate-limiting engine implementing a **weighted sliding window algorithm**.

### 12.2 Algorithm Mechanics

- **Weighted Approximation**: Each request counts against the current fixed window plus the fraction of the previous window still inside the lookback period:
  $$\text{Weighted Count} = \text{Current Count} + \text{Previous Count} \times \left(1 - \frac{\text{Elapsed in Window}}{\text{Window Length}}\right)$$
- **Boundary Defense**: Unlike plain fixed windows, this prevents an attacker from sending $2 \times \text{limit}$ requests across a window boundary.

### 12.3 Storage Backends

1. **`MemoryStore` (In-Process)**:
   - Uses a JavaScript `Map<string, { windowStart: number, count: number }>`.
   - Bounded at `MAX_ENTRIES = 20_000` to prevent denial-of-service against server memory.
   - Eviction: Drops expired windows, then sorts by oldest `windowStart` when exceeding 20,000 keys.
2. **`RedisStore` (Distributed)**:
   - Uses `ioredis` pipeline executing `INCR` and `EXPIRE(2 * windowSeconds)` on the current window key, plus `GET` on the previous window key.
   - Dynamic lazy import: `ioredis` is only imported when `REDIS_URL` is configured and present.

### 12.4 Failure Mode (Fail-Open Fallback)

- If Redis is unreachable, drops offline, or throws during a pipeline execution, `consumeRateLimit` catches the error, logs a security warning (`ratelimit.store_failed`), and **falls back to the local `MemoryStore`**.
- Traffic is never rejected due to a Redis outage ("A limiter outage must not become an application outage").

### 12.5 Current Configured Policies in `RATE_LIMITS`

1. `loginByIp`: 10 requests / 300 seconds (5 min)
2. `loginByAccount`: 5 requests / 900 seconds (15 min)
3. `magicLinkByAccount`: 3 requests / 900 seconds (15 min)
4. `magicLinkByIp`: 10 requests / 900 seconds (15 min)
5. `authCallbackByIp`: 30 requests / 300 seconds (5 min)
6. `approvalVerifyByIp`: 20 requests / 300 seconds (5 min)
7. `portalSessionByIp`: 20 requests / 300 seconds (5 min)
8. `portalReadBySession`: 120 requests / 60 seconds (1 min)
9. `sharePasswordBySession`: 5 requests / 900 seconds (15 min)

---

## 13. Distributed / Serverless Analysis

### 13.1 Multi-Instance Multiplication Risk

In `src/lib/env.server.ts`, `REDIS_URL` is classified as:

```ts
{
  name: "REDIS_URL",
  requirement: "optional",
  exposure: "server",
  purpose: "Redis connection for the portal cache.",
  fallback: "Falls back to the in-memory cache (per-instance, not shared).",
}
```

### 13.2 Architectural Failure Scenario

When deployed to modern containerized or serverless hosting environments (e.g., Vercel Serverless Functions, AWS ECS/Fargate, Google Cloud Run, Kubernetes):

1. **Isolated In-Memory Buckets**: Each serverless container or container replica maintains an isolated `MemoryStore` instance in process memory.
2. **Budget Multiplication**:
   - If an application runs across $N$ instances (e.g., 10 replicas or auto-scaled serverless lambdas), a client distributing requests across instances effectively receives:
     $$\text{Effective Limit} = N \times \text{Configured Policy Limit}$$
   - An attacker targeting `loginByAccount` (configured at 5 attempts / 15 minutes) can execute 50 brute force attempts against a victim account if routed across 10 instances.
3. **Database Connection Starvation**:
   - Unthrottled server actions executing concurrent queries on multiple instances will easily saturate the Supabase Transaction Pooler (PgBouncer, max client connections typically 200–500 on standard plans), triggering 500 errors across all tenants.

---

## 14. Rate-Limit Dimension Model

To prevent abuse without disrupting legitimate enterprise collaborative workflows, rate limiting must be multi-dimensional:

| Dimension                  | Target Use Case                                                                      | Identifier Formulation                       |
| -------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| **1. Client IP**           | Anonymous endpoints (login, OAuth, invite preview, health check)                     | `ip:{normalizedIp}`                          |
| **2. Authenticated User**  | Personal mutations (clock-in, task updates, comments, profile edits)                 | `user:{userId}`                              |
| **3. Organization ID**     | Tenant resource caps (total uploads, bulk report generations, workflow triggers)     | `org:{orgId}`                                |
| **4. Target Account**      | Email-targeted endpoints (password sign-in, magic link dispatch, invite issuance)    | `account:{normalizedEmail}`                  |
| **5. Session / Token**     | Portal read operations, external review token verification, share links              | `token:{tokenHash}` or `session:{sessionId}` |
| **6. Compound Dimensions** | High-abuse flows: Org + User (invites), Org + Action (exports), IP + Account (login) | `compound:{orgId}:{userId}:{action}`         |

---

## 15. Abuse Classification & Risk Matrix

| Surface Category      | Abuse Risk                                       | Current Protection                                                | Limiting Dimension                          | Recommended S6.2 Category |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------- | ------------------------- |
| **AUTHENTICATION**    | High (Credential stuffing, enumeration)          | Partial (Password & Magic link limited; Google OAuth unthrottled) | Client IP + Normalized Email                | `AUTH_STRICT`             |
| **ONBOARDING & ORG**  | Critical (Workspace creation explosion)          | **None**                                                          | User ID + Client IP                         | `ORG_MUTATION`            |
| **INVITATIONS**       | High (Token guessing, invite spam)               | **None**                                                          | Client IP (preview) / Org + User (issuance) | `INVITE_FLOW`             |
| **GLOBAL SEARCH**     | High (Postgres DoS via 6 parallel regex queries) | **None**                                                          | User ID + Client IP                         | `SEARCH_EXPENSIVE`        |
| **WORKFORCE REPORTS** | High (10k row in-memory processing)              | **None**                                                          | User ID + Org ID                            | `REPORT_EXPENSIVE`        |
| **STORAGE & FILES**   | High (Presigned URL generation flood)            | **None** (Size and quota checked, frequency unthrottled)          | User ID + Org ID                            | `UPLOAD_INITIALIZE`       |
| **AI AGENTS & RUNS**  | High (Session & execution run explosion)         | **None**                                                          | User ID + Org ID                            | `AI_DISPATCH`             |
| **AUTOMATION RUNS**   | High (Queue flood with unbounded payloads)       | **None** in server action                                         | User ID + Org ID                            | `AUTOMATION_TRIGGER`      |
| **CORE MUTATIONS**    | Medium (Task/Project/Deliverable spam)           | **None**                                                          | User ID + Org ID                            | `STANDARD_MUTATION`       |
| **CORE READS**        | Medium (Scraping, DB pooler saturation)          | **None** (Except portal dashboard: 120/min)                       | User ID + Org ID                            | `STANDARD_READ`           |
| **PORTAL PUBLIC**     | Medium (Session creation / revocation spam)      | Partial (POST limited to 20/5m; DELETE unthrottled)               | Client IP / Session Token                   | `PORTAL_SESSION`          |

---

## 16. Payload & Resource Limit Inventory

OWASP API4 specifically mandates strict limits on request payloads and database fetch sizes.

### 16.1 Body Size Limits

- **Route Handlers**: Use `readJsonBody` with `DEFAULT_MAX_BODY_BYTES = 64 * 1024` (64 KB). Large bodies are rejected with HTTP 413 Payload Too Large.
- **Server Actions**: Handled by Next.js App Router body parser. Next.js defaults allow bodies up to 1 MB (or up to 10 MB if configured on platform). **No per-action body size clamping exists**.

### 16.2 Missing String Length Bounds

In multiple Zod schemas (`src/features/*/schemas.ts`):

- `projects.projectName`: `z.string().min(1)` — **Missing `.max()` constraint**.
- `projects.description`: `z.string().optional()` — **Missing `.max()` constraint**.
- `tasks.name`: `z.string().min(1)` — **Missing `.max()` constraint**.
- `tasks.description`: `z.any().optional()` — **Completely untyped and unbounded JSONB**.
- `tasks.notes`: `z.string().optional()` — **Missing `.max()` constraint**.
- `organizations.legalName`, `industry`, `country`, `address`: **Missing `.max()` constraints**.

### 16.3 Missing Array Bounds

- `projects.tags`: `z.array(z.string()).default([])` — **No maximum array length**. A client can submit an array of 50,000 strings.

### 16.4 Unbounded Database Pagination

- `getProjects(query, limit = 50, offset = 0)`: The `limit` parameter is not clamped to an upper bound. A caller can pass `limit: 100000` and attempt to load the entire database.
- `getTasks(milestoneId, cursorOffset = 0, limit = 100)`: `limit` parameter is unclamped.

### 16.5 In-Memory Array Filtering

- `getWorkforceReportAction`: Executes `fetchRows` with hardcoded `pageSize: 10_000`, retrieving thousands of records into Node.js memory before running `.filter()`.

---

## 17. Bypass Analysis

1. **Dual Server Action Export Bypass**:
   - For every feature domain, `actions.ts` (wrapper) and `real-actions.ts` (implementation) both declare `"use server"`.
   - If an engineer places a rate limiter only on `src/features/projects/actions.ts:createProject`, an attacker can send an HTTP POST targeting the Action ID generated for `src/features/projects/real-actions.ts:createProject`, **completely bypassing the rate limiter**.
   - **Architectural Requirement**: Any rate limiter must wrap the underlying real action or be enforced at the shared action execution root.
2. **PostgREST Direct Access Vector**:
   - The browser client receives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - While RLS policies protect database access, PostgREST has no application-level rate limiter. A compromised or malicious client with authenticated JWT can call Supabase PostgREST endpoints directly, bypassing Server Action throttles.
3. **`X-Forwarded-For` Spoofing**:
   - `src/lib/security/request.ts:getClientIp` relies on `TRUSTED_PROXY_HOPS` (defaulting to 1).
   - If the production deployment is positioned behind multiple reverse proxies (e.g. Cloudflare + Cloud Run/Vercel) without `TRUSTED_PROXY_HOPS` tuned, an attacker can append fake IP addresses to `X-Forwarded-For` and rotate through fresh rate-limit buckets.

---

## 18. Sensitive Business Flows (OWASP API6)

Even when technical authorization passes, certain business operations require strict execution throttles:

1. **Organization Creation**: High business and database cost. Must be restricted to a small number of workspaces per user per day.
2. **Team Member Invitations**: Potential communication and data spam. Must be throttled per organization per hour.
3. **External Deliverable Share Links**: Public-facing entry point. Link creation should be bounded per project.
4. **Attendance Clock-In / Clock-Out**: Workforce integrity flow. Multiple clock-in events in seconds indicate replay attacks or automation abuse.
5. **Global Search**: High-intensity analytical query across multiple tables. Keystroke debouncing on client is insufficient; server-side throttle is mandatory.

---

## 19. Existing Test Coverage

### 19.1 What Is Tested

- `tests/unit/rate-limit.test.ts`: Validates the weighted sliding window math, burst rejection, budget restoration, header generation, in-process store cap, and Redis store mock.
- `tests/unit/security-logging.test.ts`: Validates structured logging for `rate_limited` ApiErrors (status 429).

### 19.2 What Is Missing

- **Zero Action-Level Throttle Tests**: Not a single test asserts that `signInWithPassword` or `signInWithMagicLink` actually returns 429 when hammered in a loop.
- **Zero Route Handler Throttle Tests**: No tests verify that `/auth/callback`, `/api/approvals/verify`, or `/api/v1/portal/dashboard` enforce rate limiting under load.
- **Zero Distributed Rate Limit Tests**: No integration tests exercise multi-instance rate limiting against an actual Redis instance.

---

## 20. Categorized Findings & Vulnerability Register

### [CRITICAL-01] 190 of 192 Real Server Actions Lack Rate Limiting

- **Severity**: CRITICAL
- **Location**: All files in `src/features/*/real-actions.ts` and `src/lib/*/real-actions.ts`
- **Description**: 98.9% of the server-side mutation and read surface is unthrottled, leaving the database, memory, and application vulnerable to volumetric denial of service and state corruption.

### [CRITICAL-02] Unbounded Organization Workspace Creation

- **Severity**: CRITICAL
- **Location**: `src/features/organizations/onboarding-actions.ts:47` (`createOrganizationAction`)
- **Description**: Authenticated users can create unlimited organizations. Each creation triggers a multi-table transaction writing organizations, roles, memberships, and sequences, leading to database exhaustion.

### [HIGH-01] Public Invitation Token Enumeration Surface

- **Severity**: HIGH
- **Location**: `src/features/organizations/onboarding-actions.ts:112` (`previewInvitationAction`)
- **Description**: Unauthenticated endpoint exposed at `/invite/[token]`. Has no rate limiting or IP throttle, allowing automated adversaries to probe token validity and query the database continuously.

### [HIGH-02] Global Search Multi-Table Query Starvation

- **Severity**: HIGH
- **Location**: `src/features/search/actions.ts:60` (`globalSearch`)
- **Description**: Executes 6 parallel un-indexed `ILIKE '%term%'` queries across 6 tables on every invocation, creating severe database CPU spikes and pooler exhaustion under load.

### [HIGH-03] Workforce Monthly Report 10,000-Row Memory Exhaustion

- **Severity**: HIGH
- **Location**: `src/features/workforce/attendance/read-model-actions.ts:103` (`getWorkforceReportAction`)
- **Description**: Queries up to 10,000 attendance records into Node.js heap memory for in-memory date range slicing without any rate limiting.

### [HIGH-04] Unbounded Pre-signed Upload URL Minting

- **Severity**: HIGH
- **Location**: `src/features/files/real-actions.ts:414` (`initializeFileUpload`)
- **Description**: Lacks frequency limiting. Allows users to flood Supabase Storage with presigned URL requests and create thousands of orphaned file version records.

### [HIGH-05] Multi-Instance Rate Limit Multiplication (Optional Redis)

- **Severity**: HIGH
- **Location**: `src/lib/env.server.ts:153`, `src/lib/security/rate-limit.ts:17`
- **Description**: `REDIS_URL` is optional. In multi-instance or serverless environments without Redis, rate-limit budgets multiply across $N$ process instances.

### [HIGH-06] Dual Server Action Export Bypass Vector

- **Severity**: HIGH
- **Location**: `actions.ts` vs `real-actions.ts` architecture across all feature slices
- **Description**: Next.js compiles distinct action IDs for both files because both declare `"use server"`. Rate limits applied only to wrapper files can be bypassed by invoking real actions directly.

### [MEDIUM-01] Missing String and Array Bounds in Domain Schemas

- **Severity**: MEDIUM
- **Location**: `src/features/projects/schemas.ts`, `src/features/tasks/schemas.ts`, `src/features/organizations/schemas.ts`
- **Description**: Core fields (`projectName`, `description`, `notes`, `tags`) lack `.max()` bounds, allowing oversized payloads to consume database storage.

### [MEDIUM-02] Unclamped Query Pagination Limits

- **Severity**: MEDIUM
- **Location**: `getProjects` (`real-actions.ts:232`), `getTasks` (`real-actions.ts:480`)
- **Description**: Callers can supply arbitrarily large `limit` values, forcing massive database reads.

### [MEDIUM-03] Unprotected Portal Session Revocation

- **Severity**: MEDIUM
- **Location**: `src/app/api/v1/portal/auth/session/route.ts:107` (`DELETE`)
- **Description**: The DELETE handler has no IP or session rate limiting.

### [MEDIUM-04] Complete Absence of Action-Level Throttle Tests

- **Severity**: MEDIUM
- **Location**: `tests/` directory
- **Description**: Existing test suite only unit-tests the limiter mathematical utility; zero tests verify actual endpoint rejection or 429 response formatting.

### [LOW-01] Health Probe Information and Load Surface

- **Severity**: LOW
- **Location**: `src/app/api/health/route.ts`
- **Description**: Health check has no throttling. While withholding diagnostic details in production, high-frequency flooding can consume web server bandwidth.

---

## 21. Recommended S6.2 Policy & Implementation Strategy

To resolve the findings documented in this inventory, the following policy framework is recommended for **Phase S6.2**:

```
                                  PHASE S6.2 ARCHITECTURE

  Inbound Request / Action Call
                │
                ▼
  ┌───────────────────────────┐
  │  Proxy / Edge IP Limiter  │  ──> Blocks brute force scanners on /login,
  └─────────────┬─────────────┘      /invite, /api/health before app execution
                │
                ▼
  ┌───────────────────────────┐
  │ Action Guard Wrapper / HOF│  ──> Uniform higher-order function applied to
  └─────────────┬─────────────┘      all real-actions (prevents dual-export bypass)
                │
                ├──────────────────────────────────────────────────────┐
                ▼                                                      ▼
  ┌───────────────────────────┐                          ┌───────────────────────────┐
  │   Mutation Policy Pool    │                          │     Read Policy Pool      │
  │ • AUTH_STRICT (5/15m)     │                          │ • SEARCH_EXPENSIVE (20/1m)│
  │ • ORG_CREATE (5/24h)      │                          │ • REPORT_GEN (10/1m)      │
  │ • INVITE_ISSUE (30/1h)    │                          │ • STANDARD_READ (180/1m)  │
  │ • UPLOAD_INIT (50/10m)    │                          └───────────────────────────┘
  │ • STANDARD_MUTATION (60/m)│
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │ Distributed Redis Engine  │  ──> Upstash / Redis primary with atomic pipeline;
  │   (with in-memory failover│      bounded MemoryStore fallback on connection fault
  └───────────────────────────┘
```

### Specific Recommendations:

1. **Higher-Order Server Action Rate Limiter (`withRateLimit`)**:
   Implement a composable wrapper function to enforce rate limits directly inside `real-actions.ts`, eliminating the dual-export bypass vulnerability.
2. **Mandatory Redis in Production**:
   Elevate `REDIS_URL` in `ENV_MANIFEST` from `optional` to `production` requirement so that multi-instance deployments cannot silently run in-process rate limits.
3. **Payload Hardening**:
   Add strict `.max()` bounds to all string and array fields across Zod schemas, and clamp pagination `limit` to a maximum of 100 across all queries.
4. **Database Query Defense**:
   Introduce query debouncing or cached search indexes for `globalSearch`, and refactor `getWorkforceReportAction` to push date filtering down into SQL.
5. **Comprehensive Integration Test Suite**:
   Create automated Vitest suites in `tests/integration/rate-limiting/` verifying 429 rejections for auth, invitations, search, and core mutations.

---

## 22. Production & Staging Safety Verification

- **Production Database (`gsgseacjcalkhhmunjhx`)**: **PAUSED** (Verified untouched; 0 queries, 0 migrations, 0 network calls).
- **Staging Database (`shnzzbbtydmvfhgeoysg`)**: **PAUSED** (Verified untouched; 0 queries, 0 migrations, 0 network calls).
- **Local Application Source Code**: 0 modifications.
- **Git Commit / Branch Status**: Unchanged (0 commits, 0 pushes).
- **Total Supabase Mutations**: **0**.
- **Total Production Mutations**: **0**.

---

## 23. Final Decision

**Status**: **S6.1 INVENTORY COMPLETE — NO BLOCKER**

The forensic inventory is fully concluded. All server entry points, authentication surfaces, invitation mechanisms, file uploads, expensive queries, rate limiting mechanics, and distributed failure modes have been rigorously analyzed and cataloged.

No code changes or database migrations have been executed. The platform is primed for policy design and defensive implementation in **Phase S6.2**.
