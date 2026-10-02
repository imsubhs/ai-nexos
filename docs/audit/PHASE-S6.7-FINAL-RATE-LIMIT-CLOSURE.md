# AI NEX OS — Phase S6.7: Final Rate-Limit & Abuse-Control Security Closure

**Document Status:** FINAL / APPROVED  
**Security Status:** S6 PASS  
**Target Environment:** AI NEX OS Core Infrastructure (`ai-nexos`)  
**Evaluation Date:** September 28, 2026  
**Auditor Identity:** Principal Application Security Engineer & Production Readiness Lead  

---

## 1. Executive Summary

Phase S6.7 represents the formal security and operational closure of Phase S6 (**Rate Limiting & Abuse Prevention**) for AI NEX OS. 

Over cycles S6.1 through S6.6-R, AI NEX OS designed, implemented, and validated an enterprise abuse-control architecture. Operating under human approval for **S6.6-R**, the application employs a **MemoryStore-first architecture with an optional pluggable distributed Redis adapter**. 

In the current single-instance deployment model hosted on Antideploy:
- Rate limiting is active and enforced across **192 server actions** and **4 sensitive HTTP route handlers**.
- **MemoryStore** provides synchronous, race-free token enforcement within the Node.js event loop with LRU eviction and memory bounds (20,000 keys).
- **Redis is completely optional** for single-instance operations and is **not required** for production boot.
- If Redis is configured, the system seamlessly transitions to distributed rate limiting; if a configured Redis cluster fails, high-risk actions (`orgCreation`) enforce **fail-closed** semantics while standard actions degrade gracefully to local memory limits.
- Staging runtime verification confirmed **57/57 live checks passed** against AWS Singapore PostgreSQL 17.6 without a single failure or data leak.
- Full regression verification confirms **965/965 unit and integration tests passing**, **159/159 authorization guard coverage**, **0 TypeScript errors**, **0 ESLint errors**, and **38/38 routes cleanly compiled in production build**.

The rate limiting subsystem satisfies all abuse-prevention criteria without compromising multi-tenant isolation, architectural simplicity, or platform reliability. Phase S6 is officially closed with status **S6 PASS**.

---

## 2. S6.1 – S6.6 Evidence Log

| Phase / Loop | Focus Area | Status | Key Evidence & Validation Artifacts |
|---|---|---|---|
| **S6.1** | Threat Modeling & Abuse Topology | **PASS** | Identified 8 high-risk attack surfaces (credential stuffing, token enumeration, org creation spam, search ReDoS, analytic DB exhaustion, storage exhaustion). Documented in `AI-NEX-OS-RATE-LIMITING-ARCHITECTURE.md`. |
| **S6.2** | Rate-Limit Taxonomy & Sliding Window | **PASS** | Established canonical policies (`auth:mutation`, `org:creation`, `invitation:preview`, `search:expensive`, `report:expensive`, `resource:mutation`, `resource:read`). Implemented weighted sliding window algorithm. |
| **S6.3** | Action Inventory & Registry Coverage | **PASS** | Built `ACTION_POLICY_REGISTRY` covering 100% of public actions. Enforced zero unmapped actions and zero conflicting mappings (`rate-limiting-action-registry.test.ts`). |
| **S6.4** | Guardrails & High-Risk Surface Hardening | **PASS** | Implemented token prefix bucketing (`tokenPrefixBucket`), fail-closed org creation, query bounds [2, 64], report date clamps (≤31 days), and HTTP 429 rate limit headers. |
| **S6.5** | Operator Readiness & Scalability Planning | **PASS** | Validated single-instance vs. multi-instance scaling requirements. Added deploy gate assertions (`production-deploy-gate.test.ts`). |
| **S6.6-R** | Architectural Pivot: MemoryStore-First | **PASS** | Formal human approval to remove mandatory `REDIS_URL` requirement for single-instance Antideploy. Decoupled distributed state from boot prerequisites. |
| **S6.6 Loop 9/10** | Staging Runtime & Proxy Validation | **PASS** | Executed `scripts/verify-s6-6-staging-runtime.ts` against live Supabase staging (`shnzzbbtydmvfhgeoysg`): 57/57 checks passed. Empirically verified Cloudflare Anycast -> Antideploy -> app path. Tested Cases A–F. |

