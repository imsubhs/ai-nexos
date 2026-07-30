# Phase 3 — Core Product (MVP) Execution Plan

**Date:** 2026-07-14
**Basis:** PRODUCT-COMPLETION-AUDIT.md + PHASE-02-STABILIZATION-REPORT.md + fresh code inventory
**Scope:** Organizations, Clients, Projects, Tasks — everything required to make these four entities fully usable end-to-end.
**Out of scope:** Deliverables, Files, Meetings, AI, Analytics, Automations, Portal, Billing.

---

## 0. Current-State Summary (verified against code, not just the audit)

| Entity        | Backend (server actions)                                                                                             | Frontend                                                                                                                                        | RLS                                      | Gaps in one line                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Organizations | **None** (schema + seed only)                                                                                        | **None** (no page, no nav)                                                                                                                      | Yes (0001)                               | Entire management surface missing                      |
| Clients       | Full C/R/U/soft-D + contacts, permissioned, zod-validated                                                            | List + detail + create modal                                                                                                                    | Yes (0002)                               | Edit/archive UI and contact CRUD UI not mounted        |
| Projects      | Full C/R/U/soft-D + members, permissioned; dashboard summary stubbed                                                 | List + detail + timeline + create modal + member mgmt                                                                                           | Yes (0003)                               | Edit/archive UI missing; summary stats hardcoded zeros |
| Tasks         | create/update/list/timers/dependencies; **no delete, no getById**; permission checks partial ("borrowed" or missing) | Components built (`task-board`, `task-list`, `task-detail-modal`, `task-dashboard`) but **zero routes import them**; `/tasks` sidebar link 404s | _\*No RLS on tasks or any task_* table_* | Entire module orphaned + security gaps                 |

Cross-cutting: `DEMO_MODE=true` with `DEMO_ADMIN_USER` bypasses all permission checks; 10 of 13 sidebar links broken; near-zero test coverage on these entities.

---

## 1. Feature-by-Feature Gap Specification

### 1.1 Organizations

| Dimension                    | State                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing backend             | Drizzle schema (`organizations`, `organizationSequences`, `roles`, `users`, `departments`); RLS policies (0001); Postgres `app.has_permission()`; seed script only. **No actions module at all.**                                                                                                      |
| Existing frontend            | None. No page, no components, no nav entry.                                                                                                                                                                                                                                                            |
| Missing UI                   | Organization Settings page (`/settings/organization`): profile form (name, legal name, logo, website, industry, timezone, currency, country, contact, brand colors); Members list (users in org, role display); Roles view (system roles read-only for MVP).                                           |
| Missing CRUD                 | `getOrganization`, `updateOrganization` server actions (dispatcher/real/mock triple, matching feature pattern). Create/delete org is out of MVP scope (single-tenant seed-provisioned) — record as explicit deferral. Member management: `getOrganizationMembers`, `updateUserRole`, `deactivateUser`. |
| Missing permissions          | Guard with `requirePermission(user.permissions, "organization", "read"/"update")`; role changes restricted to owner/super_admin; prevent self-demotion of last owner.                                                                                                                                  |
| Missing validation           | `schemas.ts` with zod: org profile (URL fields, hex brand colors, IANA timezone, ISO currency/country), role-change schema.                                                                                                                                                                            |
| Missing loading/error states | Settings page loading skeleton; form-level error toasts; optimistic-safe save states. (Group-level boundaries from Phase 2 already cover route errors.)                                                                                                                                                |
| Dependencies                 | None on other milestones — but Tasks/Projects permission hardening (M2) shares the permission engine, so land engine touch-ups first.                                                                                                                                                                  |
| Order                        | Milestone 6 (last of entity work) — Clients/Projects/Tasks deliver more user value; org data already exists via seed.                                                                                                                                                                                  |

### 1.2 Clients

| Dimension                    | State                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing backend             | Complete: `getClients`, `getClientById`, `getClientActivity`, `createClient`, `updateClient`, `archiveClient`, contact CRUD — all permissioned, zod-validated, activity-logged, org-scoped. RLS live.                                                                                                                                                               |
| Existing frontend            | `/clients` list with create modal; `/clients/[clientId]` detail with contacts + activity. `client-form.tsx` already supports `initialData` (edit-ready, unmounted).                                                                                                                                                                                                 |
| Missing UI                   | Edit-client modal/drawer on detail page (mount existing form with `initialData`); Archive action with confirm dialog + status filter (show archived toggle); Contact add/edit/archive UI on detail page; brand fields section (colors, typography, moodboards, asset URLs) currently write-only via schema — expose in form; list search/filter by status & health. |
| Missing CRUD                 | None on the server. Wire existing `updateClient`, `archiveClient`, `createContact`, `updateContact`, `archiveContact` to UI.                                                                                                                                                                                                                                        |
| Missing permissions          | Conditionally render edit/archive controls from `hasPermission` (currently unconditioned because demo user has `*`).                                                                                                                                                                                                                                                |
| Missing validation           | Client-side RHF resolvers already exist via shared zod schemas — extend for contact forms; inline field errors on contact forms.                                                                                                                                                                                                                                    |
| Missing loading/error states | Pending states on edit/archive submissions; empty state for zero contacts; toast + rollback on failed archive.                                                                                                                                                                                                                                                      |
| Dependencies                 | None. First milestone — smallest gap, purely wiring.                                                                                                                                                                                                                                                                                                                |
| Order                        | Milestone 1.                                                                                                                                                                                                                                                                                                                                                        |

