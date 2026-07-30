# Product Backlog

## Data Layer / Dispatcher Debt (Sprint 11B — DONE, see SPRINT-11B.md)

- **Deliverables**: `getDeliverables`, `getDeliverableById`, `searchDeliverables` implemented in `actions.ts`, `real-actions.ts`, `mock-actions.ts`. Done.
- **Files**: `getFiles`, `getFolder`, `searchFiles` implemented in `actions.ts`, `real-actions.ts`, `mock-actions.ts`. Done.
- **Meetings**: `getMeetings` (global) implemented in `queries.ts`, `real-queries.ts`, `mock-queries.ts`. Done.
- **Timeline**: `getTimelines()` (global) implemented in `actions.ts`, `real-actions.ts`, `mock-actions.ts`. Done.
- **Follow-up (new)**: Meetings' pre-existing project-scoped mock reads (`getMeetingsForProject`, `getMeetingById`, `getMeetingDecisions`, `getMeetingActionItems` in `mock-queries.ts`) are stubs that don't read `DemoStore.meetings` — back-fill these before the Meetings workspace page ships (see SPRINT-11B.md "Known Limitations").

## Presentation Layer (Sprint 11A Resumed — DONE, see SPRINT-11A.md)

- **Workspace Completions**: `/deliverables`, `/files`, `/meetings`, and `/timeline` global workspace pages built, navigation flipped to `"live"`. Done.
- **Client Enhancements**: Still deferred — not part of the resumed 11A scope (limited to the four missing workspaces).
- **Project Enhancements**: Still deferred.
- **Organization Enhancements**: Still deferred.

## New Backlog Items (raised while building the Sprint 11A workspaces)

- **Total-count query**: `getDeliverables`/`searchDeliverables`/`getFiles`/`searchFiles` return a page of rows, not a count; the pager currently over-fetches by one row to detect "has more" instead of a real total. Add a `count()` variant when this needs to be exact.
- **Server-side filters for `getMeetings()`/`getTimelines()`**: both take only `(cursorOffset, limit)`, so the Meetings and Timeline workspaces filter client-side over a bounded batch. Fine at demo scale; add filter params before real multi-project orgs hit this.
- **Meetings mock-query stub back-fill**: unchanged from Sprint 11B — `getMeetingsForProject`/`getMeetingById`/`getMeetingDecisions`/`getMeetingActionItems` in `mock-queries.ts` don't read `DemoStore.meetings`. Now additionally blocks the Meetings workspace's drawer from showing Decision Summary/Action Items (see SPRINT-11A.md).
- **Client/Project/Organization page enhancements**: deferred from the original Sprint 11A scoping, still not started.

## TanStack Table Implementation (Phase 1.11)

- Refactor the minimalist `DataTable` primitive to the full TanStack port (sorting, visibility, selection, export slots).

---

## Sprint 12A — Enterprise Interaction Layer (DONE, see SPRINT-12A.md)

Closed this sprint:

- **P1-01 Sign out** — fixed and verified (cookie cleared, redirect honoured).
- **P1-02 Organisation Profile** — fixed and verified. Three causes, not one: the
  DemoStore field-name mismatch, a timezone regex that rejected `"UTC"` on a
  field the form does not render (a _silent_ save failure), and empty-string
  brand colours that could never be cleared.
- **P2-01 Deliverable status vocabulary** — seed status corrected to a real enum
  member; the filter now exposes all 12 statuses, not 8.
- **P2-02 / P2-03 accessibility** — "coming soon" nav items genuinely disabled;
  destructive remove-member button named. One further unnamed control (project
  detail back button) was found by the verification sweep and fixed.
- **P2-04 / P2-05 dead header controls** — global search and the notification
  bell both work.
- **P3-01/02 (partly), P3-03, P3-08** — task create/edit/status/board movement;
  file upload and folder creation; deliverable approve/revision/share.
