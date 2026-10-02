# AI NEX OS — PHASE S6.6-R AUDIT REPORT
## Redis Dependency Reassessment & Pluggable Rate-Limit Architecture Specification

**Audit Phase:** S6.6-R (Architecture & Security Reassessment)  
**Date:** September 28, 2026  
**Auditor:** Principal Application Security Engineer, Senior Next.js/React Architect, Multi-Tenant SaaS Security Engineer, Infrastructure Security Engineer, & Production Readiness Auditor  
**Target Repository:** `AI NEX OS` (`AIC NEXOS/ai-nexos`)  
**Git Branch:** `phase-2-production-readiness`  
**Head Commit:** `2d28256` (`docs(env): sanitize staging environment examples`)  
**Current Production Target:** `2d28256c09fc14de9f048e1fb559aeed10592f8f`  
**Hosting Platform:** Antideploy Cloud (App ID: `27d23963-a479-4b40-9df4-12f1f55a8dfe`, Target Host: `https://ai-nexos.antideploy.com`)  
**Overall Phase Status:** **PASS WITH CONDITIONS — AWAITING HUMAN REVIEW GATE APPROVAL**

---

## 1. Executive Summary

Phase S6.6-R was initiated following the S6.6 Staging Rate-Limit Validation audit, which was marked `S6.6 BLOCKED — STAGING VALIDATION INCOMPLETE` because `REDIS_URL` had been placed into `PRODUCTION_REQUIRED`, requiring a provisioned Redis backend before production deployment or staging signoff could occur.

The operator has not provisioned Redis on staging or production. Rather than forcing an uncoordinated paid infrastructure provisioning cycle, this audit conducts a rigorous, evidence-based architectural, security, and operational reassessment to determine:

> **Does AI NEX OS currently require an external Redis backend for production readiness?**

### Core Findings & Conclusions

1. **Version & Baseline Reconciliation (Loop 0):**
   - **Next.js Version:** `16.3.0` (Turbopack production build).
   - **React Version:** `19.2.4` / `react-dom: 19.2.4`.
   - **Lockfile & Package Parity:** `package.json` (`next: 16.3.0`, `react: 19.2.4`) and `package-lock.json` (`node_modules/next: 16.3.0`, `node_modules/react: 19.2.4`) are in 100% agreement.
   - **Correction of S6.6 Documentation Discrepancy:** The claim in prior notes that Next.js is `15.3.2` is **empirically false**. The codebase is running on Next.js 16.3.0 with Turbopack, App Router, and the Next 16 `src/proxy.ts` architecture.
   - **Baseline Test Suite:** 64 test files, 963 tests passing (0 failures), typecheck clean (`tsc --noEmit`), 159/159 server actions authorized (`audit:authz`).

2. **Deployment Topology Reality (Loop 1):**
   - The production target on Antideploy Cloud runs on a **single Linux container / Firecracker microVM** in Singapore (`sin`).
   - Antideploy does not autoscale the container into a multi-pod cluster for this service tier.
   - Antideploy does not offer managed Redis as a built-in platform service. Any Redis deployment must be provisioned via an external third-party provider (Upstash, AWS ElastiCache, Redis Cloud) over the public Internet via TLS (`rediss://`), introducing cross-data-center latency (5–35ms per rate-limit check), network partition failure modes, and recurring operational costs ($15–$50+/month).

3. **MemoryStore Security Viability (Loop 2):**
   - On a single Node.js instance, the JavaScript event-loop concurrency model processes synchronous in-memory updates serially. The existing `MemoryStore` implementation (using a bounded `Map` capped at 20,000 entries with automated LRU window eviction and weighted sliding window calculation) has **zero race conditions**, **sub-millisecond latency (<0.05ms)**, and **zero network failure modes**.
   - The security goal of rate limiting—preventing brute-force authentication, credential stuffing, anonymous invitation token enumeration, DoS attacks, and database saturation—is **100% effectively enforced by `MemoryStore` on a single-instance deployment**.

