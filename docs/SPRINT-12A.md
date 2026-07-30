# AI NEX OS — Sprint 12A: Enterprise Interaction Layer

**Sprint type:** Interaction completion (no architecture, no new domain capability)
**Branch:** `phase-03-core-product` · `DEMO_MODE=true` · Next.js 16.2.10 · Node 24.15.0
**Date:** 2026-07-26
**Input:** `docs/PHASE-A-REVIEW.md` (Enterprise Product Review)
**Method:** every interaction wired here was verified end to end in a real
Chromium session driving the running application — 32 workflow checks, listed
in §4.

---

## 1. Executive Summary

Phase A's finding was that the read surface is mature and the write surface is
roughly a third built: *"a user can look at almost everything and change almost
nothing."* Sprint 12A closes that gap as far as the existing domain allows, and
draws an explicit line where it does not.

**Both P1 blockers are closed and verified.** Sign out now ends the session
(cookie cleared, redirect honoured, protected routes bounce afterwards) and the
Organisation Profile loads populated, saves, and persists across reload.

**Sixteen write interactions are now wired** across Tasks, Deliverables, Files
and Meetings, every one of them onto an action the public gateway already
exposed. **Nine more were deliberately not built** because no domain action
exists for them — they are enumerated in §3 rather than shipped as controls
that cannot finish a job.

**Every dead control identified in Phase A is gone.** The header search box and
the notification bell — the two things a reviewer clicks first — both work. The
nine focusable "coming soon" nav items, the unnamed destructive
remove-member button, the no-op project-card menu, and an unnamed back button
found during verification are all fixed.

Two things are worth flagging to the architect beyond the sprint brief:

1. **P1-02 had a second cause nobody had seen.** The DemoStore field-name
   mismatch was real, but even after fixing it the form still could not save:
   `timezone: "UTC"` fails the organisation schema's IANA regex, and because
   the form renders no timezone input, the rejection had nowhere to display.
   The save failed **silently**. Both halves are fixed, and the form now
   surfaces any validation error on a field it does not render.

2. **The defect class behind P1-02 and P2-01 is now enforced, not just fixed.**
   `tests/unit/demo-store-schema-parity.test.ts` validates nine DemoStore
   collections against their Drizzle tables — no invented keys, no missing
   required columns, no out-of-enum values. It would have caught both defects,
   and it caught four more while being written (see §2.1).

**Quality gates:** lint 0 errors · typecheck 0 errors · **175/175 tests** (was
139) · build green, 36 routes.

**Enterprise readiness moves from 6.0 to 7.5 / 10** (§8). What still holds it
back is domain coverage, not defects.

---

## 2. Interaction Completion Report

### 2.1 Phase 1 — Critical product blockers

#### P1-01 · Sign out — **FIXED, verified**

`app-header.tsx` called `onSelect={() => signOut()}`. The returned promise was
discarded, so Next never applied the action's `Set-Cookie` or its `redirect()`
— zero network requests fired.

The menu item is now a submit button for a `<form action={signOut}>`. The form
is rendered **outside** the menu so it survives the menu unmounting on click,
and the flow works without JavaScript, which is what TD-14 prescribed.

> **TD-14 should be reclassified.** Phase A is right that "should become
> `<form action>` for no-JS resilience" understates it. This was a total
> functional failure *with* JavaScript enabled.

Verified: cookie cleared, redirect to `/login`, and `/dashboard` afterwards
bounces to `/login?next=%2Fdashboard`.

#### P1-02 · Organisation Profile — **FIXED, verified**

Three distinct causes, all closed:

| # | Cause | Fix |
|---|---|---|
| 1 | DemoStore row used `name` / `brandColors[]`; the form reads `organizationName` / `brandPrimaryColor` / `brandSecondaryColor` | Row made schema-parallel with `organizations` |
| 2 | **`timezone: "UTC"` failed the IANA regex `^[a-zA-Z_]+\/[a-zA-Z_]+$`, and the form renders no timezone input — so the save was rejected with nothing on screen to explain it** | Regex widened to accept single-segment zones; the form now renders a form-level alert for any error on a field it does not display |
| 3 | Emptying an optional colour submitted `""`, which fails hex validation and can never be cleared | `.or(z.literal(""))` on both hex fields (matching the existing `logoUrl`/`website`/`contactEmail` pattern) plus `normalizeOrganizationInput()`, which persists an emptied field as `NULL` in **both** the mock and real actions |

