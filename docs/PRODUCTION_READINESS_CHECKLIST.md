# AI NEX OS — Production Readiness Checklist

**Version:** 1.0
**Date:** 2026-07-28
**Gate for:** `v1.0.0` customer-production release
**Current state:** `v1.0.0-beta` — demo persistence

**Status key:** ✅ done · ⚠️ partial · ❌ not started · N/A not applicable at v1.0

**Every ❌ and ⚠️ below is a release gate.** This checklist is the exit criteria for `BETA_FREEZE.md`.

> **Sprint 2.2 update (2026-08-07).** Section 3 (Auth/Authz) and section 7
> (Security) were reworked. Details in `docs/SECURITY.md` and
> `docs/THREAT-MODEL.md`. The items that moved are marked below; the ones that
> did **not** move are more important to read — 3.5 / 7.6 (RLS never evaluated
> by a database) remains the single largest open risk, and no amount of
> application-layer work in this sprint changes that.

---

## Summary

| Section                           | Done   | Partial | Not started | Score              |
| --------------------------------- | ------ | ------- | ----------- | ------------------ |
| 1. Repository & Release           | 1      | 1       | 5           | **1 / 7**          |
| 2. Persistence                    | 2      | 1       | 8           | **2 / 11**         |
| 3. Authentication & Authorization | 7      | 0       | 5           | **7 / 12**         |
| 4. Object Storage                 | 2      | 1       | 6           | **2 / 9**          |
| 5. Background Runtime             | 1      | 2       | 6           | **1 / 9**          |
| 6. Observability                  | 1      | 0       | 6           | **1 / 7**          |
| 7. Security                       | 10     | 4       | 1           | **10 / 15**        |
| 8. Performance                    | 3      | 2       | 4           | **3 / 9**          |
| 9. Quality & Testing              | 6      | 2       | 3           | **6 / 11**         |
| 10. Deployment & DR               | 0      | 1       | 8           | **0 / 9**          |
| 11. Documentation & Process       | 6      | 1       | 4           | **6 / 11**         |
| 12. Compliance                    | 0      | 0       | 5           | **0 / 5**          |
| **TOTAL**                         | **43** | **19**  | **53**      | **43 / 115 (37%)** |

**37% after Sprint 2.2, and the honest reading has not changed much.** Section 7 moved from 5/15 to 10/15 and section 3 from 3/12 to 7/12, but every one of those points is _application-layer_: code that has been reviewed, type-checked and unit-tested, and in the case of the CSP verified against a running production build.

What did not move is the part that matters most. **RLS has still never been evaluated by a database** (3.5, 7.6), there are still no integration tests against Postgres (9.9), and five of the six system roles have still never run (3.6). Every tenant-isolation fix in Sprint 2.2 is a `WHERE` clause that has never executed against real rows. Those are Sprint 13's to close, and until they are, the security posture is _well-constructed and unverified_ rather than proven.

---

## 1. Repository & Release

| #   | Item                       | Status | Note                                                                                                                        |
| --- | -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Working tree committed     | ❌     | **136 uncommitted paths.** Violates Baseline Rule 8. Blocks everything.                                                     |
| 1.2 | Migrations tracked in git  | ❌     | `0008`, `0009` and their snapshots are **untracked** while `_journal.json` references them — a fresh clone would be broken. |
| 1.3 | Release tagged             | ❌     | No tags exist. `v1.0.0-beta` recommended.                                                                                   |
| 1.4 | Git remote configured      | ❌     | **No remote. The only copy is on one disk.**                                                                                |
| 1.5 | `main` reflects reality    | ❌     | `main` is 2 commits behind a 136-file tree.                                                                                 |
| 1.6 | Branch strategy documented | ⚠️     | Recommended in `BETA_FREEZE.md` §5.7, not adopted.                                                                          |
| 1.7 | `.gitignore` correct       | ✅     | `scratch/`, `.next/`, `.env*` (with `.env.example` tracked) all correct.                                                    |