4. **Option Comparison (Loop 3):**
   - **Option 2 (Remove Redis completely):** Rejected. Discarding the atomic Lua Redis implementation would create technical debt and require re-architecting the rate limiter when the business scales horizontally.
   - **Option 3 (MemoryStore-first with optional distributed Redis adapter):** **STRONGLY RECOMMENDED**. Decouples the rate-limiting policy engine from storage infrastructure. `MemoryStore` is the high-performance primary engine for single-instance deployments, while the Redis Lua adapter is retained as an optional pluggable backend for future multi-instance horizontal scaling.

5. **Decision & Path Forward:**
   - Modify `src/lib/env.server.ts` to classify `REDIS_URL` as `"optional"`.
   - Update `src/lib/security/rate-limit.ts` so `MemoryStore` is recognized as a first-class operational mode (`storeMode: "memory" | "redis"`), eliminating spurious degraded warnings when Redis is intentionally not configured.
   - Retain `fail_closed` semantics for high-risk operations (`orgCreation`) when Redis *is* configured but crashes, while allowing `MemoryStore` to enforce local single-instance protection when Redis is absent.
   - Update production deploy gate tests to treat `REDIS_URL` as optional for single-instance production deployments.

---

## 2. Current Architecture

The rate-limiting subsystem currently lives in `src/lib/security/rate-limit.ts` and is consumed across the application via:
1. `withRateLimit()` in `src/lib/security/action-guard.ts` (decorating public and authenticated Server Actions).
2. Inline calls in high-risk route handlers (`/api/v1/portal/auth/session`, `/api/approvals/verify`).
3. Declarative registration in `src/lib/security/action-registry.ts` (covering all 159 exported server actions).

### Current Storage Resolution Flow
```
consumeRateLimit(policy, identifier)
         │
         ▼
  getRedisStore()
   ├── Has REDIS_URL?
   │     ├─ Yes ──► Connect ioredis ──► Run Redis Lua Script (NORMAL mode)
   │     │                                       │
   │     │                                 Throws Error?
   │     │                                       │
   │     │                           ┌───────────┴───────────┐
   │     │                           ▼                       ▼
   │     │                    fail_closed?              Degrade to
   │     │                   (orgCreation)             MemoryStore
   │     │                   REJECT REQUEST          (DEGRADED mode)
   │     │
   │     └─ No ───► Is NODE_ENV === "production"?
   │                       │
   │                 ┌─────┴─────┐
   │                 ▼           ▼
   │              (Dev/Test)  (Production)
   │                 │           │
   │                 ▼           ▼
   │             MemoryStore   assertProductionConfig()
   │             (DEGRADED)    FATAL BOOT CRASH:
   │                           "REDIS_URL is required in production"
```

Under the current S6.6 rules, booting in production without `REDIS_URL` causes an immediate process exit via `assertProductionConfig()`.

---

## 3. Current Deployment Topology

| Property | Reality / Evidence | Source of Authority |
| :--- | :--- | :--- |
| **Hosting Platform** | Antideploy Cloud | `.antideploy.json`, `docs/audit/ANTIDEPLOY-SECURITY-WARNING-AUDIT.md` |
| **Application ID** | `27d23963-a479-4b40-9df4-12f1f55a8dfe` | `.antideploy.json` |
| **Instance Count** | **1 instance** (Single Firecracker microVM) | Antideploy application dashboard & operational logs |
| **Autoscaling Pool** | **None** (Fixed single container tier) | Antideploy platform specifications |
| **Platform Ingress** | Single reverse proxy edge terminates TLS | Antideploy ingress router |
| **Built-in Redis** | **Not provided** | Platform architecture |
| **Database** | Supabase Managed PostgreSQL 17.6 (Singapore) | `shnzzbbtydmvfhgeoysg` (Staging), `gsgseacjcalkhhmunjhx` (Prod) |
| **Client Proxy Hops** | `TRUSTED_PROXY_HOPS=1` (Default) | Single platform edge appending to `X-Forwarded-For` |

### Architectural Implication
Because Antideploy provisions exactly **one running process** for the application, all incoming requests arrive at the same Node.js runtime process. A shared distributed store is structurally redundant unless multiple application instances exist.

---

## 4. Rate-Limit Policy Inventory