The form also now re-baselines itself and calls `router.refresh()` on success,
so the value on screen after a save is the persisted one.

#### DemoStore schema parity — **new, and the architect's recommendation**

Phase A §9 recommended "a test that validates every DemoStore collection
against its Zod/Drizzle schema… a far better investment than fixing them
individually." That test now exists and covers nine collections. Writing it
surfaced four further drifts beyond the two already known:

| Collection | Drift found | Consequence before the fix |
|---|---|---|
| `organizations` | `name`, `brandColors[]` | **P1-02** |
| `deliverables` | `status: "pending"` not in the enum; no `projectId`, `type`, `currentRevisionId`, `isLocked` | **P2-01** — the row was unreachable through every status filter; Type rendered blank; approve/share had no revision to act on |
| `tasks` | no `timelineId`, `phaseId`, `taskType`, `progress`, scheduling | Task detail showed "—" for Type and Progress; task creation was impossible (the hierarchy was incomplete) |
| `meetings` | no `meetingType`, `location`, `provider`, `endTime`, `description` | Location and Provider rendered "—" (Phase A recorded this as a gap) |
| `files` | `currentVersionId: null` | Share links were unreachable for every seeded file |
| `notifications` | `title`, `message`, `isRead` — none of which are columns | The notification read model could not be consumed at all |

`deliverableRevisions` and `fileVersions` were seeded (both collections were
empty), so approvals, revisions and share links have real rows to work with.
**No schema was changed** — the store was aligned to it.

### 2.2 Phase 2 — Tasks

| Interaction | Action consumed | Notes |
|---|---|---|
| Create task | `createTask` | New dialog; full hierarchy supplied by the page |
| Edit task | `updateTask` | Same form, edit mode, from the detail dialog |
| Change status (12 values) | `updateTask` | Detail dialog; whole `taskStatusEnum` |
| Board movement | `updateTask` | Per-card "Move to" menu across the five columns |
| Open a task from the list | — | List rows were previously unclickable |

Structural changes: task loading moved from `TaskList`/`TaskBoard` up into
`TaskDashboard`, so one `reload()` refreshes list, board and dialog together —
two independent fetches could not reflect a mutation made in the other view.
The duplicated `<h1>Tasks</h1>` is gone, and the subtitle now states the real
scope ("Wireframes milestone · Website Redesign") instead of claiming "across
all projects".

**Board movement is a menu, not drag-and-drop.** It is the same supported
domain call, it works from the keyboard and on touch, and it does not invent an
ordering concept the task table has no column for. Statuses outside the five
columns are counted and named beneath the board rather than silently hidden.

### 2.3 Phase 3 — Deliverables

All five write actions the gateway exposes are wired in the detail drawer:
`startReviewSession`, `approveRevision`, `requestRevision`, `generateShareLink`,
plus `createDeliverable` behind a "New Deliverable" dialog.

The status filter now offers all **12** schema statuses (Phase A: 8 of 12), and
the seeded `"pending"` row is reachable again.

**One constraint is surfaced rather than hidden.** `approveRevision` requires a
`sessionId`, and the read layer has no "list review sessions for a deliverable"
query. Approve is therefore enabled only for a session started in the same
drawer; otherwise the drawer says *"Approval requires a review session. Start
one to enable Approve."* rather than failing on submit.

### 2.4 Phase 4 — Files

`createFolder`, `initializeFileUpload` → `finalizeFileUpload`, and
`generateShareLink` are wired into the folder browser and the preview drawer.
The flat Files list gained per-project "Browse & upload" links, because the only
previous route into the folder browser was a file's "View in folder" — which an
organisation with no files could never take.

**Upload is honest about TD-02.** The file record, its version, and a real
browser-computed SHA-256 are all created; the binary is not transferred,
because `initializeFileUpload` returns a mock storage URL. The dialog says so.
Inline preview and download remain absent for the same reason, and the drawer
states it instead of offering a control that cannot work.

