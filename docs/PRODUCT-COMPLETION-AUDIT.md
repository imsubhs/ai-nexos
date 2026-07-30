# AI NEX OS — Product Completion Audit

**Date:** 2026-07-14 · **Branch:** `phase-01-stabilization` · **Scope:** full repository, read-only

---

## 1. Executive Summary

The platform builds green (23 routes, 0 TS errors), but **the product is roughly 15–20% complete and presents as far more**. The repository is an inverted pyramid: a massive, largely real backend (199 database tables across 23 domains, 14 feature modules, 10 lib subsystems, a real DAG agent worker) sitting under a **very thin wired surface of exactly 3 working pages** — Clients, Projects, and Project Timeline.

Five structural facts dominate everything else:

1. **DEMO_MODE=true is the active default.** Every server action dispatches to mock stubs that return `{id: "mock-id", success: true}` with no state. Forms show success toasts but nothing persists. The demo admin user bypasses all permission checks.
2. **8 of 14 feature modules are fully orphaned.** Approvals, deliverables, revisions, meetings, notifications, files, shares, and events all have substantial, genuinely real Drizzle write-path backends — and **zero call sites**. No page imports any of them. Their UI components (some high quality, like the shares FeedbackSidebar) are never mounted.
3. **The entire "advanced backend" is dead code today.** AI gateway, agent engine, automation engine, analytics, knowledge graph, portal services, storage, virus scanning — nothing in `src/app` or `src/features` imports any of it. Three worker entrypoints (agent executor, approvals SLA worker, portal session cleanup) have no invoker — no cron, no script, no queue consumer.
4. **Load-bearing stubs block real operation even outside demo mode.** The AI provider factory never calls an LLM (returns a hardcoded string; no AI SDK is even in `package.json`), Supabase storage returns fake signed URLs, the virus scanner always returns clean, notification delivery is `console.log`, and the seed script seeds no AI model profiles — so the AI router would find nothing.
5. **Navigation promises 13 destinations; 3 exist.** Ten sidebar links are broken (`/tasks`, `/timeline`, `/calendar`, `/deliverables`, `/files`, `/meetings`, `/ai`, `/analytics`, `/team`, `/settings`). The portal has six pages but no navigation at all, and five of the six are static "Loading…" stubs.

**The good news:** the hardest engineering is largely done. The schema is complete and migrated, RLS foundations exist, the write-path server actions are real and transactional, and the state machines (revisions, approvals, agent DAG) are well built. The remaining work is dominated by _read queries, UI pages, and wiring_ — not architecture.

---

## 2. Route Matrix

### Implemented & Working

| Route                                        | Auth                           | Loading             | Error        | Data           | Notes                                                                                                |
| -------------------------------------------- | ------------------------------ | ------------------- | ------------ | -------------- | ---------------------------------------------------------------------------------------------------- |
| `/`                                          | proxy                          | —                   | —            | —              | Redirects to `/dashboard`                                                                            |
| `/dashboard`                                 | proxy + layout guard           | ❌                  | ❌           | ⚠️ Placeholder | All metric cards hardcoded to 0                                                                      |
| `/clients`                                   | proxy only                     | ❌                  | ❌           | ✅ Real        | List + create modal                                                                                  |
| `/clients/[clientId]`                        | proxy only                     | ❌                  | `notFound()` | ✅ Real        | Contacts + activity                                                                                  |
| `/projects`                                  | proxy only                     | Suspense            | ❌           | ✅ Real        | Streamed list                                                                                        |
| `/projects/[projectId]`                      | proxy only                     | ❌                  | `notFound()` | ✅ Real        | Summary stats are stubbed zeros; M2 audit reports a runtime 404 defect (un-awaited Next 16 `params`) |
| `/projects/[projectId]/timeline`             | proxy + `requireCurrentUser()` | Suspense + skeleton | ❌           | ✅ Real        | Gantt/roadmap work; calendar is a placeholder                                                        |
| `/login`, `/unprovisioned`, `/auth/callback` | public                         | —                   | —            | ✅ Real        | Supabase password/magic-link/Google + demo button                                                    |
| `/api/health`                                | ⚠️ proxy-blocked               | —                   | —            | ✅             | Unauthenticated calls get redirected to `/login` — broken as a health check                          |
| `/api/approvals/verify`                      | token (plaintext DB compare)   | —                   | —            | ⚠️             | Bypasses the JWT layer in `tokens.ts`; admitted TODO                                                 |