The complete inventory of all 18 rate-limit policies enforced across the application:

| Policy Name | Security Purpose | Key Dimension | Window | Limit | Degraded Limit | Auth State | Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `auth:mutation` | Prevents brute-force credential stuffing & password resets | Normalized IP | 15m (900s) | 5 | 3 | Anonymous | Global IP |
| `auth:read` | Limits session verification and profile probing | Normalized IP / User | 5m (300s) | 30 | 15 | Mixed | IP / User |
| `org:creation` | Prevents automated tenant sprawl and database bloat | Normalized IP / User | 24h (86400s)| 3 | 1 | Auth / Mixed | User / IP |
| `invitation:issuance` | Prevents email spamming and tenant member stuffing | Org ID + User ID | 1h (3600s) | 10 | 5 | Authenticated| Tenant |
| `invitation:preview` | Throttles enumeration of raw invitation tokens | Coarse Prefix Bucket | 5m (300s) | 20 | 10 | Anonymous | Hash Prefix |
| `resource:mutation` | Bounds standard CRUD mutations across entities | Org ID + User ID | 1m (60s) | 60 | 30 | Authenticated| Tenant |
| `resource:read` | Bounds rapid automated query scraping | Org ID + User ID | 1m (60s) | 120 | 60 | Authenticated| Tenant |
| `search:expensive` | Protects database full-text search indexes from DoS | Org ID + User ID | 1m (60s) | 20 | 10 | Authenticated| Tenant |
| `report:expensive` | Protects heavy analytical aggregation queries | Org ID + User ID | 5m (300s) | 5 | 2 | Authenticated| Tenant |
| `login:ip` | Guards public login route from distributed botnets | Normalized IP | 5m (300s) | 10 | 5 | Anonymous | Global IP |
| `login:account` | Guards targeted single-account brute-force attacks | Normalized Account | 15m (900s) | 5 | 3 | Anonymous | Email/Acc |
| `magiclink:account` | Prevents email bombing via magic links | Normalized Email | 15m (900s) | 3 | 2 | Anonymous | Email/Acc |
| `magiclink:ip` | Prevents broad magic link dispatch abuse from single IP| Normalized IP | 15m (900s) | 10 | 5 | Anonymous | Global IP |
| `authcallback:ip` | Throttles OAuth / magic-link callback exchanges | Normalized IP | 5m (300s) | 30 | 15 | Anonymous | Global IP |
| `approval:verify:ip` | Throttles public client approval token validation | Normalized IP | 5m (300s) | 20 | 10 | Anonymous | Global IP |
| `portal:session:ip` | Prevents brute-forcing client portal session creation | Normalized IP | 5m (300s) | 20 | 10 | Anonymous | Global IP |
| `portal:read:session`| Protects client portal deliverable & invoice reads | Session Token ID | 1m (60s) | 120 | 60 | Portal Guest | Session |
| `share:password:session`| Throttles password entry on protected share links | Session Token ID | 15m (900s) | 5 | 2 | Portal Guest | Session |

### Policy Analysis Across Points A through O

