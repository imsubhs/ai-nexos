# Platform Stabilization Report — Phase 2

**Project:** AI NEX OS (`ai-nexos`)
**Date:** 2026-07-14
**Prepared by:** Lead Software Architect (autonomous run)
**Scope:** Stabilize the wired core only. No new modules, no architecture redesign, no placeholder pages.

---

## 1. Objective

Phase 1 (verification-only audit) and the Product Completion Audit were both approved. Phase 2 executes exactly seven scoped items against the existing wired core (auth, clients, projects, timelines) — nothing else.

---

## 2. Implementation Summary

### 2.1 Authenticated dashboard layout

Extracted the sidebar/header shell into a shared `AppShell` component that calls `requireCurrentUser()`, and created the missing `(dashboard)/layout.tsx` using it. `/clients` and `/projects` now render inside the application shell with the render-time auth guard — previously they were chrome-less and protected only at the proxy edge. `(internal)/layout.tsx` was refactored to use the same shell, so there is one source of truth and no behavior change for `/dashboard`.

### 2.2 Project Detail page fix

`projects/[projectId]/page.tsx` typed `params` as a synchronous object; this Next version requires it as a `Promise`, matching every other dynamic page in the app. Fixed the type and added the `await`.

### 2.3 Demo Mode persistence

Built a deterministic in-memory database at `src/lib/demo/store.ts`:

- Lives on `globalThis` so it survives being evaluated in more than one bundle (RSC render vs. server action).
- Seed data uses fixed UUIDs and fixed timestamps: 2 clients with contacts and activity history, 2 projects with members, a full timeline (5 phases, 4 milestones, 1 dependency), and 3 tasks.
- All ids are valid UUIDs so zod `.uuid()` form validation accepts references to demo entities.

Rewrote the four wired mock-action modules (clients, projects, timelines, tasks) to mirror their real counterparts against this store: creates append and appear in lists, updates persist, archives soft-delete and cascade (client → contacts, project → members), search/pagination/sorting work, activity is logged, project codes generate sequentially (`AIC-2026-XXXX`), and `revalidatePath` fires so the UI refreshes.

This also fixed two pre-existing demo-mode crashes surfaced in the Product Completion Audit:

- `getProjectTimeline` returned `[]` instead of an object with `.phases`, crashing the timeline dashboard.
- Tasks exposed a `title` field while every component read `.name`, rendering blank task titles.

The project dashboard summary now computes open/completed task counts from the store instead of hardcoding them.

### 2.4–2.6 Loading / error / not-found boundaries

Added to every implemented route group:

- `(dashboard)`: `loading.tsx`, `error.tsx`, `not-found.tsx`
- `(internal)`: `loading.tsx`, `error.tsx`, `not-found.tsx`
- `(auth)`: `loading.tsx`, `error.tsx`
- Root: `src/app/not-found.tsx` (catches the ten not-yet-built sidebar destinations that would otherwise hit the framework default)

`error.tsx` files are Client Components using this Next version's `unstable_retry` prop and display the error digest for support reference.

### 2.7 Health API + auth policy

- `/api/health` added to the proxy's public-path allowlist on the internal domain, and exempted from the portal-domain rewrite — it is now reachable unauthenticated on both domains.
- Unauthenticated requests to any other `/api/*` route now receive a `401 JSON` response instead of being redirected to `/login` (which is meaningless for API clients).
- Corrected the health payload's false `framework: "Next.js 14"` claim.

---

## 3. Files Changed