- **DemoStore schema parity** — now enforced by
  `tests/unit/demo-store-schema-parity.test.ts` over nine collections. This was
  Phase A's architectural recommendation; writing it surfaced four drifts beyond
  the two already known.

### New backlog items raised by Sprint 12A

Each blocks a UI interaction that was deliberately _not_ built rather than
shipped as a control that cannot finish the job (SPRINT-12A.md §3).

- **`updateMeeting` action** — `updateMeetingSchema` exists, the action does not.
  Blocks edit / cancel / complete on meetings.
- **Meeting-scoped decision & action-item reads** — `getMeetingDecisions` /
  `getMeetingActionItems` remain project-scoped stubs returning `[]`. The write
  actions exist, so anything a user added would be invisible to them. (This is
  the long-standing stub item, now blocking a second surface.)
- **Review-session read for deliverables** — no "list sessions for a
  deliverable" query, so `approveRevision` can only be reached in the drawer
  session that started the review.
- **Notification template join** — the notifications read model carries no
  subject or body, so the bell can only show priority and delivery state.
- **`getMeetings()` null-safe sort** — sorts on `startTime` without a guard; a
  meeting with no start time would break the list. The create dialog requires a
  start time as a stopgap.
- **Task domain gaps** — no delete, assignment, comments, checklists, or a
  readable active timer (`startTaskTimer` exists; `stopTaskTimer` needs a
  `timeEntryId` no read returns). Also no task search, which is why `/tasks` is
  absent from global search.
- **Global search coverage** — composed from the five search-capable public
  reads. Tasks, meetings and timelines have none, and are stated as unsearchable
  in the empty state.

### Still deferred (unchanged)

- Breadcrumbs across nested routes; dashboard charts / activity feed /
  drill-through; search, filters and pagination on Projects and Clients; a
  global task read layer; TanStack Table port.

---

## Sprint 12B — Enterprise Domain Completion (DONE, see SPRINT-12B.md)

Every backlog item Sprint 12A raised above is resolved except where noted. No
table, column, enum or migration was added — each capability sat on schema the
aggregate already had.

Closed this sprint:

- **`updateMeeting` action** — added, plus `cancelMeeting` / `completeMeeting`,
  guarded by `MEETING_STATUS_TRANSITIONS` so an illegal lifecycle jump is
  refused rather than written. Attendee and agenda management came with it.
- **Meeting-scoped decision & action-item reads** — `getMeetingOutcomes(meetingId)`
  added, and the four long-standing project-scoped mock stubs
  (`getMeetingsForProject` / `getMeetingById` / `getMeetingDecisions` /
  `getMeetingActionItems`) now read the DemoStore. This backlog item had been
  carried since Sprint 11B; it is closed.
- **Review-session read for deliverables** — `getReviewSessions(deliverableId)`.
  Approve now survives a page reload, which is asserted by a workflow check
  written to reproduce the old failure.
- **Notification template join** — `getNotificationFeedAction` composes
  notification → event → in-app template. The bell renders real titles and
  bodies; a missing template degrades to the event it came from, never a blank.
- **`getMeetings()` null-safe sort** — `DESC NULLS LAST` in SQL, matched in the
  mock adapter.
- **Task domain gaps** — delete, assignment, comments, history and a stoppable
  timer all added. `startTaskTimer` now returns its entry and
  `getActiveTaskTimer` finds one that outlived its page, which is what makes
  Start/Stop a closed loop. **Checklists are the exception and remain open.**
- **Global search coverage** — `searchTasks` added and wired in as a sixth
  source. Meetings and timelines are still unsearchable and still say so.
- **Files domain** — rename, move, soft delete, folder rename/move/delete,
  version history with restore, share-link list, activity trail.
- **Deliverables domain** — approval history, share links and activity trail
  surfaced from tables the write side had been filling since Sprint 11.

### New backlog items raised by Sprint 12B

- **Task checklists** — `insertTaskChecklistSchema` and both tables exist; the
  nested checklist → item structure needs two write paths and two reads. A work
  package, not a completion.