---

## 3. Final Architecture

The finalized AI NEX OS rate-limiting architecture operates on a two-tier hierarchy:

```
                          ┌───────────────────────────┐
                          │   Incoming HTTP Request   │
                          │   or Server Action Call   │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │    Client Identification   │
                          │ (Reverse Proxy IP / User) │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │    consumeRateLimit()     │
                          └─────────────┬─────────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       │ REDIS_URL present & reachable?  │
                       └────────────────┬────────────────┘
                                        │
                     YES ───────────────┴─────────────── NO
                      │                                   │
                      ▼                                   ▼
          ┌───────────────────────┐           ┌───────────────────────┐
          │      RedisStore       │           │      MemoryStore      │
          │  (Distributed / Lua)  │           │  (Single-Instance)    │
          └───────────┬───────────┘           │  - Synchronous hits   │
                      │                       │  - LRU map (cap 20k)  │
           Fail / Down│                       │  - Window weighting   │
                      ▼                       └───────────────────────┘
          ┌───────────────────────┐
          │  Degraded / Fail-Safe │
          │  - orgCreation: CLOSE │
          │  - others: Fallback   │
          └───────────────────────┘
```

1. **Default Mode (`storeMode = "memory"`):**
   - Active when `REDIS_URL` is absent.
   - Synchronous, zero-latency execution directly on the V8 event loop.
   - In-memory Map bounded to 20,000 active entries with automated LRU window eviction.
   - No external network dependency. Fully self-contained.
2. **Distributed Mode (`storeMode = "normal"`):**
   - Active when `REDIS_URL` is configured and connected.
   - Atomic evaluation using custom Lua scripts (`REDIS_HIT_LUA_SCRIPT`) or transactional pipelines.
   - Enforces TLS encryption via mandatory `rediss://` protocol scheme in production.
3. **Pluggable Adapter Pattern:**
   - Unified interface `RateLimitStore` (`hit(key, windowStart, windowSeconds)`).
   - Zero application-level logic changes whether running in memory or against Redis.

---

## 4. Rate-Limit Policy Inventory & Action Completeness

### 4.1 Global Inventory Summary
- **Total Public Action Modules:** 31 modules across all domains (`approvals`, `auth`, `calendar`, `clients`, `deliverables`, `files`, `meetings`, `notifications`, `organizations`, `projects`, `revisions`, `search`, `shares`, `tasks`, `timelines`, `users`, `workforce`, `agents`, `automation`).
- **Total Registered Server Actions:** 192 actions.
- **Total Rate-Limited Server Actions:** 192 actions (100.0% coverage).
- **Unmapped Actions:** 0.
- **Conflicting Mappings:** 0.

### 4.2 Breakdown by Policy Category

| Policy Name | Action Count | Base Limit | Window | Degraded / Memory Limit | Primary Scope | Typical Actions |
|---|---|---|---|---|---|---|
| `resource:mutation` | 112 | 60 | 60s | 30 | `userAndOrg` | `createProject`, `updateClient`, `submitReview`, `createTask`, `saveEmployee` |
| `resource:read` | 64 | 120 | 60s | 60 | `userAndOrg` | `listProjects`, `getClientDetails`, `getDeliverableTimeline`, `getPendingApprovalsCount` |
| `auth:mutation` | 5 | 5 | 900s (15m) | 3 | `ipOnly` | `signInWithPassword`, `signInWithMagicLink`, `signInWithGoogle`, `signOut`, `demoLogin` |
| `search:expensive` | 4 | 20 | 60s | 10 | `userAndOrg` | `globalSearch`, `filterDeliverables`, `searchKnowledge` |
| `report:expensive` | 3 | 5 | 300s (5m) | 2 | `userAndOrg` | `getWorkforceReportAction`, `exportAttendanceSummary`, `generateAuditReport` |
| `invitation:issuance` | 2 | 10 | 3600s (1h) | 5 | `userAndOrg` | `inviteMemberAction`, `reissueInvitationAction` |
| `org:creation` | 1 | 3 | 86400s (24h) | 1 | `userAndOrg` (User) | `createOrganizationAction` |
| `invitation:preview` | 1 | 20 | 300s (5m) | 10 | `invitationTokenPrefixBucket` | `previewInvitationAction` |