| File                                                | Change                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `src/components/layout/app-shell.tsx`               | New — shared authenticated shell                                 |
| `src/app/(dashboard)/layout.tsx`                    | New — missing group layout                                       |
| `src/app/(internal)/layout.tsx`                     | Refactored to shared shell                                       |
| `src/app/(dashboard)/projects/[projectId]/page.tsx` | Await `params` Promise                                           |
| `src/lib/demo/store.ts`                             | New — deterministic in-memory demo DB                            |
| `src/features/clients/mock-actions.ts`              | Rewritten — store-backed CRUD                                    |
| `src/features/projects/mock-actions.ts`             | Rewritten — store-backed CRUD + computed summary                 |
| `src/features/timelines/mock-actions.ts`            | Rewritten — fixes `.phases` crash                                |
| `src/features/tasks/mock-actions.ts`                | Rewritten — fixes `title`/`name` mismatch                        |
| `src/app/(dashboard)/loading.tsx`                   | New                                                              |
| `src/app/(dashboard)/error.tsx`                     | New                                                              |
| `src/app/(dashboard)/not-found.tsx`                 | New                                                              |
| `src/app/(internal)/loading.tsx`                    | New                                                              |
| `src/app/(internal)/error.tsx`                      | New                                                              |
| `src/app/(internal)/not-found.tsx`                  | New                                                              |
| `src/app/(auth)/loading.tsx`                        | New                                                              |
| `src/app/(auth)/error.tsx`                          | New                                                              |
| `src/app/not-found.tsx`                             | New — root 404                                                   |
| `src/proxy.ts`                                      | Health allowlist, portal-domain health passthrough, 401 for APIs |
| `src/app/api/health/route.ts`                       | Framework string corrected                                       |

19 files changed: 2 modified layouts, 1 modified page, 4 rewritten mock-action modules, 1 new store module, 9 new boundary files, 2 modified infra files.

---

## 4. Verification Results

### 4.1 Static checks

| Check               | Result                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`      | 0 errors, 163 warnings (down from 199 pre-existing — the rewritten mocks eliminated 36 stale `eslint-disable` warnings) |
| `npm run typecheck` | 0 errors                                                                                                                |
| `npm run build`     | Compiles clean; all 23 routes + new `/_not-found` generated                                                             |

### 4.2 Runtime smoke test (dev server + curl)

| Test                                            | Result                                                  |
| ----------------------------------------------- | ------------------------------------------------------- |
| `GET /api/health` unauthenticated               | `200`, correct JSON, `framework: "Next.js"`             |
| `GET /clients` without session                  | `307` → `/login?next=/clients`                          |
| `GET /api/v1/portal/dashboard` unauthenticated  | `401` JSON                                              |
| `GET /clients` with demo session                | `200`, seeded clients render inside sidebar shell       |
| `GET /projects` with demo session               | `200`, seeded projects render                           |
| `GET /projects/[id]` with demo session          | `200`, correct project data (confirms async params fix) |
| `GET /projects/[id]/timeline` with demo session | `200`                                                   |
| `GET /projects/[unknown-id]` with demo session  | `200`, renders not-found boundary                       |
| `GET /tasks` (unimplemented route)              | `404`, renders root not-found page                      |

### 4.3 Persistence test (scripted against the mock-action modules directly)

| Operation                         | Result                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| `getClients()` seed read          | Returns 2 seeded clients                                                    |
| `createClient(...)`               | New client appended, appears in subsequent `getClients()`                   |
| `updateClient(...)`               | Field change persists on re-read via `getClientById`                        |
| `archiveClient(...)`              | Client disappears from `getClients()` (soft delete)                         |
| `getClients("north")`             | Search filter returns only matching client                                  |
| `createProject(...)`              | Sequential project code generated (`AIC-2026-XXXX`)                         |
| `getProjectDashboardSummary(...)` | Computes open/completed task counts from seeded tasks (2 open, 1 completed) |

---

## 5. Remaining Phase 2 Issues

- The `error.tsx` retry prop is named `unstable_retry` in this Next version — will need a rename when the API stabilizes.
- Demo persistence resets on server restart (by design — in-memory, per-process; not durable across deploys).
- Pre-existing lint warnings elsewhere in the codebase (163) and the portal/orphaned-module stubs identified in the Product Completion Audit are untouched — out of scope for this phase.

---

## 6. Ready for Review

Phase 2 is complete per the seven-item scope. No commits were made — all changes are in the working tree on `phase-01-stabilization` pending review. Not proceeding to Phase 3.
