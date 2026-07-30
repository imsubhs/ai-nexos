# AI NEX OS — Sprint 12B: Enterprise Domain Completion

**Sprint type:** Domain completion (no new bounded contexts, no redesigned workflows)
**Branch:** `phase-03-core-product` · `DEMO_MODE=true` · Next.js 16.2.10 · Node 24.15.0
**Date:** 2026-07-27
**Input:** `docs/SPRINT-12A.md` §3 (unsupported interactions) and §9 / `docs/TECHNICAL-DEBT-NOTES.md` items 5, 9–14
**Method:** every capability listed here was driven end to end in a real Chromium
session against the running application — 39 workflow checks, all passing (§3).

---

## 1. Executive Summary

Sprint 12A's closing sentence was that the constraint had moved: _"what still
holds it back is domain coverage, not defects… none of these are UI gaps; each
needs a domain action or a read-layer query."_ Sprint 12B built exactly those,
and nothing else.

**Nineteen domain actions and sixteen reads now exist that did not.** Every one
of them sits on a table the schema already had and a capability the aggregate
already implied. No table was added, no column was added, no migration was
written, and the Repository/Dispatcher/DemoStore/state-machine architecture is
untouched — new actions follow the existing three-file pattern
(`real-actions` / `mock-actions` / dispatcher) exactly.

**Six of the eight recorded technical-debt items are closed:**

| Item | Was                                                                              | Now                                                                                  |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 5    | Four meeting mock-queries were hardcoded stubs returning `[]`                    | All four read the DemoStore                                                          |
| 9    | No `updateMeeting` action → meetings could not be edited, cancelled or completed | `updateMeeting` / `cancelMeeting` / `completeMeeting`, guarded by a transition table |
| 10   | No review-session read → Approve died on reload                                  | `getReviewSessions(deliverableId)`; verified across a reload (W3.3)                  |
| 11   | No template join → the bell could not say what happened                          | `getNotificationFeedAction` composes notification → event → in-app template          |
| 12   | `getMeetings()` sorted on a nullable `startTime` with no guard                   | `DESC NULLS LAST` in SQL, matched in the mock                                        |
| 14   | No task search → `/tasks` was invisible to header search                         | `searchTasks`, wired into `globalSearch`                                             |

Item 13 (task delete / assignment / comments / stoppable timer) is closed
**except for checklists**, which are recorded as still unsupported in §4. TD-02
(mock object storage) and items 6, 7 and 8 are carried forward unchanged — none
of them is a domain gap, and TD-02 remains the single largest blocker to a
credible DAM.

**Two things are worth flagging to the architect beyond the sprint brief:**

1. **The mock and real adapters had silently diverged on task time-tracking.**
   `real.startTaskTimer` / `stopTaskTimer` log a `time_logged` activity event;
   the mock logged neither. Nothing had ever read task activity, so the
   divergence was invisible — the moment `getTaskActivity` existed, the demo
   history was two events short of production's. Found by workflow check W2.7,
   fixed, and the class of defect is now partly covered by the parity test
   (§2.7). _A parity test for **behaviour**, not just row shape, is worth
   considering: schema parity would not have caught this._

2. **`startTaskTimer` returning `void` was the actual reason Sprint 12A removed
   the timer**, not a missing action. It now returns its entry, and
   `getActiveTaskTimer` finds a timer that outlived the page it was started on —
   which is what makes Start/Stop a closed loop rather than a one-way door.

**Quality gates:** lint **0 errors** (109 warnings, four fewer than baseline) ·
typecheck **0 errors** · **240 / 240 tests** (was 175) · build green, **36
routes** — no route regressions.

**Enterprise readiness moves from 7.5 to 8.5 / 10** (§8). What holds it back now
is infrastructure — object storage, real auth, real persistence — not domain
coverage and not defects.

---

## 2. Domain Completion Report

### 2.1 Phase 1 — Meetings

This was the module where, in Sprint 12A's words, _"the domain, not the UI, is
the limit."_ It is now the most complete module in the product.

**Actions added** (`src/features/meetings/{real,mock}-actions.ts` + dispatcher):