### 2.5 Phase 5 — Meetings

`createMeeting` is wired behind a "New Meeting" dialog with the full
`createMeetingSchema` field set. The drawer gained the join link.

Nothing else was built here, and the drawer now says why in plain language.
See §3 — this is the module where the domain, not the UI, is the limit.

### 2.6 Phase 6 — Interaction consistency

Every mutation in the product now follows one shape: confirm where the action
is destructive or state-advancing, disable-and-relabel while pending, a sonner
toast on success, an inline message on failure, and a refresh of the affected
list.

- `components/shared/confirm-dialog.tsx` is the single confirmation pattern. It
  owns the dialog lifecycle (stays open while in flight, closes on success,
  keeps itself open with the error shown on failure) while the caller owns the
  mutation.
- **The one native `window.confirm()` in the product is gone** — removing a
  project member used it, and never refreshed the table afterwards, so the
  removed row stayed on screen.
- Forms follow the existing `ProjectForm` idiom (react-hook-form + zodResolver +
  sonner). No second mutation idiom was introduced.
- A failed task load now renders an inline `role="alert"` instead of a
  `console.error`, which also removed the only console noise a hard navigation
  could produce.

### 2.7 Phase 7 — Header review

| Control | Before | After |
|---|---|---|
| Global search (P2-04) | Decorative — typing and Enter did nothing | Real results panel over `globalSearch()`, which fans out across the five search-capable public reads (projects, clients, people, deliverables, files). Enter jumps to the first hit. The placeholder no longer promises "tasks", which are not searchable. |
| Notification bell (P2-05) | `aria-label` and nothing else | Popover over `getNotificationsAction` with an unread count in the accessible name and per-row `markNotificationReadAction`. |

`globalSearch` composes existing public actions only; it does not touch the
dispatcher. Each source is permission-gated by its own action, and a read the
user cannot perform contributes nothing rather than erroring.

**The notification panel is deliberately plain.** The notifications read model
is event-derived (`eventId` + `priority` + `status` + `readAt`) and
`getNotificationsQuery` performs no join to `notification_templates`, so there
is no headline or body to render. Producing one means changing the read layer,
which this sprint must not do. The panel shows what the model carries and says
why in a footnote.

The unused `NotificationCenter` / `NotificationBadge` components were deleted:
they were dead code styled with raw `gray-*` utilities rather than design
tokens, and the bell supersedes them.

### 2.8 Accessibility defects closed

| ID | Defect | Fix |
|---|---|---|
| P2-02 | Nine "coming soon" nav items at `tabIndex 0` with no `disabled`/`aria-disabled` — `disabled` never reached the DOM through the Base UI `useRender`/`mergeProps` path | `aria-disabled` + `tabIndex={-1}` + `pointer-events-none` + a "— coming soon" accessible name. Verified: 9 items, all `tabindex="-1"`. |
| P2-03 | Icon-only **destructive** remove-member button with no accessible name | `aria-label="Remove {name} from this project"` |
| *(new)* | Icon-only back button on project detail with no accessible name — found by the Phase 8 sweep, not by Phase A | `aria-label="Back to all projects"` |

Verified across the shell: **0** dimmed-but-focusable controls and **0**
unnamed interactive controls.

---

## 3. Unsupported Interactions (deliberately not built)

Each of these was considered and rejected because building it would mean either
inventing a domain action or shipping a control that cannot complete a task.