### Stub Routes (exist, render nothing real)

| Route                                                              | State                                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `/portal/dashboard`                                                | Calls PortalServiceLayer with hardcoded `mock-org-id`/`mock-client-id`                                         |
| `/portal/{approvals, deliverables, meetings, projects, revisions}` | Static "Loading…" text, zero data fetching                                                                     |
| `/portal/s/[token]`                                                | Token ignored; always "link not active"                                                                        |
| `/api/v1/portal/{auth/session, dashboard}`                         | Canned success responses, auth commented out; also unreachable on the portal domain due to a proxy rewrite bug |

### Missing Routes (nav links or product spec with no page)

`/tasks` · `/timeline` · `/calendar` · `/deliverables` · `/files` · `/meetings` · `/ai` · `/analytics` · `/team` · `/settings` · `/settings/profile` (header link) · any admin routes · any organization-management routes · task detail · deliverable detail · approvals (internal) · notifications page/center mount

### Broken/Structural Route Defects

- `(dashboard)` route group has **no `layout.tsx`** — `/clients` and `/projects` render without sidebar/header shell and without the layout-level auth guard.
- **No `loading.tsx`, `error.tsx`, `not-found.tsx`, or `global-error.tsx` anywhere** in `src/app`.
- Proxy rewrites make `/api/*` unreachable on the portal domain and login-gated on the internal domain.

---

## 3. Feature Matrix

Legend: ✅ done · ⚠️ partial · ❌ missing · **Wired** = reachable from a real page

| Feature         | Backend                                     | Frontend            | CRUD | Nav              | Forms            | Valid.    | Loading     | Error    | Empty | Perms           | Wired                                 |
| --------------- | ------------------------------------------- | ------------------- | ---- | ---------------- | ---------------- | --------- | ----------- | -------- | ----- | --------------- | ------------------------------------- |
| Dashboard       | ❌ stub                                     | ⚠️ shell            | —    | ✅               | —                | —         | ❌          | ❌       | —     | ✅              | ✅ (fake data)                        |
| Organizations   | ⚠️ schema+seed only                         | ❌                  | ❌   | ❌               | ❌               | ❌        | ❌          | ❌       | ❌    | —               | ❌                                    |
| Clients         | ✅ 80%                                      | ⚠️ 55%              | ⚠️   | ✅               | create only      | ✅ zod    | ✅          | ✅ toast | ✅    | ✅              | ✅                                    |
| Projects        | ⚠️ 75%                                      | ⚠️ 60%              | ⚠️   | ✅               | create only      | ✅ zod    | ⚠️          | ✅ toast | ✅    | ✅              | ✅                                    |
| Tasks           | ⚠️ 65%                                      | ⚠️ 40%              | ⚠️   | ❌ broken link   | ❌               | ✅ schema | ✅          | ⚠️       | ✅    | ❌ weak         | ❌ **orphaned**                       |
| Timelines       | ⚠️ 70%                                      | ⚠️ 55%              | ⚠️   | via project      | ❌ no editing    | ✅        | ✅ skeleton | ❌       | ✅    | ✅              | ✅                                    |
| Resources/Team  | ❌                                          | ❌                  | ❌   | ❌ broken link   | ❌               | —         | —           | —        | —     | —               | ❌                                    |
| Files/Assets    | ✅ 90% (best backend)                       | ⚠️ 50% mock-data UI | ⚠️   | ❌ broken link   | ❌ no handlers   | ⚠️        | ❌          | ❌       | ❌    | ✅              | ❌ orphaned                           |
| Deliverables    | ⚠️ 70% write-only                           | ❌ 0%               | ⚠️   | ❌ broken link   | ❌               | ✅        | —           | —        | —     | ✅              | ❌ orphaned                           |
| Approvals       | ✅ 85% (engine, SLA, JWT)                   | ❌ 0%               | ⚠️   | ❌               | ❌               | ✅        | —           | —        | —     | ✅              | ❌ orphaned                           |
| Revisions       | ✅ 80% (state machine)                      | ❌ 0%               | ⚠️   | ❌               | ❌               | ✅        | —           | —        | —     | ✅              | ❌ orphaned                           |
| Meetings        | ⚠️ 75% (only module with real reads)        | ❌ 0%               | ⚠️   | ❌ broken link   | ❌               | ✅        | —           | —        | —     | ✅              | ❌ orphaned                           |
| Notifications   | ⚠️ 55% (no delivery)                        | ⚠️ 60% built        | ⚠️   | ❌               | ⚠️ no validation | ❌        | ❌          | ❌       | ✅    | —               | ❌ orphaned                           |
| Shares          | ✅ 80% (strong security code)               | ⚠️ 70% built        | ⚠️   | ❌               | ⚠️               | ⚠️        | ⚠️          | ⚠️       | —     | ✅              | ❌ orphaned                           |
| Client Portal   | ⚠️ mocked service layer                     | ⚠️ stub pages       | ❌   | ❌ no portal nav | ❌               | ❌        | ❌          | ❌       | ❌    | ❌ mock IDs     | ⚠️ stubs only                         |
| Analytics       | ⚠️ logic on mock data, own orphan schema    | ❌                  | ❌   | ❌ broken link   | —                | —         | —           | —        | —     | ❌ mock API key | ❌ dead                               |
| AI Workspace    | ⚠️ gateway real, **provider stub — no LLM** | ❌ 0%               | ❌   | ❌ broken link   | ❌               | —         | —           | —        | —     | ✅ guardrails   | ❌ dead                               |
| AI Agents       | ⚠️ real DAG worker, no runner               | ❌                  | ❌   | ❌               | ❌               | ✅        | —           | —        | —     | ✅              | ❌ dead                               |
| Automation      | ⚠️ leases/scheduler real, no queue/runner   | ❌                  | ❌   | ❌               | ❌               | ✅        | —           | —        | —     | ✅              | ❌ dead                               |
| Knowledge Graph | ⚠️ engine vs unbound interfaces             | ❌                  | ❌   | ❌               | —                | —         | —           | —        | —     | —               | ❌ dead                               |
| Events (bus)    | ⚠️ 40% scaffold                             | n/a                 | —    | —                | —                | —         | —           | —        | —     | —               | ❌ dead (referenced only in comments) |
| Settings        | ❌                                          | ❌                  | ❌   | ❌ broken link   | ❌               | —         | —           | —        | —     | —               | ❌                                    |
| Admin           | ❌                                          | ❌                  | ❌   | ❌               | ❌               | —         | —           | —        | —     | —               | ❌                                    |

