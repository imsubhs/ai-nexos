# Technical Debt Notes - Sprint 11A

## Identified Missing Core Infrastructure

During Sprint 11A's prerequisite verification phase, a significant gap in the read-layer for several certified modules was identified.

1. **Deliverables Module** — RESOLVED in Sprint 11B.
   - `getDeliverables`, `getDeliverableById`, `searchDeliverables` implemented in `src/features/deliverables/actions.ts`, `real-actions.ts`, `mock-actions.ts`.

2. **Files Module** — RESOLVED in Sprint 11B.
   - `getFiles`, `getFolder`, `searchFiles` implemented in `src/features/files/actions.ts`, `real-actions.ts`, `mock-actions.ts`.

3. **Meetings Module** — RESOLVED (global fetcher only) in Sprint 11B.
   - `getMeetings` implemented in `src/features/meetings/queries.ts`, `real-queries.ts`, `mock-queries.ts`.

4. **Timeline Module** — RESOLVED (global fetcher only) in Sprint 11B.
   - `getTimelines()` implemented in `src/features/timelines/actions.ts`, `real-actions.ts`, `mock-actions.ts`. Existing `getProjectTimeline` (still `projectId`-scoped) is unchanged and remains the project-detail fetcher.

## Architectural Enforcement

Per the strict "verify-before-implement" rule, no local mock data or ad-hoc fetchers were invented in the UI layer. Items 1-4 above are now resolved at the Data Layer; the Presentation Layer (workspace pages) remains separately scoped to Sprint 11A completion / Sprint 12.

## New Debt Identified in Sprint 11B

5. **Meetings mock-mode stub gap** (pre-existing, discovered while implementing item 3 above — not introduced this sprint).
   - **Gap**: `getMeetingsForProject`, `getMeetingById`, `getMeetingDecisions`, `getMeetingActionItems` in `src/features/meetings/mock-queries.ts` are hardcoded stubs that do not read `DemoStore.meetings`/`meetingOutcomes`/`meetingDecisions`/`meetingActionItems` — e.g. `getMeetingsForProject` always returns `[]` regardless of seed data.
   - **Impact**: In DEMO_MODE, a future Meetings workspace page's project-level drill-down would render empty/incorrect data even though the global list (via the new `getMeetings`) is correct. `getMeetings` was deliberately implemented to read the DemoStore directly rather than compose these broken stubs, so it is unaffected — but the underlying stubs are still broken for their own callers.
   - **Location**: `src/features/meetings/mock-queries.ts`.
   - **Recommendation**: Back-fill these four mock implementations against the DemoStore before the Meetings workspace page ships.

## New Debt Identified in Sprint 11A (Resumed)

The Meetings workspace page has now shipped (item 5 above is no longer purely hypothetical): its detail drawer cannot show Decision Summary/Action Items because of the stub gap, and states this to the user instead of rendering broken data. Back-filling item 5 remains the fix.

6. **No total-count query for Deliverables/Files reads**
   - **Gap**: `getDeliverables`, `searchDeliverables`, `getFiles`, `searchFiles` return a page of rows with no accompanying count.
   - **Impact**: The Deliverables and Files workspace pagers over-fetch one extra row per page to infer "is there more" instead of showing an exact total. Functionally correct, but "Showing X–Y of Z" can slightly overstate Z on the last page before it's reached.
   - **Location**: `src/features/deliverables/real-actions.ts`, `src/features/files/real-actions.ts`; consumed in `src/app/(dashboard)/{deliverables,files}/page.tsx`.
   - **Recommendation**: Add a paired `count()` query per module if exact totals become a product requirement.

