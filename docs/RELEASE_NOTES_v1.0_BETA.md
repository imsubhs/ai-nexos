# AI NEX OS — Release Notes

## v1.0.0-beta — "Feature Complete"

**Released:** 2026-07-28
**Type:** Beta · demo persistence
**Branch:** `phase-03-core-product`
**Audience:** Design partners, internal stakeholders, evaluators

---

### Read this first

**This build stores nothing.** It runs on an in-memory demo store that resets when the server restarts. It is certified for demonstration and evaluation, and explicitly **not** certified for customer production or real data.

Everything below works. None of it is saved.

---

## What's new since the v1.0 architectural baseline

The baseline (2026-07-20) certified the architecture: 19 modules, 199+ tables, 8 state machines, 3 workflow engines. What it could not certify was whether any of it could be _used_ — the write surface was roughly a third built.

Four sprints later, it can.

### Meetings — from the weakest module to the most complete

Meetings scored 6/10 at the Phase A review: you could see a meeting and change nothing about it. Now you can run one.

- **Edit, cancel, complete, and change status** — with a transition guard, so a cancelled meeting cannot quietly become "in progress" again
- **Attendees** — invite team members or external contacts by email, track RSVPs, remove
- **Agenda** — add items, tick them off during the meeting, reorder, remove
- **Decisions and action items** — record them, and _see them_. Both write actions had existed since Sprint 11, but the only reads were project-scoped, so anything you added was invisible to you. That is fixed.
- **Promote an action item to a real task** — pick the milestone, and the task is created with the item's title, priority and due date, linked back
- **Notes** and a full **activity trail** of every change

### Files — a filing system, not a list

- **Rename, move, and delete** files; **rename, move, and delete** folders
- **Version history with restore.** `promoteFileVersion` shipped fully implemented in Sprint 11 and was unreachable because nothing listed versions.
- **Share links** listed against the file, and an **activity trail**
- Deleting a non-empty folder is **refused with a reason** rather than silently scattering its contents into the project root

### Deliverables — the review loop closes

- **Approve now survives a page reload.** Previously the session id lived only in the drawer that started the review; reload and the deliverable could be reviewed forever but never approved.
- **Review sessions, approval history, share links and activity** are all readable. The write side had been recording all four since Sprint 11 with nothing reading them back.

### Tasks — assignment, discussion, and a timer you can stop

- **Assign and unassign** people
- **Comments**
- **Delete** (soft — the record and its history are retained)
- **A stoppable timer.** The old blocker was not a missing action: `startTaskTimer` returned `void`, so no caller could ever get the id needed to stop it.
- **Full history** of every change
- **Task search** — tasks now appear in global search for the first time

### Notifications — they say what happened

The bell used to read _"normal priority · delivered"_. The notifications read model is event-derived by design — the headline lives in a template table and the values live in the event payload, and no read performed that join.

- **Real titles and bodies**, rendered from templates against event payloads
- **Mark unread**, mark all read, unread-only filter
- **Grouped** by Today / Yesterday / Earlier
- A notification with no matching template degrades to the event it came from — never a blank row

### Earlier in this cycle

- **Sign out works.** It previously fired zero network requests.
- **Organisation profile saves.** It had three separate causes, one of which failed silently.
- **Global search** across projects, clients, people, deliverables, files and now tasks
- **Nine "coming soon" nav items** are genuinely disabled instead of being announced as available
- Ten workspace pages: Deliverables, Files, Meetings, Timeline, Tasks, Settings, Employees, Projects, Clients, Dashboard

---

## Quality

|                               |                               |
| ----------------------------- | ----------------------------- |
| Lint                          | 0 errors, 109 warnings        |
| TypeScript                    | 0 errors (strict)             |
| Tests                         | **240 / 240** across 22 files |
| Build                         | Green — 36 routes             |
| Browser workflow verification | **39 / 39** in real Chromium  |
| Runtime                       | 0 page errors                 |

Up from 23 tests at the v1.0 baseline.

---

## Known limitations

Stated plainly, because the product states them plainly too — where a capability is unavailable, the UI says so rather than offering a control that cannot finish the job.

### Not available in this build

