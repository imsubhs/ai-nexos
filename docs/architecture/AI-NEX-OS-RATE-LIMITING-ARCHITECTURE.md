# AI NEX OS — Phase S6.2: Rate-Limiting Policy & Resource-Control Architecture

**Document Version**: 1.0.0  
**Phase**: S6.2 (Architectural Specification & Security Policy Design)  
**System**: AI NEX OS (`AIC NEXOS/ai-nexos`)  
**Target Branch**: `phase-2-production-readiness`  
**Classification**: STRICT SECURITY SPECIFICATION — ARCHITECTURE ONLY (ZERO CODE CHANGES)  
**Author**: Senior Application Security Architect  
**Date**: September 28, 2026  
**Status**: APPROVED — LOCKED FOR S6.3 IMPLEMENTATION

---

## 1. Executive Summary

### 1.1 Scope & Context

Phase S6.2 establishes the definitive rate-limiting, resource-bounding, and abuse-protection architecture for the AI NEX OS enterprise platform. Following the forensic reconciliation completed in Phase S6.1.1, this specification transitions from forensic observation to normative architectural policy.

AI NEX OS is an enterprise-grade AI creative agency infrastructure operating on Next.js 16.3.0, React 19.2.4, PostgreSQL 17 (via Supabase), and Drizzle ORM. Prior to S6, the application had strict authentication and hardened Row Level Security (audited in Phases S1–S5.2.2), but was virtually unthrottled at the application layer: out of 189 distinct production server actions, **187 had zero rate limiting**, 69+ Zod schemas lacked maximum string lengths, and high-cost analytical, search, and storage flows were vulnerable to volumetric exhaustion.

### 1.2 Core Architectural Principles

This architecture is founded on four immutable security postulates:

1. **Orthogonality of Authorization and Resource Bounds**: An action may be fully authenticated, authorized via multi-tenant RBAC, and memory-safe, yet remain fatal to system availability if execution frequency and input payload sizes are unrestricted.
2. **Compiler-Enforced Single Ingress**: Next.js App Router exposes every exported function from any file containing `"use server"` as an independent HTTP POST endpoint with a unique Action ID. To eliminate the confirmed "dual-export bypass" where an attacker calls internal implementation modules (`real-actions.ts`) directly, the architecture removes `"use server"` from all implementation files, establishing `actions.ts` as the sole compiled entry point.
3. **Multi-Instance State Parity**: Because production operates across distributed containers or serverless runtimes (Vercel / Antideploy / Cloud Run), process-local memory cannot enforce a shared global budget. Distributed atomic state (Redis) is mandatory in production, while maintaining graceful degradation to bounded local memory during connectivity anomalies.
4. **Abuse Isolation & Multi-Tenant Fairness**: Rate-limit keys are hierarchically structured to ensure that abusive activity from one tenant or rogue user never degrades the budget or availability of another tenant.

---

## 2. Threat Model

AI NEX OS faces distinct threat vectors across its anonymous, authenticated, and administrative attack surfaces:

```
                      AI NEX OS THREAT TOPOLOGY

   [ Public Scanners / Bots ]               [ Authenticated Users ]
               │                                       │
        (Anonymous Edge)                        (Tenant Session)
               │                                       │
      ┌────────┴────────┐                     ┌────────┴────────┐
      ▼                 ▼                     ▼                 ▼
[ T-1: Credential  [ T-2: Token Probing  [ T-3: Multi-Org  [ T-4: Search /
   Stuffing &        & Query Amplif.        Sybil Spawning   Report Exhaustion]
   Account Lockout]  (Invite Preview) ]     (Org Creation)]          │
      │                 │                     │                      │
      ▼                 ▼                     ▼                      ▼
  [ Auth APIs ]   [ Public Tokens ]     [ DB Pooler ]          [ Postgres /
                                                                Node V8 Heap ]
```

### 2.1 Threat Vector Matrix

| Threat ID | Threat Vector                            | Target Component                                   | Threat Actor                             | Impact                                                                                       | Mitigating Policy Tier             |
| :-------- | :--------------------------------------- | :------------------------------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------- | :--------------------------------- |
| **T-1**   | Credential Stuffing & Brute Force        | `signInWithPassword`, `signInWithMagicLink`        | Anonymous External Adversary             | Account takeover, credential compromise, SMTP quota exhaustion, outbound spam                | `AUTH_STRICT`                      |
| **T-2**   | Query Amplification & Token Probing      | `previewInvitationAction`, `/api/approvals/verify` | Anonymous External Adversary             | 3-table join amplification, token metadata harvesting, DB connection pool starvation         | `PUBLIC_TOKEN_LOOKUP`              |
| **T-3**   | Sybil Workspace Creation Explosion       | `createOrganizationAction`                         | Authenticated Malicious User             | Unbounded multi-table transactions (orgs, 5 roles, sequences, memberships), DB storage bloat | `ORG_CREATION`                     |
| **T-4**   | Algorithmic Resource Exhaustion (Search) | `globalSearch`                                     | Authenticated Malicious User             | 6 concurrent unindexed `ILIKE` wildcard table scans, DB CPU saturation, worker lockup        | `SEARCH_EXPENSIVE`                 |
| **T-5**   | Process Memory & V8 Heap Saturation      | `getWorkforceReportAction`                         | Authenticated Team Manager               | In-memory loading of 10,000 attendance records, heap fragmentation, container OOM restart    | `REPORT_EXPENSIVE`                 |
| **T-6**   | Storage Pre-Signed URL Minting Flood     | `initializeFileUpload`                             | Authenticated Member with `files:upload` | Flooding Supabase Storage APIs, orphaned file version database records, storage billing burn | `UPLOAD_INITIALIZATION`            |
| **T-7**   | Invitation Spamming & Disruption         | `inviteMemberAction`                               | Authenticated Admin with `users:create`  | Flooding invitations table, future email quota exhaustion, victim notification harassment    | `INVITATION_ISSUANCE`              |
| **T-8**   | Server Action Dual-Export Bypass         | `features/*/real-actions.ts` direct Action IDs     | External Attacker with compiled bundle   | Complete bypass of action-level rate limits by targeting internal implementation IDs         | Architecture: Strip `"use server"` |

---

## 3. Current-State Architecture

### 3.1 Codebase Structure

The application code in `src/` is structured into domain slices (`src/features/<slice>`) following a tri-module design:

- `actions.ts`: Public entry point. Currently inspects `isDemoMode()` and dynamically dispatches calls to either `real-actions.ts` or `mock-actions.ts`.
- `real-actions.ts`: Concrete production business logic utilizing Drizzle ORM and server-side Supabase clients.
- `mock-actions.ts`: In-memory demo simulation.

### 3.2 The Dual-Export Phenomenon

Next.js App Router scans every file in the project during build. Any module declaring the top-level string literal `"use server"` has all of its exported async functions transformed into RPC endpoints. Next.js assigns each function an internal cryptographic hash (the `Action ID`) and writes it into `.next/server/server-reference-manifest.json`.

In the current build:

- Both `src/features/<slice>/actions.ts` AND `src/features/<slice>/real-actions.ts` declare `"use server"`.
- The compiled manifest contains **316 Action IDs across 47 files**.
- As an example, `createApprovalCycle` is assigned ID `7fc181b519fa...` for `actions.ts` and ID `402aec70b241...` for `real-actions.ts`.
- If a security engineer adds rate limiting solely inside `actions.ts`, an attacker can POST directly to `/` with header `Next-Action: 402aec70b241...`, executing `real-actions.ts` directly and bypassing the wrapper entirely.

---

## 4. Confirmed S6.1.1 Findings

Phase S6.1.1 completed an exhaustive forensic reconciliation that serves as the baseline for S6.2:

```
+------------------------------------------------------------------------------------+
| S6.1.1 FORENSIC RECONCILIATION SUMMARY                                             |
+------------------------------------------------------------------------------------+
| 1. Route Handlers: 5 total (4 rate-limited, 1 health check unthrottled).          |
| 2. "use server" Modules: 62 modules (25 wrappers, 23 real, 8 mock, 6 standalone).   |
| 3. Exported Server Action Functions: 404 total compiler endpoints.                |
| 4. Distinct Production Actions: 189 (190 with demo login).                         |
| 5. Dual-Export Bypass: CONFIRMED across all 22 wrapper/real slice pairs.           |
| 6. Direct PostgREST Bypass: CORRECTED (0 client Supabase calls; external surface).|
| 7. IP Trust Model: PARTIALLY CONFIRMED (safe if TRUSTED_PROXY_HOPS is calibrated). |
| 8. Numerical Limits in S6.1: PROVISIONAL (must be derived mathematically in S6.2). |
+------------------------------------------------------------------------------------+
```

---

## 5. Rate-Limiting Architecture

### 5.1 Evaluation of Architectural Options

The architecture must enforce rate limits and resource controls comprehensively without introducing security bypasses, double-limiting risks, or code maintainability nightmares. Five candidate models were evaluated:

| Criterion                | Option A: Service-Layer Limiter      | Option B: Shared HOF on Server Actions | Option C: Remove `"use server"` from Implementation | Option D: Edge Middleware / Proxy Boundary | Option E: Hybrid (Option C + Option B) [CHOSEN]  |
| :----------------------- | :----------------------------------- | :------------------------------------- | :-------------------------------------------------- | :----------------------------------------- | :----------------------------------------------- |
| **Security Coverage**    | High (service calls)                 | Medium (only what is wrapped)          | High (shrinks attack surface)                       | Low (opaque Next-Action bodies)            | **Absolute (100% of callable ingress)**          |
| **Bypass Resistance**    | Complete against Action IDs          | Zero against `real-actions.ts` IDs     | Complete (eliminates secondary IDs)                 | Low (cannot inspect action args)           | **Complete (Compiler + Runtime defense)**        |
| **Developer Ergonomics** | Poor (transfers HTTP/IP to services) | High (declarative wrapping)            | High (standard internal TS modules)                 | Poor (requires manual routing rules)       | **High (declarative, clean domain separation)**  |
| **Testability**          | Poor (services need mock HTTP)       | High (isolated unit tests)             | High (services testable directly)                   | Complex (requires full HTTP harness)       | **High (direct unit testing of pure logic)**     |
| **Performance Overhead** | Low (in-process)                     | Low (in-process)                       | Zero (compiler elimination)                         | Medium (extra middleware hop)              | **Minimal (single Redis round-trip at ingress)** |
| **Migration Complexity** | Very High (refactor 189 actions)     | Low (wrap exports)                     | Low (strip single directive)                        | Very High (unravel Next server actions)    | **Low to Moderate (clean, phased execution)**    |
| **Double-Limiting Risk** | High (internal service calls)        | High (if wrapper + real wrapped)       | Zero                                                | Low                                        | **Zero (single outer boundary enforcement)**     |
| **Demo / Mock Parity**   | Poor (mock bypasses real services)   | Requires duplicate wrapping            | Seamless (wraps unified dispatch)                   | Poor (cannot inspect demo cookies)         | **Seamless (wraps public action switch)**        |

### 5.2 The Canonical Choice: Option E (Hybrid Architecture)

**Architecture Decision**: AI NEX OS adopts **Option E: The Hybrid Architecture (Compiler Surface Reduction + Higher-Order Action Guards)**.

```
                         CANONICAL EXECUTION ARCHITECTURE

  Client Request (HTTP POST with Next-Action ID)
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Next.js App Router Ingress                                 │
  │  (Only features/*/actions.ts & standalone actions registered│
  │   because "use server" removed from real-actions.ts)        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Unified Action Guard (withRateLimit / withResourceBounds)  │
  │  1. Extract Client IP via getClientIp (Right-to-Left hops)  │
  │  2. Resolve Identity: Unauthenticated IP or CurrentUser     │
  │  3. Formulate Compound Key: policy:orgId:userId             │
  │  4. Enforce Sliding-Window Budget via Redis (or Local LRU)  │
  │  5. Validate Zod Schemas with Strict String/Array Bounds    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ├──────────────────────────────┐
                                 │                              │
                          [ Demo Mode = true ]          [ Demo Mode = false ]
                                 │                              │
                                 ▼                              ▼
  ┌──────────────────────────────────────────────┐  ┌───────────────────────────┐
  │ features/*/mock-actions.ts                   │  │ features/*/real-actions.ts│
  │ (Regular async TypeScript functions;         │  │ (Regular async functions; │
  │  NO "use server" directive)                  │  │  NO "use server";         │
  │                                              │  │  Pure domain + Drizzle DB)│
  └──────────────────────────────────────────────┘  └───────────────────────────┘
```

#### Why Option E is Selected:

1. **Elimination of Attack Surface at Compile Time**: By removing `"use server"` from `real-actions.ts` (and `mock-actions.ts`), Next.js never generates Action IDs for implementation files. The total registered action endpoints in `server-reference-manifest.json` immediately drops from 316 to the canonical set of production actions. Direct ID invocation of `real-actions.ts` becomes mathematically impossible because those IDs do not exist in the routing table.
2. **Single, Clean Ingress Guard**: The public wrapper (`actions.ts`) becomes the sole boundary where transport-level concerns (IP, headers, cookies, rate limits) are evaluated.
3. **Decoupled Pure Domain Logic**: `real-actions.ts` remains a clean, modular server library. Functions in `real-actions.ts` do not need to accept `Headers`, nor do they need to know about Redis or rate-limiting algorithms. They can be invoked directly by background cron jobs, database seeders, or unit tests without fabricating mock HTTP contexts.
4. **Prevention of Double-Limiting**: Because `real-actions.ts` has no rate limiter of its own, an internal call from `actions.ts` into `real-actions.ts` consumes exactly one rate-limit unit.

---

## 6. Policy Taxonomy

Rather than assigning arbitrary ad-hoc numbers to 189 actions, AI NEX OS establishes **nine canonical policy classes**. Every server action and route handler maps to exactly one policy class based on its resource intensity, privilege level, and abuse potential.