| Action                                                                   | Consumes                                                               | Notes                                                                                                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `updateMeeting(meetingId, input)`                                        | `updateMeetingSchema` (existed since Sprint 11 with nothing behind it) | `projectId` is omitted from the schema — a meeting's outcomes, attendees and activity all carry the project, so moving the parent would orphan them |
| `cancelMeeting(meetingId, reason?)`                                      | `updateMeeting` + an activity entry                                    | The reason is written to the activity trail, not to a new column                                                                                    |
| `completeMeeting(meetingId)`                                             | `updateMeeting`                                                        | —                                                                                                                                                   |
| `addMeetingAttendee` / `updateMeetingAttendee` / `removeMeetingAttendee` | `meeting_attendees`                                                    | Either an internal `userId` **or** an `externalEmail`; the schema refines that at least one is present                                              |
| `addAgendaItem` / `updateAgendaItem` / `removeAgendaItem`                | `meeting_agenda`                                                       | New items append to the end (`max(orderIndex) + 1`) rather than all landing at 0                                                                    |

**Reads added** (`real-queries.ts` / `mock-queries.ts` + dispatcher):
`getMeetingAttendees`, `getMeetingAgenda`, `getMeetingOutcomes(meetingId)`,
`getMeetingActivity`.

`getMeetingOutcomes` is the one that mattered most. `createDecision`,
`createActionItem` and `promoteActionItemToTask` had existed since Sprint 11, but
the only outcome reads were **project**-scoped, so a decision recorded in the
drawer was invisible to the person who recorded it. Sprint 12A correctly refused
to ship that. The meeting-scoped read closes the loop, and verification W1.6
asserts precisely it: record a decision, see it appear.

**A transition guard, not a new state machine.** `meetingStatusEnum` already
declared the lifecycle; nothing enforced it, so `updateMeeting` would happily
move a cancelled meeting back to `in_progress`.
`MEETING_STATUS_TRANSITIONS` in `constants.ts` is the table both adapters check,
covered by 8 unit tests and asserted in the UI (W1.9/W1.10 read the actual
`<option>` set: from `scheduled` the drawer offers in-progress / completed /
cancelled / postponed and **not** archived; from `completed`, archived only).

**Meeting notes** persist into the existing `notes` jsonb column as `{ text }`,
the same envelope tasks use for `description`.

**Technical-debt item 5 is closed.** `getMeetingsForProject`, `getMeetingById`,
`getMeetingDecisions` and `getMeetingActionItems` were hardcoded stubs — one of
them returned a literal `{ id: "mock-id", status: "active" }`. All four now read
the DemoStore.

### 2.2 Phase 2 — Files

| Capability                        | Action                                                    | Notes                                                                                                                                                                                                     |
| --------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rename, move, edit description    | `updateFile`                                              | A file may only move between folders in its own project — folders are project-scoped, and the action checks it                                                                                            |
| Delete                            | `deleteFile`                                              | Soft: `deletedAt` plus the terminal `deleted` lifecycle status, which every read already filtered on. Versions are retained, so a restore path remains                                                    |
| Rename / move / recolour a folder | `updateFolder`                                            | Re-runs the same 10-level depth check `createFolder` uses, and refuses to move a folder into its own descendant — the recursive depth query would not terminate on the resulting cycle                    |
| Delete a folder                   | `deleteFolder`                                            | **Refused while non-empty.** `files.folderId` is `ON DELETE SET NULL`, so a cascade would silently scatter live assets into the project root. Verified: W4.6 asserts the refusal message reaches the user |
| Version history + restore         | `getFileVersions` + the pre-existing `promoteFileVersion` | `promoteFileVersion` shipped in Sprint 11 fully implemented and unreachable, because no read listed versions                                                                                              |
| Share-link list                   | `getFileShares`                                           | Links issued against any version of the file                                                                                                                                                              |
| Activity                          | `getFileActivity`                                         | The trail every write above already appended to                                                                                                                                                           |
| Move destinations                 | `getProjectFolders`                                       | `getFolder` returns one level by design; move needs a flat list                                                                                                                                           |