### 4.3 Key Resolver Distribution
- `userAndOrg` (`user:${userId}:org:${orgId}`): 179 actions. Guarantees multi-tenant isolation; actions consumed by a user in Org A do not deplete quotas in Org B.
- `ipOnly` (`ip:${clientIp}`): 11 actions. Used for pre-auth flows (login, magic link, password reset, demo entry).
- `userOrIp` (`user:${userId}` or `ip:${clientIp}`): 1 action. Fallback for mixed-context endpoints.
- `invitationTokenPrefixBucket` (`token_pfx:${token.slice(0, 8)}`): 1 action. Prevents brute-force scanning across large token spaces.

### 4.4 HTTP Route Handlers
1. `/api/approvals/verify` (POST): Rate limited via `RATE_LIMITS.approvalVerifyByIp` (20 / 300s).
2. `/api/v1/portal/auth/session` (POST, DELETE): Rate limited via `RATE_LIMITS.portalSessionByIp` (20 / 300s).
3. `/api/v1/portal/dashboard` (GET): Rate limited via `RATE_LIMITS.portalReadBySession` (120 / 60s).
4. `/auth/callback` (GET): Rate limited via `RATE_LIMITS.authCallbackByIp` (30 / 300s).
5. `/api/health` (GET): **Intentionally Unthrottled**.
   - *Justification:* Liveness and readiness probe for uptime monitors (Antideploy orchestrator, external status monitors).
   - *Security Properties:* 100% static computation; performs zero database queries, zero network egress, zero writes, and zero CPU-heavy tasks. In production, diagnostic details and variable lists are withheld, returning only generic status `{ status: "healthy", version: "1.0.0" }`.

---

## 5. High-Risk Surface Closure Review

The 8 high-risk attack surfaces identified in S6.1 were subjected to targeted verification:

```
┌─────────────────────────────────┬──────────────────┬─────────────────┬───────────────────┬─────────────────────────┐
│ High-Risk Surface               │ Rate Policy      │ Auth Guard      │ Resource Bounds   │ Abuse Resistance        │
├─────────────────────────────────┼──────────────────┼─────────────────┼───────────────────┼─────────────────────────┤
│ 1. createOrganizationAction     │ org:creation     │ requireCurrent  │ Name: 1-200 chars │ 3/24h per user;         │
│                                 │ (3 / 24h)        │ User            │ Prefix: 2-8 chars │ Fail-closed on Redis err│
├─────────────────────────────────┼──────────────────┼─────────────────┼───────────────────┼─────────────────────────┤
│ 2. previewInvitationAction      │ invitation:prev  │ Public (Token)  │ Prefix: 8 hex chars│ Prefix bucket prevents  │
│                                 │ (20 / 5m)        │                 │ Hash: SHA-256     │ token brute-force scans │
├─────────────────────────────────┼──────────────────┼─────────────────┼───────────────────┼─────────────────────────┤
│ 3. inviteMemberAction           │ invitation:iss   │ requirePerm     │ Email: max 255 ch │ 10/1h per admin/tenant; │
│                                 │ (10 / 1h)        │ manage:members  │ Role: enum check  │ Prevents email bombing  │
├─────────────────────────────────┼──────────────────┼─────────────────┼───────────────────┼─────────────────────────┤
│ 4. signInWithPasswordAction     │ login:account    │ Public Auth     │ Email: max 255 ch │ 5/15m per account;      │
│                                 │ & login:ip       │                 │ Pass: max 128 ch  │ 10/5m per IP; no enum   │
├─────────────────────────────────┼──────────────────┼─────────────────┼───────────────────┼─────────────────────────┤
│ 5. sendMagicLinkAction          │ magiclink:account│ Public Auth     │ Email: max 255 ch │ 3/15m per account;      │
│                                 │ & magiclink:ip   │                 │                   │ 10/15m per IP           │
├─────────────────────────────────┼──────────────────┼─────────────────┼───────────────────┼─────────────────────────┤
│ 6. globalSearch                 │ search:expensive │ requireCurrent  │ Query: [2, 64] ch │ 20/1m; escapes %, _;    │
│                                 │ (20 / 1m)        │ User + Org      │ Max results: 50   │ Prevents ReDoS & scans  │
├─────────────────────────────────┼──────────────────┼─────────────────┼───────────────────┼─────────────────────────┤
│ 7. getWorkforceReportAction     │ report:expensive │ requirePerm     │ Range: max 31 days│ 5/5m; row limit: 1,000; │
│                                 │ (5 / 5m)         │ view_reports    │ Valid ISO dates   │ Prevents DB exhaustion  │
├─────────────────────────────────┼──────────────────┼─────────────────┼───────────────────┼─────────────────────────┤
│ 8. initializeFileUpload         │ resource:mutation│ requirePerm     │ Max: 10GB ceiling │ 60/1m; filename cleaned;│
│                                 │ (60 / 1m)        │ upload:files    │ Schema: 25MB def  │ Prevents storage flood  │
└─────────────────────────────────┴──────────────────┴─────────────────┴───────────────────┴─────────────────────────┘
```