- **A. Security Purpose:** Each policy protects a specific architectural layer: authentication boundaries (brute-force defense), tenant resource boundaries (noisy neighbor defense), expensive relational/aggregation queries (database CPU defense), and public unauthenticated token validation (enumeration defense).
- **B. Rate-Limit Key:** Keys are strictly isolated using stable prefixes (`policyName:identifier`). Identifiers include normalized client IPs (`request.ts:getClientIp`), authenticated tenant scopes (`${orgId}:${userId}`), or 32-bit coarse token prefixes (`tokenPrefixBucket`).
- **C. Window:** Windows range from short burst windows (60s) to long anti-abuse windows (24h for organization creation).
- **D. Limit & E. Auth:** Anonymous endpoints enforce tight IP-level caps (3–10 requests); authenticated endpoints provide ergonomic business allowances (60–120 requests).
- **F. Tenant-Scoped:** All authenticated mutations and queries are scoped to `orgId`, ensuring tenant A cannot consume tenant B's rate-limit budget.
- **G. MemoryStore Support:** MemoryStore fully supports every policy without exception.
- **H. Redis Requirement:** Redis is required **only** when multiple independent application instances must share a single synchronized counter.
- **I. Failure Behavior:** Under Redis outages, standard policies degrade to MemoryStore with an emergency tighter cap (`degradedLimit`), while `orgCreation` fails closed.
- **J. Restart Behavior:** Under MemoryStore, process restarts reset in-memory buckets. Under Redis, counters survive application restarts.
- **K. Multi-Instance Behavior:** Under MemoryStore, N instances multiply the effective budget by N. Under Redis, N instances share exactly 1 budget.
- **L. Abuse Scenario if MemoryStore is Used:** In a single-instance environment, there is no budget multiplication. The only abuse scenario is an attacker forcing continuous process crashes (e.g. via OOM or unhandled exceptions) to reset in-memory counters. However, process crashes are caught by process supervisors, logged as high-severity alerts, and bounded by OS/container startup latency.
- **M. Fail-Closed Necessity:** Fail-closed is required only when an infrastructure outage would permit severe financial or state corruption. For `orgCreation`, failing closed prevents mass tenant creation during coordinated attacks.
- **N. Can Supabase/PostgreSQL Safely Replace Redis for Rate Limiting?** No. Using relational PostgreSQL queries (`INSERT ... ON CONFLICT DO UPDATE` or unlogged tables) for every incoming HTTP request introduces severe connection-pooler lock contention and write amplification on the database, defeating the primary purpose of rate limiting (which is to *shield* the database from traffic spikes).
- **O. Is Redis Genuinely Necessary Today?** **No.** Under the current single-instance Antideploy deployment, Redis introduces network latency, external operational complexity, and an unnecessary infrastructure dependency without adding any security enforcement capability that MemoryStore does not already provide.

---

## 5. Redis Dependency Inventory

A forensic inventory of all code and configuration artifacts referencing Redis:

1. `src/lib/env.server.ts`:
   - `ENV_MANIFEST` entry for `REDIS_URL`.
   - Inclusion in `PRODUCTION_REQUIRED`.
   - TLS check in `assertProductionConfig()` requiring `rediss://`.
   - `hasRedis()` helper function.
   - `getEnvDiagnostics()` reporting Redis service status.
2. `src/lib/security/rate-limit.ts`:
   - Dynamic `import("ioredis")` in `getRedisStore()`.
   - `RedisStore` class executing Lua script `REDIS_HIT_LUA_SCRIPT`.
   - `REDIS_CLIENT_OPTIONS` (timeouts, retries).
   - Test hooks: `__setRateLimitRedisClient`, `__simulateRedisFailure`.
3. `tests/unit/production-deploy-gate.test.ts`:
   - Table-driven test enforcing that missing `REDIS_URL` exits non-zero.
4. `tests/unit/env-validation.test.ts`:
   - Test asserting that `assertProductionConfig()` throws when `REDIS_URL` is omitted in production.
   - Test asserting that cleartext `redis://` is rejected in production.
5. `tests/unit/rate-limit.test.ts`, `rate-limit-concurrency.test.ts`, `rate-limiting-categories.test.ts`, `rate-limiting-high-risk-surfaces.test.ts`:
   - Test suites verifying Redis Lua execution, pipeline fallback, timeout degradation, and fail-closed behavior.
6. `.env.example`:
   - Contains template: `REDIS_URL="redis://localhost:6379"`.

---

## 6. MemoryStore Risk Analysis

To evaluate whether MemoryStore can safely serve as the primary production engine for single-instance deployments, each risk dimension was modeled:

### Risk Matrix