**One real defect was found during verification and fixed.** After a rename or a
move, the drawer went on showing the pre-write title and folder — the row came
from a list the parent owned, and only the table behind refreshed. The drawer now
holds the row `updateFile` returns, keyed by file id so it can never show one
file's write under another. W4.2 asserts the drawer, not just the list.

**Inline preview and download are still absent, and still for TD-02 only.**
Storage returns mock signed URLs; there is no byte stream to render or serve. The
drawer says so.

### 2.3 Phase 3 — Deliverables

Four reads, all over tables the write side had been filling since Sprint 11 with
nothing reading them back: `getReviewSessions`, `getDeliverableApprovals`,
`getDeliverableShareLinks`, `getDeliverableActivity`.

**Technical-debt item 10 is closed, and it was the sprint's cleanest win.**
`approveRevision(deliverableId, sessionId, notes)` always needed a session id and
no read returned one, so Approve worked _only_ inside the drawer session that
started the review — reload, and the deliverable could be reviewed again but never
approved. W3.3 is written to catch exactly the old failure: start a session,
**close the drawer, reload the page**, reopen, and approve. It passes.

The drawer now shows revision history (with the current revision badged), review
sessions, approval history with notes, share links, and the activity trail. When
more than one session exists, Approve asks which one.

### 2.4 Phase 4 — Notifications

**Technical-debt item 11 is closed.** The notifications read model is
event-derived by design — `eventId`, `priority`, `status`, `readAt`, and no
subject. The headline lives in `notification_templates` (keyed by event type and
channel) and the values live in the event payload; no read performed that join,
so Sprint 12A's bell could only say _"normal priority · delivered"_.

- `src/features/notifications/templates.ts` — the substitution layer, shared by
  both adapters so demo and production cannot render different copy.
  `{{path.to.value}}` against the payload; a missing key renders an em dash
  rather than `undefined`; a payload value is never re-scanned as a template
  itself. **21 unit tests.**
- `getNotificationFeedAction` — composes notification → event → in-app template
  and sorts newest-first in the read, so both adapters agree on order.
- A notification with no matching template degrades to
  `"Deliverable · Deliverable"` (aggregate · event type) and the panel footnotes
  why, rather than rendering a blank row.
- `markNotificationUnreadAction` — the inverse the domain always supported:
  `readAt` is nullable and `delivered` is the pre-read status. `queued` would
  have been a lie; it has already been delivered.
- `markAllNotificationsReadAction` — bulk clear.
- The panel groups by Today / Yesterday / Earlier, filters to unread, and each
  row carries a rendered title, body, priority badge, timestamp and an Open link
  from `actionUrlTemplate`.

The DemoStore now seeds three events and three in-app templates, so the feed has
real material rather than a single unrenderable row.

### 2.5 Phase 5 — Tasks

| Capability | Action / read                                                   | Notes                                                                                                                                    |
| ---------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Assignment | `assignTask`, `unassignTask`, `getTaskAssignees`                | `task_assignees` has a unique `(taskId, userId)`; the insert is `onConflictDoNothing` and reports `alreadyAssigned` rather than throwing |
| Comments   | `addTaskComment`, `getTaskComments`                             | Content stored as `{ text }` in the existing jsonb column, so a rich-text editor can extend it without a migration                       |
| Delete     | `deleteTask`                                                    | Soft. `deletedAt` and the `"deleted"` activity event were both already in the schema and every read already filtered on it               |
| Timer      | `startTaskTimer` (now returns its entry) + `getActiveTaskTimer` | See §1 note 2                                                                                                                            |
| History    | `getTaskActivity`                                               | The table every task write has fed since Sprint 11                                                                                       |
| Search     | `searchTasks`                                                   | Org-wide title read; `getTasks` is milestone-scoped, which is why tasks were absent from header search                                   |

`globalSearch` gained a sixth source and the header placeholder can promise
tasks again. It still omits meetings and timelines, which have no search-capable
read — naming something the search cannot find is the same defect in smaller
print.

### 2.6 Phase 6 — Cross-module verification