## 2. Persistence

| #    | Item                                      | Status | Note                                                                             |
| ---- | ----------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| 2.1  | Schema designed and migrated              | ✅     | 199+ tables, 10 journaled migrations                                             |
| 2.2  | Drizzle client configured                 | ✅     | Pooler-safe (`prepare:false`), session-mode config for DDL                       |
| 2.3  | Supabase project provisioned              | ❌     | Sprint 13                                                                        |
| 2.4  | Migrations applied to a real database     | ❌     | Sprint 13                                                                        |
| 2.5  | `DEMO_MODE=false` verified end to end     | ❌     | **The central gap.** Sprint 13                                                   |
| 2.6  | Every real adapter executed at least once | ❌     | ~35 never-executed functions from 12A/12B alone                                  |
| 2.7  | Multi-tenant isolation proven by test     | ❌     | **The single most important item on this checklist**                             |
| 2.8  | Seed script validated against Postgres    | ❌     | `scripts/seed.ts` exists, never run against a DB                                 |
| 2.9  | Non-journaled SQL resolved                | ⚠️     | `database/drafts/automation_rls.draft.sql` quarantined, not resolved (TD-07)     |
| 2.10 | Connection pooling verified under load    | ❌     | Sprint 17                                                                        |
| 2.11 | Transaction semantics verified            | ❌     | Multi-step writes behave differently in SQL than in the array-mutating DemoStore |

## 3. Authentication & Authorization

| #    | Item                                      | Status | Note                                                                                                                                                                                                                                                                                            |
| ---- | ----------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | Auth provider integrated                  | ✅     | Supabase Auth: password, magic link, Google OAuth, PKCE — written                                                                                                                                                                                                                               |
| 3.2  | Session handling in the gateway           | ✅     | `proxy.ts` `getUser()` refresh — frozen                                                                                                                                                                                                                                                         |
| 3.3  | Permission vocabulary defined             | ✅     | 22 modules × 15 actions, mirrored in SQL and TypeScript                                                                                                                                                                                                                                         |
| 3.4  | Real auth flows verified                  | ❌     | Never executed. Sprint 15                                                                                                                                                                                                                                                                       |
| 3.5  | RLS policies evaluated by a database      | ❌     | **Never. The platform's central security claim is unverified.**                                                                                                                                                                                                                                 |
| 3.6  | All six system roles exercised            | ❌     | Only `owner` has ever been used                                                                                                                                                                                                                                                                 |
| 3.7  | `requirePermission` on every real action  | ✅     | **Sprint 2.2.** Audited mechanically and enforced on every commit — `scripts/audit-authorization.ts` + `tests/unit/authorization-coverage.test.ts`. First run found 6 unguarded actions across automation, agents and shares; all closed. 4 sign-in actions exempt, each with a written reason. |
| 3.8  | `DEMO_MODE` cannot reach production       | ✅     | **Sprint 2.2.** `isDemoMode()` returns false under `NODE_ENV=production` unconditionally, independent of the boot gate (which skips the Edge runtime and the build phase). P2-06 closed.                                                                                                        |
| 3.9  | Session cookie flags correct on all paths | ✅     | **Sprint 2.2.** One definition in `features/auth/demo-session.ts`; both writers use it. Portal sessions likewise (`httpOnly`, `secure`, `sameSite=lax`, bounded TTL).                                                                                                                           |
| 3.10 | Portal session auth real                  | ✅     | **Sprint 2.2.** `lib/portal/session.ts` — share token verified, then exchanged for a server-side session scoped to the share's own organisation and client. Token stored as SHA-256 only; revocation is a status update. TD-10 closed.                                                          |
| 3.11 | Password reset / email verification       | ❌     | Sprint 15                                                                                                                                                                                                                                                                                       |
| 3.12 | User provisioning / invitation flow       | ❌     | Sprint 15                                                                                                                                                                                                                                                                                       |