- **Task dependencies in the UI** — `addTaskDependency` exists with real DAG
  cycle detection, but no read lists a task's dependencies and a picker over
  every task in the org is a design question.
- **Behavioural parity test for the mock adapters** — schema parity would not
  have caught the divergence this sprint found (the mock timer logged no
  activity event while the real adapter logged two). Worth considering a test
  that asserts both adapters emit the same audit trail for the same call.
- **Global task workspace** — `/tasks` is still pinned to the seeded Wireframes
  milestone because `getTasks` is milestone-scoped. `searchTasks` is now the
  org-wide read a global workspace could be built on.
- **Per-record routes** — deliverables, files, tasks and meetings have none, so
  a search hit lands on the filtered workspace rather than the record.
- **Notification preference surface** — `updateNotificationPreferencesAction`
  exists and `PreferencesForm` is unrouted. A settings-page work package.
- **Deliverable review threads / comments** — tables carry coordinate and
  timecode columns; an annotation surface, not a gap.
- **Meeting recordings, transcripts, templates, follow-ups** — tables exist, no
  ingestion path, no media storage (TD-02).
- **Trash / restore for soft-deleted files and tasks** — both deletes are
  reversible at the data layer; nothing exposes the reversal.

### Still deferred (unchanged)

- Breadcrumbs across nested routes; dashboard charts / activity feed /
  drill-through; search, filters and pagination on Projects and Clients;
  total-count queries; server-side filters for `getMeetings`/`getTimelines`;
  files breadcrumb deep-link ancestors; TanStack Table port.

---

## Phase C — v1.0 Beta Freeze (DONE, see VERSION_1.0_BETA.md / BETA_FREEZE.md)

Phase C was a documentation and planning phase. **No application code was
modified, committed, or pushed.** The demo platform is declared feature complete
and frozen; the backlog below is reorganised around that freeze.

### Frozen — not backlog any more

Everything in `SPRINT-12B.md` §4 ("Unsupported Capabilities") is now **frozen
out of v1.0**, not queued for it: task checklists, task dependency UI,
deliverable publish semantics, review threads/annotations, meeting recordings and
transcripts, meeting templates and follow-ups, trash/restore surfaces, ranked
search, notification preference editing. These are post-v1.0 product decisions,
not gaps to close before release.

### Promoted to release gates (see PRODUCTION_READINESS_CHECKLIST.md)

These moved from "backlog" to "cannot ship without":

- **Commit and tag the working tree.** 136 uncommitted paths, no remote, no tags.
  Migrations `0008`/`0009` are untracked while `_journal.json` references them,
  so a fresh clone is broken. **This is the highest-priority item in the
  repository** and it blocks the freeze from meaning anything.
- **Prove multi-tenant isolation with a test.** No RLS policy has ever been
  evaluated by a database. This is the platform's central security claim.
- **Audit `requirePermission` coverage on every real action.** The Drizzle client
  connects as `postgres` and bypasses RLS by design, so the service layer is the
  only boundary. One omission is one unprotected action.
- **Block `DEMO_MODE` in production** (P2-06, open since Phase A). Demo login
  accepts any credentials and grants `*:*`.
- **Organisation-scope the file dedup lookup.** `finalizeFileUpload` matches
  `sha256Hash` with no org filter — two tenants uploading the same file would
  share a storage path. Found in the Phase C audit; treat as a security defect.
- **Replace `MockVirusScanner`** — it always returns `isClean: true`.
- **Rehearse a restore.** Not configure a backup — rehearse and time a restore.

### New backlog items raised by the Phase C audit

- **Behavioural mock/real parity test** (TD item 17). Schema parity would not
  have caught the Sprint 12B divergence where the mock timer logged no activity
  event for two sprints. Assume more exist.
- **Correct baseline TD-05.** It names three background workers; only
  `agent-executor.ts` exists in `src/workers/`. Repository overrides
  documentation (Baseline Rule 7) — the baseline should be amended at its next
  revision.