Every capability above writes through the public gateway, so the audit and
activity trails come for free — but "for free" is worth checking, and two checks
exist for it:

- **W1.11 / W2.7** assert the trails actually grew by the sweep's writes (7
  meeting activity entries, 7 task history entries), not merely that a panel
  rendered.
- **W6.2** asserts a single status change produces **exactly one** activity
  entry, not two — the duplicate-event failure mode the brief calls out.

The notification feed reads the same `events` store the rest of the platform
publishes to, so no second event path was introduced.

### 2.7 DemoStore parity

Eleven collections were added and seeded: `meetingAttendees`, `meetingAgenda`,
`meetingOutcomes`, `meetingDecisions`, `meetingActionItems`, `meetingActivity`,
`taskAssignees`, `taskComments`, `taskActivity`, `notificationTemplates`, and
`domainEvents` (previously declared and left empty).

Sprint 12A's `demo-store-schema-parity.test.ts` was extended to cover all of
them plus `events`. It now validates **20 collections** against their Drizzle
tables — **80 assertions**, up from 36. Several of the new collections were
previously created lazily by mock-actions on first write, which is precisely how
the drift behind P1-02 started.

---

## 3. Workflow Verification Report

Playwright, real Chromium, real demo session, against the running application.
Harness: `scratch/sprint12b/verify.mjs` (gitignored — not application code).
Screenshots: `docs/sprint-12b-screenshots/`.

| #     | Workflow                                                                     | Result |
| ----- | ---------------------------------------------------------------------------- | ------ |
| W0    | Demo login → authenticated `/dashboard`                                      | PASS   |
| W1.1  | Meetings list renders the seeded meeting                                     | PASS   |
| W1.2  | Drawer opens with attendees (3), agenda (3), decisions (1), action items (1) | PASS   |
| W1.3  | Add an attendee → 4                                                          | PASS   |
| W1.4  | Change an attendee RSVP                                                      | PASS   |
| W1.5  | Add an agenda item → 4, then tick it off                                     | PASS   |
| W1.6  | **Record a decision and see it** (the Sprint 12A blocker)                    | PASS   |
| W1.7  | Add an action item → **promote it to a real task**                           | PASS   |
| W1.8  | Edit the meeting, save notes, notes render                                   | PASS   |
| W1.9  | Transition guard: `archived` **not** offered from `scheduled`                | PASS   |
| W1.10 | Complete the meeting → only `archived` remains                               | PASS   |
| W1.11 | Activity trail carries every write (7 entries)                               | PASS   |
| W2.1  | The promoted action item appears as a task                                   | PASS   |
| W2.2  | Task detail shows assignees, comments and history                            | PASS   |
| W2.3  | Assign a second person → 2                                                   | PASS   |
| W2.4  | Unassign → 1                                                                 | PASS   |
| W2.5  | Add a comment                                                                | PASS   |
| W2.6  | **Timer start → stop → start available** (closed loop)                       | PASS   |
| W2.7  | Task history grew with the sweep's writes (7 entries)                        | PASS   |
| W2.8  | Delete a task → gone from the list                                           | PASS   |
| W3.1  | Deliverable drawer shows sessions, approvals, shares, activity               | PASS   |
| W3.2  | Start a review session → listed                                              | PASS   |
| W3.3  | **Approve survives a full page reload** (TD-10)                              | PASS   |
| W3.4  | Request revision → reopens, v2 created                                       | PASS   |
| W3.5  | Share link generated and listed                                              | PASS   |
| W4.1  | File drawer shows versions, shares, activity                                 | PASS   |
| W4.2  | Rename → reflected in **the drawer and** the list                            | PASS   |
| W4.3  | Move to another folder                                                       | PASS   |
| W4.4  | Restore is offered only when a second version exists                         | PASS   |
| W4.5  | Folder create → rename → delete                                              | PASS   |
| W4.6  | Deleting a non-empty folder is refused, with the reason on screen            | PASS   |
| W5.1  | Bell renders template-rendered titles and bodies (TD-11)                     | PASS   |
| W5.2  | Date grouping present                                                        | PASS   |
| W5.3  | Mark read → mark unread on the same notification round-trips the badge       | PASS   |
| W5.4  | Mark all read clears the badge                                               | PASS   |
| W6.1  | Global search finds **tasks** (TD-14)                                        | PASS   |
| W6.2  | One activity entry per write — no duplicates                                 | PASS   |
| W7.1  | No unexpected console errors                                                 | PASS   |
| W7.2  | No uncaught page errors                                                      | PASS   |