```
                                POLICY TAXONOMY HIERARCHY

  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                              TIER 1: PUBLIC / ANONYMOUS                      │
  │  • AUTH_STRICT           : Credential login, magic link, OAuth redirect      │
  │  • PUBLIC_TOKEN_LOOKUP   : Public invitation preview, approval verification  │
  ├──────────────────────────────────────────────────────────────────────────────┤
  │                              TIER 2: WORKSPACE LIFECYCLE                     │
  │  • ORG_CREATION          : Multi-tenant workspace provisioning               │
  │  • INVITATION_ISSUANCE   : Tenant member invitations (email & DB rows)       │
  ├──────────────────────────────────────────────────────────────────────────────┤
  │                              TIER 3: HIGH-INTENSITY OPERATIONS               │
  │  • SEARCH_EXPENSIVE      : Global multi-table wildcard substring searches    │
  │  • REPORT_EXPENSIVE      : Large-dataset aggregations & workforce reporting  │
  │  • UPLOAD_INITIALIZATION : Pre-signed URL minting & file record transactions │
  ├──────────────────────────────────────────────────────────────────────────────┤
  │                              TIER 4: STANDARD APPLICATION RUNTIME            │
  │  • STANDARD_MUTATION     : Standard entity CRUD (projects, tasks, meetings)  │
  │  • STANDARD_READ         : Standard entity queries & dashboard feeds         │
  └──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Rate-Limit Key Design

Rate-limit keys must be constructed to guarantee tenant isolation, prevent budget exhaustion across users, thwart identity rotation, and neutralize IP spoofing.

### 7.1 Key Formulation Grammar

The canonical key grammar is:
$$\text{Key} = \text{prefix} : \text{policyName} : \text{scopeDimensions}$$

```
+---------------------------------------------------------------------------------------------+
| SCOPE FORMULATIONS                                                                          |
+---------------------------------------------------------------------------------------------+
| 1. Anonymous Public Endpoint:                                                               |
|    rl:lookup:ip:{clientIp}                                                                  |
|                                                                                             |
| 2. Anonymous Target-Account Flow (Anti-Spraying):                                           |
|    rl:auth:ip:{clientIp}                               (Blunt IP filter)                    |
|    rl:auth:account:{normalizedEmail}                   (Distributed account defense)        |
|                                                                                             |
| 3. Authenticated Tenant User Operation (Standard):                                          |
|    rl:mut:org_user:{organizationId}:{userId}                                                |
|                                                                                             |
| 4. Tenant Aggregate Safety Cap (Preventing Tenant-Wide Exhaustion):                         |
|    rl:upload:org:{organizationId}                                                           |
|                                                                                             |
| 5. Global Unauthenticated Single-Token Flow:                                                |
|    rl:lookup:token_prefix:{tokenPrefix}                (First 8 hex chars of SHA-256)       |
+---------------------------------------------------------------------------------------------+
```

### 7.2 Security Invariants of Key Design

- **Cross-Tenant Budget Isolation**: Because `organizationId` is prefixed on all authenticated keys, Tenant A executing heavy operations never consumes Tenant B's budget.
- **No User-to-User Starvation**: Compound keys `org_user:{organizationId}:{userId}` ensure that an abusive employee in an agency cannot lock out their colleagues.
- **Identifier Normalization**: All email addresses are stripped of leading/trailing whitespace and lowercased (`email.trim().toLowerCase()`). All client IPs are normalized to strip port suffixes and IPv6-mapped IPv4 prefixes (`::ffff:`).
- **Prevention of Anonymous Rotation**: Anonymous keys require valid extracted IPs via right-to-left proxy chain traversal. If an attacker appends fake IPs to `X-Forwarded-For`, the platform's trusted hop extraction selects the real edge IP, keeping the attacker in the same bucket.

---

## 8. Burst vs. Sustained Limits & Window Mathematics

### 8.1 Algorithm Evaluation

| Algorithm                   | Boundary Burst Vulnerability                       | Memory Cost in Redis                | CPU / Pipeline Cost                      | Complexity | Suitability                           |
| :-------------------------- | :------------------------------------------------- | :---------------------------------- | :--------------------------------------- | :--------- | :------------------------------------ |
| **Fixed Window**            | **High** ($2 \times \text{limit}$ across boundary) | Minimal (1 counter)                 | Very Low (1 `INCR`)                      | Trivial    | **Rejected** (Unsafe for auth/tokens) |
| **Token Bucket**            | Zero (governed by capacity)                        | Moderate (counter + timestamp)      | Moderate (Lua script required)           | High       | Viable, but complex Lua state         |
| **Sliding Log**             | Zero (exact timestamp log)                         | **Severe** ($O(N)$ entries per key) | High (ZREMRANGEBYSCORE + ZCARD)          | High       | **Rejected** (Memory DoS in Redis)    |
| **Weighted Sliding Window** | **Minimal** (approximate smoothing)                | **Low** (2 fixed counters per key)  | **Minimal** (`INCR` + `EXPIRE` pipeline) | Low        | **CHOSEN (Retained & Standardized)**  |

### 8.2 The Weighted Sliding Window Mathematical Model

The existing implementation in `src/lib/security/rate-limit.ts` uses the weighted sliding window approximation. For a request arriving at time $t$ within fixed window $[W_{\text{start}}, W_{\text{start}} + W_{\text{size}}]$:

$$\text{effectiveCount} = C_{\text{current}} + C_{\text{previous}} \times \max\left(0, 1 - \frac{t - W_{\text{start}}}{W_{\text{size}}}\right)$$

This formula calculates the overlap of the lookback window onto the previous fixed window. It guarantees that an adversary firing requests directly across a window boundary cannot exceed the configured limit, while requiring only two integer keys in Redis (`rl:<key>:<windowStart>` and `rl:<key>:<previousWindowStart>`).

### 8.3 Mathematical Derivation of Policy Limits

Limits must not be arbitrary round numbers. Each limit is derived from empirical workload requirements:

$$\text{Limit} = \max\left(\text{Peak Human Workload}, \text{Legitimate Burst}\right) \times \text{Safety Factor (1.5–2.0)}$$

1. **`AUTH_STRICT` (Password Login)**:
   - Legitimate user: 1 attempt every 10 seconds; up to 3 mistyped passwords.
   - Credential stuffing threshold: Attacker tests thousands of pairs.
   - _Policy_: 5 attempts per 15 minutes per account; 10 attempts per 5 minutes per IP.
2. **`SEARCH_EXPENSIVE` (Global Search)**:
   - Legitimate user: Fast typing in a search bar generates typeahead debounced calls (300ms debounce = ~3 calls per word). A 10-word search session produces ~15–20 queries over 30 seconds.
   - Database cost: 1 search = 6 parallel queries. 20 queries = 120 database transactions.
   - _Policy_: Burst capacity: 10 queries. Sustained: 30 queries per minute (60s).
3. **`REPORT_EXPENSIVE` (Workforce Monthly Report)**:
   - Legitimate user: Manager selects date range, views report, toggles 1 or 2 filters. Typical usage is 1–2 requests per minute.
   - Backend cost: Reads up to 1,000 attendance records, runs in-memory date calculations.
   - _Policy_: Burst capacity: 2 queries. Sustained: 6 queries per minute (60s).
4. **`UPLOAD_INITIALIZATION`**:
   - Legitimate user: Creative designer drags a batch of 20 images/video assets into the upload dropzone.
   - Backend cost: 1 `SUM()` aggregation + 2 DB inserts + 1 external S3 presigned URL mint per file.
   - _Policy_: Burst capacity: 15 uploads. Sustained: 60 uploads per 10 minutes (600s) per user. Org ceiling: 150 uploads per 10 minutes.
5. **`ORG_CREATION`**:
   - Legitimate user: Onboarding an agency or creating a separate subsidiary workspace. 1 or 2 workspaces on day one; rarely more than 1 per month thereafter.
   - Backend cost: Multi-table transaction (organizations, 5 roles, sequences, memberships).
   - _Policy_: Burst capacity: 2 workspaces. Sustained: 5 workspaces per 24 hours (86,400s) per user. IP ceiling: 10 per 24 hours.

---

## 9. Comprehensive Policy Table

The following table defines the binding rate-limiting policy for AI NEX OS:

| Policy Name               | Target Operations                                                                 | Auth State                             | Identity Key Formulation                       | Window                   | Burst Limit                      | Sustained Limit                                   | Resource Caps Enforced                                         | Failure Semantics                       | Technical Justification                                                                   |
| :------------------------ | :-------------------------------------------------------------------------------- | :------------------------------------- | :--------------------------------------------- | :----------------------- | :------------------------------- | :------------------------------------------------ | :------------------------------------------------------------- | :-------------------------------------- | :---------------------------------------------------------------------------------------- |
| **`AUTH_STRICT`**         | `signInWithPassword`, `signInWithMagicLink`, `signInWithGoogle`                   | Anonymous                              | `ip:{clientIp}`<br>`account:{normalizedEmail}` | 300s (IP)<br>900s (Acct) | 10 (IP)<br>3 (Magic)<br>5 (Pass) | 10 / 5m (IP)<br>3 / 15m (Magic)<br>5 / 15m (Pass) | Email: 255 chars<br>Password: 128 chars                        | Degraded Local Store                    | Prevents brute force, credential stuffing, and email provider reputation damage.          |
| **`PUBLIC_TOKEN_LOOKUP`** | `previewInvitationAction`, `/api/approvals/verify`, `/api/v1/portal/auth/session` | Anonymous                              | `ip:{clientIp}`<br>`token:{tokenPrefix}`       | 300s                     | 15                               | 30 / 5m (IP)<br>5 / 5m (Token)                    | Token: 64 hex chars (max 128)                                  | Degraded Local Store                    | Prevents automated probing of 256-bit token validity and 3-table join DB hammering.       |
| **`ORG_CREATION`**        | `createOrganizationAction`                                                        | Authenticated                          | `user:{userId}`<br>`ip:{clientIp}`             | 86,400s (24h)            | 2                                | 5 / 24h (User)<br>10 / 24h (IP)                   | Org Name: 100 chars<br>Code Prefix: 10 chars                   | **FAIL CLOSED** (or Degraded Local = 1) | Prevents multi-tenant workspace Sybil attacks and database bloat.                         |
| **`INVITATION_ISSUANCE`** | `inviteMemberAction`, `resendInvitationAction`                                    | Authenticated (`users:create`)         | `org_user:{orgId}:{userId}`<br>`org:{orgId}`   | 3,600s (1h)              | 10 (User)<br>25 (Org)            | 30 / 1h (User)<br>100 / 1h (Org)                  | Email: 255 chars<br>Role ID: UUID                              | Degraded Local Store                    | Prevents malicious admins from flooding organization invitation queues and mail services. |
| **`SEARCH_EXPENSIVE`**    | `globalSearch`                                                                    | Authenticated                          | `org_user:{orgId}:{userId}`<br>`ip:{clientIp}` | 60s (1m)                 | 10                               | 30 / 1m (User)<br>45 / 1m (IP)                    | Term: 2–64 chars<br>Hits: Max 5/group                          | Degraded Local Store                    | Prevents PostgreSQL CPU saturation from 6 concurrent unindexed wildcard `ILIKE` scans.    |
| **`REPORT_EXPENSIVE`**    | `getWorkforceReportAction`, `getWorkforceDashboardMetrics`                        | Authenticated (`attendance:view_team`) | `org_user:{orgId}:{userId}`<br>`org:{orgId}`   | 60s (1m)                 | 2 (User)<br>5 (Org)              | 6 / 1m (User)<br>20 / 1m (Org)                    | Range: $\le$ 31 days<br>SQL Rows: $\le$ 1,000                  | Degraded Local Store                    | Prevents Node.js V8 heap spikes and container OOM termination from loading 10k rows.      |
| **`UPLOAD_INITIALIZE`**   | `initializeFileUpload`                                                            | Authenticated (`files:upload`)         | `org_user:{orgId}:{userId}`<br>`org:{orgId}`   | 600s (10m)               | 15 (User)<br>40 (Org)            | 60 / 10m (User)<br>150 / 10m (Org)                | File: $\le$ 10 GB<br>Org: $\le$ 500 GB<br>Title: 255 chars     | Degraded Local Store                    | Stops automated scripts from minting thousands of S3 signed URLs and orphaned DB records. |
| **`STANDARD_MUTATION`**   | `createProject`, `createTask`, `updateTask`, `createDeliverable`                  | Authenticated (Valid RBAC)             | `org_user:{orgId}:{userId}`                    | 60s (1m)                 | 20                               | 60 / 1m (User)                                    | Body: $\le$ 1 MB<br>Title: 100 chars<br>Arrays: $\le$ 50 items | Degraded Local Store                    | Protects database transaction pooler and entity tables from scripted write spam.          |
| **`STANDARD_READ`**       | `getProjects`, `getTasks`, `getClients`, `getCalendarMonth`                       | Authenticated                          | `org_user:{orgId}:{userId}`                    | 60s (1m)                 | 60                               | 180 / 1m (User)                                   | Pagination Limit: $\le$ 100 rows clamped                       | Degraded Local Store                    | Prevents scraping and rapid UI polling loops from saturating DB connection poolers.       |

---

## 10. Redis & Distributed-State Architecture

### 10.1 Multi-Instance Runtime Reality

Investigation of `docs/DEPLOYMENT.md` and `docs/audit/ANTIDEPLOY-SECURITY-WARNING-AUDIT.md` confirms that AI NEX OS runs in containerized/serverless environments (Vercel Serverless Functions in Tokyo `hnd1` and Antideploy Linux containers).

- In these environments, incoming HTTP requests are routed across $N$ independent container replicas.
- Process-local memory (`MemoryStore`) is completely isolated inside each container's V8 isolate.
- **Security Multiplier Hazard**: Without a shared store, an attacker distributing requests across $N$ instances receives an effective budget of $N \times \text{limit}$. For an account brute-force limit of 5, an attacker hitting 10 containers achieves 50 attempts.
- **Conclusion**: Process-local memory can **never** provide a reliable global budget in production.

### 10.2 Security Requirement vs. Implementation Choice

$$\mathbf{SECURITY\ REQUIREMENT:\ Centralized\ Distributed\ Atomic\ State\ Enforcement}$$
$$\mathbf{IMPLEMENTATION\ CHOICE:\ Redis\ (ioredis)\ via\ Redis-Compatible\ Service\ (Upstash\ /\ AWS\ ElastiCache)}$$

Redis is selected as the implementation choice because:

1. `ioredis` (v5.11.1) is already installed in `package.json`.
2. Atomic pipeline operations (`INCR` + `EXPIRE`) execute in sub-millisecond latency.
3. The weighted sliding window algorithm maps directly to Redis integer keys with automatic TTL cleanup.

### 10.3 Redis Failure Semantics & Operational Fallback

```
                          REDIS STORE LIFECYCLE & FALLBACK

                          [ Inbound Rate-Limit Check ]
                                       │
                                       ▼
                          { Is REDIS_URL configured? }
                                 │           │
                              [ YES ]      [ NO ] ──> In Development / Test:
                                 │                     Use MemoryStore cleanly.
                                 ▼                     In Production: FAIL BOOT.
                      [ Execute Redis Pipeline ]
                      (INCR current + EXPIRE + GET previous)
                                 │
                   ┌─────────────┴─────────────┐
               [ Success ]                 [ Error / Timeout ]
                   │                               │
                   ▼                               ▼
          [ Return Allow/Deny ]        1. Log Alert: ratelimit.redis_error
                                       2. Trip Circuit Breaker: redisUnavailable
                                       3. Seamless Fallback: MemoryStore
                                       4. Execute Degraded Sliding Window
                                       5. If ORG_CREATION: Enforce Limit = 1