| Module | Interaction | Why not |
|---|---|---|
| Tasks | Delete | No delete action exists. `status: "cancelled"` / `"archived"` are offered instead, which is what the domain supports. |
| Tasks | Assignment | `taskAssignees` exists as a table; no assign/unassign action does. |
| Tasks | Comments, checklists | Insert schemas exist; no actions do. |
| Tasks | Timer | `startTaskTimer` exists, but `stopTaskTimer` needs a `timeEntryId` that no public read returns — and `startTaskTimer` returns `void` in the real adapter. A Start control would strand the user in a timer they cannot stop. The disabled button Phase A flagged (P4) was removed rather than wired. |
| Deliverables | Reject, publish, archive, delete | No such actions. Rejection is expressible only as `requestRevision`. |
| Deliverables | Download | TD-02 — storage returns mock signed URLs. |
| Deliverables | Approve without first starting a session | `approveRevision` needs a `sessionId`; no read lists sessions for a deliverable. |
| Files | Rename, move, delete | No such actions in the files domain. |
| Files | Inline preview, download | TD-02. |
| Files | Actual binary upload | TD-02 — metadata, version and checksum are created for real; the bytes are not transferred. |
| Meetings | Edit, cancel, complete | `updateMeetingSchema` exists; **`updateMeeting` does not.** A status control would be a fake write path. |
| Meetings | Decisions, action items, promote-to-task | The mirror case: the write actions exist, but `getMeetingDecisions` / `getMeetingActionItems` in `mock-queries.ts` are stubs returning `[]`, so anything added would be invisible to the user who added it. |
| Global search | Tasks, meetings, timelines | No search-capable read exists for any of the three. The empty state says so. |
| Notifications | Human-readable headlines | Requires a template join the read layer does not perform. |

---

## 4. Workflow Verification Report

Playwright, real Chromium, real demo session, against the running application.
Harness: `scratch/sprint12a/verify.mjs` (gitignored — it is not application
code).

| # | Workflow | Result |
|---|---|---|
| W1.1 | Demo login → authenticated `/dashboard`, cookie set | PASS |
| W1.2 | **Sign out → cookie cleared, redirect to `/login`** | PASS |
| W1.3 | Protected route bounces after sign out | PASS |
| W2.1 | **Organisation form loads populated** (name + valid hex) | PASS |
| W2.2 | **Organisation name saves and persists across reload** | PASS |
| W2.3 | No validation errors raised on untouched fields | PASS |
| W3.1 | Tasks workspace: one heading, New Task control present | PASS |
| W3.2 | Create task → appears in the list | PASS |
| W3.3 | Edit task → rename persists | PASS |
| W3.4 | Status change in the dialog → survives reload | PASS |
| W3.5 | Board "Move to" → task changes column | PASS |
| W4.1 | Status filter offers all 12 schema statuses | PASS |
| W4.2 | Seeded deliverable reachable through a status filter (P2-01) | PASS |
| W4.3 | Create deliverable → appears in the list | PASS |
| W4.4 | Start review → approve → deliverable locked | PASS |
| W4.5 | Request revision → reopens, v2 created | PASS |
| W4.6 | Share link generated with a real token | PASS |
| W5.1 | Folder browser reachable from the flat file list | PASS |
| W5.2 | Create folder → appears in the browser | PASS |
| W5.3 | Upload → file registered in the current folder | PASS |
| W5.4 | File share link generated | PASS |
| W6.1 | Schedule a meeting → appears in the list | PASS |
| W6.2 | New meeting reachable via the Upcoming filter | PASS |
| W6.3 | Drawer states the unsupported actions plainly | PASS |
| W7.1 | Global search returns grouped results | PASS |
| W7.2 | Selecting a result navigates to the record | PASS |
| W7.3 | Notification bell opens a panel of real notifications | PASS |
| W7.4 | Mark-as-read clears the unread badge | PASS |
| W8.1 | Nine "Soon" nav items: `aria-disabled`, `tabindex="-1"` | PASS |
| W8.2 | Zero dimmed-but-focusable controls in the shell | PASS |
| W8.3 | Every interactive control has an accessible name | PASS |
| W9.1 | 13 modules × 4 viewports = 52 loads, no overflow, no ≥400 | PASS |

**Runtime during the sweep:** 0 console errors · 0 page errors · 0 uncaught
exceptions.

**End-to-end chain exercised:** login → create task → edit → status change →
board move → create deliverable → review session → approve → request revision →
share → create folder → upload → share file → schedule meeting → search →
notifications → sign out.

**Self-corrections made during verification**, recorded rather than dropped:

- An initial sweep reported six modules overflowing at mobile width. That was a
  measurement artifact — the check ran before the route settled and measured the
  `loading.tsx` skeleton, not the page. Re-measured after settling: 52/52 clean.
  It did surface a genuine (minor) issue, now fixed: five loading skeletons used
  a fixed `w-96`, which does overflow a 390 px viewport during load.