## 4. Object Storage

| #   | Item                                | Status | Note                                                                                                                                                                               |
| --- | ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Provider interface defined          | ✅     | `StorageService` — clean, provider-agnostic                                                                                                                                        |
| 4.2 | Real storage provider               | ❌     | **TD-02.** Still a hand-written mock returning `mock.supabase.co` URLs. Sprint 2.2 made it **throw in production** — a "signed" URL no backend enforces is an unauthenticated one. |
| 4.3 | Bucket provisioned with policies    | ❌     | Sprint 14                                                                                                                                                                          |
| 4.4 | Upload path transfers bytes         | ⚠️     | Record, version and a real browser-computed SHA-256 are created; **no bytes move**                                                                                                 |
| 4.5 | Download works                      | ❌     | Sprint 14                                                                                                                                                                          |
| 4.6 | Inline preview                      | ❌     | Sprint 14                                                                                                                                                                          |
| 4.7 | Virus scanning                      | ⚠️     | **TD-09.** Still a mock, but **fails closed in production** as of Sprint 2.2 rather than returning `isClean: true` everywhere.                                                     |
| 4.8 | Dedup is organisation-scoped        | ✅     | **Sprint 2.2.** Organisation filter added. R-9 closed, including the existence oracle it created.                                                                                  |
| 4.9 | Share-link downloads expire and cap | ❌     | Schema supports `expiresAt` / `maxDownloads`; unenforced without real storage                                                                                                      |

## 5. Background Runtime

| #   | Item                        | Status | Note                                                                                           |
| --- | --------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| 5.1 | Queue schema and interfaces | ✅     | `notification_queue`, `background_jobs`, DLQ, retry columns all exist                          |
| 5.2 | Queue consumer              | ❌     | **`DatabaseNotificationQueue.dequeue()` returns `[]` unconditionally**                         |
| 5.3 | Email delivery              | ❌     | `EmailChannel.deliver()` is `console.log`. Resend key in `.env.example` only                   |
| 5.4 | In-app delivery             | ⚠️     | Read side real (titles, bodies, grouping, read/unread); **delivery is `console.log`**          |
| 5.5 | Worker invokers             | ❌     | **TD-05.** No cron, no consumer. Baseline names 3 workers; **only `agent-executor.ts` exists** |
| 5.6 | Scheduler running           | ❌     | `DistributedScheduler` implemented; **nothing calls `.start()`**                               |
| 5.7 | Event bus instantiated      | ❌     | **TD-06.** Never instantiated; no subscribers                                                  |
| 5.8 | Realtime subscriptions      | ❌     | DB publication configured since `0001`; **zero client subscriptions**                          |
| 5.9 | Production queue provider   | ⚠️     | `InMemoryQueueProvider` **throws in production** — a good guard that will fire on day one      |

## 6. Observability

| #   | Item                    | Status | Note                                             |
| --- | ----------------------- | ------ | ------------------------------------------------ |
| 6.1 | Health endpoint         | ✅     | `/api/health` returns `{demoMode, environment}`  |
| 6.2 | Uptime probe            | ❌     | Endpoint exists; nothing polls it                |
| 6.3 | Error tracking          | ❌     | `SENTRY_DSN` in `.env.example`; no SDK installed |
| 6.4 | Structured logging      | ❌     | `console.*` throughout                           |
| 6.5 | DB metrics and alerting | ❌     | Sprint 16                                        |
| 6.6 | Performance tracing     | ❌     | Sprint 16                                        |
| 6.7 | Alert routing / on-call | ❌     | Sprint 17                                        |

## 7. Security

