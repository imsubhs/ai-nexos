# AI NEX OS — Production Migration Plan

**Version:** 1.0
**Date:** 2026-07-28
**From:** `v1.0.0-beta` (demo persistence, `DEMO_MODE=true`)
**To:** `v1.0.0` (customer production)
**Status:** Plan only. Nothing in this document has been implemented.
**Authority:** Principal Enterprise Software Architect

---

## 1. Migration Thesis

The v1.0 Baseline asserted that the DemoStore → Supabase migration is _"a configuration change (`DEMO_MODE=false` + Supabase credentials), not a code change"_ (§2.11).

**That is half true, and the half that is false is the whole risk of this plan.**

True: the dispatcher genuinely routes on one environment variable, the real adapters genuinely exist for every action, and their signatures genuinely match. No module needs redesigning.

False: **none of those adapters has ever executed.** Sprint 12B alone added ~35 functions containing recursive CTEs, `DESC NULLS LAST` ordering, `onConflictDoNothing` upserts, batched `inArray` lookups and cross-schema joins into the `events` schema — all written against the Drizzle types, all typechecked, none run. On top of that sit 199+ tables of RLS policies that no database has evaluated, a permission engine mirrored in SQL that has never been called, and a demo identity that bypasses authentication entirely.

The flip is one line. **Making the system work after the flip is five sprints.** This plan is sequenced accordingly: persistence first, because everything else is meaningless if reads and writes do not work; then storage, then identity, then the background runtime, then deployment.

---

## 2. Production Infrastructure Map (Phase 3)

### 2.1 Dependency graph

