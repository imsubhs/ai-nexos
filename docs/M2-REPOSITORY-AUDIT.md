# AI NEX OS — Repository Audit Report

**Repo:** `AIC NEXOS/ai-nexos` · Audit date: 2026-07-14 · Auditor role: Chief Software Architect

## Verdict (read this first)

The platform is **~15% complete against the planned spec, but presents as far more**: a very large pre-built backend (199 Drizzle tables, 14 feature modules, 10 lib subsystems, a DAG agent worker) sits behind only **3 working page surfaces** (Clients, Projects list, Project Timeline). **8 of 14 feature modules are orphans** — full server-action backends with zero UI importers. The app currently runs with `DEMO_MODE=true`, so every action serves hardcoded mocks; several "real" paths are stubs that return fake success (LLM provider factory, Supabase storage signed URLs, portal session API). Two runtime-breaking defects exist despite clean builds: the **project detail page 404s on every project** (un-awaited Next 16 `params` — Verified: read the file), and the **`(dashboard)` route group has no layout**, so Clients/Projects render without the app shell and without layout-level auth (Verified: `ls` shows no `layout.tsx`).

One premise correction: the request said "Modules 01–19," but the PRD numbers only **Modules 01–15**; its Part 4 (which would presumably define 16–19: AI, Automations, Reporting, plus NFRs/acceptance criteria) **is missing from the PRD file itself**. The SDS/roadmap add Auth, AI Workspace, Reports, and Settings as unnumbered modules — this report audits against those 19 total below.

Build ✅ (23 routes) · `tsc --noEmit` ✅ 0 errors · ESLint ✅ 0 errors / 199 unused-var warnings · Tests: 23 pass, but cover only auth + permissions. All Verified: ran them this session.

---

## 1. Route Map — Implemented (Verified: `next build` route table + file inventory)

### Internal app

| Route                            | Status        | Notes                                                                             |
| -------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| `/`                              | ✅ FULL       | Redirect → /dashboard                                                             |
| `/login`                         | ✅ FULL       | Password + magic link + Google, demo-login gate                                   |
| `/unprovisioned`                 | ✅ FULL       | Safe landing for un-provisioned identities                                        |
| `/auth/callback`                 | ✅ FULL       | PKCE + token-hash, safe redirects — solid                                         |
| `/dashboard`                     | 🟡 PARTIAL    | Real auth; all 4 metric cards hardcoded to 0                                      |
| `/clients`                       | ✅ FULL*      | Real Drizzle path exists; serves mocks under DEMO_MODE                            |
| `/clients/[clientId]`            | ✅ FULL*      | Params awaited correctly                                                          |
| `/projects`                      | 🟡 DEGRADED   | `searchParams` not awaited → search filter silently dead                          |
| `/projects/[projectId]`          | 🔴 **BROKEN** | `params` not awaited → `projectId` is `undefined` → **every project detail 404s** |
| `/projects/[projectId]/timeline` | ✅ FULL*      | Params handled correctly                                                          |

### Client portal

| Route                                                          | Status               | Notes                                                                     |
| -------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| `/portal`                                                      | ✅ Static landing    |                                                                           |
| `/portal/s/[token]`                                            | ⚪ STUB (deliberate) | Token ignored; always "link not active"; never calls the `shares` feature |
| `/portal/dashboard`                                            | 🟡 PARTIAL           | Hardcoded `"mock-org-id"/"mock-client-id"`                                |
| `/portal/{projects,approvals,deliverables,meetings,revisions}` | ⚪ STUB ×5           | Static "Loading…" text, no data fetch                                     |

### API

| Endpoint                                  | Status       | Notes                                                                                                            |
| ----------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                         | ✅           | Claims "Next.js 14" (app is 16) — cosmetic lie                                                                   |
| `POST /api/approvals/verify`              | 🟠 RISKY     | No rate limit, no Zod, no org scoping; plain DB token equality (crypto verification skipped per its own comment) |
| `POST/DELETE /api/v1/portal/auth/session` | 🔴 FAKE      | Returns `success: true` without validating anything                                                              |
| `GET /api/v1/portal/dashboard`            | 🔴 FAKE-AUTH | Auth commented out; hardcoded mock ids                                                                           |
| `GET /auth/callback`                      | ✅           |                                                                                                                  |