| #    | Item                              | Status | Note                                                                                                                                                                                                                                                                                                                         |
| ---- | --------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | Multi-tenant schema design        | ✅     | `organization_id` on every operational table                                                                                                                                                                                                                                                                                 |
| 7.2  | RLS policies written              | ✅     | Migration `0001` + per-module policies                                                                                                                                                                                                                                                                                       |
| 7.3  | Permission engine SQL/TS parity   | ✅     | `app.has_permission` mirrors the TypeScript vocabulary                                                                                                                                                                                                                                                                       |
| 7.4  | Org-isolation policy helper       | ✅     | `orgIsolationPolicy` applied across modules                                                                                                                                                                                                                                                                                  |
| 7.5  | Portal token security             | ✅     | JWT + HMAC signing implemented                                                                                                                                                                                                                                                                                               |
| 7.6  | RLS verified at runtime           | ❌     | **Never evaluated by a database**                                                                                                                                                                                                                                                                                            |
| 7.7  | Demo bypass blocked in production | ✅     | **Sprint 2.2.** See 3.8.                                                                                                                                                                                                                                                                                                     |
| 7.8  | Cookie flags on every path        | ✅     | **Sprint 2.2.** See 3.9                                                                                                                                                                                                                                                                                                      |
| 7.9  | Virus scanning                    | ⚠️     | **Sprint 2.2.** Still a mock (TD-09), but it now _fails closed_ in production instead of stamping every file clean. Cannot ship silently.                                                                                                                                                                                    |
| 7.10 | Cross-tenant dedup closed         | ✅     | **Sprint 2.2.** `finalizeFileUpload` deduplicates within the organisation. Closed the existence oracle too — R-9.                                                                                                                                                                                                            |
| 7.11 | Rate limiting / WAF               | ⚠️     | **Sprint 2.2.** Application-layer rate limiting shipped (`lib/security/rate-limit.ts`): weighted sliding window, Redis-backed with an in-memory fallback, on sign-in, magic link, auth callback, approval verify, portal session and share passwords. **No WAF** — that remains Sprint 17. Per-instance without `REDIS_URL`. |
| 7.12 | Security headers / CSP            | ✅     | **Sprint 2.2.** Nonce-based CSP with no `'unsafe-inline'` for scripts, emitted per request by the proxy; full static header set. Verified against a production build, not just unit-tested. `style-src` keeps `'unsafe-inline'` — documented in `docs/SECURITY.md` §4.                                                       |
| 7.13 | Dependency vulnerability audit    | ✅     | **Sprint 2.2.** Run, acted on (Next → 16.3.0, clearing a proxy bypass + SSRF + DoS and transitively postcss/sharp), and wired into CI as `npm run audit:deps` at `--audit-level=high`. 4 moderate dev-only findings accepted with reasons.                                                                                   |
| 7.14 | Penetration test                  | ❌     | Sprint 17                                                                                                                                                                                                                                                                                                                    |
| 7.15 | Secrets management                | ⚠️     | Unchanged: `.env.local` gitignored, `.env.example` tracked, boot-time validation and no constant fallbacks (Sprint 2.1). Still **no vault and no rotation policy** — Sprint 2.3.                                                                                                                                             |

## 8. Performance

| #   | Item                                    | Status | Note                                                                                                                                                                                      |
| --- | --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | Production build green                  | ✅     | Green on Next 16.3.0. **Sprint 2.2:** all 36 routes are now dynamic — the nonce-based CSP requires a per-request header in the root layout, which costs prerendering on 9 trivial shells. |
| 8.2 | List virtualisation                     | ✅     | `@tanstack/react-virtual` on task list and board                                                                                                                                          |
| 8.3 | Parallelised reads                      | ✅     | Drawer sub-reads use `Promise.all`                                                                                                                                                        |
| 8.4 | Pagination                              | ⚠️     | Works; **over-fetches one row to infer "has more"** (no total-count query)                                                                                                                |
| 8.5 | Server-side filtering everywhere        | ⚠️     | Meetings and Timeline filter client-side over a bounded batch (TD item 7)                                                                                                                 |
| 8.6 | Measured under real latency             | ❌     | **Every measurement to date is in-memory**                                                                                                                                                |
| 8.7 | Load tested                             | ❌     | Sprint 17                                                                                                                                                                                 |
| 8.8 | Query plans reviewed / indexes verified | ❌     | Indexes declared; never `EXPLAIN`ed                                                                                                                                                       |
| 8.9 | Caching strategy                        | ❌     | Redis cache falls back to a warning stub                                                                                                                                                  |