**Responsive UI / Accessibility (cross-cutting):** shadcn/ui primitives give a reasonable baseline (Radix a11y, `use-mobile` hook, aria-label on NotificationBadge), but no systematic responsive or a11y pass has been done on any feature page; portal pages and orphaned components are untested against either.

---

## 4. CRUD Matrix

Real (non-demo) backend implementation. UI wiring shown separately since it's the dominant gap.

| Entity                           | C                           | R                | U                | D                  | Search | Filter      | Sort  | Pagin. | UI wired               |
| -------------------------------- | --------------------------- | ---------------- | ---------------- | ------------------ | ------ | ----------- | ----- | ------ | ---------------------- |
| Client                           | ✅                          | ✅               | ✅               | ✅ soft            | ✅     | ⚠️          | fixed | ❌     | Create + Read only     |
| Contact                          | ✅                          | ✅               | ✅               | ✅ soft            | ❌     | ❌          | —     | ❌     | Read only              |
| Project                          | ✅                          | ✅               | ✅               | ✅ soft            | ✅     | ⚠️          | fixed | ✅     | Create + Read only     |
| Project Member                   | ✅                          | ✅               | ✅ role          | ✅                 | ❌     | ❌          | —     | ❌     | Create + Read + Delete |
| Task                             | ✅                          | ⚠️ list only     | ✅               | ❌ **none**        | ❌     | ⚠️          | fixed | ✅     | ❌ none (orphaned)     |
| Timeline/Milestone               | ✅                          | ✅               | ❌               | ❌                 | ❌     | scoped      | fixed | ✅     | Read only              |
| Deliverable                      | ✅                          | ❌ **no reads**  | ⚠️ status        | ❌                 | ❌     | ❌          | ❌    | ❌     | ❌ none                |
| Approval Cycle/Review            | ✅                          | ❌ **no reads**  | ✅ engine        | cascade (uncalled) | ❌     | ❌          | ❌    | ❌     | ❌ none                |
| Revision                         | ✅                          | ❌ **no reads**  | ✅ state machine | via status         | ❌     | ❌          | ❌    | ❌     | ❌ none                |
| Meeting/Decision/ActionItem      | ✅                          | ✅               | ❌               | ❌                 | ❌     | project     | ✅    | ❌     | ❌ none                |
| Notification                     | via queue (dead)            | ✅               | ✅ mark-read     | ❌                 | ❌     | client-side | —     | ❌     | ❌ none                |
| File/Folder                      | ✅ (quota, dedup, versions) | ❌ **no reads**  | ✅ promote       | ❌                 | ❌     | ❌          | ❌    | ❌     | ❌ UI is 10k fake rows |
| Share Session                    | ✅                          | ❌               | ⚠️               | ❌                 | ❌     | ❌          | ❌    | ❌     | ❌ none                |
| Organization / Role / Dept       | seed only                   | ⚠️ via auth join | ❌               | ❌                 | ❌     | ❌          | ❌    | ❌     | ❌ none                |
| Automation / Agent / AI entities | schema only + engine writes | ❌               | ❌               | ❌                 | ❌     | ❌          | ❌    | ❌     | ❌ none                |