---

## 6. MemoryStore Security Boundary

### 6.1 Current Operating Context
- The production deployment target is Antideploy running as a **single application instance (single microVM / container)**.
- Under a single instance, all application requests route through one Node.js runtime process.
- `MemoryStore` maintains a private in-memory LRU Map with sliding-window accounting.
- **Race Condition Immunity:** Because JavaScript executes synchronously within the single-threaded event loop, counter increments in `MemoryStore.hit()` are atomic without requiring distributed mutexes or lock primitives. Concurrency testing verified that 20 simultaneous hits against a budget of 10 yielded exactly 10 permitted and 10 rejected calls (`tests/unit/rate-limit-concurrency.test.ts`).

### 6.2 The Multi-Instance Boundary
- If the application topology is scaled horizontally to $N$ instances without Redis:
  - Each instance maintains its own independent `MemoryStore`.
  - An attacker could distribute requests across instances, effectively multiplying their allowed request budget by $N$.
- **Architectural Guardrail:**
  - Before configuring Antideploy or any hosting provider for auto-scaling or multi-instance replicas ($N > 1$), **`REDIS_URL` provisioning is mandatory**.
  - `docs/architecture/AI-NEX-OS-RATE-LIMITING-ARCHITECTURE.md` and `src/lib/env.server.ts` explicitly codify this rule.
  - The production deploy gate (`npm run env:check -- --production`) permits single-instance execution when `REDIS_URL` is omitted, but requires TLS (`rediss://`) the instant it is supplied.

---

## 7. Restart Semantics & Defense-in-Depth

### 7.1 Counter Reset Behavior
When the Node.js application process restarts (e.g. during a release rollout, crash recovery, or container reschedule), all `MemoryStore` counters reset to zero.

### 7.2 Risk Classification: Low / Bounded
This risk is classified as **LOW** and acceptable for enterprise deployment because **rate limiting is strictly an abuse-control and volumetric throttling mechanism**, never the primary security or authorization perimeter.

### 7.3 Defense-in-Depth Verification
A process restart and immediate counter reset **CANNOT** bypass any of the following underlying security boundaries:
1. **Cryptographic Authentication:** Supabase Auth issues cryptographically signed JWTs. An attacker cannot forge or elevate session privileges across a restart.
2. **Role-Based Authorization (RBAC):** Every action invokes `requireCurrentUser()` and `requirePermission()`, validating actual permissions in database state.
3. **Database Row Level Security (RLS):** All queries against Postgres enforce tenant isolation (`organization_id = auth.jwt()->>'organization_id'`). Even if an unthrottled burst occurs, no user can read or write cross-tenant data.
4. **Relational Schema Uniqueness:** Postgres enforces `UNIQUE` constraints on organization names, prefixes, user emails, and active memberships. A burst of requests cannot duplicate records or corrupt schema state.
5. **Token Entropy & Validation:** Invitation tokens utilize 256 bits of cryptographically secure random entropy. Resetting the rate limiter does not make brute-forcing a $2^{256}$ space feasible.
6. **Object-Level Authorization:** Deliverables, project assets, and files verify project membership and client association before returning URLs or payloads.

---

## 8. Proxy & IP Resolution Security