**39 / 39 passing.** 0 page errors. One console error, expected and accounted
for: W4.6 deliberately triggers a refused domain action, a server action that
throws answers HTTP 500, and the browser logs the failed fetch. That is the
error path working — `ConfirmDialog` catches it and shows the message inline.

**End-to-end chain exercised:** login → meeting attendees → agenda → decision →
action item → promote to task → assign → comment → timer → task history → task
delete → deliverable review session → reload → approve → request revision →
share → file rename → move → folder create/rename/delete → notification feed →
mark read/unread → global search → activity trails.

**Self-corrections made during verification**, recorded rather than dropped:

- The first sweep reported 15 failures. Two were real (the stale file drawer in
  §2.2, the mock timer-activity divergence in §1); the rest were harness faults
  of one kind: **role-based selectors ignore the page behind an open
  sheet**, because Base UI marks it `aria-hidden`. Assertions about a list have
  to wait for the drawer to close. Worth knowing for future harnesses.
- W2.1 initially failed for a reason that is not a defect: a promoted task lands
  under the milestone chosen in the promote dialog, and `/tasks` is pinned to the
  Wireframes milestone (a demo-scope limitation recorded since Sprint 12A). The
  check now promotes into that milestone explicitly.

---

## 4. Unsupported Capabilities (deliberately not built)

Each was considered and rejected because building it would mean inventing a
domain concept, adding a table, or shipping a control that cannot finish a job.

| Module              | Capability                         | Why not                                                                                                                                                                                                                                                                           |
| ------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meetings            | Recordings, transcripts            | `meeting_recordings` / `meeting_transcripts` exist, but there is no ingestion path and no media storage (TD-02). The drawer says so.                                                                                                                                              |
| Meetings            | Templates (`meeting_templates`)    | Reserved in the schema; no action, and a template picker implies an authoring surface this sprint has no read layer for.                                                                                                                                                          |
| Meetings            | Follow-ups (`meeting_followups`)   | Table exists; escalation levels imply a scheduler that does not exist.                                                                                                                                                                                                            |
| Meetings            | Agenda drag-and-drop               | Offered as move-up / move-down over the existing `orderIndex`. Drag ordering needs fractional ranks the column cannot hold.                                                                                                                                                       |
| Tasks               | Checklists                         | `insertTaskChecklistSchema` and both tables exist; the nested checklist → item structure needs two write paths and two reads, which is a work package, not a completion. Item 13 stays partly open for this.                                                                      |
| Tasks               | Dependencies from the UI           | `addTaskDependency` exists with real DAG cycle detection, but no read lists a task's dependencies, and a picker over every task in the org is a design question.                                                                                                                  |
| Deliverables        | Publish, reject, archive, delete   | No such actions. Rejection remains expressible only as `requestRevision`; `delivered` is in the status enum with no writer. **"Publish history" as the brief lists it does not exist as a concept** — what exists is share-link issuance and the status trail, both now surfaced. |
| Deliverables        | Review threads and comments        | `deliverableReviewThreads` / `deliverableReviewComments` exist with coordinate and timecode columns — an annotation surface, not a completion.                                                                                                                                    |
| Deliverables, Files | Download, inline preview           | TD-02.                                                                                                                                                                                                                                                                            |
| Files               | Hard delete, restore-from-deleted  | The soft delete is reversible at the data layer; no action exposes it, and a trash surface is a new capability.                                                                                                                                                                   |
| Files               | Real binary transfer               | TD-02 — metadata, version and a real browser-computed SHA-256 are created; the bytes are not moved.                                                                                                                                                                               |
| Notifications       | Real push / email delivery         | Channels, queue, digest and dead-letter tables exist and are out of scope by the brief.                                                                                                                                                                                           |
| Notifications       | Preference editing from the header | `updateNotificationPreferencesAction` exists and `PreferencesForm` is unrouted; wiring it is a settings-page work package.                                                                                                                                                        |
| Global search       | Meetings, timelines                | Neither has a search-capable read. The empty state says so.                                                                                                                                                                                                                       |
| All                 | Cross-source search ranking        | Relevance is per source; each read brings its own ordering.                                                                                                                                                                                                                       |