7. **No server-side filters for `getMeetings()`/`getTimelines()`**
   - **Gap**: Both functions take only `(cursorOffset, limit)` — no status/date/search parameters.
   - **Impact**: The Meetings workspace fetches one bounded batch (500 rows) and filters/paginates entirely client-side; the Timeline workspace filters client-side over whatever has been loaded via "Load more." Both are correct at demo/small-org scale but won't scale to large multi-project organizations.
   - **Location**: `src/features/meetings/real-queries.ts`, `src/features/timelines/real-actions.ts`; consumed in `src/features/meetings/components/meetings-directory.tsx`, `src/features/timelines/components/timeline-feed.tsx`.
   - **Recommendation**: Add filter parameters to both dispatcher functions in a future sprint; this was out of scope for a presentation-only sprint that was instructed not to modify the frozen dispatcher.

8. **Files folder browser breadcrumb trail is not deep-link-complete**
   - **Gap**: `getFolder()` returns one folder level at a time with no ancestor/path query, so `FolderBrowser` builds its breadcrumb trail client-side as the user clicks deeper.
   - **Impact**: Reloading a deep `?projectId=&folderId=` link shows only that folder as the breadcrumb, not its full ancestor chain.
   - **Location**: `src/features/files/components/folder-browser.tsx`.
   - **Recommendation**: Add an ancestor-path query to `getFolder()` (or a dedicated function) if deep-linkable breadcrumbs become a requirement.

---

# Technical Debt Notes — Sprint 12A

## Resolved this sprint

- **DemoStore ⇄ schema drift** (root cause of P1-02 and P2-01). Nine collections
  are now schema-parallel and the parity is enforced by
  `tests/unit/demo-store-schema-parity.test.ts`. This was Phase A §9's
  architectural recommendation.
- **TD-14 (sign out)** — resolved via `<form action={signOut}>`. _TD-14 should
  be reclassified from Low to P1 in the v1.0 baseline before it is closed:_ it
  was recorded as a no-JS progressive-enhancement nicety, but it was a total
  functional failure with JavaScript enabled.
- **Item 8 (files breadcrumb deep links)** — still open, unchanged.

## New debt identified in Sprint 12A

Each of these blocks a user-facing interaction that was deliberately not built.

9. **No `updateMeeting` action**
   - **Gap**: `updateMeetingSchema` exists in `src/features/meetings/schemas.ts`;
     no `updateMeeting` action exists in `actions.ts` / `real-actions.ts` /
     `mock-actions.ts`.
   - **Impact**: Meetings cannot be edited, cancelled or completed from the UI.
     The detail drawer states this rather than offering a status control that
     would be a fake write path.
   - **Location**: `src/features/meetings/{actions,real-actions,mock-actions}.ts`.

10. **No review-session read for deliverables**
    - **Gap**: `approveRevision(deliverableId, sessionId, notes)` requires a
      `sessionId`, but the Sprint 11B read layer has no query listing review
      sessions for a deliverable.
    - **Impact**: Approve is reachable only within the same drawer session that
      started the review. Reload and the deliverable can be reviewed again but
      not approved. The drawer says so.
    - **Location**: `src/features/deliverables/real-actions.ts` (read layer);
      consumed in `components/deliverable-actions.tsx`.
    - **Recommendation**: add `getReviewSessions(deliverableId)`.

11. **Notifications read model has no renderable headline**
    - **Gap**: `getNotificationsQuery` selects from `notifications` only —
      `eventId`, `priority`, `status`, `readAt`. No join to
      `notification_templates` (or to `events`), so there is no subject or body.
    - **Impact**: The header bell can show priority, delivery state, timestamp
      and read/unread, but not what happened. The panel states this.
    - **Location**: `src/features/notifications/real-queries.ts`.
    - **Recommendation**: join templates and render `subjectTemplate` when the
      notification surface becomes a product priority.

12. **`getMeetings()` sorts on `startTime` with no null guard**
    - **Gap**: `mock-queries.ts` sorts `b.startTime.getTime() - a.startTime…`;
      `createMeetingSchema` makes `startTime` optional.
    - **Impact**: A meeting created without a start time would throw while
      rendering the meetings list. Mitigated (not fixed) by the create dialog
      requiring a start time — the read is still fragile for any other writer.
    - **Location**: `src/features/meetings/mock-queries.ts`,
      `src/features/meetings/real-queries.ts`.