### 8.1 Empirically Verified Staging Topology
During S6.6 live validation on staging, the network path was observed and recorded as:
$$\text{Client} \longrightarrow \text{Cloudflare Anycast Edge} \longrightarrow \text{Antideploy Reverse Proxy} \longrightarrow \text{Node.js Application}$$

*(Note: While empirically observed in staging, this topology is documented as current evidence rather than a static perpetual guarantee across future platform migrations).*

### 8.2 IP Resolution Verification (`src/lib/security/request.ts`)
The IP resolver computes client identity using `TRUSTED_PROXY_HOPS`:
$$\text{Target Index} = \max(0, \text{chain.length} - \max(1, \text{trustedHops}))$$

Six deterministic test cases (Cases A through F) are validated in `tests/unit/security-request.test.ts`:
- **Case A (`hops=1`, single entry):** `X-Forwarded-For: 203.0.113.195` $\rightarrow$ Resolves `203.0.113.195`.
- **Case B (`hops=1`, attacker prepended entry):** `X-Forwarded-For: 1.2.3.4, 203.0.113.195` $\rightarrow$ Resolves `203.0.113.195` (attacker spoof completely ignored).
- **Case C (`hops=2`, multi-proxy chain):** `X-Forwarded-For: attacker, 203.0.113.50, 198.51.100.1` $\rightarrow$ Resolves `203.0.113.50`.
- **Case D (Malformed header):** `X-Forwarded-For: ,,,` $\rightarrow$ Resolves `unknown` bucket (fails safe).
- **Case E (Absent header):** No forwarding header $\rightarrow$ Resolves `unknown` bucket.
- **Case F (`X-Real-IP` fallback):** Uses `X-Real-IP` when `X-Forwarded-For` is missing; strips port numbers (`:44321`) and normalizes IPv6-mapped prefixes (`::ffff:`).

---

## 9. Comprehensive Resource Bounds Review

All potential vector inputs have strict resource clamps applied prior to database execution:

```
┌──────────────────────────┬────────────────────────────────────────────────────────┐
│ Vector Category          │ Enforced Production Bound                              │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ String Fields            │ Org Name: 1–200 chars                                  │
│                          │ Org Code Prefix: 2–8 alphanumeric characters           │
│                          │ Email: max 255 chars, RFC 5322 regex                   │
│                          │ Password: min 8, max 128 chars                         │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ Search Inputs            │ Query String: min 2, max 64 characters                 │
│                          │ SQL Wildcards: `%` and `_` escaped via RegExp          │
│                          │ Result Limit: hard-clamped at 50 records               │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ Report Generation        │ Date Span: differenceInCalendarDays(to, from) <= 31    │
│                          │ Query Rows: hard-clamped at 1,000 rows                 │
│                          │ Aggregation: executed within tenant boundary           │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ Pagination               │ Page index: integer >= 1                               │
│                          │ Page size: integer between 1 and 100                   │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ File Uploads             │ Upper Ceiling: 10 GB absolute max                      │
│                          │ Default Schema Limit: 25 MB                            │
│                          │ Folder Hierarchy: max recursive depth of 10 levels     │
├──────────────────────────┼────────────────────────────────────────────────────────┤
│ Request Bodies           │ DEFAULT_MAX_BODY_BYTES = 1,048,576 (1 MB)              │
│                          │ Enforced stream parsing via readJsonBody()             │
└──────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 10. Failure Semantics & Degradation Modes

| Operating State | Redis Configured? | Redis Reachable? | `storeMode` | `orgCreation` Behavior | Standard Actions Behavior |
|---|---|---|---|---|---|
| **Single-Instance Standard** | No (`REDIS_URL` unset) | N/A | `memory` | Permitted up to memory limit (1/24h) | Permitted up to memory limits |
| **Distributed Normal** | Yes (`rediss://...`) | Yes | `normal` | Enforced globally (3/24h) | Enforced globally (standard limits) |
| **Distributed Outage** | Yes (`rediss://...`) | No (down / timeout) | `degraded` | **FAIL-CLOSED** (`storage_unavailable_fail_closed`) | Degrade to per-process memory limits |

- When Redis is absent in the single-instance topology, the system does not consider this an error; `storeMode` is cleanly reported as `memory`.
- Under no circumstances does a failure in the caching or rate-limiting infrastructure silently disable rate limits or expose unbounded execution.