## 9. Quality & Testing

| #    | Item                                | Status | Note                                                                        |
| ---- | ----------------------------------- | ------ | --------------------------------------------------------------------------- |
| 9.1  | Lint clean                          | ✅     | 0 errors, 109 warnings                                                      |
| 9.2  | Typecheck clean                     | ✅     | 0 errors, strict                                                            |
| 9.3  | Unit tests                          | ✅     | 240 / 240, 22 files                                                         |
| 9.4  | Build green                         | ✅     | 36 routes                                                                   |
| 9.5  | E2E workflow verification           | ✅     | 39 / 39 in real Chromium                                                    |
| 9.6  | DemoStore ⇄ schema parity enforced  | ✅     | 20 collections, 80 assertions                                               |
| 9.7  | CI runs the gates                   | ⚠️     | `.github/workflows/ci.yml` exists; **no deploy stage**                      |
| 9.8  | Behavioural mock/real parity tested | ❌     | **TD item 17** — the divergence found in 12B was invisible for two sprints  |
| 9.9  | Integration tests against Postgres  | ❌     | Sprint 13                                                                   |
| 9.10 | Accessibility audited with AT       | ⚠️     | 0 unnamed / 0 dimmed-focusable controls verified; **no screen-reader pass** |
| 9.11 | Portal surface reviewed             | ❌     | Never reviewed. Flagged since Stabilization                                 |

## 10. Deployment & DR

| #    | Item                                | Status | Note                                                      |
| ---- | ----------------------------------- | ------ | --------------------------------------------------------- |
| 10.1 | Production environment              | ❌     | Sprint 17                                                 |
| 10.2 | Domains + TLS (`app.*`, `portal.*`) | ❌     | Sprint 17                                                 |
| 10.3 | CD pipeline                         | ❌     | CI exists, deployment does not                            |
| 10.4 | Environment variables documented    | ⚠️     | `.env.example` has 26 vars; **no per-environment matrix** |
| 10.5 | Backup configured                   | ❌     | Sprint 17                                                 |
| 10.6 | **Restore rehearsed and timed**     | ❌     | **An unrehearsed backup is not a backup**                 |
| 10.7 | Rollback procedure                  | ❌     | Sprint 17                                                 |
| 10.8 | Runbooks                            | ❌     | Sprint 17                                                 |
| 10.9 | Staging environment                 | ❌     | Sprint 13 needs one                                       |

## 11. Documentation & Process

| #     | Item                          | Status | Note                                              |
| ----- | ----------------------------- | ------ | ------------------------------------------------- |
| 11.1  | Architecture baseline         | ✅     | `NEXOS_v1.0_BASELINE.md`                          |
| 11.2  | Sprint history                | ✅     | 11A, 11B, Stabilization, Phase A, 12A, 12B        |
| 11.3  | Technical debt register       | ✅     | 20 items, current                                 |
| 11.4  | QA notes                      | ✅     | Per-sprint, with method and limitations stated    |
| 11.5  | Migration notes               | ✅     | Per-sprint                                        |
| 11.6  | Production migration plan     | ✅     | This phase                                        |
| 11.7  | API documentation             | ❌     | No generated action/API reference                 |
| 11.8  | Developer onboarding / README | ⚠️     | `README.md` exists; predates most of the platform |
| 11.9  | Incident response             | ❌     | Sprint 17                                         |
| 11.10 | Baseline TD-05 corrected      | ❌     | Names 3 workers; 1 exists                         |
| 11.11 | Support / escalation path     | ❌     | Sprint 17                                         |