---

## 5. Files Created

| File                                                           | Purpose                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/features/meetings/components/meeting-form.tsx`            | Create / edit a meeting — one form, shared by the create dialog and the drawer |
| `src/features/meetings/components/meeting-attendees-panel.tsx` | Add / RSVP / remove attendees                                                  |
| `src/features/meetings/components/meeting-agenda-panel.tsx`    | Add / complete / reorder / remove agenda items                                 |
| `src/features/meetings/components/meeting-outcomes-panel.tsx`  | Decisions, action items, promote-to-task                                       |
| `src/features/notifications/templates.ts`                      | Template substitution + feed composition, shared by both adapters              |
| `tests/unit/meeting-transitions.test.ts`                       | The transition guard (8 tests)                                                 |
| `tests/unit/notification-templates.test.ts`                    | Rendering and composition (21 tests)                                           |
| `docs/SPRINT-12B.md`                                           | This document                                                                  |
| `docs/sprint-12b-screenshots/*.png`                            | 8 workflow screenshots                                                         |

## 6. Files Modified

| File                                                                | Change                                                                                                                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/meetings/schemas.ts`                                  | `updateMeetingSchema` omits `projectId`, gains `notes`; attendee and agenda schemas                                                                                                             |
| `src/features/meetings/constants.ts`                                | Attendee/RSVP/decision/action-item vocabularies; `MEETING_STATUS_TRANSITIONS` + `canTransitionMeeting`                                                                                          |
| `src/features/meetings/real-actions.ts`                             | `updateMeeting`, `cancelMeeting`, `completeMeeting`, 3 attendee actions, 3 agenda actions                                                                                                       |
| `src/features/meetings/mock-actions.ts`                             | The same nine, over the DemoStore                                                                                                                                                               |
| `src/features/meetings/real-queries.ts`                             | `DESC NULLS LAST` (TD-12); `getMeetingAttendees` / `getMeetingAgenda` / `getMeetingOutcomes` / `getMeetingActivity`                                                                             |
| `src/features/meetings/mock-queries.ts`                             | **Rewritten** — the four stubs now read the store (TD-5), plus the four new reads                                                                                                               |
| `src/features/meetings/{actions,queries}.ts`                        | Dispatcher entries for all of the above                                                                                                                                                         |
| `src/features/meetings/components/meeting-detail-sheet.tsx`         | **Rewritten** — edit / cancel / complete / status, attendees, agenda, outcomes, notes, activity                                                                                                 |
| `src/features/meetings/components/create-meeting-dialog.tsx`        | Delegates its field set to `MeetingForm`                                                                                                                                                        |
| `src/features/meetings/components/meetings-directory.tsx`           | Selects by id; passes members; refreshes on write                                                                                                                                               |
| `src/app/(dashboard)/meetings/page.tsx`                             | Supplies the attendee-picker member list                                                                                                                                                        |
| `src/features/files/schemas.ts`                                     | `updateFileSchema`, `updateFolderSchema`                                                                                                                                                        |
| `src/features/files/real-actions.ts`                                | `updateFile`, `deleteFile`, `updateFolder`, `deleteFolder`, `getProjectFolders`, `getFileVersions`, `getFileShares`, `getFileActivity`                                                          |
| `src/features/files/mock-actions.ts`                                | The same eight                                                                                                                                                                                  |
| `src/features/files/actions.ts`                                     | Dispatcher entries                                                                                                                                                                              |
| `src/features/files/components/file-preview-sheet.tsx`              | Rename / move / delete / restore; versions, shares, activity; keeps itself in sync after a write                                                                                                |
| `src/features/files/components/folder-browser.tsx`                  | Per-folder rename / move / delete menu; supplies move destinations                                                                                                                              |
| `src/features/files/components/files-directory.tsx`                 | Fetches move destinations per selected file; refreshes on write                                                                                                                                 |
| `src/features/deliverables/real-actions.ts`                         | `getReviewSessions`, `getDeliverableApprovals`, `getDeliverableShareLinks`, `getDeliverableActivity`                                                                                            |
| `src/features/deliverables/mock-actions.ts`                         | The same four                                                                                                                                                                                   |
| `src/features/deliverables/actions.ts`                              | Dispatcher entries                                                                                                                                                                              |
| `src/features/deliverables/components/deliverable-actions.tsx`      | Approve targets a listed session; session picker when several exist                                                                                                                             |
| `src/features/deliverables/components/deliverable-detail-sheet.tsx` | Revision / session / approval / share / activity histories                                                                                                                                      |
| `src/features/notifications/real-actions.ts`                        | `getNotificationFeedAction`, `markNotificationUnreadAction`, `markAllNotificationsReadAction`                                                                                                   |
| `src/features/notifications/mock-actions.ts`                        | The same three                                                                                                                                                                                  |
| `src/features/notifications/actions.ts`                             | Dispatcher entries                                                                                                                                                                              |
| `src/features/notifications/components/notification-bell.tsx`       | **Rewritten** — titles, bodies, priority, grouping, unread filter, read/unread, mark all                                                                                                        |
| `src/features/tasks/real-actions.ts`                                | `deleteTask`, `assignTask`, `unassignTask`, `getTaskAssignees`, `addTaskComment`, `getTaskComments`, `getTaskActivity`, `searchTasks`, `getActiveTaskTimer`; `startTaskTimer` returns its entry |
| `src/features/tasks/mock-actions.ts`                                | The same nine, plus the timer-activity parity fix                                                                                                                                               |
| `src/features/tasks/actions.ts`                                     | Dispatcher entries                                                                                                                                                                              |
| `src/features/tasks/components/task-detail-modal.tsx`               | **Rewritten** — assignment, comments, timer, history, delete                                                                                                                                    |
| `src/features/tasks/components/task-dashboard.tsx`                  | Threads the member list to the dialog                                                                                                                                                           |
| `src/app/(dashboard)/tasks/page.tsx`                                | Supplies the assignable-member list                                                                                                                                                             |
| `src/features/search/actions.ts`                                    | Sixth source: `searchTasks`                                                                                                                                                                     |
| `src/features/search/components/global-search.tsx`                  | Placeholder and empty state updated to match what is searchable                                                                                                                                 |
| `src/lib/demo/store.ts`                                             | 11 collections added and seeded (§2.7)                                                                                                                                                          |
| `tests/unit/demo-store-schema-parity.test.ts`                       | 9 → 20 collections; 36 → 80 assertions                                                                                                                                                          |

No files were deleted.

---

## 7. Quality Gate Results

| Gate                | Result                                                              | Baseline (Sprint 12A)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`      | **0 errors**, 109 warnings                                          | 0 errors, 113 warnings — four fewer (three dead `eslint-disable` directives removed along the way; `@typescript-eslint/no-explicit-any` is off globally, so those comments were never doing anything). Six `react-hooks/set-state-in-effect` errors were introduced during the sprint and fixed properly rather than suppressed: prop-to-state sync replaced by derived values keyed on entity id, dialog field defaults seeded on open instead of by effect, and the per-project folder set stamped with its project so a stale list can never be offered as a destination. |
| `npm run typecheck` | **0 errors**                                                        | 0 errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm test`          | **240 / 240 passing**, 22 files                                     | 175 / 175, 20 files (+29 new assertions, +44 parity assertions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `npm run build`     | **Green** — 3.8 s compile, 31 static pages in 134 ms, **36 routes** | Green, 36 routes — no route regressions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

## 8. Remaining Production Gaps

Nothing in this list is a domain gap or a defect. All of it is infrastructure or
scope.

1. **TD-02 — mock object storage.** Still the single largest blocker to a
   credible DAM, and now the _only_ reason Files and Deliverables have no
   preview and no download. Upload creates the record, the version and a real
   SHA-256; the bytes are not transferred.
2. **Persistence is `DEMO_MODE`.** Every capability in this sprint has a real
   Drizzle adapter written against the real schema, but none of it has been
   executed against Postgres — the Supabase migration is explicitly not started.
   Treat the real adapters as unverified until it is.
3. **No total-count queries** for the deliverables/files pagers (item 6).
4. **No server-side filters** for `getMeetings` / `getTimelines` (item 7) — both
   fetch one bounded batch and filter client-side.
5. **Files breadcrumbs are not deep-link complete** (item 8).
6. **Task checklists and UI-level dependencies** — see §4.
7. **`/tasks` is milestone-pinned.** The workspace hard-codes the seeded
   Wireframes milestone because `getTasks` is milestone-scoped. `searchTasks` is
   now the org-wide read; a global task workspace could be built on it.
8. **No per-record routes** for deliverables, files, tasks or meetings — search
   hits land on the filtered workspace, not the record.
9. **Notification delivery is not wired.** Channels, queue, digest, dead-letter
   and webhook tables all exist; nothing dispatches.

---

## 9. Enterprise Readiness Assessment

| Dimension            | Sprint 12A | Now          | Basis                                                                                                                                                                                                                                                           |
| -------------------- | ---------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Readiness | 7          | **8**        | Six of eight technical-debt items closed; every module has a complete write surface against its own aggregate. Held at 8, not higher, by TD-02 and by the real adapters being unexercised against Postgres.                                                     |
| Domain Completeness  | _(new)_    | **8**        | 19 actions and 16 reads added, all on existing tables. What remains unbuilt is enumerated in §4 and is genuinely new capability, not gaps.                                                                                                                      |
| UI                   | 8          | **8**        | Unchanged — every new surface uses the existing design system and the single `ConfirmDialog` mutation pattern                                                                                                                                                   |
| UX                   | 7          | **8.5**      | Journeys now finish: a meeting can be run, a task worked, a deliverable taken through review to approval and back. Unsupported actions are still stated rather than hidden. Still no breadcrumbs, still no dashboard drill-through, still no per-record routes. |
| Performance          | 8          | **8**        | Unchanged; the new drawer reads are parallelised and fire on open                                                                                                                                                                                               |
| Accessibility        | 9          | **9**        | Every new control carries an accessible name (RSVP selects, agenda reorder, unassign, folder menus, notification toggles are all named after the record they act on)                                                                                            |
| Runtime Stability    | 10         | **10**       | 0 page errors, 0 unexpected console errors across a 39-check sweep                                                                                                                                                                                              |
| Responsive           | 9          | **9**        | Unchanged; new panels live inside existing sheet/dialog containers                                                                                                                                                                                              |
| **FINAL**            | **7.5**    | **8.5 / 10** |                                                                                                                                                                                                                                                                 |

**Where this platform now stands.** A user can run a meeting end to end — invite
internal and external attendees, track RSVPs, build and work an agenda, record
decisions, capture action items and promote one into a real task — then work that
task with assignment, comments, a stoppable timer and a full history, take a
deliverable through review → approval → revision → share with every step
recorded and readable, manage files and folders as a filing system rather than a
list, and read notifications that say what actually happened.

**The constraint has moved again, and this time it is off the domain.** Sprint
12A ended with "the interaction layer is no longer the constraint." Sprint 12B
ends with the domain no longer the constraint either. What stands between this
and customer production is object storage, real persistence, and delivery
infrastructure — the three things this sprint was explicitly told not to start.

**Classification: pilot-ready as a design-partner deployment on demo
persistence; not yet customer-production.** The gap is infrastructure, and it is
enumerated in §8.

---

**Sprint 12B is complete. Awaiting architecture review. Sprint 13, the Supabase**
**migration, and production infrastructure have not been started.**