13. **Task domain has no delete, assignment, comments, checklists, or stoppable timer**
    - **Gap**: `taskAssignees`, task comment and checklist insert schemas all
      exist; no actions do. `startTaskTimer` exists but `stopTaskTimer` needs a
      `timeEntryId` that no public read returns, and the real `startTaskTimer`
      returns `void`.
    - **Impact**: The task detail dialog offers status, edit and time _totals_
      only. The previously-disabled "Start Timer" button was removed rather than
      wired — starting a timer the user cannot stop is worse than no timer.
    - **Location**: `src/features/tasks/{actions,real-actions}.ts`.

14. **No search-capable read for tasks, meetings or timelines**
    - **Gap**: `globalSearch()` composes `getProjects`, `getClients`,
      `listEmployeesAction`, `searchDeliverables` and `searchFiles`. There is no
      equivalent for the other three modules, and relevance is per-source (each
      read brings its own ordering; there is no cross-source ranking).
    - **Impact**: Header search cannot find a task, a meeting or a timeline. The
      empty state says so explicitly.
    - **Location**: `src/features/search/actions.ts`.

## Carried forward unchanged

- **TD-02 (mock storage signed URLs)** — still the single largest blocker to a
  credible DAM. It is now the _only_ reason Files has no inline preview and no
  download; upload registers the record, version and a real SHA-256 but cannot
  transfer bytes.
- Items 6 (total-count queries), 7 (server-side filters for
  `getMeetings`/`getTimelines`), 8 (files breadcrumb ancestors).

---

# Technical Debt Notes — Sprint 12B

## Resolved this sprint

Six of the eight open items are closed. Each was closed by building the domain
action or read it named — no table, column, enum or migration was added.

- **Item 5 — Meetings mock-mode stub gap.** Carried since Sprint 11B. All four
  stubs (`getMeetingsForProject`, `getMeetingById`, `getMeetingDecisions`,
  `getMeetingActionItems`) now read the DemoStore. One of them had been returning
  a literal `{ id: "mock-id", status: "active", priority: "high" }`.
- **Item 9 — No `updateMeeting` action.** Added, with `cancelMeeting` /
  `completeMeeting`, attendee management and agenda editing. Status changes are
  guarded by `MEETING_STATUS_TRANSITIONS` (8 unit tests, plus UI assertions in
  workflow checks W1.9/W1.10). _This item was also the reason meetings could not
  carry notes; the `notes` jsonb column now has a writer._
- **Item 10 — No review-session read for deliverables.**
  `getReviewSessions(deliverableId)` added. Workflow check W3.3 is written to
  reproduce the recorded failure precisely — start a session, close the drawer,
  **reload the page**, reopen, approve — and passes.
- **Item 11 — Notifications read model has no renderable headline.**
  `getNotificationFeedAction` composes notification → event → in-app template.
  Rendering lives in `src/features/notifications/templates.ts` and is shared by
  both adapters (21 unit tests) so demo and production cannot show different
  copy. A missing template degrades to the event it came from rather than a blank
  row.
- **Item 12 — `getMeetings()` sorts on `startTime` with no null guard.** Now
  `DESC NULLS LAST` in SQL, matched in the mock adapter. The create dialog still
  requires a start time, but for a product reason (an unscheduled meeting cannot
  be filtered as upcoming or past), not as a crash guard.
- **Item 14 — No search-capable read for tasks.** `searchTasks` added and wired
  into `globalSearch` as a sixth source. Meetings and timelines remain
  unsearchable and the empty state still says so.