**Structural route defects:** zero `loading.tsx` / `error.tsx` / `not-found.tsx` / `global-error.tsx` in the whole app; `(dashboard)` group missing `layout.tsx` (no sidebar/header/auth shell — Clients and Projects render outside the app chrome); **two conflicting portal shells nest** (`portal/layout.tsx` login-free M1 design vs `portal/(portal)/layout.tsx` mock-auth design → double headers/footers and two contradictory product philosophies).

---

## 2. Module Coverage Report — Planned vs Implemented

Legend: **UI** = reachable page · **BE** = server actions/schema exist · **DB** = tables migrated. (Verified: cross-referenced spec-agent extraction against code-agent inventory.)

| #   | Module (PRD)                         | DB           | BE                                                                                      | UI                                                                                          | Coverage                                                                              |
| --- | ------------------------------------ | ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 01  | Organization Mgmt                    | ✅           | partial (M1)                                                                            | ❌ no settings/org pages                                                                    | ~35%                                                                                  |
| 02  | User & Role Mgmt                     | ✅           | ✅ permissions engine (wired)                                                           | ❌ no admin pages                                                                           | ~45%                                                                                  |
| 03  | Client Mgmt                          | ✅           | ✅ full CRUD                                                                            | ✅ list + detail                                                                            | **~80%** — missing health score, categories UI, comm history, invoices/resources tabs |
| 04  | Project Mgmt                         | ✅           | ✅ CRUD + members                                                                       | 🔴 list OK, detail broken; 1 of 7 planned views; no duplicate/restore                       | ~40%                                                                                  |
| 05  | Production Timeline                  | ✅           | partial (create/read only)                                                              | ✅ timeline page (gantt/roadmap/calendar components)                                        | ~55%                                                                                  |
| 06  | Task Mgmt                            | ✅ 13 tbl    | ✅ C/R/U + timers + deps                                                                | ❌ **orphan** — task-board/list/detail components built, no page                            | ~50%                                                                                  |
| 07  | Deliverables                         | ✅ 12 tbl    | ✅ create + workflow verbs                                                              | ❌ orphan; no read/list action                                                              | ~40%                                                                                  |
| 08  | Review & Approval                    | ✅           | ✅ engine + cascading + SLA worker                                                      | ❌ orphan (only the risky verify API)                                                       | ~45%                                                                                  |
| 09  | Revision Mgmt                        | ✅ 13 tbl    | ✅ state machine + workflow                                                             | ❌ orphan                                                                                   | ~45%                                                                                  |
| 10  | File Mgmt                            | ✅ 12 tbl    | ✅ 2-phase upload                                                                       | ❌ orphan; **storage provider is a hardcoded mock — uploads cannot work even in real mode** | ~30%                                                                                  |
| 11  | Communication Center                 | partial      | ❌ no comments module                                                                   | ❌                                                                                          | ~10%                                                                                  |
| 12  | Meeting Hub                          | ✅ 18 tbl    | ✅ CRUD + promote-to-task                                                               | ❌ orphan                                                                                   | ~40%                                                                                  |
| 13  | Client Share Portal                  | ✅ 21 tbl    | ✅ sessions/JWT (insecure fallback secret)                                              | ⚪ token page is a stub that never calls it                                                 | ~35%                                                                                  |
| 14  | Dashboard & Analytics                | ✅           | scaffold only (`lib/analytics` — nothing imports it)                                    | 🟡 zero-state dashboard                                                                     | ~15%                                                                                  |
| 15  | Notifications                        | ✅ 11 tbl    | 🟡 incomplete pipeline (own TECHNICAL_DEBT.md)                                          | ❌ orphan components                                                                        | ~25%                                                                                  |
| —   | Auth & Authorization                 | ✅           | ✅                                                                                      | ✅                                                                                          | **~85%** — best module; missing password reset page                                   |
| —   | AI Workspace                         | ✅ 24+22 tbl | 🔴 gateway real, **provider factory returns stubbed responses — no LLM is ever called** | ❌ nothing imports `lib/ai`                                                                 | ~20%                                                                                  |
| —   | Reports                              | ✅           | scaffold                                                                                | ❌                                                                                          | ~10%                                                                                  |
| —   | Settings / Search / Templates / Tags | partial      | ❌                                                                                      | ❌                                                                                          | ~5%                                                                                   |