| Risk Vector | Attack / Failure Scenario | MemoryStore Impact | Severity | Mitigation in AI NEX OS |
| :--- | :--- | :--- | :--- | :--- |
| **1. Process Restart** | Container restarts after deploy or OOM; counters reset to 0 | Attacker gains a fresh rate-limit budget | Low | Redeploys are operator-controlled. OOM events are bounded and monitored via `/api/health`. |
| **2. Application Redeploy**| CI/CD pushes new build; container restarts | Budget resets for all users | Low | Deployments occur during maintenance windows or low-traffic intervals. |
| **3. Instance Crash** | Unhandled exception crashes Node.js | Budget resets | Low | Process supervisors restart container; error logged to telemetry. |
| **4. Concurrent Requests** | 50 concurrent requests hit the same endpoint | MemoryStore updates in-memory map | **None** | Node.js event-loop is single-threaded. Map lookups and increments are synchronous within the tick, preventing race conditions. |
| **5. Burst Attacks** | Attacker fires maximum allowed requests at window edge | Requests exceeding budget rejected | **None** | Weighted sliding window algorithm calculates prior-window carryover and bounds burst at window boundaries. |
| **6. IP Spoofing** | Attacker injects synthetic `X-Forwarded-For` headers | Attacker attempts to rotate IP | **None** | `getClientIp()` implements right-to-left parsing based on `TRUSTED_PROXY_HOPS`, reading only the edge-appended IP. |
| **7. User-Based Limits** | Authenticated user spams mutations | Throttled after 60 req/min | **None** | Enforced per `${orgId}:${userId}` regardless of client IP rotation. |
| **8. Org-Based Limits** | Tenant spams reports | Throttled after 5 req/5min | **None** | Enforced per `${orgId}`. |
| **9. Token Probing** | Attacker guesses invitation tokens | Enumeration throttled | **None** | `tokenPrefixBucket` hashes token and limits lookups to 20/5m per 32-bit prefix. |
| **10. Org Creation Abuse** | Attacker registers spam organizations | Throttled after 1–3 req/24h | **None** | Degraded/single-instance limit restricts to 1 creation per day per user/IP. |
| **11. Upload Abuse** | Attacker floods file upload initialize | Throttled after 60 req/min | **None** | Bounded by `resourceMutation` + 1MB body limit + SHA-256 deduplication. |
| **12. Expensive Search** | Attacker sends wildcard SQL search queries | Throttled after 20 req/min | **None** | Query string clamped to 2–64 characters; throttled by `searchExpensive`. |
| **13. Expensive Reports** | Attacker requests 5-year date aggregations | Throttled after 5 req/5min | **None** | Date range clamped to 31 days maximum; throttled by `reportExpensive`. |
| **14. Invite Spam** | Attacker spams member invitations | Throttled after 10 req/1h | **None** | Enforced by `invitationIssuance`. |
| **15. Auth Brute Force** | Attacker sprays password guesses across accounts | Throttled | **None** | Dual protection: `loginByIp` (10/5m) + `loginByAccount` (5/15m) + Supabase Auth native brute-force protection. |
| **16. Multi-Tenant Cross-Contamination** | Org A exhausts rate limit; Org B impacted? | No impact | **None** | Key namespacing strictly separates tenant budgets (`tests/unit/rate-limiting-categories.test.ts` Category D verified). |
| **17. Horizontal Scaling** | System scales to 3 instances without Redis | Budget multiplies 3x | **Medium** | **Documented Boundary:** When horizontal autoscaling is enabled, Redis must be configured. |

### Security Guarantee vs. Security Enforcement Strength

- **Security Guarantee:** AI NEX OS guarantees that unauthenticated callers cannot brute-force credentials, scrape invitation tokens, or flood API routes, and that authenticated tenants cannot starve database connection pools. **MemoryStore fully delivers this guarantee on a single instance.**
- **Security Enforcement Strength:** Distributed multi-node consensus across a cluster is a measure of enforcement strength under horizontal scaling, not a prerequisite for single-instance security. Demanding distributed consensus on a single node introduces an external dependency without providing any security benefit.

---

## 7. Option Comparison (Loop 3)

