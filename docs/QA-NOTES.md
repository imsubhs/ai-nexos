# QA Notes - Sprint 11A

## Overview

This sprint focused on exposing already-certified business modules through App Router workspace pages.

## Verification Checklist

- **Tasks Workspace (`/tasks`)**: Verified. Route created successfully. DemoStore seed renders via `TaskDashboard` component.
- **Deliverables Workspace (`/deliverables`)**: SKIPPED. Pre-requisite check failed: No read actions (`getDeliverables`) exist in the dispatcher.
- **Files Workspace (`/files`)**: SKIPPED. Pre-requisite check failed: No read actions (`getFiles`, `getFolder`) exist in the dispatcher.
- **Meetings Workspace (`/meetings`)**: SKIPPED. Pre-requisite check failed: No read actions exist in the dispatcher.
- **Timeline Workspace (`/timeline`)**: SKIPPED. Pre-requisite check failed: Existing read actions strictly require a `projectId` context; no global fetcher exists.

## Automated Gates

- **TypeScript (`npm run typecheck`)**: PASSED (0 errors)
- **Linting (`npm run lint`)**: PASSED (0 errors, warnings remain at baseline)
- **Build (`npm run build`)**: PASSED (3.6s, no route regressions)
- **Tests (`npm test`)**: PASSED (122 tests passing)

## Runtime Quality

- No hydration errors on the new `/tasks` route.
- No 404s for the newly wired navigation.
- Shared components (layouts, DataTable equivalents in `TaskDashboard`) were reused successfully without duplicate business logic.

# QA Notes - Sprint 11B

## Overview

Closed the four read-layer gaps identified above. See `docs/SPRINT-11B.md` for full detail.

## Verification Checklist

- **Deliverables read layer**: `getDeliverables`, `getDeliverableById`, `searchDeliverables` added and unit-tested (7 tests) against DemoStore.
- **Files read layer**: `getFiles`, `getFolder`, `searchFiles` added and unit-tested (5 tests) against DemoStore.
- **Meetings read layer**: `getMeetings` (global) added and unit-tested (3 tests). Pre-existing project-scoped reads untouched (and their mock stubs remain broken — see Technical Debt Notes).
- **Timeline read layer**: `getTimelines` (global) added and unit-tested (2 tests). Pre-existing `getProjectTimeline`/`getTimelineMilestones`/`getTimelineDependencies` untouched.
- **No new UI**: No workspace pages, navigation changes, or badge removals were made — out of scope per the sprint's stop condition.

## Automated Gates

- **TypeScript (`npm run typecheck`)**: PASSED (0 errors)
- **Linting (`npm run lint`)**: PASSED (0 errors, 117 warnings — pre-existing baseline, no new warnings)
- **Build (`npm run build`)**: PASSED, no route regressions or additions
- **Tests (`npm test`)**: PASSED (139/139 — 122 pre-existing + 17 new)

# QA Notes - Sprint 11A (Resumed)

## Overview

Built the four workspace pages Sprint 11A originally skipped, now that Sprint 11B's read layer is approved. See `docs/SPRINT-11A.md` for full detail.

## Verification Checklist

- **Deliverables Workspace (`/deliverables`)**: Built. `DataTable` + search (`searchDeliverables`) + status filter (`getDeliverables`) + detail drawer (`getDeliverableById`). Verified 200 response and seeded rows ("Brand Guidelines v2", "Homepage Wireframes") render, including with `?search=` and `?status=` query params.
- **Files Workspace (`/files`)**: Built. Flat list (`getFiles`/`searchFiles`) plus per-project folder browser (`getFolder`) with breadcrumbs. Verified 200 response for both modes; flat mode correctly shows its empty state (no seed data in `DemoStore.files`); folder mode verified with `?projectId=` against the seeded website project, correctly showing "This folder is empty."
- **Meetings Workspace (`/meetings`)**: Built. Client-side search/status/date filters over `getMeetings()`. Verified 200 response and the seeded "Quarterly Review" meeting renders. Decision Summary/Action Items intentionally not fetched (see SPRINT-11A.md) — drawer states why instead of showing empty sections.
- **Timeline Workspace (`/timeline`)**: Built. Card feed with server-driven infinite pagination over `getTimelines()`, client-side search/status/date filters. Verified 200 response and the seeded project timeline (5 phases, progress %) renders correctly.
- **Navigation**: All four items in `src/config/navigation.ts` flipped from `"coming-soon"` to `"live"`; sidebar no longer shows "Soon" badges or disables these links. No other navigation code required changes (hrefs/permissions were already correct).