### 1.3 Projects

| Dimension                    | State                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing backend             | Complete CRUD + members + pagination + transactional project-code generation. `getProjectDashboardSummary` returns hardcoded zeros. RLS live.                                                                                                                                                   |
| Existing frontend            | List (Suspense + skeleton), detail, timeline, create modal, member table with add/remove/role-change.                                                                                                                                                                                           |
| Missing UI                   | Edit-project modal/drawer (mount `project-form.tsx` with initial data); Archive with confirm + archived filter; status/health/priority quick-edit on detail header; list filters (status, client, manager) + search; pagination controls (backend supports limit/offset, UI doesn't expose it). |
| Missing CRUD                 | None for core fields. `getProjectDashboardSummary` must be de-stubbed to compute real task counts once Tasks route exists (open/completed tasks); approvals/reviews/revisions stay zero with an explicit "not in MVP" label rather than fake numbers.                                           |
| Missing permissions          | Render controls from `hasPermission("projects", ...)`; member-role changes should verify actor outranks target (currently any `projects.update` suffices — accept for MVP, note as debt).                                                                                                       |
| Missing validation           | Date-order rule (estimatedEndDate ≥ startDate) at zod level; budget ≥ 0; completionPercentage 0–100.                                                                                                                                                                                            |
| Missing loading/error states | Submission pending states on edit/archive; error boundary already exists; empty state for filtered-to-zero lists.                                                                                                                                                                               |
| Dependencies                 | Summary de-stub depends on Milestone 4 (Tasks read path). Everything else independent.                                                                                                                                                                                                          |
| Order                        | Milestone 2 (UI wiring), plus a small Milestone 5 item (summary de-stub).                                                                                                                                                                                                                       |

### 1.4 Tasks

| Dimension                    | State                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing backend             | `createTask` (code generation), `updateTask`, `getTasks(milestoneId)`, timers, `addTaskDependency` (DAG cycle check). **Missing:** `getTaskById`, `deleteTask`/`archiveTask`, project-scoped list (current list is milestone-scoped only), assignee CRUD wiring, comment/checklist actions (tables exist, no actions), label management.                                                     |
| Existing frontend            | `task-dashboard.tsx`, `task-board.tsx` (kanban), `task-list.tsx`, `task-detail-modal.tsx` — built but with zero call sites; `/tasks` sidebar link broken.                                                                                                                                                                                                                                    |
| Missing UI                   | `/tasks` route (org-wide "My tasks" + board/list toggle); tasks tab on project detail page; create-task form (none exists — must be built: name, project/milestone pickers, assignees, dates, priority, type); detail modal wiring (status transitions, assignee edit, comments, checklist, time entries); archive/delete with confirm.                                                      |
| Missing CRUD                 | `getTaskById` (with assignees, comments, checklist, dependencies, time entries); `archiveTask` (soft delete via existing audit fields); `getTasksByProject`; assignee add/remove; comment create/edit/delete; checklist + item CRUD. Mock-store equivalents for all (demo mode is the active default).                                                                                       |
| Missing permissions          | Replace the borrowed `projects.create` in `createTask` with `tasks.create`; add `requirePermission(...,"tasks", action)` to `updateTask`, `getTasks`, timers, dependencies (currently `requireCurrentUser` + `validateTaskAccess` only); keep `validateTaskAccess` for private tasks. **Add RLS migration for `tasks` + all `task_*` and `labels` tables** — the only core tables with none. |
| Missing validation           | Due-date ≥ start-date; progress 0–100; dependency must reference same-project task; comment length; checklist item text non-empty. Schemas exist for task core — extend for comments/checklists/assignees.                                                                                                                                                                                   |
| Missing loading/error states | Route-level loading/error (group boundaries help, add Suspense skeletons for board/list); optimistic status-drag on kanban with rollback; empty states per column and per project.                                                                                                                                                                                                           |
| Dependencies                 | Requires timelines/milestones data (exists, seeded in demo store); RLS + permission hardening should land before UI exposes writes broadly.                                                                                                                                                                                                                                                  |
| Order                        | Milestones 3 (backend hardening) and 4 (UI). Largest single work item of the phase.                                                                                                                                                                                                                                                                                                          |

---

## 2. Milestones

Each milestone is independently completable, verifiable in the running app (demo mode and real mode), and ends with an approval gate per the established ruling.

### M0 — Phase hygiene (½ day)

- Commit the uncommitted Phase 2 working tree on `phase-01-stabilization` or a new `phase-03` branch (audit notes nothing is committed since Phase 2).
- Fix the `_journal.json` tag/filename mismatch on migration 0003.
- **Verify:** clean `git status`; `drizzle-kit` journal consistent; build green.

### M1 — Clients: complete the loop (1–2 days)

- Mount edit-client UI (existing form + `updateClient`), archive flow with confirm, contact add/edit/archive UI, brand-fields section, list search + status/health filters.
- Permission-conditioned controls.
- **Verify:** full client lifecycle (create → edit → add/edit/archive contact → archive client) in demo store and against real DB; archived clients excluded by default, visible via filter.

### M2 — Projects: complete the loop (1–2 days)

- Mount edit-project UI, archive flow, header quick-edits (status/health/priority), list filters + search + pagination controls.
- Zod date/budget/percentage rules.
- **Verify:** full project lifecycle incl. member role changes; pagination works past seed data.

### M3 — Tasks backend hardening (2–3 days) — _gates M4_

- New actions: `getTaskById`, `getTasksByProject`, `archiveTask`, assignee CRUD, comment CRUD, checklist CRUD — dispatcher/real/mock triples, zod schemas, activity logging.
- Fix permissions: `tasks.*` module checks on every task action; remove the borrowed `projects.create`.
- _\*RLS migration for tasks + task_* + labels tables_*, mirroring the 0002/0003 policy pattern.
- **Verify:** unit tests for permission matrix on task actions (extend existing permissions test suite); RLS policies present in migration snapshot; demo store parity for all new actions.

### M4 — Tasks UI (3–4 days)

- Create `/tasks` route (fixes broken sidebar link): my-tasks dashboard + board/list toggle using existing orphaned components.
- Tasks tab on project detail; create-task form (new component); wire `task-detail-modal` (status, assignees, comments, checklist, timers, dependencies); archive with confirm.
- Loading skeletons, optimistic kanban drag with rollback, empty states.
- **Verify:** full task lifecycle from both `/tasks` and project detail; timer start/stop persists; dependency cycle rejected with user-visible error.

### M5 — Cross-entity integrity (1 day)

- De-stub `getProjectDashboardSummary` with real open/completed task counts; label approvals/reviews/revisions as "coming later" instead of fake zeros.
- Client detail: show related projects (relation currently stubbed — read-side only).
- Sidebar cleanup: remove or visibly disable the remaining broken links (`/timeline`, `/calendar`, `/deliverables`, `/files`, `/meetings`, `/ai`, `/analytics`, `/team`) so nav only offers what works; `/settings` stays pending M6.
- **Verify:** project detail shows live task counts; no dead links in sidebar.

### M6 — Organization settings (2 days)

- Actions module: `getOrganization`, `updateOrganization`, `getOrganizationMembers`, `updateUserRole`, `deactivateUser` (+ mock parity).
- `/settings/organization` page: profile form, members table with role select, roles read-only reference.
- Owner-protection rules (no demotion of last owner, no self-deactivation).
- **Verify:** org profile edit persists; role change reflected in a member's permissions on next request; guard rules enforced.

### M7 — MVP verification pass (1–2 days)

- End-to-end journey test (Playwright is installed): login → create client → create project → add members → create tasks → work board → archive flows.
- Run the full journey with `DEMO_MODE=false` against real Supabase (currently blocked on credentials — flag early; if still blocked, demo-mode E2E + real-mode smoke deferred with explicit note).
- Add `test` npm script; update PRODUCT-COMPLETION-AUDIT matrices; write PHASE-03-REPORT.md.
- **Verify:** E2E suite green; zero TS errors; all 4 entity modules show full rows in the CRUD matrix.

---

## 3. Sequencing & Dependency Graph

```
M0 → M1 → M2 → M3 → M4 → M5 → M7
                      M6 ────┘   (M6 independent; can run parallel to M4/M5)
```

- M1/M2 first: pure wiring of existing backend — fastest user-visible wins, no schema risk.
- M3 strictly before M4: never expose write UI over under-permissioned, RLS-less task actions.
- M5 after M4 (needs task read paths). M6 anytime after M0.
- Estimated total: **11–15 working days.**

## 4. Risks & Standing Blockers

1. **Supabase credentials still missing** — all real-mode verification is demo-store-only until provided. Highest-priority external ask.
2. **Modified Next 16.2.10 build** — consult `node_modules/next/dist/docs/` before using unfamiliar APIs (per AGENTS.md).
3. **Tasks RLS gap** is a live security defect the moment real mode ships; M3 is therefore non-negotiable before M4.
4. Demo-store drift: every new real action needs a mock twin or demo mode silently breaks — enforce via the dispatcher pattern review at each milestone gate.
