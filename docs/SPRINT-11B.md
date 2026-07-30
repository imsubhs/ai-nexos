# Sprint 11B - Public Read Layer Completion

## Sprint Objective
Close the dispatcher read-layer gap identified in Sprint 11A (see `SPRINT-11A.md`, `TECHNICAL-DEBT-NOTES.md`) for Deliverables, Files, Meetings, and Timeline — no new business logic, workflows, state machines, repositories, schemas, events, or UI. Presentation-layer workspace pages remain deferred (Sprint 11A/backlog scope), per the sprint's explicit boundary.

## Verify-Before-Implement
Every dispatcher, real/mock implementation, and query file for the four target modules was read in full before writing code (see `src/features/{deliverables,files,meetings,timelines}/{actions,real-actions,mock-actions}.ts` and `src/features/meetings/{queries,real-queries,mock-queries}.ts`). Confirmed no `getDeliverables`/`getFiles`/`getMeetings`(global)/`getTimelines` existed anywhere in the dispatcher, repository, or public-gateway layers prior to this sprint. The Tasks module's `getTasks` (dispatcher → real-actions → mock-actions, cursor-paginated) was used as the reference pattern for all four additions.

## Execution Summary

### Deliverables
Added `getDeliverables(filters, cursorOffset, limit)`, `getDeliverableById(deliverableId)`, `searchDeliverables(searchTerm, cursorOffset, limit)` across `actions.ts` → `real-actions.ts` → `mock-actions.ts`. Real implementation queries `deliverables` (org-scoped, soft-delete aware, optional `projectId`/`clientId`/`status` filters); `getDeliverableById` additionally fetches ordered `deliverableRevisions` via a second query (no Drizzle `relations()` are registered on the deliverables schema, so the relational `with:` API isn't available — same constraint applies to Files below). Mock implementation reads/filters/sorts `DemoStore.deliverables` and `DemoStore.deliverableRevisions` directly. RBAC: `requirePermission(user.permissions, "deliverables", "read")`.

### Files
Added `getFiles(filters, cursorOffset, limit)`, `getFolder(folderId, projectId)`, `searchFiles(searchTerm, cursorOffset, limit)` across the same three-file dispatcher pattern. `getFolder` returns `{ folder, childFolders, childFiles }` — one level of the existing adjacency-list hierarchy (`fileFolders.parentId`), reusing that hierarchy rather than introducing a new one; `folderId: null` addresses the project root. RBAC: `requirePermission(user.permissions, "files", "read")`.

### Meetings
Added `getMeetings(cursorOffset, limit)` only, in `queries.ts` → `real-queries.ts` → `mock-queries.ts`. The pre-existing project-scoped reads (`getMeetingsForProject`, `getMeetingById`, `getMeetingDecisions`, `getMeetingActionItems`) were **not modified**, per the sprint's explicit instruction. **Known deviation, documented rather than silently papered over**: the existing `mock-queries.ts` implementations of those four functions are stubs that ignore `DemoStore.meetings` entirely (e.g. `getMeetingsForProject` always returns `[]`). Reusing them inside `getMeetings` would have made the new global fetcher non-deterministic/empty in demo mode, failing this sprint's own Task 7 requirement ("returns deterministic DemoStore data"). `getMeetings`'s mock implementation therefore reads `DemoStore.meetings` directly instead of calling the broken stub — it does not touch or fix the pre-existing stubs, it just doesn't build on top of a known-broken dependency. Flagging the stub gap itself as a backlog item below. RBAC: `requirePermission(user.permissions, "meetings", "read")`.

### Timeline
Added `getTimelines(cursorOffset, limit)` only, in `actions.ts` → `real-actions.ts` → `mock-actions.ts`. `getProjectTimeline`, `getTimelineMilestones`, and `getTimelineDependencies` were **not modified**. `getTimelines` returns one row per organization timeline with its ordered phases (mirroring `getProjectTimeline`'s existing `phases` shape) — no DAG/dependency data, since the workspace list view doesn't need it. RBAC: `requirePermission(user.permissions, "timeline", "read")` (existing project-scoped reads use `"projects","read"`; the new global function uses the dedicated `"timeline"` permission module already defined in `src/features/permissions/constants.ts`, which is the more precise match).

## Public Gateway
All eight new functions are exported only from each domain's `actions.ts` (or `queries.ts` for Meetings) dispatcher — the same public entry point the Tasks module uses — dispatching to `real-*`/`mock-*` via `process.env.DEMO_MODE`. No new API routes, ad-hoc fetchers, or bypasses of the dispatcher were introduced.

## Testing
Added four new test files exercising the mock-mode implementations directly (the only path testable without a live database, consistent with the existing 122 tests which are all pure-logic/mock-mode):
- `src/features/deliverables/mock-actions.test.ts` (7 tests — pagination, status filter, search, not-found)
- `src/features/files/mock-actions.test.ts` (5 tests — project scoping, folder hierarchy, root-folder listing, search)
- `src/features/meetings/mock-queries.test.ts` (3 tests — global listing, ordering, pagination)
- `src/features/timelines/mock-actions.test.ts` (2 tests — phase ordering, pagination)

## Quality Gates
- **Lint**: Passed (0 errors, 117 warnings — pre-existing baseline; no new warnings introduced)
- **Typecheck**: Passed (0 errors)
- **Tests**: Passed (139/139 — 122 pre-existing + 17 new)
- **Build**: Passed. No new routes (workspace pages are out of scope for 11B); route list unchanged from Sprint 11A.

## Files Created
- `docs/SPRINT-11B.md` (this file)
- `src/features/deliverables/mock-actions.test.ts`
- `src/features/files/mock-actions.test.ts`
- `src/features/meetings/mock-queries.test.ts`
- `src/features/timelines/mock-actions.test.ts`

## Files Modified
- `src/features/deliverables/actions.ts`, `real-actions.ts`, `mock-actions.ts`
- `src/features/files/actions.ts`, `real-actions.ts`, `mock-actions.ts`
- `src/features/meetings/queries.ts`, `real-queries.ts`, `mock-queries.ts`
- `src/features/timelines/actions.ts`, `real-actions.ts`, `mock-actions.ts`
- `docs/BACKLOG.md`, `docs/QA-NOTES.md`, `docs/MIGRATION-NOTES.md`, `docs/TECHNICAL-DEBT-NOTES.md`

## Dispatcher / Repository / Public Gateway Additions
| Module | Function | Layers touched |
|---|---|---|
| Deliverables | `getDeliverables`, `getDeliverableById`, `searchDeliverables` | actions.ts, real-actions.ts, mock-actions.ts |
| Files | `getFiles`, `getFolder`, `searchFiles` | actions.ts, real-actions.ts, mock-actions.ts |
| Meetings | `getMeetings` | queries.ts, real-queries.ts, mock-queries.ts |
| Timeline | `getTimelines` | actions.ts, real-actions.ts, mock-actions.ts |

## Known Limitations / Remaining Blockers Before Sprint 11A Completion
- **Meetings mock-mode stub gap** (pre-existing, not introduced this sprint): `getMeetingsForProject`, `getMeetingById`, `getMeetingDecisions`, `getMeetingActionItems` in `mock-queries.ts` don't read `DemoStore.meetings` — they return hardcoded/empty stubs. This means the Meetings workspace page, once built, would show a correct global list (via `getMeetings`) but broken project-level drill-down in demo mode. Recommend a small follow-up ticket to back-fill these four stubs against `DemoStore.meetings`/`meetingOutcomes`/`meetingDecisions`/`meetingActionItems` before the Meetings workspace page ships.
- **No Drizzle relations registered** for `deliverables` or `files` schemas (confirmed via grep — only `projects.ts`, `clients.ts`, `automation.ts`, `approvals.ts` define `relations()`). `getDeliverableById`'s revisions and `getFolder`'s children are therefore fetched via explicit second queries rather than the relational `with:` API. Not a blocker, just noted for anyone extending these modules who might expect `with:` to work.
- **Deliverables seed data has no `projectId`** (`src/lib/demo/store.ts` seed rows for `id.deliverableBrand`/`id.deliverableWireframes` omit it). `getDeliverables({ projectId })` filtering therefore can't be demonstrated against seed data alone in demo mode; this is a pre-existing seed-data gap, not a Sprint 11B defect — `getDeliverables()` with no filter and `searchDeliverables`/`getDeliverableById` are unaffected and fully tested.
- Presentation layer (workspace pages for `/deliverables`, `/files`, `/meetings`, `/timeline`, plus Client/Project/Organization enhancements deferred from 11A) remains the explicit scope of Sprint 11A completion / Sprint 12, per this sprint's stop condition. Not started.