- **Review the client portal surface.** Flagged in the Stabilization Report,
  still true, and it ships to _external_ users first.
- **Exercise all six system roles.** Six are defined; only `owner` has ever been
  used in a browser.
- **`README.md` predates most of the platform.**
- **No generated API/action reference.**
- **Compliance is entirely unstarted** — privacy policy, DPA, data retention
  (`retainedUntil` exists and is unused), data export and subject-rights
  deletion. Required before holding real customer data.

### Deferred, unchanged

Breadcrumbs across nested routes; dashboard charts / activity feed /
drill-through; search, filters and pagination on Projects and Clients; global
task workspace; per-record routes for deliverables/files/tasks/meetings;
total-count queries; server-side filters for `getMeetings`/`getTimelines`; files
breadcrumb deep-link ancestors; TanStack Table port; AI Workspace; Analytics
dashboards; Automation builder UI; Knowledge Graph query adapter.

---

## Phase C.1 — Repository Stabilization (DONE, see REPOSITORY_STABILIZATION_REPORT.md)

Phase C.1 was an audit and documentation phase. **No application code was
modified, staged, committed, tagged or pushed.** Its output is five new documents
(`REPOSITORY_STABILIZATION_REPORT.md`, `VERSION_CONTROL_PLAN.md`,
`ENVIRONMENT_SETUP.md`, `DEVELOPER_ONBOARDING.md`, `RECOVERY_CHECKLIST.md`) and a
verified recovery test.

### Promoted to Gate G1 — blocking Sprint 13

Unchanged in substance from Phase C, now with the tree **proven recoverable**:
a 552-file clone installs, passes 240/240 tests, builds and serves in ≈3 minutes
with four environment variables and no local state. There is no longer any
uncertainty about whether the snapshot is worth committing.

- **Commit, tag, add a remote, push.** 552 files, 2 commits, 0 tags, 0 remotes.
  Ordered execution list in `VERSION_CONTROL_PLAN.md` §8; disaster matrix in
  `RECOVERY_CHECKLIST.md` §6. **The single highest-priority item in the
  repository.**
- **Commit the migrations first, atomically, with explicit paths.** `git add -u`
  and `git commit -a` stage the modified `_journal.json` while ignoring the
  untracked `0008`/`0009` SQL and snapshots, producing 10 journal entries against
  8 files. `HEAD` and the working tree are each internally consistent; only the
  intermediate state is broken — which is what makes it easy to reach by accident.
- **Verify the remote by cloning from it elsewhere and running the gates.** A
  remote that has never been cloned from is an assumption, not a backup.
- **Create and verify an offline `git bundle`** as a second copy. The enclosing
  `WebsiteCreation` directory is a separate repository that does **not** track
  `ai-nexos` — backing up the parent backs up nothing here.

### New backlog items raised by the Phase C.1 audit

Ordered by value per unit of effort. The first three are one-line changes.

- **Add `DEMO_MODE` to `.env.example`** (TD-25). The variable that selects the
  entire persistence layer is missing from the only template provided. Following
  the template verbatim routes every call to the ~35 never-executed adapters, and
  the resulting errors do not name the cause. **The highest-value one-line change
  in the repository.**
- **Give CI a `DATABASE_URL` and `DEMO_MODE`** (TD-24). Two lines in
  `.github/workflows/ci.yml`. Without them the build step fails; the workflow has
  never run because there is no remote, so this has never been observed.
- **Run `npm run format -- --write`** — 341 files fail `format:check`, which CI
  enforces as a required step. Must be **its own commit, after the
  `v1.0.0-beta` tag**, so the tag captures the tree exactly as certified, and
  must be verified with `git diff --stat` to contain no logic change.
- **Bump `next` 16.2.10 → 16.2.12.** A non-breaking patch fix for a high-severity
  advisory; the highest-value single upgrade available among 19 advisories (13
  high, 3 direct). Recommended as the first action of Sprint 13, before any
  Supabase work.