**Item 13 — Task domain gaps: closed except checklists.** Delete (soft),
assignment, comments, history and a stoppable timer are all built. The root cause
of the timer gap turned out not to be a missing action: `startTaskTimer` returned
`void`, so no caller could ever obtain the `timeEntryId` that `stopTaskTimer`
needs. It now returns its entry, and `getActiveTaskTimer` finds a timer that
outlived the page it was started on. Checklists remain open — see item 15.

## New debt identified in Sprint 12B

15. **Task checklists are still unbuilt**
    - **Gap**: `insertTaskChecklistSchema` / `insertTaskChecklistItemSchema` and
      both tables (`task_checklists`, `task_checklist_items`) exist; no action or
      read does.
    - **Why not this sprint**: the nested checklist → item structure needs two
      write paths and two reads. That is a work package, not the completion of an
      existing capability, and the sprint brief excluded new capability.
    - **Location**: `src/features/tasks/{actions,real-actions}.ts`.

16. **No read lists a task's dependencies**
    - **Gap**: `addTaskDependency` exists with real DAG cycle detection
      (`checkTaskCycle`), and is unreachable from the UI because nothing lists
      what a task depends on.
    - **Impact**: the cycle-detection logic is untested against real use, and a
      dependency picker over every task in the organisation is an unresolved
      design question.
    - **Location**: `src/features/tasks/real-actions.ts`.

17. **The mock and real adapters can diverge behaviourally without detection**
    - **Gap**: `tests/unit/demo-store-schema-parity.test.ts` asserts _row shape_
      parity. It cannot see that two adapters emit different side effects for the
      same call.
    - **How this surfaced**: `real.startTaskTimer` / `stopTaskTimer` log a
      `time_logged` activity event; the mock logged neither. Nothing had ever read
      task activity, so the divergence was invisible for two sprints — the moment
      `getTaskActivity` existed, demo history was two events short of
      production's. Found by workflow check W2.7, not by any test.
    - **Recommendation**: a parity test that drives the same call through both
      adapters and compares the audit/activity trail. This is the highest-value
      test this sprint could identify and did not write.
    - **Location**: `tests/unit/`.

18. **The real (Postgres) adapters for everything added this sprint are unexercised**
    - **Gap**: 19 actions and 16 reads have Drizzle implementations written
      against the real schema. None has been run against a database — the sprint
      ran in `DEMO_MODE` and the Supabase migration is explicitly not started.
    - **Impact**: they typecheck and follow the existing patterns, but "reviewed"
      is not "verified". Two constructs in particular deserve attention at
      migration time: the recursive-CTE descendant check in `updateFolder`, and
      `sql\`${meetings.startTime} DESC NULLS LAST\``in`getMeetings`.
    - **Location**: `src/features/{meetings,files,deliverables,tasks,notifications}/real-*.ts`.

19. **Soft deletes have no exposed reversal**
    - **Gap**: `deleteFile` and `deleteTask` are both soft and both retain
      everything (file versions included), but no action restores a deleted
      record.
    - **Impact**: an accidental delete needs database access to undo.
    - **Recommendation**: a trash surface, or at minimum a `restore*` action, if
      deletion is offered to customers.

20. **`notification_templates` must be seeded per organisation**
    - **Gap**: the feed renders whatever in-app templates exist for the
      organisation. A new organisation has none.
    - **Impact**: the bell falls back to event-derived titles
      (`"Deliverable · Deliverable"`) — readable, but not written copy. The panel
      footnotes when this is happening.
    - **Recommendation**: seed a template set as part of organisation
      provisioning, alongside roles.

## Carried forward unchanged

- **TD-02 (mock storage signed URLs)** — still the single largest blocker to a
  credible DAM, and now the _only_ reason Files and Deliverables have no inline
  preview and no download. Rename, move, delete, folder operations, version
  history and share links are all real; the bytes are not.
- Items 6 (total-count queries), 7 (server-side filters for
  `getMeetings`/`getTimelines`), 8 (files breadcrumb deep-link ancestors).