```
                          ┌─────────────────────────────────────────┐
                          │           CLIENT (browser)              │
                          │   app.aicollective.agency  ·  portal.*  │
                          └───────────────────┬─────────────────────┘
                                              │ HTTPS
                          ┌───────────────────▼─────────────────────┐
                          │        Next.js 16 (Vercel)              │
                          │  ┌───────────────────────────────────┐  │
                          │  │  src/proxy.ts — PUBLIC GATEWAY    │  │
                          │  │  dual-domain · getUser() refresh  │  │
                          │  │  auth gating · public allowlist   │  │  [FROZEN]
                          │  └────────────────┬──────────────────┘  │
                          │                   │                     │
                          │  ┌────────────────▼──────────────────┐  │
                          │  │  RSC + Server Actions             │  │
                          │  │  ┌─────────────────────────────┐  │  │
                          │  │  │  DISPATCHER  actions.ts     │  │  │  [FROZEN]
                          │  │  │  DEMO_MODE ? mock : real    │  │  │
                          │  │  └──────┬───────────────┬──────┘  │  │
                          │  │         │               │         │  │
                          │  │    ┌────▼─────┐   ┌─────▼──────┐  │  │
                          │  │    │DemoStore │   │real-actions│  │  │
                          │  │    │(dev only)│   │ (Drizzle)  │  │  │
                          │  │    └──────────┘   └─────┬──────┘  │  │
                          │  │                         │         │  │
                          │  │  requirePermission() ───┤         │  │  [FROZEN]
                          │  └─────────────────────────┼─────────┘  │
                          └────────────────────────────┼────────────┘
                                                       │
   ┌───────────────────────────────────────────────────┼──────────────────────────┐
   │                          SUPABASE                 │                          │
   │                                                   │                          │
   │  ┌─────────────┐   ┌──────────────────────────────▼───────────┐              │
   │  │Supabase Auth│──▶│  PostgreSQL  (Drizzle ORM)               │              │
   │  │ password    │   │  199+ tables · 10 migrations             │              │
   │  │ magic link  │   │  RLS: app.has_permission()               │              │
   │  │ Google OAuth│   │       app.is_org_member()                │              │
   │  │ PKCE        │   │       app.current_user_organization_id() │              │
   │  └──────┬──────┘   │  schemas: public · events                │              │
   │         │          │  pooler 6543 (app) · direct 5432 (DDL)   │              │
   │         │FK        └───┬─────────────┬────────────┬───────────┘              │
   │         └───▶ users    │             │            │                          │
   │                        │             │            │                          │
   │  ┌─────────────────┐   │   ┌─────────▼──────┐  ┌──▼──────────────┐           │
   │  │Supabase Storage │◀──┘   │ Realtime       │  │ Edge Functions  │           │
   │  │ nexos-assets    │       │ (WAL → socket) │  │ (Deno)          │           │
   │  │ signed up/down  │       └────────┬───────┘  └──┬──────────────┘           │
   │  │ bucket RLS      │                │             │                          │
   │  └────────┬────────┘                │             │ invoked by               │
   │           │                         │             │                          │
   │           │ post-upload             │        ┌────▼─────┐                    │
   │           └────────────────────────────────▶ │  CRON    │                    │
   │                                     │        │(pg_cron  │                    │
   │                                     │        │ or Vercel│                    │
   │                                     │        │  Cron)   │                    │
   │                                     │        └────┬─────┘                    │
   └─────────────────────────────────────┼─────────────┼──────────────────────────┘
                                         │             │
        ┌────────────────────────────────┘             │
        │  in-app notifications                        │  triggers
        │  live task/deliverable updates               │
        ▼                                              ▼
   ┌─────────┐                          ┌──────────────────────────────────┐
   │ Browser │                          │       BACKGROUND RUNTIME         │
   └─────────┘                          │  ┌────────────────────────────┐  │
                                        │  │ notification consumer      │  │
   ┌──────────────────┐                 │  │  dequeue FOR UPDATE        │  │
   │     Resend       │◀────────────────┼──┤  SKIP LOCKED → channels    │  │
   │  transactional   │  EmailChannel   │  ├────────────────────────────┤  │
   │  email           │                 │  │ DistributedScheduler       │  │
   └──────────────────┘                 │  │  automation_schedules poll │  │
                                        │  ├────────────────────────────┤  │
   ┌──────────────────┐                 │  │ agent-executor             │  │
   │  Upstash Redis   │◀────────────────┼──┤ SLA / expiry sweeps        │  │
   │  queue + cache   │  QueueProvider  │  ├────────────────────────────┤  │
   └──────────────────┘                 │  │ virus scan (post-upload)   │  │
                                        │  └────────────────────────────┘  │
                                        └──────────────────────────────────┘

   ┌──────────────────────────── OBSERVABILITY ────────────────────────────┐
   │  Sentry (errors, traces)   ·   Vercel Logs / Axiom (structured logs)  │
   │  Supabase Metrics (DB)     ·   Uptime probe → /api/health             │
   └───────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────── BACKUP / DR ──────────────────────────────┐
   │  Supabase PITR (7d) · nightly logical dump → cold storage (30d)       │
   │  Storage bucket versioning · quarterly restore rehearsal              │
   └───────────────────────────────────────────────────────────────────────┘
```

### 2.2 Integration contracts