**Pattern:** write paths are strong; **read/list queries are the systemic backend gap** (5 modules have zero read functions), and Update/Delete UI is missing everywhere except project members.

---

## 5. Module Integration Matrix

| Integration                            | Status       | Evidence                                                             |
| -------------------------------------- | ------------ | -------------------------------------------------------------------- |
| Supabase Auth (login/OAuth/magic-link) | **Complete** | Real SSR flow, PKCE callback, session refresh in proxy               |
| Postgres via Drizzle (core CRUD)       | **Complete** | 199 tables, 8 journaled migrations, RLS foundation                   |
| Supabase Storage                       | **Missing**  | Provider returns `mock.supabase.co` fake URLs                        |
| LLM Providers (Anthropic/OpenAI)       | **Missing**  | Provider factory returns hardcoded string; no SDK installed          |
| Event Bus (Module 09)                  | **Missing**  | EventEngine never instantiated; exists only in comments              |
| Notification delivery (email/in-app)   | **Missing**  | Channels `console.log`; `dequeue()` returns `[]`                     |
| Automation queue (Redis)               | **Missing**  | `ioredis` installed but unused; in-memory queue throws in production |
| Job runners / cron                     | **Missing**  | 3 workers (agents, SLA, session cleanup) + scheduler have no invoker |
| Meetings → Tasks (promote action item) | **Partial**  | Real cross-module insert exists, unwired to UI                       |
| Approvals → Notifications              | **Missing**  | SLA worker comment: "dispatch would hook here"                       |
| Deliverables → Shares/Email            | **Partial**  | Share link generated; email job never enqueued                       |
| Analytics → platform DB                | **Missing**  | Own orphan schema.sql; never imports `@/db`                          |
| Knowledge Graph → DB                   | **Missing**  | Abstract interfaces never bound                                      |
| Virus scanning                         | **Missing**  | Mock always returns clean                                            |
| Portal ↔ internal data                 | **Missing**  | PortalServiceLayer returns hardcoded mocks; APIs fake-auth           |

---

## 6. User Journey Matrix

**Organization → Client → Project → Task → Deliverable → Approval → Portal → Analytics → AI**

| Step                   | Can a user complete it?                                           |
| ---------------------- | ----------------------------------------------------------------- |
| Create Organization    | ❌ Seed script only — no UI                                       |
| Create Client          | ✅ (real mode only; demo mode fakes it)                           |
| Create Project         | ✅ (real mode only)                                               |
| Create/Manage Task     | ❌ Backend exists; no page, no create form, board orphaned        |
| Create Deliverable     | ❌ Backend exists; zero UI, zero reads                            |
| Run Approval           | ❌ Engine exists; tokens never issued; no UI internal or external |
| Client views in Portal | ❌ Stub pages, mock IDs, share token ignored                      |
| View Analytics         | ❌ Dead subsystem; dashboard shows hardcoded zeros                |
| Use AI                 | ❌ No page; no LLM provider; no seeded model profiles             |