- **`/tasks` is milestone-pinned.** Not previously numbered, worth recording:
  the workspace hard-codes the seeded Wireframes milestone because `getTasks` is
  milestone-scoped. `searchTasks` is now the org-wide read a global task
  workspace could be built on. This also means a task promoted from a meeting
  action item is only visible in `/tasks` if it was promoted into that milestone.

---

# Technical Debt Notes — Phase C (v1.0 Beta Freeze)

Phase C modified no code. Nothing below is resolved; two items are **new**, found
by auditing `src/` rather than reading prior reports.

## New debt identified in Phase C

21. **Cross-tenant file deduplication in `finalizeFileUpload`**
    - **Gap**: `src/features/files/real-actions.ts` looks up an existing blob by
      `eq(fileVersions.sha256Hash, …)` **with no organisation or project
      filter**, then repoints the finalising version at the match's
      `storagePath`. Its sibling `initializeFileUpload` performs the same
      deduplication correctly scoped (`eq(fileVersions.projectId, …)`, commented
      "Project-scoped trust").
    - **Impact**: two organisations uploading byte-identical files would share a
      single storage object. Inert today because storage is mocked and no bytes
      exist; **a cross-tenant data-sharing defect the moment Sprint 14 enables
      real storage**.
    - **Severity**: High — security, not hygiene.
    - **Fix before**: Sprint 14, not during it.
    - **Location**: `src/features/files/real-actions.ts`, `finalizeFileUpload`.

22. **Demo session cookie set without security flags**
    - **Gap**: `src/features/auth/mock-actions.ts` sets `demo_session` via
      `cookies().set("demo_session", "true", { path: "/" })` — no `httpOnly`, no
      `secure`, no `sameSite` — and validates no password.
      `src/features/auth/actions/demo-login.ts` sets the same cookie with all
      three flags correct, so the codebase contains both the right and the wrong
      pattern for the same cookie.
    - **Impact**: demo-only, and therefore low while `DEMO_MODE=true` is never
      deployed. **Nothing enforces that** (P2-06, open since Phase A), so the two
      facts compound into a real exposure.
    - **Severity**: Medium (High if P2-06 remains open at deploy).
    - **Location**: `src/features/auth/mock-actions.ts`.

## Debt reclassified at the freeze

These were already tracked. Phase C changes their standing, not their content.

- **TD-02 (mock storage)** — promoted to a **release gate**. It is the only thing
  blocking file preview and download, and it must land with real virus scanning
  (TD-09) and with item 21 closed.
- **TD-09 (virus scanner)** — promoted to a **release gate**. `MockVirusScanner`
  is the exported singleton and always returns `isClean: true`. A clean-returning
  scanner in production is a liability, not debt.
- **TD-04, TD-05, TD-06 (delivery, workers, event bus)** — consolidated into
  Sprint 16. Note that `DatabaseNotificationQueue.dequeue()` returns `[]`
  unconditionally, `DistributedScheduler.start()` is never called, and the Event
  Engine is never instantiated — the schemas and interfaces are complete, the
  runtime does not exist.
- **TD-07 (non-journaled SQL)** — one file remains:
  `database/drafts/automation_rls.draft.sql`. Journal it or delete it in Sprint 13.
- **TD-13 (knowledge graph stubs)**, **TD-03 (AI provider)** — explicitly **out
  of v1.0 scope**. `executeProvider()` returns a canned string and no LLM SDK is
  installed; the AI Workspace nav item is "coming soon".
- **Item 18 (unexercised real adapters)** — this is now the defining risk of the
  entire migration, not one item among twenty. See `PRODUCTION_MIGRATION_PLAN.md`
  §1 and Sprint 13's risk table.

## Documentation defect