- **Set `package.json` version to `1.0.0-beta`.** It reads `0.1.0` while
  `/api/health` returns `"1.0.0"` and every document says v1.0.0-beta — the
  repository reports three different versions of itself.
- **Promote the E2E harness out of `scratch/` into a committed Playwright suite.**
  `@playwright/test` is a devDependency with no config, no specs and no
  `tests/e2e/`. The 39/39 browser checks certified in `VERSION_1.0_BETA.md` §2.5
  ran from gitignored `scratch/` — genuine verification that **cannot be
  reproduced from a clone.** Sprint 13 needs a browser harness anyway to re-run
  those checks against Postgres.
- **Drop 4 unused dependencies** — `@tanstack/react-query`, `framer-motion`,
  `zustand` (zero imports each); move `shadcn` (a CLI) out of `dependencies`.
  After the tag.
- **Pin Node** — add `"engines": { "node": ">=24 <25" }` and `.nvmrc`. CI pins
  Node 24; developer machines are unconstrained.
- **Three pre-emptive `.gitignore` additions** — `playwright-report/`,
  `test-results/`, `tmp|logs`. None of these paths exists yet; the file is
  otherwise correct and no artefact is tracked anywhere in the index.
- **Make `src/db/index.ts` lazy** (TD-23). Its `DATABASE_URL` guard fires at
  module evaluation, so `next build` fails during page-data collection regardless
  of `DEMO_MODE`. Lazy client construction would let the demo path build with no
  database configuration at all. A code change — Sprint 13 at the earliest.
- **Remove `NEXTAUTH_SECRET` from `.env.example`** — unused by any code path; the
  platform uses Supabase Auth natively.
- **Reconcile the storage bucket name** — `.env.example` says `documents`,
  `PRODUCTION_MIGRATION_PLAN.md` provisions `nexos-assets`. Sprint 14.
- **Reject `SEED_OWNER_PASSWORD="change-me-immediately"` at seed time.** A
  template placeholder that will be copied verbatim by someone. Sprint 15.

### Withdrawn from the backlog

- **"Correct baseline TD-05"** (raised by the Phase C audit; checklist 11.10).
  **There is nothing to correct — the baseline was right.** All three named
  workers exist and are tracked: `src/workers/agent-executor.ts`,
  `src/features/approvals/sla-worker.ts`,
  `src/lib/portal/workers/SessionCleanupWorker.ts`. Phase C searched only
  `src/workers/`, found one file, and concluded two were missing; the claim then
  propagated into four documents. Baseline Rule 7 cuts both ways.
  What _is_ true of all three — and is the real content of TD-05 — is that **none
  has an invoker.** Sprint 16 therefore has three workers to wire, not one to
  wire and two to build, which makes it a smaller sprint than Phase C estimated.
  Worth reflecting in the estimate before it is committed to.

### Corrected in the record, not backlog

- **Route count is 35, not 36.** Quoted as 36 in `VERSION_1.0_BETA.md` §2.5,
  `BETA_FREEZE.md` §4 and `PRODUCTION_READINESS_CHECKLIST.md` 8.1/9.4.
- **"A fresh clone would be broken" is not true of `HEAD`** (8 journal entries, 8
  files, consistent). See the Gate G1 item above for the actual failure mode.

### Deferred, unchanged

Everything under "Deferred, unchanged" in the Phase C section above is untouched:
breadcrumbs across nested routes; dashboard charts / activity feed /
drill-through; search, filters and pagination on Projects and Clients; global
task workspace; per-record routes; total-count queries; server-side filters for
`getMeetings`/`getTimelines`; files breadcrumb deep-link ancestors; TanStack Table
port; AI Workspace; Analytics dashboards; Automation builder UI; Knowledge Graph
query adapter.

Everything frozen out of v1.0 by `BETA_FREEZE.md` §1 remains frozen. Phase C.1
added no product scope and closed none.