```

- **Startup Behavior**: When `NODE_ENV === "production"`, `assertProductionConfig()` checks `REDIS_URL`. If missing, the application **refuses to boot** (elevated from warning to fatal invariant).
- **Connection Failure Handling**:
  - `ioredis` is initialized with `maxRetriesPerRequest: 1`, `enableOfflineQueue: false`, and `lazyConnect: false`. Rate-limiting checks will **never hang or queue** behind a stalled TCP socket.
  - If a Redis call times out or throws, the error is caught immediately.
  - `logSecurityEvent("ratelimit.store_failed")` emits a structured alert with error details.
  - The limiter degrades to the local in-memory `MemoryStore` (capped at 20,000 entries with LRU eviction).
- **Health Endpoint Integration**: `/api/health` reports the live Redis status: `redis: "healthy" | "degraded" | "unconfigured"`.

---

## 11. Rate-Limit Failure Semantics (Fail-Open vs. Fail-Closed)

Enforcing a single naive failure policy across all endpoints is dangerous:

- **Failing closed everywhere** turns any Redis blip into a total platform outage (denial of service against legitimate users).
- **Failing open everywhere** allows an attacker who causes a Redis network partition to bypass authentication brute-force protections.

AI NEX OS adopts a **Categorized Degraded Failure Model**:

```
+-----------------------------------------------------------------------------------------------+
| CATEGORIZED FAILURE SEMANTICS                                                                 |
+-----------------------------------------------------------------------------------------------+
| Policy Category          | Primary Store | Failure Mode          | Operational Impact         |
+-----------------------------------------------------------------------------------------------+
| AUTH_STRICT              | Redis         | Degraded Local Store  | Throttled locally per-node;|
|                          |               |                       | Prevents complete bypass.  |
| PUBLIC_TOKEN_LOOKUP      | Redis         | Degraded Local Store  | Throttled locally per-node.|
| ORG_CREATION             | Redis         | FAIL CLOSED (Strict)  | Refuses new org creations  |
|                          |               |                       | until Redis state restored.|
| INVITATION_ISSUANCE      | Redis         | Degraded Local Store  | Throttled locally per-node.|
| SEARCH_EXPENSIVE         | Redis         | Degraded Local Store  | Throttled locally per-node.|
| REPORT_EXPENSIVE         | Redis         | Degraded Local Store  | Throttled locally per-node.|
| UPLOAD_INITIALIZE        | Redis         | Degraded Local Store  | Throttled locally per-node.|
| STANDARD_MUTATION        | Redis         | Degraded Local Store  | Maintains application write|
|                          |               |                       | availability under alert.  |
| STANDARD_READ            | Redis         | FAIL OPEN             | Reads always permitted.    |
+-----------------------------------------------------------------------------------------------+
```

---

## 12. Server Action Architecture

### 12.1 Elimination of `"use server"` from Implementation Files

In S6.3, the `"use server"` directive is removed from:

- All `src/features/*/real-actions.ts`
- All `src/features/*/real-queries.ts`
- All `src/features/*/mock-actions.ts`

These files become regular internal TypeScript modules. They can only be executed by importing them into an authorized entry point.

### 12.2 The Unified Action Guard (`withRateLimit`)

A higher-order wrapper utility `withRateLimit` is established for all Server Actions:

```typescript
// Architectural signature for S6.3 implementation:
export function withRateLimit<TArgs extends unknown[], TReturn>(
  policy: RateLimitPolicy,
  keyResolver: (args: TArgs, context: ActionSecurityContext) => Promise<string>,
  handler: (...args: TArgs) => Promise<TReturn>,
  options?: {
    resourceValidator?: (args: TArgs) => void;
    failureMode?: "throw" | "action_response";
  },
): (...args: TArgs) => Promise<TReturn>;
```

### 12.3 Execution Flow Inside `withRateLimit`:

1. **Context Resolution**: Extracts `headers()` and `cookies()`. Derives `clientIp` via `getClientIp`.
2. **Identity Derivation**: Calls `getCurrentUser()` (cached per request). If authenticated, retrieves `userId` and `organizationId`. If unauthenticated, sets identity to `anonymous`.
3. **Key Derivation**: Invokes `keyResolver` to assemble the structured key (e.g. `policy.name + ":" + orgId + ":" + userId`).
4. **Rate-Limit Consumption**: Calls `consumeRateLimit(policy, key)`.
5. **Enforcement & Rejection**:
   - If allowed: Proceeds to step 6.
   - If throttled: Emits `logSecurityEvent("ratelimit.exceeded")`.
     - If `failureMode === "action_response"`: Returns `{ success: false, error: "RATE_LIMITED", message: "Too many requests...", retryAfterSeconds }`.
     - If `failureMode === "throw"` (default): Throws `ApiError("rate_limited", ...)` with standard message and `retryAfterSeconds`.
6. **Resource Bounds Validation**: Executes `resourceValidator` (if provided) to enforce string, array, and payload limits.
7. **Business Logic Dispatch**: Dispatches call to `real-actions.ts` or `mock-actions.ts` based on `isDemoMode()`.

---

## 13. Route Handler Architecture

Route Handlers (`src/app/**/route.ts`) operate on standard web `Request` and `Response` streams.

### 13.1 Standardized 429 Response Protocol

When a route handler exceeds its rate-limiting budget, it must return an RFC 6585 compliant HTTP 429 response:

```typescript
// Route handler standard response contract:
return NextResponse.json(
  {
    error: "TOO_MANY_REQUESTS",
    message: "Rate limit exceeded. Please try again shortly.",
    retryAfterSeconds: result.retryAfterSeconds,
  },
  {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfterSeconds),
      "RateLimit-Limit": String(result.limit),
      "RateLimit-Remaining": String(result.remaining),
      "RateLimit-Reset": String(
        Math.ceil((result.resetAt - Date.now()) / 1000),
      ),
    },
  },
);
```

### 13.2 Route Handler Coverage Matrix

- `/auth/callback`: Guarded by `RATE_LIMITS.authCallbackByIp` (30 req / 300s).
- `/api/approvals/verify`: Guarded by `RATE_LIMITS.approvalVerifyByIp` (20 req / 300s).
- `/api/v1/portal/auth/session` (POST): Guarded by `RATE_LIMITS.portalSessionByIp` (20 req / 300s).
- `/api/v1/portal/auth/session` (DELETE): **Currently Unthrottled**. S6.3 will attach `RATE_LIMITS.portalSessionByIp`.
- `/api/v1/portal/dashboard`: Guarded by `RATE_LIMITS.portalReadBySession` (120 req / 60s).
- `/api/health`: Health probe. Unthrottled for monitoring systems; diagnostic data withheld in production.

---

## 14. High-Risk Surface Protections

### 14.1 Organization Creation (`createOrganizationAction`)

- **Problem**: Authenticated users can loop creation of thousands of workspaces, running 5-table transactions that bloat database disk and sequences.
- **Security Controls**:
  - **Rate Limit**: Enforce `ORG_CREATION` policy: Max **2 workspaces in burst**, sustained **5 workspaces per 24 hours** per user; **10 per 24 hours per IP**.
  - **Input Bounds**: Zod schema enforced with `.max(100)` on `organizationName`, `.max(10)` on `codePrefix`.
  - **Failed Attempts**: Pre-validation failures (e.g. invalid characters) do not consume budget. Database conflict rejections (e.g. duplicate prefix) consume budget to prevent prefix probing.
- **Product vs. Security Separation**:
  - _Security Bound_: 5 creations per 24h prevents DoS.
  - _Product Rule_: User membership table checks: Free users may belong to at most $M$ organizations (handled in business logic).

### 14.2 Invitation Protection (`previewInvitationAction` & `inviteMemberAction`)

- **Token Security Facts**: Raw tokens have 32 bytes of secure random entropy (64 hex characters, 256 bits). Brute force guessing of a valid token is cryptographically impossible ($2^{-256}$).
- **Real Vulnerability**:
  1. `previewInvitationAction` is completely unauthenticated and executes a 3-table join (`organizationInvitations`, `organizations`, `roles`). Automated probing exhausts database connections.
  2. A valid token reveals organization name, slug, email, and role name.
  3. `inviteMemberAction` allows a malicious admin to spam thousands of pending invitations.
- **Security Controls**:
  - **Public Preview Throttling**: Bound to client IP: Max **15 previews per 15 minutes** per IP. Additionally, bound to token prefix: Max **5 requests per token hash prefix** per 15 minutes.
  - **Issuance Throttling**: Bound to `org_user`: Max **10 burst**, **30 per hour** per user; **100 per hour per organization**.
  - **Input Bounds**: Email length validated strictly with `.email().max(255)`.

### 14.3 Search Protection (`globalSearch`)

- **Problem**: Executes 6 parallel `ILIKE '%term%'` queries across 6 tables simultaneously. An attacker typing rapidly or scripting requests triggers 300+ unindexed table scans per second.
- **Security Controls**:
  - **Length Constraints**: Server-side validation enforcing: `min(2)` and `max(64)` characters. Any query $>64$ characters is rejected immediately without hitting the database.
  - **Rate Limiting**: Enforce `SEARCH_EXPENSIVE` policy: Max **10 requests burst**, **30 requests per minute** per user; **45 per minute per IP**.
  - **Result Caps**: Hard ceiling of **5 results per category** (30 total records).
  - **Database Roadmap Note**: Flagged for S7 to introduce PostgreSQL `pg_trgm` GIN indexes or Full-Text Search vectors to replace full-table scans.

### 14.4 Workforce Report Protection (`getWorkforceReportAction`)

- **Problem**: Fetches up to 10,000 attendance records into Node.js heap memory (`ALL_ROWS_PAGE_SIZE = 10_000`) and executes JavaScript `.filter()` in memory.
- **Security Controls**:
  - **Date Range Clamping**: Server-side check enforcing: `(to - from) <= 31 days` (maximum 1 calendar month per request). Requests spanning $>31$ days are rejected.
  - **SQL Pushdown Requirement**: In S6.3, refactor the Drizzle query to push `gte(date, from)` and `lte(date, to)` down to the PostgreSQL `WHERE` clause, eliminating the in-memory array filter.
  - **Pagination Hard Ceiling**: Maximum records returned capped at **1,000 records**.
  - **Rate Limiting**: Enforce `REPORT_EXPENSIVE` policy: Max **2 requests burst**, **6 requests per minute** per user.

### 14.5 File Upload Initialization (`initializeFileUpload`)

- **Problem**: No call frequency limit. A user can call `initializeFileUpload` 10,000 times with `sizeBytes: 1`, minting 10,000 S3 presigned URLs, inserting 10,000 database rows, and running 10,000 `SUM()` aggregations.
- **Security Controls**:
  - **Rate Limiting**: Enforce `UPLOAD_INITIALIZE` policy: Max **15 uploads burst** (for bulk creative drops), **60 uploads per 10 minutes** per user; **150 uploads per 10 minutes per organization**.
  - **Storage Bounds**: Retain existing 10 GB file limit and 500 GB organization quota.
  - **Abandoned Upload TTL**: Mark file versions remaining in `"uploading"` status for $>24$ hours as `"abandoned"` via background cleanup.

---

## 15. Resource Limit & Payload Policy

OWASP API4 mandates rigorous boundaries on all input structures and database queries. AI NEX OS establishes standard limit classes:

```
+-----------------------------------------------------------------------------------------------+
| CANONICAL RESOURCE BOUNDARIES                                                                 |
+-----------------------------------------------------------------------------------------------+
| Resource Type            | Policy Scope / Tier           | Hard Maximum Boundary              |
+-----------------------------------------------------------------------------------------------+
| Short Text Strings       | Names, codes, titles, slugs   | max(100) characters                |
| Medium Text Strings      | Addresses, notes, descriptions| max(500) characters                |
| Long Markdown / Specs    | Task descriptions, briefs     | max(5,000) characters              |
| Rich Document Bodies     | Knowledge base, deliverable doc| max(20,000) characters             |
| Search Query Term        | globalSearch input            | min(2), max(64) characters         |
| Tag / Category Arrays    | projects.tags, deliverable.tag| max(50) items, each max(30) chars  |
| Bulk ID Target Arrays    | Bulk delete/archive/status    | max(100) UUID items                |
| JSONB Metadata Payloads  | Activity log metadata, extra  | max(32 KB) serialized JSON         |
| Pagination: SMALL_LIST   | Comments, activity, dropdowns | Default: 10, Hard Cap: 25 rows     |
| Pagination: STANDARD_LIST| Projects, tasks, clients, files| Default: 25, Hard Cap: 100 rows    |
| Pagination: LARGE_LIST   | Audit log tables, timelines   | Default: 100, Hard Cap: 250 rows   |
| Reporting Queries        | Workforce attendance, metrics | Max Date Range: 31 days, Cap: 1,000|
| Server Action Payload    | All Server Action invocations | 1 MB (Next.js default locked)      |
| Route Handler JSON Body  | All route handlers (parseJson)| 64 KB (DEFAULT_MAX_BODY_BYTES)     |
+-----------------------------------------------------------------------------------------------+
```

### 15.1 Server Action Body Size Decision

Next.js defaults `serverActions.bodySizeLimit` to `1mb`.

- In AI NEX OS, all file uploads bypass the Next.js server entirely via direct pre-signed URLs to Supabase Storage.
- Server Action payloads consist solely of JSON metadata, form inputs, and entity IDs.
- A 1 MB payload is sufficient for ~100,000 words of UTF-8 text, far exceeding any legitimate agency form submission.
- **Decision**: Retain 1 MB and explicitly configure `serverActions: { bodySizeLimit: "1mb" }` in `next.config.ts` during S6.3 to make this security invariant explicit and immutable.

---

## 16. HTTP / Server Action Response Contract

To avoid breaking existing frontend components, rate-limit rejection responses must adhere to established caller patterns:

### 16.1 Route Handlers

- **HTTP Status**: `429 Too Many Requests`
- **Response Body**:
  ```json
  {
    "error": "TOO_MANY_REQUESTS",
    "message": "Too many requests. Please try again in 45 seconds.",
    "retryAfterSeconds": 45
  }
  ```
- **Headers**: `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