- **Baseline TD-05 over-states worker inventory.** It names `agent-executor`,
  `sla-worker` and `SessionCleanupWorker`. `src/workers/` contains exactly one
  file: `agent-executor.ts`. Per Baseline Rule 7 (repository overrides
  documentation) this is a baseline defect. Sprint 16 must decide whether the
  two missing workers are to be built or the debt item corrected — currently the
  register implies work that has no code behind it.

## Process debt — the largest single risk in the repository

- **136 uncommitted paths, two commits, no tags, no remote.** Every sprint since
  the M0 baseline — M3.1, 11A, 11B, Stabilization, Phase A, 12A, 12B — is
  uncommitted. Migrations `0008` and `0009` are **untracked** while
  `_journal.json` references them, so a fresh clone would carry a journal
  pointing at files that do not exist.
  - Each sprint brief correctly forbade committing; the cumulative effect is that
    roughly three months of work exists in exactly one place, unversioned.
  - Violates Baseline Rule 8, flagged in the Stabilization Report and unmoved
    since.
  - **Recommendation**: commit and tag as the precondition of Sprint 13, not as a
    step within it. Grouping and tags are proposed in `BETA_FREEZE.md` §5.

## Carried forward unchanged

TD-01 (Redis), TD-03, TD-10 (portal auth), TD-13, and register items 6, 7, 8,
15, 16, 17, 19, 20 from Sprints 11B/12A/12B. None was touched in Phase C.

---

# Technical Debt Notes — Phase C.1 (Repository Stabilization)

Phase C.1 modified no code. Nothing below is resolved. Three items are **new**,
all three found by _executing_ the repository — installing it from nothing,
building it without a `.env.local`, and running every script in `package.json` —
rather than by reading `src/`.

## New debt identified in Phase C.1

23. **`src/db/index.ts` throws at module evaluation, so a demo-mode build
    requires `DATABASE_URL`**
    - **Gap**: the `DATABASE_URL is not set` guard fires when the module is
      _imported_, not when a query is issued. `next build` walks the module graph
      while collecting page data, so any route transitively reaching `src/db/`
      fails the build — **regardless of `DEMO_MODE`**, because the dispatcher
      selects its branch at call time while the import happens at module time.
    - **Impact**: a fresh clone cannot build. Observed failures: first
      `/projects/[projectId]/timeline`, then `/api/approvals/verify`. A
      syntactically valid but never-connected DSN produces a fully green build
      (35 routes) — so the requirement is pure ceremony, and undocumented
      ceremony at that.
    - **Consequence**: `.github/workflows/ci.yml` does not set `DATABASE_URL`,
      so **CI's build step fails** (see item 24).
    - **Severity**: Medium — no security or correctness impact, but it is the
      first thing every new developer and every CI run hits.
    - **Fix**: defer client construction to first use (lazy init), which would
      let the demo path build with no database configuration at all. Until then,
      `ENVIRONMENT_SETUP.md` documents the placeholder.
    - **Location**: `src/db/index.ts`.