| Component             | Integrates via                                                                                | Exists today?                                       | Contract owner                           |
| --------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| **Supabase Auth**     | `src/lib/supabase/{client,server}.ts`; `getCurrentUser()` real branch; `proxy.ts` `getUser()` | **Yes** — written, never exercised                  | Frozen (Gateway)                         |
| **Supabase Postgres** | `src/db/index.ts` → `postgres-js` + Drizzle, `prepare:false`, pooler                          | **Yes** — client configured, never connected        | Frozen (Repository)                      |
| **Drizzle ORM**       | `src/db/schema/*` → `database/migrations/` (10 journaled)                                     | **Yes**                                             | Frozen (Rule 6)                          |
| **Supabase Storage**  | `StorageService` interface; `SupabaseStorageProvider`                                         | **Interface yes, provider mocked** (D-2)            | Interface is stable; body is replaceable |
| **Edge Functions**    | None                                                                                          | **No**                                              | New in Sprint 16                         |
| **Resend**            | `IDeliveryChannel` → `EmailChannel`                                                           | **Interface yes, body `console.log`** (D-3)         | Interface is stable                      |
| **Background Jobs**   | `background_jobs` table; `QueueProvider`; `DatabaseNotificationQueue`                         | **Schema + interfaces yes, no consumer** (D-4, D-6) | New consumers in Sprint 16               |
| **Realtime**          | Publication configured in migration `0001`                                                    | **DB side yes, zero client subscriptions**          | New in Sprint 16                         |
| **Cron**              | None (`.github/workflows/ci.yml` only)                                                        | **No**                                              | New in Sprint 16                         |
| **Monitoring**        | `/api/health` returns `{demoMode, environment}`                                               | **Endpoint yes, no probe**                          | New in Sprint 16                         |
| **Logging**           | `console.*` throughout                                                                        | **No structured logging**                           | New in Sprint 16                         |
| **Error tracking**    | `SENTRY_DSN` in `.env.example`                                                                | **Var only, no SDK**                                | New in Sprint 16                         |
| **Backup**            | Supabase-managed                                                                              | **Not configured**                                  | New in Sprint 17                         |

### 2.3 The three integration seams that carry the risk

1. **`getCurrentUser()`** — the only place identity resolves. Demo returns a hardcoded owner; real does a Supabase join across `users → roles → organizations`. Everything downstream (RBAC, org scoping, audit attribution) hangs off this one function. It is the highest-leverage 40 lines in the codebase.
2. **`src/db/index.ts`** — one pooled client, RLS-bypassing (`postgres` role) by design, with the safety contract living **entirely in the service layer** (`requirePermission`). If any real adapter forgets that call, RLS will not save it. This is worth an audit in Sprint 13, not an assumption.
3. **`StorageService`** — the only interface between the DAM and object storage. Clean and provider-agnostic; swapping it is genuinely low-risk. The risk is downstream: the client-side upload path, bucket policy, and virus scanning.

---

## 3. Migration Sprints (Phase 4)

Five sprints, **strictly ordered**. Each has a rollback that returns to `DEMO_MODE=true` — which is the plan's single most valuable property, and the reason the dispatcher pattern was worth the ceremony.

---

### Sprint 13 — Persistence

**Objective:** Every action and read executes against Supabase Postgres with `DEMO_MODE=false`, and multi-tenant isolation is proven by test rather than asserted.

**Precondition (blocking):** Commit and tag the working tree per `BETA_FREEZE.md` §5. Migrating on 136 uncommitted files means a failed migration has nothing to roll back to.

**Objectives**

1. Provision the Supabase project; apply all 10 migrations via `DIRECT_DATABASE_URL` (session mode — the pooler breaks DDL).
2. Seed one organisation, six system roles, and one owner from the `SEED_*` env vars.
3. Execute **every** real adapter at least once. ~35 are new in 12A/12B and have never run.
4. Audit every real action for a `requirePermission` call — RLS is bypassed by the service-role connection, so the service layer _is_ the boundary.
5. Prove tenant isolation: seed a second organisation and assert org A cannot read org B.
6. Exercise a non-owner role in a browser for the first time.
7. Resolve `database/drafts/automation_rls.draft.sql` — journal it or delete it (TD-07).

**Files affected**

- `.env.local` / deployment env (no code)
- `src/features/*/real-actions.ts`, `real-queries.ts` — defect fixes only, signatures frozen
- `src/db/index.ts` — connection tuning if the pooler misbehaves
- `database/migrations/` — only if a defect requires it; expected to be **zero new migrations**
- `tests/` — new integration suite
- `scripts/seed.ts`

**Risks**