### 16.2 Server Actions

Server actions in AI NEX OS follow two established conventions depending on the feature domain:

1. **Direct Data Return (Entities / Queries)** (e.g. `createProject`, `updateTask`, `getProjects`):
   - _Mechanism_: Throws `ApiError("rate_limited", "Too many requests. Please try again shortly.")`.
   - _Client Compatibility_: Client components wrap calls in `try { ... } catch (err) { toast.error(err.message) }`. The thrown error surfaces cleanly in the existing toast notification without unhandled promise rejections or TypeScript type regressions.
2. **ActionResponse Return (Forms / Onboarding)** (e.g. `createOrganizationAction`, `switchOrganizationAction`):
   - _Mechanism_: Returns structured failure:
     ```typescript
     {
       success: false,
       error: "RATE_LIMITED",
       message: "Too many attempts. Please try again in 30 seconds.",
       retryAfterSeconds: 30
     }
     ```
   - _Client Compatibility_: The form handler inspects `result.success` and displays `result.message` directly in the form error banner.

---

## 17. IP Trust Model & Topology Specifications

### 17.1 Analysis of `getClientIp`

The IP extraction logic in `src/lib/security/request.ts` parses `X-Forwarded-For` from right to left:
$$\text{Index} = \max\left(0, \text{chain.length} - \max(1, \text{trustedHops})\right)$$