24. **The CI pipeline has never executed, and two of its five steps fail**
    - **Gap**: `.github/workflows/ci.yml` runs `npm ci` → `lint` →
      `format:check` → `typecheck` → `build`. There is **no git remote**, so the
      workflow has never run once. Executed manually against a clean clone:
      `npm run format:check` **fails on 341 files**, and `npm run build`
      **fails** because the workflow's `env:` block provides only
      `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — not
      `DATABASE_URL` (item 23).
    - **Impact**: the safety net intended to protect the migration sprints does
      not function, and **adding a remote is the action that reveals it** — CI
      goes red on the first push. Compounding: branch protection with required
      checks cannot be enabled against a failing pipeline without blocking all
      merges.
    - **Note on scope**: `format:check` was never part of the four gates
      certified in `VERSION_1.0_BETA.md` §2.5, so this is not a regression. It is
      an unreported failing gate that the pipeline nonetheless enforces.
    - **Severity**: High — process, not product.
    - **Fix**: two lines in the workflow `env:` block (`DATABASE_URL`,
      `DEMO_MODE`), plus a one-off `npm run format -- --write` as its own commit
      **after** the `v1.0.0-beta` tag, so the tag captures the tree as certified.
    - **Location**: `.github/workflows/ci.yml`; repository-wide formatting.

25. **`DEMO_MODE` is absent from `.env.example`**
    - **Gap**: the variable that selects the entire persistence layer —
      `DEMO_MODE === "true"` routes ~20 dispatcher files to the DemoStore — is
      not in the only environment template the repository provides. It _is_
      present in the local `.env.local`, which is how it has gone unnoticed.
    - **Impact**: following the template verbatim yields `DEMO_MODE` unset →
      falsy → every read and write routed to the ~35 real adapters that have
      never executed. With placeholder Supabase credentials every page fails;
      with real credentials against an unmigrated database every page fails
      differently. **Neither error names the cause.**
    - **Severity**: High — onboarding and demo-integrity, no runtime impact on
      the current machine.
    - **Fix**: a three-line addition to `.env.example`. The single
      highest-value one-line change in the repository.
    - **Related**: `NEXTAUTH_SECRET` is in `.env.example` and is **unused by any
      code path** (the platform uses Supabase Auth natively) — remove it at the
      same revision. The storage bucket name also disagrees between
      `.env.example` (`documents`) and `PRODUCTION_MIGRATION_PLAN.md`
      (`nexos-assets`); reconcile in Sprint 14.
    - **Location**: `.env.example`.

## Documentation defect — Phase C's worker correction is itself wrong

**This supersedes the "Documentation defect" recorded in the Phase C section
above.**

Phase C recorded that baseline TD-05 over-stated the worker inventory, on the
grounds that it names `agent-executor`, `sla-worker` and `SessionCleanupWorker`
while `src/workers/` contains one file. Phase C.1 checked the whole tree rather
than one directory. **All three workers exist, and all three are tracked in
git:**

| Worker                 | Path                                             | Tracked |
| ---------------------- | ------------------------------------------------ | ------- |
| `agent-executor`       | `src/workers/agent-executor.ts`                  | ✅      |
| `sla-worker`           | `src/features/approvals/sla-worker.ts`           | ✅      |
| `SessionCleanupWorker` | `src/lib/portal/workers/SessionCleanupWorker.ts` | ✅      |

The baseline was **accurate**. Phase C's correction searched only
`src/workers/`, concluded the other two did not exist, and propagated that claim
into four documents: `VERSION_1.0_BETA.md` §3 (D-6) and §6 caveat 4,
`PRODUCTION_MIGRATION_PLAN.md` §3 Sprint 16 objective 2,
`PRODUCTION_READINESS_CHECKLIST.md` 5.5 and 11.10, `QA-NOTES.md`, and the Phase C
section of this file.

Per Baseline Rule 7 the repository is authoritative — which cuts both ways, and
here it exonerates the baseline. Checklist item 11.10 ("Baseline TD-05
corrected") should be **withdrawn, not completed**; there is nothing to correct.

What is true of all three, and is the actual content of TD-05: **none has an
invoker.** Verified by grep — the only reference to any of them outside its own
file is a comment in `src/lib/ai/memory.ts:94`. Sprint 16 therefore has three
workers to wire, not one to wire and two to write. That is a _smaller_ job than
Phase C assumed, and it is worth knowing before the sprint is estimated.

## Process debt — restated precisely

The "136 uncommitted paths" figure in the Phase C section is a porcelain count.
Measured in files, the exposure is larger:

```
Tracked at HEAD         316
Modified (tracked)       71   (+6,970 / −663 lines, 73 changed paths)
Deleted (tracked)         2   (both intentional, Sprint 12A)
Untracked paths          68   → 238 files
Total committable       552 files / 12 MB
Commits                   2      Tags 0      Remotes 0
```

**Correction to a claim repeated in five documents.** `BETA_FREEZE.md` §5.3,
`PRODUCTION_READINESS_CHECKLIST.md` 1.2, `BACKLOG.md` and the Phase C section
above all state that migrations `0008`/`0009` being untracked means "a fresh
clone would carry a journal pointing at files that do not exist." **That is not
true of `HEAD`**, which has 8 journal entries and 8 migration files and is
internally consistent. The working tree is also consistent: 10 and 10.

The hazard is real but it is _prospective_, and it has one specific trigger:

| State                  | Journal entries | `.sql` present | Consistent    |
| ---------------------- | --------------- | -------------- | ------------- |
| `HEAD`                 | 8               | 8              | ✅            |
| Working tree           | 10              | 10             | ✅            |
| **After `git add -u`** | **10**          | **8**          | ❌ **BROKEN** |

`_journal.json` is tracked-and-modified; the four migration/snapshot files are
untracked. `git add -u` and `git commit -a` stage the former and ignore the
latter. Those are the most natural commands anyone would reach for, which is
precisely why this matters more than a static inconsistency would.

**Mitigation:** the migration commit must use explicit paths and must be atomic.
See `RECOVERY_CHECKLIST.md` §1 step 1.

Also newly recorded: the enclosing `WebsiteCreation` directory is a **separate**
git repository that does not track `ai-nexos` (it is not a submodule). Backing up
the parent does not back up this project.

## New debt of record — dependencies

Recorded here rather than as numbered items, because remediation is a
`package.json` edit rather than engineering:

- **4 unused runtime dependencies**: `@tanstack/react-query`, `framer-motion`,
  `zustand` (zero imports each), and `shadcn` (a CLI consumed via
  `components.json`, misplaced in `dependencies`). Verified by import-specifier
  grep across `src/`, `tests/` and `scripts/`, with `tw-animate-css` (imported by
  `globals.css:2`) and `react-dom` (required peer) cleared as false positives.
- **19 advisories — 13 high, 6 moderate, 0 critical.** Three are _direct_:
  `next` (≤16.3.0-preview.7), `eslint`, `eslint-config-next`. The advertised fix
  for `next` is **16.2.12** — a patch bump inside the current minor, non-breaking,
  and the highest-value single upgrade available. Recommended as the first action
  of Sprint 13, before any Supabase work.
- **Node is not pinned.** No `engines` field, no `.nvmrc`. CI pins
  `node-version: 24`; developer machines are unconstrained.

## Verification debt — the E2E suite is not in the repository

`@playwright/test` is a devDependency, but there is **no `playwright.config.*`,
no `*.spec.ts`, and no `tests/e2e/`**. The 39/39 browser workflow checks
certified in `VERSION_1.0_BETA.md` §2.5 were executed by ad-hoc scripts in
`scratch/` (`scratch/sprint12b/verify.mjs`, `scratch/stabilization/*.mjs`) —
which is **gitignored**.

The verification was genuine. It is **not reproducible from a clone and not
re-runnable by anyone else.** This is a gap between the evidence the
certification documents cite and the evidence the repository can produce.

`scratch/` being ignored is correct for working notes. The narrower point is that
**a verification harness is not a working note** — it is the only executable
evidence behind the interaction-layer certification. Promoting it to a committed
Playwright suite is a recommended Sprint 13 task, and Sprint 13 needs a browser
harness anyway to re-run those 39 checks against Postgres.

## Carried forward unchanged

Every item 1–22 from Sprints 11A/11B/12A/12B and Phase C, plus TD-01 (Redis),
TD-02 (mock storage), TD-03 (AI provider), TD-04/05/06 (delivery, workers, event
bus), TD-07 (non-journaled SQL), TD-09 (virus scanner), TD-10 (portal auth),
TD-13 (knowledge graph). **None was touched in Phase C.1** — no code was
modified.

TD-21 (cross-tenant file dedup) and TD-09 remain the two items that must close
**before**, not during, Sprint 14.