| ID  | Risk                                                                                                                                                                                                                                                                               | Mitigation                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | **Demo conveniences with no SQL equivalent.** `nextDemoId()` returns sequential UUIDs; Postgres returns random ones. Any code that assumes ordering by id, or that a generated id is predictable, breaks.                                                                          | Grep for id-ordering assumptions before the flip. Covered by the "execute every adapter" objective.                                                                          |
| R-2 | **Never-executed SQL constructs.** The recursive-CTE descendant check in `updateFolder`, `sql\`… DESC NULLS LAST\``, `onConflictDoNothing().returning()`on`taskAssignees`, and the cross-schema `events`join in`getNotificationFeedAction` are the four most likely to fail first. | Write a targeted integration test for each **before** broad testing.                                                                                                         |
| R-3 | **RLS bypassed silently.** The Drizzle client connects as `postgres`. A real action missing `requirePermission` has _no_ protection.                                                                                                                                               | The §4 audit is not optional. Consider a lint rule or a test that asserts every exported action in `real-actions.ts` calls `requirePermission` or a validated access helper. |
| R-4 | **Behavioural mock/real divergence** (TD item 17). Sprint 12B found the two adapters writing different audit trails for the same call, invisible for two sprints.                                                                                                                  | Assume more exist. The integration suite should assert audit rows, not just return values.                                                                                   |
| R-5 | **Transaction semantics differ.** DemoStore "transactions" are synchronous array mutations that cannot roll back. Real ones can, and partial failures will now behave differently.                                                                                                 | Test the multi-step writes specifically: `createDeliverable` (3 steps), `promoteActionItemToTask` (2 tables), `initializeFileUpload` (3 steps).                              |
| R-6 | **Cross-schema FK to `auth.users`.** Migration `0001` creates it. Seeding users outside Supabase Auth will violate it.                                                                                                                                                             | Seed through the Auth API, not raw SQL.                                                                                                                                      |

**Rollback:** Set `DEMO_MODE=true`. The dispatcher routes back to the DemoStore; no data migration is required because there is no production data yet. **This is the cheapest rollback in the entire plan and it is why persistence goes first.**

**Acceptance criteria**

- [ ] All 10 migrations applied; `_journal.json` matches the database
- [ ] `DEMO_MODE=false` with all 39 Sprint 12B workflow checks passing against Postgres
- [ ] Every exported function in every `real-actions.ts` / `real-queries.ts` executed at least once, recorded in a coverage table
- [ ] `requirePermission` audit complete; every gap closed
- [ ] **Org B cannot read org A's rows — proven by an automated test, not inspection**
- [ ] At least one non-owner role completes a full workflow in a browser and is correctly denied at least one action
- [ ] `npm test` green including the new integration suite
- [ ] No new migration required, or any that was required is journaled and documented

---

### Sprint 14 — Object Storage

**Objective:** Real bytes move. Files upload, download and preview; TD-02 closes.

**Objectives**

1. Replace the `supabaseAdmin` object literal in `SupabaseStorageProvider.ts` with a real service-role client.
2. Create the `nexos-assets` bucket with org-scoped policies.
3. Complete the client-side upload: browser → signed URL → `finalizeFileUpload`. The SHA-256 is already computed browser-side and is real.
4. Wire download: signed URL, permission-checked, `file_metrics` recorded.
5. Inline preview by MIME type (image / video / PDF).
6. **Replace `MockVirusScanner`** (TD-09) — it currently always returns clean. Quarantine on detection.
7. Thumbnail generation via Edge Function (optional; may defer to 16).

**Files affected**

- `src/lib/storage/SupabaseStorageProvider.ts` — the mock literal
- `src/lib/security/VirusScanner.ts` — the mock singleton
- `src/features/files/real-actions.ts` — download action; scan hook
- `src/features/files/components/file-preview-sheet.tsx` — replace the TD-02 notice with a viewer
- `src/features/deliverables/components/deliverable-actions.tsx` — enable download
- `src/app/portal/s/[token]/` — share-link download path

**Risks**