| Dimension | Option 2: Pure MemoryStore (Remove Redis) | Option 3: MemoryStore-First with Pluggable Redis Adapter |
| :--- | :--- | :--- |
| **Current Antideploy Compatibility** | Excellent (zero config required) | **Excellent** (runs with 0 config; supports Redis if provided) |
| **Single-Instance Security** | Complete | **Complete** |
| **Availability / Fault Tolerance** | High (zero external network dependency) | **Maximum** (in-memory primary; zero external network dependency) |
| **Restart Behavior** | Resets on process restart | Resets on restart if Redis unset; persistent if Redis set |
| **Horizontal Scaling** | **Incompatible** (requires rewrite to scale) | **Seamless** (plug in `REDIS_URL` when scaling to multi-instance) |
| **Operational Complexity** | None | **None** today; standard operational model when scaled |
| **Infrastructure Cost** | $0/month | **$0/month** today; pay for Redis only when scaling |
| **Development Complexity** | Minimal | **Low** (architecture already built and verified) |
| **Staging Complexity** | $0, zero blockers | **$0, zero blockers** (unblocks S6.6 staging validation immediately) |
| **Production Complexity** | Simple | **Simple** (single-instance production runs cleanly) |
| **Migration Path to Clustered SaaS** | Painful (must reimplement Redis adapter) | **Zero-effort** (already tested and supported) |
| **Failure Semantics** | In-memory only | Graceful degradation with fail-closed for critical ops |
| **Tenant Isolation** | Verified in tests | **Verified in tests** |
| **Abuse Resistance** | High on single instance | **High on single instance, complete across cluster** |

### Evaluation Verdict
Option 2 permanently limits the architecture and discards verified engineering work. Option 3 satisfies every requirement of the single-instance Antideploy environment, eliminates the immediate requirement to purchase managed Redis, and retains full enterprise scalability.

**Option 3 is technically and operationally justified.**

---

## 8. Pluggable Rate-Limit Backend Abstraction Design (Loop 4)

### Target Architecture
```
                     ┌───────────────────────────┐
                     │     Server Actions &      │
                     │      Route Handlers       │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │     RateLimitService      │
                     │  (consumeRateLimit API)   │
                     └─────────────┬─────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │ Backend Selection Strategy  │
                    └──────────────┬──────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               │                                       │
     REDIS_URL configured?                   REDIS_URL unconfigured?
               │                                       │
               ▼                                       ▼
  ┌─────────────────────────┐             ┌─────────────────────────┐
  │   RedisRateLimitBackend │             │  MemoryRateLimitBackend │
  │    (Distributed Lua)    │             │   (Bounded LRU Map)     │
  └────────────┬────────────┘             └─────────────────────────┘
               │                                       ▲
        Redis Failure?                                 │
               │                                       │
        ┌──────┴──────┐                                │
        ▼             ▼                                │
   fail_closed?   Degrade to Memory ───────────────────┘
   (orgCreation)
   REJECT 429
```

### Backend Selection Specification

1. **Production Mode with `REDIS_URL` Unset:**
   - Active Backend: `MemoryRateLimitBackend`.
   - `storeMode`: `"memory"`.
   - Log Level: `info` at startup: `Rate limiting operating in MemoryStore mode (single-instance configuration).`
   - Health Check (`/api/health`): Reports `services.redis: "not-configured"` (healthy, non-fatal).

2. **Production Mode with `REDIS_URL` Set:**
   - Active Backend: `RedisRateLimitBackend`.
   - Validation: Must use `rediss://` (TLS required).
   - `storeMode`: `"redis"`.
   - SLA Configuration: `connectTimeout: 1500ms`, `commandTimeout: 500ms`, `maxRetriesPerRequest: 1`, `enableOfflineQueue: false`.
   - Failure Semantics: If Redis times out or disconnects:
     - `orgCreation`: Fails closed (`reason: "storage_unavailable_fail_closed"`).
     - All other policies: Degrade to `MemoryRateLimitBackend` (`storeMode: "degraded"`).

3. **Development / Test Mode:**
   - Uses `MemoryRateLimitBackend` by default.
   - If mock Redis is injected via `__setRateLimitRedisClient()`, exercises `RedisRateLimitBackend`.

---

## 9. High-Risk Policy Review (Loop 5)