**The journey breaks at step 4 of 9.** The furthest a real user can go today: log in → create client → create project → view auto-seeded timeline. Everything downstream is backend-only or missing.

---

## 7. Missing UI Inventory

**Missing pages (17+):** Tasks hub, Task detail, internal Deliverables, Deliverable detail, internal Approvals + external review page, Revisions, internal Meetings + meeting detail, Files browser (routed), AI Workspace, Analytics, Team/Resources, Settings (+ profile), Admin, Organization management, Notifications preferences page, global Calendar/Timeline, functioning portal pages (6), functioning share viewer `/portal/s/[token]`.

**Missing components:** edit forms for Client/Project (forms support `initialData` but nothing mounts them); archive/delete buttons everywhere; contact create/edit form; task create form; milestone edit; member role-change UI; real calendar view (placeholder); task checklist + comments (placeholder text); file upload handlers ("Upload"/"New Folder" buttons do nothing); portal navigation (none exists); approval review UI; notification center mount point in header.

**Missing layouts:** `(dashboard)/layout.tsx` (critical — no shell/auth on clients/projects); portal nav layout; all `loading.tsx`/`error.tsx`/`not-found.tsx` files.

**Missing tables/dialogs:** deliverables table, approvals queue table, revisions table, meetings list, confirm-delete dialogs (only member removal has one), search inputs (backend search exists for clients/projects but no search box).

---

## 8. Deployment Readiness

| Dimension    | %       | Rationale                                                                                                                                             |
| ------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture | **85%** | Schema, module boundaries, mock/real pattern, RLS foundation all sound. Deductions: dead event bus, orphan SQL files, `(dashboard)` layout gap        |
| Backend      | **55%** | Write paths real across 14 modules; but read queries missing in 5, LLM/storage/scanner/delivery/queue are stubs, workers have no runners              |
| Frontend     | **20%** | 3 working pages of ~20 needed; 10 broken nav links; portal is stubs; no loading/error boundaries                                                      |
| Integration  | **10%** | Almost nothing crosses module boundaries at runtime; all external integrations except Supabase Auth/DB are mocked                                     |
| Testing      | **5%**  | 3 unit test files (auth + permissions only); no test npm script; zero coverage of features, engines, state machines                                   |
| Production   | **10%** | DEMO_MODE default, JWT fallback secrets, plaintext token compare, DB connection bypasses RLS by design, health endpoint login-gated, no observability |

**Overall: ~20–25% complete. Not deployable to real users in current state.**

---

## 9. Master Backlog

### Critical (blocks any real usage)

1. Fix `(dashboard)` route group: add `layout.tsx` with shell + `requireCurrentUser()` — clients/projects currently render chrome-less and under-guarded.
2. Fix project detail 404 (un-awaited Next 16 `params`, per M2 audit).
3. Turn off DEMO_MODE path for production: demo cookie grants full admin and mocks all writes; also fix mock/real shape mismatches that crash demo (timeline `.phases` on `[]`, task `title` vs `name`).
4. Implement real Supabase Storage provider (fake signed URLs block all file features).
5. Add read/list queries for deliverables, approvals, revisions, files, shares (5 modules have zero reads — nothing can be displayed without them).
6. Security: replace plaintext token compare in `/api/approvals/verify` with the existing JWT layer; remove JWT fallback secrets; implement share/file password hashing (`"hashed_placeholder"`).
7. Exempt `/api/health` (and define API auth policy) in proxy; fix portal-domain API rewrite so portal APIs are reachable.

### High (unlocks the core user journey)

8. Tasks page: route the existing orphaned board/list/dashboard, add create form, wire timer/detail modal; add `deleteTask`; fix permission gaps (update/read/timer/dependency have no `requirePermission`).
9. Deliverables + Approvals internal UI (list, detail, submit-for-approval flow) and external review page; wire token issuance (`signExternalReviewToken` is never called).
10. Client Portal: replace mock IDs with real session auth, implement `/portal/s/[token]` validation using the existing shares security layer, build portal nav, wire the 5 stub pages.
11. Edit + archive/delete UI for clients, projects, contacts, milestones.
12. Notification delivery: implement in-app channel end-to-end (queue dequeue, header NotificationCenter mount), defer email.
13. Worker runtime: pick one mechanism (Vercel cron / Supabase edge / dedicated runner) and wire agent-executor, SLA worker, scheduler, session cleanup.
14. Add `loading.tsx`/`error.tsx`/`not-found.tsx` across the app; `error.tsx` at each route group minimum.