| ID   | Risk                                                                                                                                                                                                                                                                           | Mitigation                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| R-7  | **Bucket policy is a second, parallel authorisation system** and can disagree with `requirePermission`.                                                                                                                                                                        | Test the disagreement cases explicitly: a user with `files.read` but no project membership.                                      |
| R-8  | **Share links bypass the session.** `/portal/s/[token]` serves anonymous users. A signed URL leaked from there is a data breach.                                                                                                                                               | Short expiry; enforce `maxDownloads`; log every access to `file_metrics`.                                                        |
| R-9  | **Deduplication crosses tenants.** `finalizeFileUpload` looks up an existing blob by `sha256Hash` **with no organisation filter** — two orgs uploading the same file would share a storage path. `initializeFileUpload` is correctly project-scoped; the finalize path is not. | **Treat as a security defect, not a design choice.** Scope the finalize lookup to the organisation before enabling real storage. |
| R-10 | **A clean-returning virus scanner in production is a liability**, not merely debt.                                                                                                                                                                                             | Sprint 14 does not ship without it.                                                                                              |

**Rollback:** Revert the provider to the mock literal. Files already registered keep their metadata and versions; only byte transfer stops. **Uploaded blobs are not lost** — they remain in the bucket and reconnect when the provider is restored.

**Acceptance criteria**

- [ ] A real file uploads, downloads byte-identically, and previews inline
- [ ] SHA-256 computed browser-side matches the stored blob
- [ ] Dedup is organisation-scoped and proven by test (R-9)
- [ ] A share link downloads for an anonymous user, expires, and honours `maxDownloads`
- [ ] Real virus scanning quarantines a known test file (EICAR)
- [ ] TD-02 closed in `TECHNICAL-DEBT-NOTES.md`
- [ ] Every "unavailable (TD-02)" notice removed from the UI

---

### Sprint 15 — Authentication & Identity

**Objective:** Real users authenticate. The demo identity becomes unreachable in any non-development build.

**Objectives**

1. Validate all four Supabase Auth flows (password, magic link, Google OAuth, PKCE) against the real gateway.
2. Retire `DEMO_ADMIN_USER` from any deployed path; **fail the build if `DEMO_MODE=true` and `NODE_ENV=production`** (closes P2-06).
3. Fix `mock-actions.ts` cookie flags (`httpOnly`, `secure`, `sameSite`) even though it is demo-only — a cookie without them is a bad pattern to leave in the repository.
4. User invitation and provisioning flow; `/unprovisioned` becomes a real state rather than a fallback.
5. Exercise all six system roles end to end.
6. Client portal real session auth (TD-10); replace any remaining mock identity.
7. Password reset, email verification, session expiry and refresh.

**Files affected**

- `src/features/auth/{real-actions,mock-actions,current-user}.ts`
- `src/proxy.ts` — **frozen; changes require Principal Architect review** (Rule 4). Expect none.
- `src/lib/portal/services/PortalServiceLayer.ts`
- `src/app/(auth)/`, `src/app/auth/callback/`
- `next.config.ts` or a startup assertion for the production guard

**Risks**

| ID   | Risk                                                                                                                                        | Mitigation                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| R-11 | **`getCurrentUser()` is the single point of failure for identity, RBAC, org scoping and audit attribution.** Its real branch has never run. | Test it in isolation first, before any UI depends on it.                            |
| R-12 | **Rule 4 pressure.** Real auth will tempt changes to the frozen gateway.                                                                    | Any `proxy.ts` change requires explicit architect sign-off and a baseline revision. |
| R-13 | **Non-owner roles have never been exercised.** Permission maps may be wrong in ways nothing has surfaced.                                   | Sprint 13 starts this; Sprint 15 completes it across all six roles.                 |
| R-14 | **Session expiry during a multi-step write** (upload, review session) is untested.                                                          | Test mid-flow expiry explicitly.                                                    |

**Rollback:** `DEMO_MODE=true` restores demo login. **This rollback closes after Sprint 15** — once real users exist, reverting to a shared demo owner is a security regression, not a rollback.

**Acceptance criteria**