This algorithm is mathematically sound against leftmost spoofing: an attacker providing `X-Forwarded-For: 1.1.1.1` from real IP `203.0.113.195` arrives at the proxy as `1.1.1.1, 203.0.113.195`. With `trustedHops = 1`, the code reads index $2 - 1 = 1$ (`203.0.113.195`), ignoring the attacker's spoof.

### 17.2 Topology Classification: OPERATOR VERIFICATION REQUIRED

Because the exact production proxy hops depend on whether Cloudflare sits in front of Vercel/Antideploy, the production deployment requires explicit operator calibration:

```
+-----------------------------------------------------------------------------------------------+
| PROXY TOPOLOGY MAPPING                                                                        |
+-----------------------------------------------------------------------------------------------+
| Production Deployment Topology                    | Required TRUSTED_PROXY_HOPS Setting       |
+-----------------------------------------------------------------------------------------------+
| Direct Vercel Edge -> Next.js                     | 1 (Default)                               |
| Cloudflare -> Vercel Edge -> Next.js              | 2                                         |
| Antideploy Reverse Proxy (Traefik/Nginx) -> App   | 1                                         |
| Cloudflare -> Antideploy Reverse Proxy -> App     | 2                                         |
| Direct Public Internet (No Proxy - Dev/Testing)   | 0 (Uses direct socket remoteAddress)      |
+-----------------------------------------------------------------------------------------------+
```