### Medium

15. AI Workspace: install an LLM SDK, implement provider factory, seed `ai_model_profiles`/`ai_tools`/`ai_guardrails`, build a minimal chat page over the existing gateway; implement `resumeExecution` and real audit logging.
16. Meetings UI (backend is the most read-complete module — cheap win).
17. Files UI: replace 10k mock rows with real queries; wire upload buttons to the existing presigned-URL flow.
18. Wire the event bus (or delete it): instantiate EventEngine, fix the shadowed-subscribers bug, register notification/knowledge subscribers.
19. Search boxes + user-controllable sort + pagination UI on all lists; add pagination to `getClients`.
20. Settings, Team, Organization management pages.
21. Durable automation queue (Redis via installed `ioredis`) + cron-parser for scheduler; automation builder UI.
22. Bring orphan SQL into the migration pipeline (`automation_rls.sql`, analytics, knowledge schemas) and fix the `0003` journal-tag/filename mismatch.
23. Test suite: add `test` script; cover permission engine edge cases, approval engine, revision state machine, task DAG cycle detection, server actions.

### Low

24. Analytics: bind to real DB, real API-key resolution, dashboard widgets.
25. Knowledge graph: concrete DB adapters, projection wiring.
26. Agent builder UI; automation monitoring UI.
27. Real virus scanning; PDF viewer in share viewer; calendar view implementation.
28. Accessibility + responsive audit; clean up 199 ESLint warnings; admin console.

---

## 10. Implementation Order (recommended)

1. **Phase 2 — Stabilize the wired core** (items 1–3, 7, 14): layout fix, params fix, demo-mode hardening, error/loading boundaries. _Small._
2. **Phase 3 — Complete core CRUD UX** (11, 19 + client/project polish): edit/delete/search/pagination on what already works. _Small–medium._
3. **Phase 4 — Tasks** (8): first new module; backend mostly exists. _Medium._
4. **Phase 5 — Read-query layer + Deliverables → Approvals → Revisions UI** (5, 9): the production-workflow spine. _Large._
5. **Phase 6 — Files + Storage** (4, 17): real provider, then wire existing rich backend. _Medium._
6. **Phase 7 — Portal + Shares** (10, 6): external client value; depends on deliverables/approvals. _Large._
7. **Phase 8 — Notifications + Events + Workers** (12, 13, 18): cross-cutting glue. _Medium._
8. **Phase 9 — Meetings, Settings, Team** (16, 20). _Medium._
9. **Phase 10 — AI Workspace + Agents + Automation** (15, 21, 26): needs provider integration + runners first. _Large._
10. **Phase 11 — Analytics + Knowledge Graph** (24, 25): least started, depends on event flow. _Large._
11. **Continuous:** testing (23) alongside every phase.

---

## 11. Estimated Remaining Work

Assuming one senior engineer working with AI assistance at the velocity evident in this repo:

| Block                                                                 | Estimate         |
| --------------------------------------------------------------------- | ---------------- |
| Phases 2–3 (stabilize + core CRUD UX)                                 | 1–2 weeks        |
| Phase 4 (Tasks)                                                       | 1 week           |
| Phase 5 (workflow spine: reads + deliverables/approvals/revisions UI) | 2–3 weeks        |
| Phases 6–7 (files/storage + portal/shares)                            | 2–3 weeks        |
| Phase 8 (notifications/events/workers)                                | 1–2 weeks        |
| Phase 9 (meetings/settings/team)                                      | 1–2 weeks        |
| Phase 10 (AI/agents/automation, real LLM)                             | 3–4 weeks        |
| Phase 11 (analytics/knowledge)                                        | 2–3 weeks        |
| Testing/hardening/production readiness                                | 2 weeks (spread) |
| **Total to full product vision**                                      | **~13–20 weeks** |
| **Total to a shippable core MVP** (through Phase 7)                   | **~7–10 weeks**  |

---

**One-line verdict:** the foundation is genuinely strong and mostly real — but the product is a backend without a face: until read queries, pages, and wiring catch up, only 3 of ~20 promised destinations work, and the default demo mode means even those don't persist data.