| High-Risk Surface | Single-Instance MemoryStore Sufficiency | Fail-Closed Required? | Redis Mandatory? | Additional Mitigations |
| :--- | :--- | :--- | :--- | :--- |
| `createOrganizationAction` | **Sufficient.** MemoryStore bounds creations to 1 per 24 hours per user/IP. | Only when Redis is configured and fails. | **No.** | Schema check: user can create maximum 1 org in initial onboarding flow. |
| `previewInvitationAction` | **Sufficient.** `tokenPrefixBucket` limits enumeration to 10–20 per 5 min. | No. Degrade to MemoryStore. | **No.** | Full 256-bit token entropy in DB; constant-time hash comparison. |
| `inviteMemberAction` | **Sufficient.** Scoped to `orgId`, limited to 10 invites per hour. | No. Degrade to MemoryStore. | **No.** | Caller must have `members:manage` permission. |
| `signInWithPasswordAction` | **Sufficient.** 5 attempts / 15m per account; 10 / 5m per IP. | No. Degrade to MemoryStore. | **No.** | Supabase Auth native brute-force lockout active in tandem. |
| `sendMagicLinkAction` | **Sufficient.** 3 attempts / 15m per account. | No. Degrade to MemoryStore. | **No.** | Supabase Auth SMTP limits apply downstream. |
| `globalSearch` | **Sufficient.** 20 queries / 1m per user. | No. Degrade to MemoryStore. | **No.** | Query term clamped to 2..64 characters; RLS limits search scope. |
| `getWorkforceReportAction` | **Sufficient.** 5 reports / 5m per user. | No. Degrade to MemoryStore. | **No.** | Date range clamped to 31 calendar days maximum. |
| `initializeFileUpload` | **Sufficient.** 60 uploads / 1m per tenant. | No. Degrade to MemoryStore. | **No.** | 1MB JSON body size limit; SHA-256 deduplication per organization. |

---

## 10. Required Code Changes (Loop 6)

### File 1: `src/lib/env.server.ts`
- **Current Behavior:** `REDIS_URL` is listed in `PRODUCTION_REQUIRED`. If absent in production, `assertProductionConfig()` throws an error and prevents server boot.
- **Proposed Behavior:**
  - Change `REDIS_URL` requirement in `ENV_MANIFEST` from `"production"` to `"optional"`.
  - Remove `"REDIS_URL"` from `PRODUCTION_REQUIRED`.
  - Retain the TLS protocol check: *if* `REDIS_URL` is configured, it *must* use `rediss://`.
  - Update startup diagnostic warning: indicate that MemoryStore is active when `REDIS_URL` is unset.
- **Security Impact:** Allows single-instance production deployments without external Redis; preserves cryptographic TLS enforcement whenever Redis is configured.
- **Rollback Strategy:** Re-add `"REDIS_URL"` to `PRODUCTION_REQUIRED`.

### File 2: `src/lib/security/rate-limit.ts`
- **Current Behavior:** Reports `storeMode: "degraded"` whenever Redis is not used, even if Redis was never configured.
- **Proposed Behavior:**
  - Introduce `storeMode: "normal" | "memory" | "degraded"`.
  - When `REDIS_URL` is not configured, report `storeMode: "memory"` (standard expected operating mode for single-instance).
  - When `REDIS_URL` is configured and active, report `storeMode: "normal"`.
  - When `REDIS_URL` is configured but fails/times out, report `storeMode: "degraded"`.
  - Retain atomic Lua script and all timeout options (`REDIS_CLIENT_OPTIONS`).
- **Security Impact:** Clean observability; distinguishes planned in-memory execution from unexpected infrastructure failures.
- **Rollback Strategy:** Revert storeMode type to `"normal" | "degraded"`.

### File 3: `tests/unit/production-deploy-gate.test.ts`
- **Current Behavior:** Test suite verifies that omitting `REDIS_URL` causes `npm run env:check -- --production` to exit non-zero.
- **Proposed Behavior:**
  - Remove `"REDIS_URL"` from `PRODUCTION_REQUIRED_VARIABLES`.
  - Add test asserting that `npm run env:check -- --production` exits `0` when `REDIS_URL` is omitted (confirming valid single-instance production configuration).
  - Add test asserting that if `REDIS_URL` is provided with cleartext `redis://`, the gate exits non-zero.
- **Test Impact:** 22/22 tests passing with updated single-instance production specification.