**Operator Mandate**: In S6.3, a diagnostic test utility will be provided to log the resolved IP against `x-real-ip` and `x-forwarded-for` to enable production verification.

---

## 18. Observability & Security Telemetry

All rate-limiting events must be observable in production monitoring without leaking sensitive credentials or PII.

### 18.1 Safe Telemetry Invariants

- **Forbidden Fields (NEVER Logged)**:
  - Raw invitation tokens
  - Passwords or plain password hashes
  - Session secrets or JWT signatures
  - Full database connection strings
- **Permitted Fields**:
  - Policy name (e.g. `AUTH_STRICT`, `SEARCH_EXPENSIVE`)
  - Client IP (normalized)
  - Obfuscated User ID (UUID)
  - Organization ID (UUID)
  - Token hash prefix (first 8 hex characters of SHA-256)
  - Effective request count and remaining budget

### 18.2 Telemetry Event Catalog

The system will emit structured JSON events via `src/lib/security/logger.ts`:

1. `ratelimit.exceeded`: Fired whenever a request is blocked by a rate limiter.
2. `ratelimit.store_failed`: Fired when Redis throws an exception.
3. `ratelimit.store_degraded`: Fired when the limiter activates local `MemoryStore` fallback.
4. `abuse.suspicious_token_probing`: Fired when $>5$ invalid invitation tokens are queried from a single IP within 5 minutes.
5. `abuse.org_creation_burst`: Fired when a user hits the workspace creation ceiling.
6. `abuse.upload_init_flood`: Fired when an upload initialization burst is throttled.

---

## 19. Abuse Fairness & Multi-Tenant Isolation

To ensure that one tenant's abusive behavior never degrades the experience of another tenant, rate-limiting budgets follow a strict four-layer hierarchy:

```
                      RATE-LIMITING FAIRNESS HIERARCHY

  ┌─────────────────────────────────────────────────────────────────┐
  │ Level 1: Global Platform Safety Ceiling                         │
  │ (Emergency infrastructure protection; protects Postgres pooler) │
  └───────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Level 2: Tenant (Organization) Quota                            │
  │ (Caps total uploads, invites, and reports per organization)     │
  └───────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Level 3: Authenticated User Budget                              │
  │ (Guarantees User A cannot exhaust User B's budget in same org)  │
  └───────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │ Level 4: Operation / IP Budget                                  │
  │ (Throttles specific sensitive business actions and public flows)│
  └─────────────────────────────────────────────────────────────────┘
```

---

## 20. Decision Table

The following table records the authoritative status of all architectural and policy decisions established in Phase S6.2:

| #        | Architectural / Policy Decision          | Security Requirement                                | Product Decision                      | Status                                     | Owner / Target Phase        |
| :------- | :--------------------------------------- | :-------------------------------------------------- | :------------------------------------ | :----------------------------------------- | :-------------------------- |
| **D-01** | Execution Architecture                   | Eliminate dual-export Action ID bypass              | Maintain unified demo/mock dispatch   | **LOCKED**                                 | Phase S6.3                  |
| **D-02** | Strip `"use server"` from Implementation | Remove directive from `real-actions.ts`             | Keep pure TypeScript domain logic     | **LOCKED**                                 | Phase S6.3                  |
| **D-03** | Distributed State Store                  | Distributed atomic state required in multi-node     | Redis (ioredis) utilized              | **LOCKED**                                 | Phase S6.3                  |
| **D-04** | Redis Outage Behavior                    | Degrade to bounded local MemoryStore with alerts    | Maintain core platform availability   | **LOCKED**                                 | Phase S6.3                  |
| **D-05** | Production Boot Invariant                | Fail boot if `REDIS_URL` unset in production        | Provide seamless in-memory dev mode   | **LOCKED**                                 | Phase S6.3                  |
| **D-06** | Rate-Limiting Algorithm                  | Weighted Sliding Window approximation               | Retain existing 2-counter Redis model | **LOCKED**                                 | Phase S6.3                  |
| **D-07** | Org Creation Rate Limit                  | Max 5 workspaces per 24 hours per user              | Max active workspace count per tier   | **LOCKED** (Rate) / **PROVISIONAL** (Tier) | S6.3 (Sec) / Product (Tier) |
| **D-08** | Public Invite Preview Limit              | Max 15 requests per 15 min per IP                   | Allow seamless onboarding preview UX  | **LOCKED**                                 | Phase S6.3                  |
| **D-09** | Global Search Bounds                     | Enforce 64-char max length & 30 req/min limit       | Maintain responsive typeahead UX      | **LOCKED**                                 | Phase S6.3                  |
| **D-10** | Workforce Report Bounds                  | Clamp date range to $\le$ 31 days; SQL pushdown     | Support monthly executive reviews     | **LOCKED**                                 | Phase S6.3                  |
| **D-11** | Upload Init Frequency                    | Max 60 uploads per 10 min per user                  | Retain 10 GB file / 500 GB org quota  | **LOCKED**                                 | Phase S6.3                  |
| **D-12** | String & Array Max Bounds                | Add `.max()` bounds to all domain Zod schemas       | Establish reasonable business caps    | **LOCKED**                                 | Phase S6.3                  |
| **D-13** | Pagination Clamping                      | Clamp `limit` parameter across all queries          | Standard page size defaults           | **LOCKED**                                 | Phase S6.3                  |
| **D-14** | Server Action Body Size                  | Lock `bodySizeLimit: "1mb"` in `next.config.ts`     | All files uploaded via presigned S3   | **LOCKED**                                 | Phase S6.3                  |
| **D-15** | Server Action Error Contract             | Return `ApiError(rate_limited)` or `ActionResponse` | Seamless toast and form error banners | **LOCKED**                                 | Phase S6.3                  |
| **D-16** | Route Handler 429 Contract               | Return HTTP 429 with RFC headers                    | Standard machine-readable responses   | **LOCKED**                                 | Phase S6.3                  |
| **D-17** | Proxy Hop Calibration                    | Right-to-left parsing `chain.length - hops`         | Calibrate for production edge proxy   | **OPERATOR REQUIRED**                      | Production Preflight        |
| **D-18** | Security Telemetry                       | Structured JSON logging of rate-limit alerts        | Redact raw tokens, secrets, and PII   | **LOCKED**                                 | Phase S6.3                  |

---

## 21. S6.3 Implementation Plan

Phase S6.3 will execute the architectural specifications defined in S6.2 according to the following phased sequence:

```
                         PHASE S6.3 EXECUTION ROADMAP

  Step 1: Compiler Attack Surface Reduction
  └── Strip "use server" from all features/*/real-actions.ts & mock-actions.ts
  └── Verify build artifact server-reference-manifest.json reduces from 316 to ~189 IDs

  Step 2: Core Rate-Limiting Engine Hardening
  └── Update src/lib/security/rate-limit.ts with 9 canonical policy definitions
  └── Enhance RedisStore pipeline with error timeouts and degraded circuit-breaker
  └── Elevate REDIS_URL in src/lib/env.server.ts to production mandatory

  Step 3: Higher-Order Action Guard Implementation
  └── Implement withRateLimit & withResourceBounds utilities in src/lib/security/action-guard.ts
  └── Establish ActionResponse vs. thrown ApiError handling conventions

  Step 4: Domain Schema & Resource Bounding
  └── Apply .max() bounds to all domain Zod schemas (strings, arrays, JSON)
  └── Clamp pagination query limits to Math.min(limit, 100) across all repositories

  Step 5: High-Risk Surface Hardening
  └── Apply ORG_CREATION guard to createOrganizationAction
  └── Apply PUBLIC_TOKEN_LOOKUP guard to previewInvitationAction
  └── Apply SEARCH_EXPENSIVE guard & 64-char cap to globalSearch
  └── Apply REPORT_EXPENSIVE guard, 31-day clamp & SQL pushdown to getWorkforceReportAction
  └── Apply UPLOAD_INITIALIZE guard to initializeFileUpload

  Step 6: Universal Action Wrapping
  └── Wrap all remaining standard mutations and reads in features/*/actions.ts

  Step 7: Verification & Test Execution
  └── Execute complete S6.3 automated test matrix (Categories A through U)
```