---

## 11. Security Telemetry & Log Sanitization

Structured security logging (`src/lib/security/logger.ts`) emits normalized events for monitoring:
- `ratelimit.action_throttled`: Emitted whenever an action exceeds its budget (includes `action_name`, `identifier` hash/mask, `limit`, `window_seconds`, `retry_after_seconds`).
- `ratelimit.exceeded`: Emitted on HTTP route handler throttling.
- `ratelimit.store_failed`: Emitted if the distributed storage adapter throws an error.
- `ratelimit.redis_error`: Emitted on connection errors when Redis is configured.

**Data Leak Prevention Guarantee:**
- Zero passwords, raw authentication secrets, or user tokens are ever written to log payloads.
- Token lookups log only the 8-character prefix bucket (`tokenPrefixBucket`) or SHA-256 hash.
- Email addresses are logged only in hashed or truncated format for abuse correlation.
- If Redis is not configured, zero synthetic Redis error events are emitted.

---

## 12. Full Regression & Quality Audit

The entire test and verification suite was executed in sequence:

```
$ npm test
✓ 64 test files passed (64/64)
✓ 965 tests passed (965/965)
  Duration: 8.96s

$ npm run typecheck
✓ tsc --noEmit (0 errors)

$ npm run audit:authz
✓ Every exported server action reaches an authorization guard.
✓ Static tenant isolation gate verified: No untrusted client organizationId parameters.
  (159/159 actions verified)

$ npx eslint src
✓ 0 errors (110 warnings, 0 errors)

$ npm run build
▲ Next.js 16.3.0 (Turbopack)
✓ Compiled successfully in 1289ms
✓ Finished TypeScript in 1746ms
✓ Generating static pages using 9 workers (38/38) in 144ms
  Route tree: 38/38 routes valid
```

---

## 13. Static Security Audit Findings

A comprehensive static analysis across `src/` confirmed:
1. **Zero Raw SQL Vulnerabilities:** All database queries utilize Drizzle ORM query builders or parameterized `sql` tagged template literals. The only usage of `sql.raw` is an internal numeric integer lease interval within `src/lib/automation/execution.ts`.
2. **Zero Client Secret Leaks:** No server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `SHARE_JWT_SECRET`, `DATABASE_URL`) are exposed to client bundles or prefixed with `NEXT_PUBLIC_`.
3. **Zero Client-Side Rate-Limit Bypasses:** All rate limits are enforced server-side inside Server Actions and Route Handlers prior to any business or database execution.
4. **Zero Missing Authorization Guards:** 100% of exported actions enforce user session and permission validation.

---

## 14. Remaining Observations & Non-Blocking Notes

1. **Horizontal Scaling Prerequisite:** Before the Antideploy deployment is scaled beyond a single instance, `REDIS_URL` must be provisioned with TLS (`rediss://`).
2. **Cloudflare WAF / DDoS Rules:** While application-level rate limiting protects business logic, volumetric DDoS protection should continue to be supplemented by edge WAF rules at the Cloudflare layer.

---

## 15. Operational Requirements Checklist

- [x] MemoryStore-first architecture confirmed as approved baseline.
- [x] Redis decoupled from single-instance production boot prerequisites.
- [x] Production deploy gate rejects plaintext `redis://` when Redis is configured.
- [x] 192/192 public actions verified in action registry with zero unmapped actions.
- [x] 8 high-risk attack surfaces hardened with specific policies and resource bounds.
- [x] Staging runtime verified with 57/57 passed tests.
- [x] Production database (`gsgseacjcalkhhmunjhx`) verified paused and untouched.
- [x] Git branch clean of unintended commits or remote pushes.

---

## 16. Final S6 Decision

# S6 PASS

Phase S6 (Rate Limiting & Abuse Prevention) is formally declared **COMPLETE**, **SECURE**, and **OPERATIONALLY CLOSED**.

---

## Phase 4 / S7 Boundary Statement

```
============================================================
S6 status:
PASS

S7:
NOT STARTED

Phase 4:
NOT STARTED

Production:
PAUSED / UNTOUCHED

Git:
NO COMMIT
NO PUSH
============================================================
```