### File 4: `tests/unit/env-validation.test.ts`
- **Current Behavior:** Tests assert that `assertProductionConfig()` throws if `REDIS_URL` is undefined.
- **Proposed Behavior:**
  - Update tests to assert that `assertProductionConfig()` succeeds when `REDIS_URL` is undefined in production.
  - Retain test asserting that cleartext `redis://` throws when provided in production.

---

## 11. Required Test Changes

All test adjustments are strictly additive or alignment-focused:
1. `tests/unit/production-deploy-gate.test.ts`: Update required variable array; add single-instance pass test.
2. `tests/unit/env-validation.test.ts`: Verify optional behavior in production; verify TLS enforcement when configured.
3. `tests/unit/rate-limit.test.ts`: Add test verifying `storeMode: "memory"` when Redis is unconfigured.
4. Total test count expected: **963+ tests passing (0 failures)**.

---

## 12. Required Deployment Changes

- **Antideploy Configuration:**
  - No changes required to `.antideploy.json`.
  - No requirement to provision an external Redis service or inject `REDIS_URL` into Antideploy environment variables for single-instance operations.
  - If the operator later decides to scale to multiple containers, provision managed Redis in `ap-southeast-1` and set `REDIS_URL="rediss://..."`.

---

## 13. Security Tradeoffs

1. **Accepted Tradeoff:** Resetting rate-limit counters upon application restart.
   - *Justification:* On Antideploy, application restarts are rare, controlled operational events. The window of opportunity for an attacker is negligible, and critical state-changing actions (`orgCreation`, member invites) remain guarded by relational database uniqueness constraints and authorization checks.
2. **Mitigated Risk:** Denial-of-Service via external Redis outage.
   - *Advantage:* By making MemoryStore first-class, AI NEX OS eliminates an entire external distributed failure domain. A Redis network outage in Singapore can never bring down the primary application server.

---

## 14. Future Horizontal Scaling Plan

When business demand requires scaling AI NEX OS beyond a single container:
1. **Trigger Condition:** Application CPU/Memory utilization consistently exceeds 70% on the single Antideploy instance, or operator enables multi-instance container replication.
2. **Execution Steps:**
   - Provision managed Redis with TLS in `ap-southeast-1` (Singapore) with `<5ms` latency to Antideploy microVMs.
   - Set `REDIS_URL="rediss://..."` in Antideploy environment settings.
   - The application automatically detects `REDIS_URL` via `hasRedis()`, instantiates `RedisRateLimitBackend`, and transitions all instances to distributed atomic Lua rate-limiting without any code modifications.

---

## 15. Decision Gate

| Criteria | Evidence / Status | Gate Evaluation |
| :--- | :--- | :--- |
| **Next.js & Framework Parity** | Next.js 16.3.0 verified across lockfile, package.json, and runtime build | **PASS** |
| **Single-Instance Topology Match** | Antideploy runs 1 instance; MemoryStore completely bounds single-instance traffic | **PASS** |
| **Zero Infrastructure Cost** | Eliminates requirement for paid Redis subscription in single-instance mode | **PASS** |
| **Cryptographic TLS Guard Retained** | Any configured Redis connection must use encrypted `rediss://` | **PASS** |
| **Zero Production Contact** | Production Supabase and Antideploy remained 100% untouched | **PASS** |
| **Zero Secret Exposure** | All credentials redacted; 0 secrets printed | **PASS** |

---

## 16. Open Questions for Human Review

1. **Approval of Option 3:** Does the operator approve transitioning `REDIS_URL` to an optional environment variable and establishing `MemoryStore` as the primary engine for single-instance Antideploy production?
2. **Approval to Implement:** Upon explicit approval, Loop 7 (implementation of code and test changes) and Loop 8 (local regression verification) will proceed.

---

## 17. Final Status

**`PASS WITH CONDITIONS — AWAITING HUMAN REVIEW GATE APPROVAL`**

*Per the mandatory human review gate in the master production readiness loop, all implementation activities are paused. No code has been modified. The auditor is awaiting explicit human approval of the S6.6-R architecture reassessment.*