## Automated Gates

- **TypeScript (`npm run typecheck`)**: PASSED (0 errors)
- **Linting (`npm run lint`)**: PASSED (0 errors, 117 warnings — pre-existing baseline). Three React Compiler errors (synchronous `setState` calls in `useEffect`) were introduced while building the Meetings/Timeline date filters and the Deliverables detail drawer, then fixed by moving the `setState` calls inside named inner functions (matching the existing `TaskBoard` pattern) before this PASSED result.
- **Build (`npm run build`)**: PASSED. New routes `/deliverables`, `/files`, `/meetings`, `/timeline` present with no regressions to existing routes.
- **Tests (`npm test`)**: PASSED (139/139, unchanged — this sprint added no new automated tests since it's presentation-only over already-tested Sprint 11B functions).

## Runtime Quality

- Manually smoke-tested via a `DEMO_MODE` dev server with the `demo_session` cookie: all four routes and their query-param variants (`?search=`, `?status=`, `?projectId=`) returned HTTP 200 with no server errors or hydration warnings in the dev log.
- **Not verified in this session**: actual desktop/tablet/mobile visual rendering and browser console output — no browser-automation tool was available. Responsive classes follow the same Tailwind patterns already used (and presumably verified) in the Employees/Clients pages, but this is inference from code, not an observed screenshot. Flagged explicitly rather than claimed as done.

---

# QA Notes - Sprint 12A

## Overview

Interaction-completion sprint. Verification measured **whether a user can finish
a task**, not whether pages render — the gap Phase A identified in prior sprints'
QA. Every interaction claimed below was driven in a real Chromium session
against the running application.

## Verification method

`scratch/sprint12a/verify.mjs` (gitignored; not application code) drives 32
workflow checks through Playwright, instrumenting console errors, page errors
and failed requests throughout. Full results table: `docs/SPRINT-12A.md` §4.

**Result: 32/32 checks pass · 0 console errors · 0 page errors.**

## Blocker regression checks

- **Sign out (P1-01)**: cookie cleared, redirect to `/login`, and `/dashboard`
  afterwards bounces to `/login?next=%2Fdashboard`. Previously fired zero
  network requests.
- **Organisation Profile (P1-02)**: loads populated (name + valid hex), saves,
  persists across reload, and raises no error on untouched fields.
- **Deliverable status (P2-01)**: the seeded row is returned by a status filter
  again; the filter offers all 12 schema statuses.

## Accessibility

- 9 "coming soon" nav items: `aria-disabled="true"`, `tabindex="-1"` on every
  one (was: `tabIndex 0`, announced as available).
- **0** dimmed-but-focusable controls across the shell.
- **0** interactive controls without an accessible name. This found one defect
  Phase A had not: the icon-only back button on project detail.

## Responsive / runtime

13 modules × 4 viewports = 52 loads: no horizontal page overflow, no HTTP ≥ 400.
Wide tables continue to scroll inside their own container rather than widening
the shell.

## Automated gates

- **`npm run lint`**: PASSED — 0 errors, 113 warnings (baseline 117; 4 fewer
  after deleting two dead components). No new warning in any file this sprint
  touched.
- **`npm run typecheck`**: PASSED — 0 errors.
- **`npm test`**: PASSED — **175/175** across 20 files (was 139/19). The +36 are
  `tests/unit/demo-store-schema-parity.test.ts`.
- **`npm run build`**: PASSED — 2.8 s compile, 31 static pages in 155 ms, 36
  routes, no regressions.

## Measurement notes (recorded rather than dropped)

Three findings from earlier passes turned out to be harness artifacts, and the
harness was corrected rather than the result being accepted:

1. **"Six modules overflow at mobile"** — the check ran before the route
   settled and measured the `loading.tsx` skeleton, not the page. On re-measure
   after settling: 52/52 clean. It did expose a genuine minor issue, now fixed:
   five loading skeletons used a fixed `w-96`, which overflows a 390 px
   viewport _during load_.
2. **"One dimmed focusable control"** — an overlay mid-exit-animation is briefly
   below the opacity threshold with its content still focusable. Measured on a
   settled route: 0.
3. **"Global search returns nothing" / "bell shows no unread"** — both raced
   asynchronous population (a debounced server action, and the bell's on-mount
   fetch). Both pass once the harness waits for the data rather than the
   element.

## Known limitations at hand-off

`ERR_ABORTED` entries appear in the failed-request log during the rapid
multi-viewport sweep. These are navigations cancelled by the next `page.goto`,
not application failures — no console error or page error accompanies any of
them, and the count is zero when routes are visited at human pace.

Interactions that were deliberately **not** built, and why, are enumerated in
`docs/SPRINT-12A.md` §3. None is a UI gap; each needs a domain action or a
read-layer query.

---

# QA Notes - Sprint 12B

## Overview

Domain-completion sprint. Verification again measured **whether a capability
completes end to end**, not whether a panel renders — and this time several
checks were written specifically to reproduce the failure the previous sprint had
recorded, so a pass means the recorded defect is gone rather than merely absent
from the happy path.

## Verification method

`scratch/sprint12b/verify.mjs` (gitignored; not application code) drives 39
workflow checks through Playwright against the running dev server, instrumenting
console errors and page errors throughout, and capturing 8 screenshots to
`docs/sprint-12b-screenshots/`. Full results table: `docs/SPRINT-12B.md` §3.

**Result: 39/39 checks pass · 0 page errors · 1 expected console error.**

The one console error is accounted for, not tolerated: W4.6 deliberately
triggers a refused domain action (deleting a non-empty folder). A server action
that throws answers HTTP 500 and the browser logs the failed fetch. That is the
error path working — `ConfirmDialog` catches it and renders the reason inline,
which the check asserts. W7.1 filters that one signature and requires silence
otherwise.

## Regression checks written against recorded defects

- **TD-10 (deliverable approve)**: W3.3 starts a review session, **closes the
  drawer, reloads the page**, reopens it, and approves. That sequence is exactly
  what failed before `getReviewSessions` existed.
- **TD-5 / TD-9 (meeting decisions invisible)**: W1.6 records a decision and
  asserts the recorder can see it — the reason Sprint 12A refused to wire
  `createDecision` at all.
- **TD-11 (notification headlines)**: W5.1 asserts the rendered subject text
  ("Deliverable updated: Brand Guidelines v2"), not that a row exists.
- **TD-13 (one-way timer)**: W2.6 asserts start → stop → start-available, so a
  user cannot be stranded in a running timer.
- **TD-14 (task search)**: W6.1 asserts a Tasks group in the header search panel.
- **Meeting transition guard**: W1.9/W1.10 read the actual `<option>` set —
  `archived` is not offered from `scheduled`, and only `archived` is offered from
  `completed`.
- **No duplicate events**: W6.2 asserts one status change produces exactly one
  activity entry.

## Defects found by verification and fixed

1. **Stale file drawer after a write.** Renaming or moving a file updated the
   table behind the drawer but not the drawer itself — the row came from a list
   the parent owned. Fixed by holding the row `updateFile` returns, keyed by file
   id so one file's write can never appear under another. W4.2 now asserts the
   drawer as well as the list.
2. **Mock/real divergence on task time-tracking.** `real.startTaskTimer` /
   `stopTaskTimer` log a `time_logged` activity event; the mock logged neither.
   Nothing had ever read task activity, so the divergence was invisible until
   `getTaskActivity` existed. Found by W2.7 (history was two events short of
   production's), fixed in the mock. **Schema parity would not have caught this**
   — see the backlog item on behavioural parity.

## Accessibility

Every control added this sprint carries an accessible name derived from the
record it acts on, not a generic verb: `"RSVP for Paul Manager"`, `"Remove Paul
Manager from this meeting"`, `"Move \"Open risks and blockers\" earlier"`,
`"Unassign Tara Member"`, `"Actions for folder Design"`, `"Mark \"Meeting:
Quarterly Review\" as read"`. The 0-unnamed-controls property established in
Sprint 12A is preserved by construction.

## Automated gates

- **`npm run lint`**: PASSED — 0 errors, 109 warnings (baseline 113; four fewer — three dead `eslint-disable` directives removed, since `@typescript-eslint/no-explicit-any` is off globally in `eslint.config.mjs`).
  Six `react-hooks/set-state-in-effect` errors were introduced during the sprint
  and **fixed rather than suppressed**: prop-to-state sync replaced by values
  derived and keyed on entity id, dialog field defaults seeded when the dialog
  opens instead of by effect, and the per-project folder set stamped with the
  project it came from. The last of those closed a latent bug as well as the
  lint error — a stale folder list could otherwise be offered as a move
  destination for a file in a different project.
- **`npm run typecheck`**: PASSED — 0 errors.
- **`npm test`**: PASSED — **240/240** across 22 files (was 175/20). New:
  8 meeting-transition tests, 21 notification-template tests, and the DemoStore
  parity test extended from 9 to 20 collections (36 → 80 assertions).
- **`npm run build`**: PASSED — 3.8 s compile, 31 static pages in 134 ms, 36
  routes, no regressions.

## Measurement notes (recorded rather than dropped)

The first sweep reported 15 failures; 13 were harness faults of a single kind,
worth recording because it will recur:

**Role-based Playwright selectors ignore the page behind an open sheet.** Base UI
marks the background `aria-hidden` while a sheet or dialog is open, which removes
it from the accessibility tree — so `getByRole("cell", …)` finds nothing even
though the cell is on screen and a CSS selector matches it. Any assertion about a
list has to wait for the drawer to close first. The harness now has a
`closeOverlay()` helper and a `topDialog()` helper for the inverse case (a
`ConfirmDialog` stacked over a `Sheet`).

Two other harness corrections: a controlled checkbox needs `click()` rather than
`check()`, because it only flips once the server action resolves; and the
global-search panel renders "Searching…" while its fan-out is in flight, so an
assertion has to wait for the settled result.

One failure was neither defect nor harness fault and is recorded as a known
limitation instead: a promoted action item lands under the milestone chosen in
the promote dialog, and `/tasks` is pinned to the seeded Wireframes milestone.
The task was created correctly; it simply landed outside the workspace's scope.
The check now promotes into that milestone explicitly.

## Not verified in this session

- **The real (Postgres) adapters.** Every capability has a Drizzle
  implementation written against the real schema, but the sprint ran in
  `DEMO_MODE` and the Supabase migration is explicitly not started. The real
  adapters typecheck and follow the existing patterns; they have not been
  executed. Treat them as unverified until the migration sprint.
- **Multi-viewport responsive re-measurement.** Sprint 12A's 52-load sweep was
  not repeated. Every new panel lives inside an existing `Sheet` or `Dialog`
  container that was measured then, so this is inference from structure, not an
  observed result — flagged rather than claimed.

Capabilities deliberately **not** built, and why, are enumerated in
`docs/SPRINT-12B.md` §4.

---

# QA Notes - Phase C (v1.0 Beta Freeze)

## Overview

Phase C ran no new tests and modified no code. It re-verified the standing gates,
audited the repository for demo-only dependencies, and recorded what has **not**
been verified — which is the more useful half.

## Gates re-verified at the freeze point

| Gate                      | Result                 |
| ------------------------- | ---------------------- |
| `npm run lint`            | 0 errors, 109 warnings |
| `npm run typecheck`       | 0 errors               |
| `npm test`                | 240 / 240, 22 files    |
| `npm run build`           | Green, 36 routes       |
| Sprint 12B workflow sweep | 39 / 39, 0 page errors |

## What has never been verified

This is the section that matters at a freeze. Every item below is an assumption
currently carried by the project, not a result.

1. **The production code path has never executed.** `DEMO_MODE=true` for every
   test, every browser sweep, every measurement in every sprint report to date.
   The real Drizzle adapters typecheck and follow the frozen contract; not one
   has run against PostgreSQL. Sprint 12A/12B alone added ~35 such functions.
2. **No RLS policy has ever been evaluated by a database.** Multi-tenant
   isolation is the platform's central security claim and it is untested. Sprint
   13's acceptance criteria are written around proving it.
3. **RBAC has only ever been exercised as `owner` (`*:*`).** Six system roles are
   defined; one has been used. Permission maps for the other five could be wrong
   in ways nothing has surfaced.
4. **`requirePermission` coverage has never been audited exhaustively.** The
   Drizzle client connects as `postgres` and bypasses RLS by design, so the
   service layer is the entire boundary. The pattern is followed consistently in
   every file reviewed, but "consistently in every file reviewed" is not "every
   file".
5. **Mock/real parity is signature-level, not behavioural.** Sprint 12B found the
   two adapters writing different audit trails for the same call — invisible for
   two sprints because nothing read task activity. Recorded as TD item 17.
6. **Performance is unmeasured under real latency.** Every timing in every sprint
   report resolved from memory. No load test, no soak test, no `EXPLAIN` on any
   query, no index verified in use.
7. **No screen-reader pass.** Structural accessibility is strong and verified
   (0 unnamed controls, 0 dimmed-but-focusable), but no assistive technology has
   been used against this product.
8. **The client portal has never been reviewed.** Flagged in the Stabilization
   Report; still true. It is the surface external users see first.
9. **No security review, dependency audit, or penetration test.**
10. **No backup has been restored** — none has been configured.

## Defects found by the Phase C audit (documentation only; not fixed)

Phase C modified no code, so both of these are recorded rather than closed.

1. **Cross-tenant file deduplication.** `finalizeFileUpload` in
   `src/features/files/real-actions.ts` looks up an existing blob by
   `sha256Hash` **with no organisation filter**, then repoints the new version at
   the match's `storagePath`. `initializeFileUpload` is correctly project-scoped;
   the finalize path is not. Harmless today because storage is mocked and no
   bytes exist — a cross-tenant data-sharing defect the moment Sprint 14 turns on
   real storage. **Must be closed before, not after, real storage.**
2. **Session cookie set without security flags.**
   `src/features/auth/mock-actions.ts` sets `demo_session` with no `httpOnly`,
   no `secure`, no `sameSite`, and validates no password.
   `enterDemoWorkspace()` in `actions/demo-login.ts` sets the same cookie
   correctly. Demo-only, but nothing currently prevents `DEMO_MODE=true` from
   being deployed (P2-06), so the two facts compound.

## Documentation accuracy correction

Baseline TD-05 names three background workers (`agent-executor`, `sla-worker`,
`SessionCleanupWorker`). `src/workers/` contains **one file**:
`agent-executor.ts`. Per Baseline Rule 7 the repository is authoritative; the
baseline over-states worker inventory and should be amended at its next revision.

## Method

Repository-first. Every claim about implementation in the Phase C documents was
checked against `src/` rather than taken from a prior sprint report — which is
how both defects above and the TD-05 discrepancy were found.

---

# QA Notes — Phase C.1 (Repository Stabilization)

## Overview

Phase C.1 modified no code. Its QA contribution is a **recovery test**: rather
than re-reading the repository, the full working tree was reconstituted in a
clean directory outside the project and driven through every script in
`package.json` from a cold start.

This is the first time the repository has been verified as _recoverable_ rather
than merely _correct_, and it is the first time `npm run format:check` and
`.github/workflows/ci.yml` have been evaluated at all.

## Gates re-verified in the working tree

| Gate                   | Phase C claim          | Phase C.1 measured            | Verdict                                       |
| ---------------------- | ---------------------- | ----------------------------- | --------------------------------------------- |
| `npm run lint`         | 0 errors, 109 warnings | **0 errors, 109 warnings**    | ✅ Confirmed exactly                          |
| `npm run typecheck`    | 0 errors (strict)      | **0 errors**                  | ✅ Confirmed                                  |
| `npm test`             | 240/240, 22 files      | **240/240, 22 files**, 2.72 s | ✅ Confirmed exactly                          |
| `npm run build`        | Green, 36 routes       | **Green, 35 routes**          | ⚠️ Green confirmed; **route count corrected** |
| `npm run format:check` | _not reported_         | **FAIL — 341 files**          | ❌ **New failing gate**                       |

**No regressions.** No code was touched, so this was expected — but it is worth
having measured rather than assumed, since three prior sprints' numbers were
being carried forward on trust.

### Two corrections to the certified numbers

1. **35 routes, not 36.** The figure 36 appears in `VERSION_1.0_BETA.md` §2.5,
   `BETA_FREEZE.md` §4 and `PRODUCTION_READINESS_CHECKLIST.md` 8.1 and 9.4.
   `npm run build` emits 35. Immaterial in itself; recorded because a number
   repeated across four documents without anyone re-counting it is exactly the
   kind of drift that erodes confidence in the numbers beside it.
2. **`format:check` is a fifth gate and it fails.** It was never part of the four
   gates Phase C certified, so this is _not_ a regression — but
   `.github/workflows/ci.yml` runs it as a required step, so the pipeline fails
   on a gate no report has ever mentioned.

## Recovery test — method and results

### Method

The exact file set that _would_ exist after committing the working tree was
enumerated with `git ls-files -c -o --exclude-standard` — tracked files at
working-tree content, plus untracked-not-ignored, excluding everything
`.gitignore` covers. The two intentionally deleted paths were removed. The
resulting **552 files** were copied to a clean directory and committed to a fresh
repository.

This reproduces a clone of the proposed `v1.0.0-beta` tag, carrying **no
`.env.local`, no `node_modules`, no `.next`, no `scratch/`** — so any dependency
on undeclared local state would surface.

### Results

| Step                                 | Result                                                          |
| ------------------------------------ | --------------------------------------------------------------- |
| File-set completeness                | ✅ 552/552; 10 migrations + 10-entry journal, consistent        |
| Secret containment                   | ✅ `.env.local` absent; `scratch/` absent; no tracked `.env*`   |
| `npm ci`                             | ✅ exit 0 from `package-lock.json` (v3)                         |
| `npm run lint`                       | ✅ exit 0 — 0 errors, 109 warnings                              |
| `npm run typecheck`                  | ✅ exit 0, strict                                               |
| `npm test`                           | ✅ **240/240, 22 files**                                        |
| `npm run format:check`               | ❌ exit 1 — 341 files                                           |
| `npm run build` — **no env**         | ❌ `DATABASE_URL is not set`                                    |
| `npm run build` — **CI's exact env** | ❌ same — **CI's build step is broken**                         |
| `npm run build` — 4-var minimum      | ✅ green, 35 routes, 3.4 s                                      |
| `npm run dev`                        | ✅ ready in 176 ms                                              |
| `GET /api/health`                    | ✅ `{"status":"healthy","demoMode":true,"version":"1.0.0",...}` |
| `GET /login`                         | ✅ HTTP 200, 1657 ms cold                                       |

**Verdict: the repository is recoverable.** Repository → running application in
≈3 minutes, with nothing required beyond four environment variables. All 240
tests and both static gates pass with _zero_ configuration.

## Defects found by the Phase C.1 audit (documentation only; not fixed)

1. **CI has never executed, and two of five steps fail.** No remote exists, so
   `.github/workflows/ci.yml` has never run. Executed manually: `format:check`
   fails on 341 files; `build` fails because the workflow's `env:` block omits
   `DATABASE_URL`. The moment a remote is added, CI goes red on the first push —
   and required checks cannot be enabled against it without blocking all merges.
   (TD-24)
2. **A fresh clone cannot build.** `src/db/index.ts` throws
   `DATABASE_URL is not set` at _module evaluation_; `next build` imports the
   module graph while collecting page data, so the failure occurs regardless of
   `DEMO_MODE`. A never-connected placeholder DSN yields a fully green build.
   (TD-23)
3. **`DEMO_MODE` is absent from `.env.example`.** The variable that selects the
   entire persistence layer is missing from the only template provided. Following
   the template verbatim routes every call to the ~35 adapters that have never
   executed, and the resulting errors do not name the cause. (TD-25)
4. **No committed E2E suite.** `@playwright/test` is a devDependency with **no
   config, no specs, no `tests/e2e/`**. The 39/39 browser checks certified in
   `VERSION_1.0_BETA.md` §2.5 ran from `scratch/`, which is gitignored. The
   verification was genuine; it is **not reproducible from a clone.**
5. **19 dependency advisories** — 13 high, 6 moderate, 0 critical; three direct
   (`next`, `eslint`, `eslint-config-next`). `next` 16.2.12 is a non-breaking
   patch fix. Checklist 7.13 moves ❌ → ⚠️: the audit now exists, the remediation
   does not.
6. **4 unused runtime dependencies** — `@tanstack/react-query`, `framer-motion`,
   `zustand`, and `shadcn` (a CLI in `dependencies`).

## Documentation accuracy corrections

Two, and the first one matters because it reverses a correction made in Phase C.

1. **Phase C's worker-inventory correction was itself wrong.** Phase C recorded
   that baseline TD-05 over-stated the workers, having found only
   `agent-executor.ts` in `src/workers/`. All three named workers exist and all
   three are tracked in git:
   `src/workers/agent-executor.ts`,
   `src/features/approvals/sla-worker.ts`,
   `src/lib/portal/workers/SessionCleanupWorker.ts`.
   Phase C searched one directory rather than the tree, and the erroneous claim
   propagated into `VERSION_1.0_BETA.md` (§3 D-6, §6 caveat 4),
   `PRODUCTION_MIGRATION_PLAN.md` (Sprint 16), `PRODUCTION_READINESS_CHECKLIST.md`
   (5.5, 11.10), `QA-NOTES.md` and `TECHNICAL-DEBT-NOTES.md`.
   Baseline Rule 7 cuts both ways: here the repository **exonerates** the
   baseline. Checklist 11.10 should be _withdrawn_, not completed. What is true of
   all three is that **none has an invoker** — verified by grep; the only external
   reference is a comment at `src/lib/ai/memory.ts:94`. Sprint 16 has three
   workers to wire, not one to wire and two to write.

2. **The "broken fresh clone" claim is wrong as stated.** Five documents assert
   that untracked migrations `0008`/`0009` mean a fresh clone carries a journal
   referencing absent files. `HEAD` has **8 journal entries and 8 migration
   files** and is internally consistent; the working tree has 10 and 10 and is
   also consistent. The hazard is prospective and has one trigger — `git add -u`
   or `git commit -a`, which stage the modified `_journal.json` while ignoring the
   untracked `.sql` files, yielding 10 entries against 8 files. Those are the most
   natural commands anyone would reach for, which is why the migration commit must
   use explicit paths.

## What remains never verified

Unchanged from Phase C, and restated because Phase C.1 verified nothing about the
product:

- `DEMO_MODE=false` — the code path customers would run has never executed.
- ~35 real adapters — never run against a database.
- RLS — never evaluated by a database.
- Non-owner RBAC — 6 roles defined, 1 exercised.
- `requirePermission` coverage — never audited exhaustively; the service-role
  connection bypasses RLS, so one omission is one unprotected action.
- Behavioural mock/real parity — signature-level only (TD-17).
- The client portal surface — never code-reviewed, and it ships to _external_
  users first.
- Load, soak, penetration testing; screen-reader accessibility pass.
- Any performance figure under real network latency — every measurement to date
  resolved from memory.

## Method

**Execution-first, and deliberately so.** Phase C's method was repository-first
(claims checked against `src/` rather than prior reports), which is how it found
the cross-tenant dedup defect. Phase C.1 went one step further and _ran_ things:
`npm ci` in a clean directory, `next build` with an empty environment, every
`package.json` script, `npm audit`, and the CI workflow's exact env block.

Every finding in this section came from that difference. Reading `src/` cannot
tell you that a build fails without `DATABASE_URL`, that `format:check` has been
failing for 341 files, or that the CI pipeline has never run. Reading the
_whole_ tree rather than one directory is also what caught the worker error —
which Phase C introduced while applying Rule 7, and which Phase C.1 removed by
applying it more carefully.