- [ ] All four auth flows work in staging
- [ ] **A production build with `DEMO_MODE=true` fails to start** (P2-06 closed)
- [ ] Six roles exercised; each denied at least one action it should not have
- [ ] Portal session auth real; TD-10 closed
- [ ] Password reset and email verification work
- [ ] Session cookies carry `httpOnly`, `secure`, `sameSite` on every path
- [ ] Audit rows attribute to real users

---

### Sprint 16 — Background Runtime & Observability

**Objective:** The platform executes work no one is watching, and someone can tell when it stops.

**Objectives**

1. **Notification delivery.** Implement `DatabaseNotificationQueue.dequeue()` with `FOR UPDATE SKIP LOCKED` (currently returns `[]`); build the consumer; wire `EmailChannel` to Resend; wire `InAppChannel` to Realtime.
2. **Worker invokers.** Cron → authenticated endpoint or Edge Function for `agent-executor` and any sweeps. **Note: `sla-worker` and `SessionCleanupWorker` named in baseline TD-05 do not exist** — decide whether to build or delete the debt item.
3. **Scheduler.** Call `DistributedScheduler.start()` from a real runtime; replace `InMemoryQueueProvider` with Redis (it already throws in production, which will be the first failure encountered).
4. **Event bus.** Instantiate the Event Engine and wire subscribers (TD-06). Domain events currently exist only as a read fixture.
5. **Realtime.** First client subscriptions — the DB publication has existed since migration `0001` with zero consumers.
6. **Observability.** Sentry SDK; structured logging replacing `console.*`; uptime probe on `/api/health`; DB metrics alerting.

**Files affected**

- `src/features/notifications/{queue,channels}.ts`
- `src/lib/automation/{queue,scheduler}.ts`
- `src/features/events/engine.ts` — subscriber wiring
- `src/workers/`
- New: `supabase/functions/` or `app/api/cron/*`
- New: `instrumentation.ts` (Sentry), `src/lib/logger.ts`
- `vercel.json` or `pg_cron` config

**Risks**

| ID   | Risk                                                                                                                                                     | Mitigation                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| R-15 | **Most-new-code sprint.** Unlike 13–15, this is not swapping implementations behind existing interfaces — it is building runtime that has never existed. | Ship incrementally: notifications first (highest user value, best-defined schema), automation last. |
| R-16 | **Double delivery.** Without `SKIP LOCKED` done correctly, two consumers send the same email twice.                                                      | Idempotency keys; test with concurrent consumers, not one.                                          |
| R-17 | **Event bus instantiation may surface subscribers nobody has run.**                                                                                      | Enumerate every subscriber before wiring; wire one at a time.                                       |
| R-18 | **Cost.** Redis, Sentry, Resend and Edge Functions all bill.                                                                                             | Size and budget before provisioning.                                                                |

**Rollback:** Per-component and independent — this sprint's components do not depend on each other. Disable the cron trigger and the system returns to Sprint 15 behaviour: notifications accumulate unsent in the queue, nothing is lost.

**Acceptance criteria**

- [ ] A domain event produces a delivered email **and** an in-app notification
- [ ] Queue consumer handles concurrency without double delivery (proven under concurrent load)
- [ ] Scheduler fires a scheduled automation in staging
- [ ] Realtime pushes a live update to a second browser
- [ ] Sentry captures a deliberately thrown error with full context
- [ ] Uptime probe alerts on a simulated outage
- [ ] TD-04, TD-05, TD-06 closed or explicitly re-scoped

---

### Sprint 17 — Production Deployment

**Objective:** A customer can be given a URL.

**Objectives**

1. Production environment: domains, TLS, DNS for `app.*` and `portal.*`.
2. CI/CD deploy pipeline with gates (lint, typecheck, test, build) — CI exists; deployment does not.
3. Backup and DR: PITR, nightly logical dumps, **a rehearsed and timed restore**.
4. Rate limiting and WAF.
5. Security review: dependency audit, header policy, CSP, penetration test.
6. Load testing at expected concurrency.
7. Runbooks: incident response, on-call, rollback, restore.
8. Legal and compliance: privacy policy, DPA, data retention (the `retainedUntil` column exists and is unused).