- An initial sweep reported one dimmed-focusable control and a search failure.
  Both were the same settling artifact; on re-measure, zero and pass.

---

## 5. Files Created

| File | Purpose |
|---|---|
| `src/components/shared/confirm-dialog.tsx` | The single confirmation pattern (Phase 6) |
| `src/components/ui/popover.tsx` | Popover primitive over Base UI — a menu cannot hold the per-row "mark as read" control |
| `src/features/tasks/constants.ts` | Task status/priority/type vocabularies + board columns |
| `src/features/tasks/components/task-form.tsx` | Create / edit task |
| `src/features/deliverables/constants.ts` | Deliverable status (all 12) / type / review type / access level |
| `src/features/deliverables/components/create-deliverable-dialog.tsx` | Create deliverable |
| `src/features/deliverables/components/deliverable-actions.tsx` | Review, approve, request revision, share |
| `src/features/files/components/file-write-actions.tsx` | New folder, upload |
| `src/features/meetings/constants.ts` | Meeting type / status / provider vocabularies |
| `src/features/meetings/components/create-meeting-dialog.tsx` | Schedule meeting |
| `src/features/search/actions.ts` | `globalSearch()` — fan-out over five existing public reads |
| `src/features/search/components/global-search.tsx` | Header search panel |
| `src/features/notifications/components/notification-bell.tsx` | Header notification popover |
| `tests/unit/demo-store-schema-parity.test.ts` | DemoStore ⇄ Drizzle parity (36 assertions) |
| `docs/SPRINT-12A.md` | This document |

## 6. Files Modified

| File | Change |
|---|---|
| `src/lib/demo/store.ts` | Schema parity for organizations, tasks, deliverables, meetings, files, notifications; seeded `deliverableRevisions` and `fileVersions` |
| `src/components/layout/app-header.tsx` | P1-01 sign-out form; global search; notification bell |
| `src/components/layout/app-shell.tsx` | Pass `userId` / `organizationId` to the header |
| `src/components/layout/app-sidebar.tsx` | P2-02 — "coming soon" items genuinely disabled |
| `src/features/organizations/schemas.ts` | Timezone regex; hex empty-string tolerance; `normalizeOrganizationInput()` |
| `src/features/organizations/{mock,real}-actions.ts` | Apply the normalizer |
| `src/app/(dashboard)/settings/organization/_components/organization-form.tsx` | Unrendered-field error summary; reset + refresh on save |
| `src/features/tasks/components/task-dashboard.tsx` | Owns loading/refresh; New Task; create dialog; inline load error |
| `src/features/tasks/components/task-list.tsx` | Controlled; rows open the detail dialog |
| `src/features/tasks/components/task-board.tsx` | Controlled; per-card "Move to"; off-board status count |
| `src/features/tasks/components/task-detail-modal.tsx` | Status control, edit mode; removed the dead timer button |
| `src/app/(dashboard)/tasks/page.tsx` | Full task scope; single heading; truthful subtitle |
| `src/features/deliverables/components/deliverables-directory.tsx` | 12 statuses; New Deliverable; refresh on write |
| `src/features/deliverables/components/deliverable-detail-sheet.tsx` | Hosts the action bar; re-reads after a write |
| `src/app/(dashboard)/deliverables/page.tsx` | Supplies project options |
| `src/features/files/components/{files-directory,folder-browser,file-preview-sheet}.tsx` | Browse links; upload/new-folder; share |
| `src/app/(dashboard)/files/page.tsx` | Supplies `organizationId` and project options |
| `src/features/meetings/components/{meetings-directory,meeting-detail-sheet}.tsx` | New Meeting; join link; honest unsupported-action notice |
| `src/app/(dashboard)/meetings/page.tsx` | Supplies project options |
| `src/features/projects/components/project-members-table.tsx` | P2-03 accessible name; ConfirmDialog replaces `window.confirm()`; refresh |
| `src/features/projects/components/project-card.tsx` | No-op "more" button → real menu (open / archive) |
| `src/app/(dashboard)/projects/[projectId]/page.tsx` | Accessible name on the back button |
| `src/app/**/loading.tsx` (5 files) | `w-96` → `w-full max-w-96` (mobile overflow during load) |