---

## 22. S6.3 Test Matrix

Phase S6.3 must deliver automated Vitest suites covering all 21 verification categories:

| Category | Test Suite Name                      | Target Scenario & Assertion                                                                       | Target File                           |
| :------- | :----------------------------------- | :------------------------------------------------------------------------------------------------ | :------------------------------------ |
| **A**    | `single-user-rate-limiting.test.ts`  | Validates that a single user exceeding sustained limit receives 429 / RATE_LIMITED error.         | `tests/integration/rate-limiting/`    |
| **B**    | `burst-behavior.test.ts`             | Asserts that rapid burst of requests up to burst limit succeeds; (burst + 1) fails immediately.   | `tests/integration/rate-limiting/`    |
| **C**    | `sustained-behavior.test.ts`         | Simulates smoothed traffic over entire window; validates budget replenishes after window expires. | `tests/integration/rate-limiting/`    |
| **D**    | `tenant-isolation.test.ts`           | Verifies that User A in Org 1 exhausting their budget has ZERO effect on User B in Org 2.         | `tests/integration/rate-limiting/`    |
| **E**    | `user-isolation.test.ts`             | Verifies that User A in Org 1 exhausting their budget does NOT throttle User C in Org 1.          | `tests/integration/rate-limiting/`    |
| **F**    | `anonymous-ip-isolation.test.ts`     | Asserts that IP 1 hitting auth limits does not restrict IP 2 hitting auth limits.                 | `tests/integration/rate-limiting/`    |
| **G**    | `direct-id-bypass.test.ts`           | Asserts that `real-actions.ts` files do NOT have Action IDs in compiled build manifests.          | `tests/integration/rate-limiting/`    |
| **H**    | `wrapper-parity.test.ts`             | Validates that calls through `actions.ts` enforce identical limits in real and mock mode.         | `tests/integration/rate-limiting/`    |
| **I**    | `redis-store-pipeline.test.ts`       | Unit-tests atomic `INCR` + `EXPIRE` pipeline execution against Redis mock client.                 | `tests/unit/rate-limit.test.ts`       |
| **J**    | `redis-outage-failover.test.ts`      | Simulates Redis connection drop mid-request; validates seamless degradation to MemoryStore.       | `tests/unit/rate-limit.test.ts`       |
| **K**    | `fallback-memory-store.test.ts`      | Tests in-memory LRU eviction when entry cap (20,000) is exceeded under load.                      | `tests/unit/rate-limit.test.ts`       |
| **L**    | `proxy-hop-handling.test.ts`         | Tests `getClientIp` with various `X-Forwarded-For` chains and `TRUSTED_PROXY_HOPS` values.        | `tests/unit/request.test.ts`          |
| **M**    | `invite-preview-abuse.test.ts`       | Floods `previewInvitationAction` with random tokens; asserts IP throttling after 15 attempts.     | `tests/integration/rate-limiting/`    |
| **N**    | `org-creation-abuse.test.ts`         | Asserts `createOrganizationAction` rejects 6th creation attempt within 24h rolling window.        | `tests/integration/rate-limiting/`    |
| **O**    | `search-abuse.test.ts`               | Floods `globalSearch` with rapid typeahead queries; asserts throttle and 64-char rejection.       | `tests/integration/rate-limiting/`    |
| **P**    | `report-abuse.test.ts`               | Asserts `getWorkforceReportAction` rejects date ranges $>31$ days and throttles rapid calls.      | `tests/integration/rate-limiting/`    |
| **Q**    | `upload-init-abuse.test.ts`          | Asserts `initializeFileUpload` throttles after 15 burst attempts; quota checks still pass.        | `tests/integration/rate-limiting/`    |
| **R**    | `invite-issuance-abuse.test.ts`      | Asserts `inviteMemberAction` throttles after 30 invitations within 1 hour.                        | `tests/integration/rate-limiting/`    |
| **S**    | `resource-bound-enforcement.test.ts` | Submits oversized strings ($>100$ chars) and arrays ($>50$ items); asserts Zod rejection.         | `tests/unit/schemas.test.ts`          |
| **T**    | `http-429-contract.test.ts`          | Validates that Route Handlers emit `Retry-After`, `RateLimit-*` headers and status 429.           | `tests/integration/rate-limiting/`    |
| **U**    | `security-telemetry.test.ts`         | Asserts that throttled requests emit `ratelimit.exceeded` logs without leaking raw tokens.        | `tests/unit/security-logging.test.ts` |

---

## 23. Security vs. Product Decisions Boundary

To ensure engineering clarity, the boundary between non-negotiable security requirements and flexible product choices is formally defined:

```
+-----------------------------------------------------------------------------------------------+
| SECURITY REQUIREMENTS (NON-NEGOTIABLE)           | PRODUCT DECISIONS (FLEXIBLE BUSINESS LOGIC)|
+-----------------------------------------------------------------------------------------------+
| 1. All Server Actions and Route Handlers MUST     | 1. Number of allowed workspaces per paid  |
|    have deterministic rate limits to prevent DoS. |    subscription tier (e.g. Free vs Pro).  |
| 2. Input strings, arrays, and JSON payloads MUST  | 2. UI presentation of throttled states    |
|    have strict maximum lengths to prevent memory  |    (e.g. toast alert vs countdown modal). |
|    exhaustion.                                    | 3. Invitation expiration period (e.g. 7   |
| 3. Multi-instance production deployments MUST     |    days vs 14 days vs 30 days).           |
|    utilize centralized atomic state (Redis).      | 4. Search relevance ranking and result    |
| 4. Client IP extraction MUST use right-to-left    |    display sorting rules.                 |
|    trusted proxy hop traversal.                   | 5. File upload size quota (e.g. 10 GB     |
| 5. Implementation files (real-actions.ts) MUST NOT|    standard vs 50 GB Enterprise).         |
|    declare "use server" to avoid direct ID bypass.| 6. Outbound notification templates and    |
| 6. Rate-limit telemetry MUST NEVER log raw tokens,|    delivery channels.                     |
|    passwords, or personal credentials.            |                                           |
+-----------------------------------------------------------------------------------------------+
```

---

## 24. Open Questions & Operational Requirements

1. **Production Edge Proxy Topology**:
   - _Status_: **OPERATOR VERIFICATION REQUIRED**.
   - _Requirement_: The deployment engineer must verify whether Cloudflare is configured in front of Vercel/Antideploy. If Cloudflare is active, `TRUSTED_PROXY_HOPS` must be set to `2`. If direct, it remains `1`.
2. **Redis Connection Provisioning**:
   - _Status_: **OPERATOR VERIFICATION REQUIRED**.
   - _Requirement_: A low-latency Redis instance (Upstash Redis or Redis Cloud) located in Tokyo (`ap-northeast-1` / `hnd1` region) must be provisioned and its connection string supplied via `REDIS_URL` prior to production unpause.

---

## 25. Final Architectural Decision

The rate-limiting and resource-control architecture for AI NEX OS is fully specified, mathematically calibrated, and locked. The hybrid architectural pattern permanently eliminates the dual-export bypass vulnerability, the nine policy classes comprehensively protect all 189 production actions, distributed failure modes preserve application availability, and the test matrix provides an exhaustive blueprint for implementation verification.

$$\mathbf{FINAL\ DECISION:\ S6.2\ POLICY\ \&\ ARCHITECTURE\ COMPLETE\ —\ READY\ FOR\ S6.3}$$

---

_End of Phase S6.2 Architectural Specification._