**Files affected** — almost entirely configuration and documentation, not `src/`.

**Risks**

| ID   | Risk                                                                                                           | Mitigation                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| R-19 | **A backup that has never been restored is not a backup.**                                                     | Rehearse and time it. Record the RTO.                                       |
| R-20 | **First real load.** No performance data exists under network latency; every measurement to date is in-memory. | Load test before the first customer, not after.                             |
| R-21 | **Rollback is no longer free.** Once customers have data, `DEMO_MODE=true` is not an option.                   | Blue-green or canary. Rollback plans must be data-aware from here.          |
| R-22 | **Unreviewed portal surface** ships to external users first.                                                   | Run the Phase A/Stabilization review passes on `/portal/*` before exposure. |

**Rollback:** Blue-green with instant DNS/deployment revert. Data rollback is PITR only, and lossy — treat it as an incident, not a routine.

**Acceptance criteria**

- [ ] Production reachable on both domains with valid TLS
- [ ] CI/CD deploys on merge with all gates enforced
- [ ] **Restore rehearsed, timed, and the RTO documented**
- [ ] Rate limiting active and verified
- [ ] Security review complete, findings closed or accepted in writing
- [ ] Load test meets targets
- [ ] Runbooks written and walked through by someone who did not write them
- [ ] `PRODUCTION_READINESS_CHECKLIST.md` fully green
- [ ] 7 consecutive days in staging with no P1

---

## 4. Sequencing and Effort

| Sprint | Objective             | Effort      | Depends on                       | Rollback cost                      |
| ------ | --------------------- | ----------- | -------------------------------- | ---------------------------------- |
| **13** | Persistence           | **8–12 d**  | Committed tree; Supabase project | Trivial (`DEMO_MODE=true`)         |
| **14** | Object Storage        | **7–10 d**  | 13                               | Low (blobs retained)               |
| **15** | Auth & Identity       | **6–9 d**   | 13                               | Low → **closes after this sprint** |
| **16** | Background Runtime    | **12–16 d** | 13, 15                           | Per-component                      |
| **17** | Production Deployment | **8–12 d**  | All                              | Blue-green; data rollback lossy    |
|        | **Total**             | **41–59 d** |                                  |                                    |

Roughly **9–13 calendar weeks** for one engineer, or 6–8 with two, given 14/15 can overlap after 13.

**Why this order.** Persistence first because nothing else can be validated without it and its rollback is free. Storage before Auth because storage is self-contained and Auth's rollback window closes permanently. Runtime after Auth because delivery needs real recipients. Deployment last, for obvious reasons.

**The one non-negotiable:** Sprint 13's tenant-isolation criterion. Multi-tenancy is the platform's central security claim and it is currently unverified. If that test cannot be made to pass, nothing after it matters.

---

## 5. Out of Scope for v1.0

Deliberately excluded from this plan; each would extend it materially.

| Item                                                      | Why deferred                                                                  |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **AI Workspace / real LLM SDK** (D-11, TD-03)             | Nav is "coming soon". `executeProvider()` returns a canned string. Post-v1.0. |
| **Knowledge Graph query adapter** (TD-13)                 | No UI consumes it.                                                            |
| **Automation builder UI**                                 | Engine only; no surface.                                                      |
| **Analytics dashboards**                                  | Engines exist; nav is "coming soon".                                          |
| **Task checklists, task dependency UI**                   | `TECHNICAL-DEBT-NOTES.md` 15, 16.                                             |
| **Global task workspace, per-record routes, breadcrumbs** | Product backlog, not migration.                                               |
| **TanStack Table port**                                   | Long-standing backlog item.                                                   |
| **Full-text / ranked search** (D-8)                       | Composed search works and is honest about its limits.                         |

---

_Plan only. No production infrastructure was implemented, no code was modified, and Sprint 13 has not begun. Awaiting architecture approval._