## 7. Files Deleted

| File | Reason |
|---|---|
| `src/features/notifications/components/NotificationCenter.tsx` | Dead code, off-design-system styling; superseded by `notification-bell.tsx` |
| `src/features/notifications/components/NotificationBadge.tsx` | Same |

---

## 8. Quality Gate Results

| Gate | Result | Baseline |
|---|---|---|
| `npm run lint` | **0 errors**, 113 warnings | 0 errors, 117 warnings — 4 fewer (deleted dead components). No new warning in any file this sprint touched; the two in `task-list`/`task-board` are the pre-existing `useVirtualizer` React-Compiler notices. |
| `npm run typecheck` | **0 errors** | 0 errors |
| `npm test` | **175 / 175 passing**, 20 files | 139 / 139, 19 files (+36 parity assertions) |
| `npm run build` | **Green** — 2.8 s compile, TypeScript 5.7 s, 31 static pages in 155 ms, **36 routes** | Green, 36 routes — no route regressions |

---

## 9. Remaining Technical Debt

Newly recorded (see `docs/TECHNICAL-DEBT-NOTES.md` items 9–13):

1. **No `updateMeeting` action** — blocks edit/cancel/complete in the UI.
2. **Meeting-scoped reads are stubs** — blocks decisions/action items
   (pre-existing item 5, now blocking a second surface).
3. **No review-session read for deliverables** — Approve is reachable only in
   the drawer session that started the review.
4. **No notification template join** — the bell cannot render headlines.
5. **`getMeetings()` sorts on `startTime` with no null guard** — a meeting saved
   without a start time would break the list. The create dialog requires one as
   a guard; the read should be fixed.
6. **No task search / delete / assignment / comments / timer-stop** — keeps
   `/tasks` a milestone-scoped tool and `/tasks` out of global search.

Carried forward unchanged: TD-02 (mock storage signed URLs — still the single
biggest blocker to a credible DAM), total-count queries, server-side filters for
`getMeetings`/`getTimelines`, files breadcrumb deep-link ancestors.

---

## 10. Enterprise Readiness Assessment

| Dimension | Phase A | Now | Basis |
|---|---|---|---|
| Production Readiness | 5 | **7** | Both P1 blockers closed and verified; the primary write paths complete end to end |
| UI | 8 | **8** | Unchanged — new surfaces use the existing design system throughout |
| UX | 5 | **7** | Journeys complete instead of dead-ending; no decorative controls; unsupported actions are stated, not hidden. Still no breadcrumbs, still no dashboard drill-through. |
| Performance | 8 | **8** | Unchanged; no new blocking work on any route |
| Accessibility | 7 (FAIL) | **9 (PASS)** | P2-02 and P2-03 closed plus one further unnamed control; verified 0 dimmed-focusable, 0 unnamed |
| Runtime Stability | 10 | **10** | 0 console errors, 0 page errors across the full interaction sweep |
| Responsive | 9 | **9** | 52/52 clean; loading-state overflow fixed |
| **FINAL** | **6.0** | **7.5 / 10** | |

**Where this platform now stands.** The two defects that would have stopped a
pilot on day one are closed and provably so. A user can sign out, configure
their organisation, create and move and complete a task, take a deliverable
through review → approval → revision → share, create folders and register
files, schedule meetings, search across five entity types, and act on
notifications. The interaction layer is no longer the constraint.

**What still holds it back is domain coverage, not defects.** Meetings cannot be
edited because no action exists. Files cannot be renamed, moved, or downloaded —
the last of those because storage is still mocked (TD-02). Tasks cannot be
assigned or discussed. None of these are UI gaps; each needs a domain action or
a read-layer query, which is a Sprint 12B scope question for the architect, not
a defect list.

**Classification: strong design-partner demo, approaching pilot-ready.** The
remaining distance to customer-production is TD-02 and the six domain gaps in
§9 — not stability, not accessibility, and no longer the write surface.

---

**Sprint 12A is complete. Awaiting architecture review. Sprint 12B, the**
**Supabase migration, and production infrastructure have not been started.**