## 12. Compliance

| #    | Item                                    | Status | Note                                               |
| ---- | --------------------------------------- | ------ | -------------------------------------------------- |
| 12.1 | Privacy policy                          | ❌     | Required before real user data                     |
| 12.2 | Terms of service                        | ❌     | —                                                  |
| 12.3 | DPA / GDPR posture                      | ❌     | Multi-tenant SaaS storing client data              |
| 12.4 | Data retention policy                   | ❌     | `retainedUntil` column exists, unused              |
| 12.5 | Data export / deletion (subject rights) | ❌     | Soft deletes exist; no export, no hard-delete path |

---

## 13. Configuration (Phase 2, Sprint 2.1)

Delivered in Sprint 2.1 unless noted. Reference: [ENVIRONMENT.md](ENVIRONMENT.md).

| #     | Item                                                       | Status | Note                                                                      |
| ----- | ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| 13.1  | Every variable classified and documented                   | ✅     | `ENV_MANIFEST` + `.env.example` + `ENVIRONMENT.md`                        |
| 13.2  | Missing required variables fail at boot, not per-request   | ✅     | `src/instrumentation.ts` → `assertProductionConfig()`                     |
| 13.3  | All problems reported in one message                       | ✅     | Shape and production checks run independently and merge                   |
| 13.4  | Optional variables never crash an import                   | ✅     | Public parse is non-fatal; blank treated as absent                        |
| 13.5  | Build succeeds with no secrets configured                  | ✅     | Verified; boot gate skipped during the build phase                        |
| 13.6  | Server secrets absent from client bundles                  | ✅     | `env.server.ts` split; `.next/static` scanned for names and values        |
| 13.7  | Obsolete / dead variables removed                          | ✅     | 6 removed (see ENVIRONMENT.md §2.2)                                       |
| 13.8  | `DEMO_MODE=true` impossible in production                  | ✅     | Fatal startup error. Complements G3 (bypass at the auth layer, Sprint 15) |
| 13.9  | Startup diagnostics, redacted                              | ✅     | `[env]` boot summary + `/api/health` services/fallbacks                   |
| 13.10 | Pre-flight validation available to developers and CI       | ✅     | `npm run env:check [-- --production]`                                     |
| 13.11 | Secret rotation runbook                                    | ❌     | Sprint 17. Rotating a signing secret invalidates outstanding tokens       |
| 13.12 | Secrets held in a managed store, not platform env vars     | ❌     | Sprint 17 decision                                                        |
| 13.13 | Production values verified against a real Supabase project | ❌     | Sprint 13 — no variable has been exercised against real infrastructure    |

## Release Gates

**Cannot ship to any customer until all of these are green:**

| Gate                               | Checklist items  | Sprint    |
| ---------------------------------- | ---------------- | --------- |
| **G1 — Committed**                 | 1.1–1.5          | Before 13 |
| **G2 — Tenant isolation proven**   | 2.7, 3.5, 3.7    | 13        |
| **G3 — Demo bypass impossible**    | 3.8, 3.9         | 15        |
| **G4 — Storage safe**              | 4.7, 4.8         | 14        |
| **G5 — Restore rehearsed**         | 10.5, 10.6       | 17        |
| **G6 — Observable**                | 6.2, 6.3, 6.4    | 16        |
| **G7 — Legally able to hold data** | 12.1, 12.3, 12.5 | 17        |
| **G8 — Configuration verified**    | 13.11–13.13      | 13 / 17   |

**G1 and G2 are the two that would make a failure unrecoverable** — one because there is no second copy of the work, the other because a tenant-isolation defect discovered after customer data exists is a breach, not a bug.

---

_Checklist only. No infrastructure was implemented in Phase C._

_Section 13 added in Phase 2, Sprint 2.1. Sections 1–12 remain the Phase C
point-in-time audit and were not re-audited._