|                                                             | Why                                                                                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **File preview and download**                               | Object storage returns mock signed URLs. Metadata, versions and a real SHA-256 are created; the bytes are not transferred. |
| **Email and push notifications**                            | Delivery channels log to the console. The in-app feed is real.                                                             |
| **Anything scheduled or background**                        | No worker invoker, no cron, no queue consumer.                                                                             |
| **AI Workspace, Analytics, Calendar, most Workforce pages** | Marked "coming soon" in the nav and genuinely disabled.                                                                    |
| **Task checklists; task dependencies from the UI**          | Tables exist, no actions.                                                                                                  |
| **Deliverable publish**                                     | No publish action exists. Rejection is expressible only as "request revision".                                             |
| **Meeting recordings and transcripts**                      | Tables exist, no ingestion path.                                                                                           |
| **Search over meetings and timelines**                      | No search-capable read. The empty state says so.                                                                           |

### Known rough edges

- **`/tasks` shows one milestone.** The task read layer is milestone-scoped. A task promoted from a meeting appears here only if promoted into that milestone.
- **No breadcrumbs** on nested routes.
- **No per-record routes** — a search hit opens the filtered workspace, not the record.
- **The dashboard is four KPI cards** — no charts, no drill-through.
- **Data resets on restart.** Nothing is persisted.

### Security posture — read before deploying anywhere

This build is **not safe to expose**:

- Demo login **accepts any credentials** and grants full Owner permissions
- The demo session cookie is set without `httpOnly`, `secure` or `sameSite` on one path
- The virus scanner **always returns clean**
- **Row-level security has never been evaluated by a database** — every RLS policy is written and unverified

Run it locally or behind an access-controlled URL. Nothing enforces this at build time yet; closing that is Sprint 15.

---

## For evaluators — a suggested walkthrough

The most complete end-to-end path, and the one worth seeing:

1. **Meetings** → open _Quarterly Review_ → add an attendee, tick an agenda item, record a decision
2. Add an action item → **Promote to task**, choosing the _Wireframes_ milestone
3. **Tasks** → open the promoted task → assign someone, comment, start and stop the timer, read the history
4. **Deliverables** → _Brand Guidelines v2_ → start a review → **reload the page** → approve → request a revision → share
5. **Files** → rename a file, move it, open version history
6. **Notification bell** → real titles, grouping, mark read and unread
7. **Global search** → type "wireframes" → results across deliverables and tasks

Every one of those steps is covered by an automated browser check in `SPRINT-12B.md` §3.

---

## What's next

`PRODUCTION_MIGRATION_PLAN.md` sequences five sprints from here to production:

| Sprint |                                                                             | Effort  |
| ------ | --------------------------------------------------------------------------- | ------- |
| 13     | Persistence — Supabase Postgres, RLS verified, tenant isolation proven      | 8–12 d  |
| 14     | Object Storage — real files, preview, download, virus scanning              | 7–10 d  |
| 15     | Authentication — real users, all six roles, demo bypass blocked             | 6–9 d   |
| 16     | Background Runtime — email, notifications, scheduler, realtime, monitoring  | 12–16 d |
| 17     | Production Deployment — environment, backups, security review, load testing | 8–12 d  |

**~9–13 weeks for one engineer.** No module needs redesigning; the work is entirely infrastructural.

---

## Upgrade notes

None. This is the first tagged release. Every prior state is uncommitted working-tree history.

---

## Documentation

| Document                                 | Contents                                           |
| ---------------------------------------- | -------------------------------------------------- |
| `NEXOS_v1.0_BASELINE.md`                 | Permanent architectural reference                  |
| `docs/VERSION_1.0_BETA.md`               | Beta certification, demo-dependency audit, scores  |
| `docs/BETA_FREEZE.md`                    | What is frozen, git baseline review, exit criteria |
| `docs/PRODUCTION_MIGRATION_PLAN.md`      | Infrastructure map and Sprints 13–17               |
| `docs/PRODUCTION_READINESS_CHECKLIST.md` | 115 gate items, currently 29 green                 |
| `docs/SPRINT-12B.md`                     | The most recent sprint, in full                    |
| `docs/TECHNICAL-DEBT-NOTES.md`           | 20 tracked items                                   |

---

**AI NEX OS v1.0.0-beta — The Operating System for Creative Execution**
_Feature complete on demo persistence. Awaiting architecture approval to begin Sprint 13._