**Planned API coverage: 5 of ~120 endpoints (4%).** Assumption: most planned REST endpoints are legitimately replaced by server actions (the code's real convention) — if so, the true gap is the missing actions/pages, not routes; but the **9 public token-auth endpoints (API §28) and share-link resource (§27) have no substitute** and block the entire portal phase.

---

## 3. Defect Inventory

### Broken (runtime, despite green build)

1. `src/app/(dashboard)/projects/[projectId]/page.tsx:17-22` — `params` typed/used synchronously; Next 16 passes a Promise → permanent 404. (Verified: read the file; Next 16 async-params is Likely-unverified from docs — confirm with one manual page load.)
2. Same class: `projects/page.tsx` `searchParams` — dead search filter.
3. Fake-success APIs: portal session (`success: true` unconditionally), portal dashboard (auth commented out).
4. Load-bearing stubs returning fake results: `lib/storage` SupabaseStorageProvider (mock signed URLs), `lib/ai/provider-factory` (stubbed LLM responses), `lib/security/VirusScanner` (always "clean").

### Security

5. JWT fallback secrets: `"default_development_secret"` (approvals tokens), `"default_secret_for_dev_only"` (share security); `JWT_SECRET`/`SHARE_JWT_SECRET`/`DEMO_MODE` all absent from `.env.example`.
6. `/api/approvals/verify`: no rate limit / validation / org scoping.
7. `DEMO_MODE=true` bypasses every permission check app-wide.

### Broken imports

None — `tsc --noEmit` clean (Verified: ran it). The breakage class here is runtime conventions, not module resolution.

### Dead code & unused components

- **8 orphan feature modules**: tasks, approvals, deliverables, meetings, files, revisions, notifications, shares (+ `events` — imported by nothing at all).
- **5 dead lib subsystems**: `lib/ai`, `lib/analytics`, `lib/knowledge`, `lib/processing`, `lib/security`; `lib/agents` + `lib/automation` only reached by an unwired worker.
- **3 dead worker entry points**: `workers/agent-executor.ts`, `approvals/sla-worker.ts`, `portal/workers/SessionCleanupWorker.ts` — no script, cron, queue consumer, or edge function invokes any of them.
- Unused shadcn components: `ui/breadcrumb.tsx`, `ui/field.tsx`. All unreachable feature components (task-board, file-explorer, NotificationCenter, ShareSessionBuilder, etc.) count as dead until their pages exist.
- 3 orphan raw SQL files outside the migration journal: `src/db/migrations/automation_rls.sql`, `lib/analytics/db/schema.sql`, `lib/knowledge/database/schema.sql`.

### Process / repo risks

8. **Only one commit exists (M1); 80 dirty entries / 63 untracked files = all M2+ work is uncommitted** (Verified: `git status`). Work-loss exposure is the single largest non-code risk.
9. Spec integrity: PRD Part 4 missing; DBD Part 1 duplicated twice and Part 2 never defined; UI/UX doc is Part 1 only. The build has outrun the paper.
10. Schema-to-surface inversion: 199 tables vs 3 working pages — every future migration risks churning tables that no code exercises.

---

## 4. Backlog

### CRITICAL (broken now / data-loss / security)

| ID  | Item                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------- |
| C1  | Commit all M2+ work; push to remote (63 untracked files at risk)                                                  |
| C2  | Fix async `params`/`searchParams` in `(dashboard)/projects/*` (project detail 404s)                               |
| C3  | Add `(dashboard)/layout.tsx` with app shell + `requireCurrentUser()` (or move clients/projects into `(internal)`) |
| C4  | Remove fake-success from portal session/dashboard APIs; require real auth or delete until Phase 4                 |
| C5  | Fail hard on missing `JWT_SECRET`/`SHARE_JWT_SECRET`; document them + `DEMO_MODE` in `.env.example`               |

### HIGH (blocks the roadmap's current phase)

| ID  | Item                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------ |
| H1  | Wire Tasks UI — backend + components exist, only a page is missing (cheapest big win)                              |
| H2  | Resolve the dual portal-shell conflict (pick login-free share-link model per PRD M13; delete the mock-auth shell)  |
| H3  | Replace mock SupabaseStorageProvider with a real client (unblocks Files/Deliverables)                              |
| H4  | Add missing read/list actions: deliverables, revisions, files, approvals (write-only modules can't render pages)   |
| H5  | Harden `/api/approvals/verify` (Zod, rate limit, org scope, constant-time token check)                             |
| H6  | Add `error.tsx`, `not-found.tsx`, `loading.tsx` at root + per group                                                |
| H7  | Decide DEMO_MODE strategy: per-module flag or seeded dev DB; today one env var flips the entire product to fiction |

### MEDIUM

Deliverables/Files/Meetings/Revisions/Approvals pages; project detail tab set (Overview/Activity/Tasks/Deliverables/…); notifications pipeline completion + bell wiring; share-token page → `shares` feature; missing CRUD verbs (milestone update/delete, task delete/archive, project duplicate/restore, meeting update/delete); worker invocation strategy (cron/queue consumer) for the 3 dead workers; tests for feature actions and the approval/revision state machines; global search; fix health endpoint version string; regenerate corrupted DBD Part 2 + missing PRD Part 4.

### LOW

Remove/park dead lib scaffolds (`ai`, `analytics`, `knowledge`, `processing`, `security`) or move to a `packages/` holding area; delete unused shadcn components; reconcile 3 orphan SQL files into the migration journal; clean 199 lint warnings; `turbopack.root` config (stray lockfile warning); Sentry + structured logging; Calendar/Reports/Analytics nav stubs.

---

## 5. Phased Execution Plan (sequencing only, no code)

- **Phase A — Stabilize (days):** C1–C5. Done-condition: repo pushed; project detail renders; clients/projects show the app shell behind auth; no API returns fake success; build+tests green.
- **Phase B — Close M2 honestly (1–2 wks):** H1, H6, H7, missing CRUD verbs on projects/timeline/tasks; project-detail tab navigation; activity feed + notifications bell. Done-condition: Roadmap Phase 2 scope demoable end-to-end against a real (or seeded) Supabase, not DEMO_MODE.
- **Phase C — Creative production (M3, ~3–4 wks):** H3, H4, then Deliverables/Files/Approvals/Revisions/Meetings pages over their existing backends; wire SLA worker; comments module (currently 0%). Exit: upload→version→approve→revise loop works with real storage.
- **Phase D — Client portal (M4, ~2–3 wks):** H2, share-token issuance/validation via `shares`, replace the 5 portal stubs, public token-auth endpoints (API §28), access logging.
- **Phase E — AI & analytics (M5–M6):** real LLM provider in `provider-factory`, wire `lib/ai` gateway + agent worker to an actual queue trigger, dashboards/reports over `lib/analytics`. Do not start until C/D exit criteria hold — this layer is 100% dead weight until pages exist to host it.
- **Continuous:** a test per feature module as it gets wired (TRD §68); regenerate the corrupted spec docs before M4 sign-off.

---

## Risks & caveats

- **Assumption:** Next 16's Promise-based `params` is what breaks the project detail page. Everything observed fits (build passes, tsc passes, correct pages `await params`, this one doesn't), but the app was not booted and the page was not loaded live. If wrong, C2 drops to a type-hygiene fix. One `npm run dev` + click verifies it.
- **Assumption:** server actions intentionally supersede the ~120 planned REST endpoints. If the REST API is still contractually required (external integrations, TRD §53), API coverage is 4% and the backlog grows materially.
- Coverage percentages are judgment-weighted (DB/BE/UI), not measured — treat as ranking, not metrics.
- Everything else labeled Verified was executed or read directly this session (build, tsc, lint, vitest, git status, both file-level audits).
