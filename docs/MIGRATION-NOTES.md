# Migration Notes - Sprint 11A

## Database Migrations

No database schema changes were required in this sprint. The enterprise baseline (v1.0) architecture and schema remain frozen.

## Code Migrations

- `src/config/navigation.ts`: Removed the `"coming-soon"` badge from the `/tasks` route, setting it to `"live"`.
- No new tables, enums, or external dependencies were added.
- The `Tasks` page relies entirely on the pre-existing `TaskDashboard` component, matching the architectural rule to reuse components.

## Deployment Notes

- No new environment variables required.
- Standard Next.js deployment procedure applies.

# Migration Notes - Sprint 11B

## Database Migrations

None. No new tables, columns, or enums — this sprint added read-only query functions against existing schema (`deliverables`, `deliverableRevisions`, `files`, `fileFolders`, `meetings`, `timelines`, `projectPhases`). Baseline v1.0 schema remains frozen.

## Code Migrations

- `src/features/deliverables/{actions,real-actions,mock-actions}.ts`: added `getDeliverables`, `getDeliverableById`, `searchDeliverables`.
- `src/features/files/{actions,real-actions,mock-actions}.ts`: added `getFiles`, `getFolder`, `searchFiles`.
- `src/features/meetings/{queries,real-queries,mock-queries}.ts`: added `getMeetings` (global). No other function in this domain was changed.
- `src/features/timelines/{actions,real-actions,mock-actions}.ts`: added `getTimelines` (global). No other function in this domain was changed.
- No new dependencies, API routes, or environment variables.

## Deployment Notes

- No new environment variables required.
- No workspace pages or navigation changes shipped in this sprint — nothing user-facing changes on deploy.

# Migration Notes - Sprint 11A (Resumed)

## Database Migrations

None. Presentation-only sprint; no schema, table, enum, or migration changes.

## Code Migrations

- Added four workspace pages + loading skeletons: `src/app/(dashboard)/{deliverables,files,meetings,timeline}/{page.tsx,loading.tsx}`.
- Added supporting feature components under `src/features/{deliverables,files,meetings,timelines}/components/`.
- Added one new shared component: `src/components/shared/status-badge.tsx` (presentational only).
- `src/config/navigation.ts`: `Deliverables`, `Files`, `Meetings`, `Timeline` nav items changed from `status: "coming-soon"` to `status: "live"`. No hrefs or permission tuples changed — they were already correct.
- No new dependencies were added; all UI is built from existing shadcn/ui primitives (`table`, `sheet`, `breadcrumb`, `dropdown-menu`, `input`, `skeleton`) already in `src/components/ui/`.

## Deployment Notes

- No new environment variables required.
- User-facing change on deploy: the Deliverables, Files, Meetings, and Timeline sidebar items become clickable (no longer show "Soon") for any user with the corresponding `read` permission.

# Migration Notes - Sprint 12A

## Database Migrations

**None.** No tables, columns, enums, or migrations were added or changed. The
v1.0 schema remains frozen. Every change to `src/lib/demo/store.ts` moved the
demo fixtures _toward_ the existing schema, never the reverse — enforced by
`tests/unit/demo-store-schema-parity.test.ts`.

## Behavioural changes on deploy

These change what an existing user sees, so they are worth calling out:

- **Sign out now works.** Any session held open by the previous no-op will end
  on the next click. Expect users to be signed out.
- **The demo organisation's brand colours changed** from `#000000`/`#ffffff`
  (stored in a non-schema `brandColors[]` array that nothing read) to
  `#0f172a`/`#38bdf8` on the correct columns.
- **The seeded deliverable "Brand Guidelines v2" moved from `"pending"` to
  `"client_review"`.** `"pending"` was never a member of
  `deliverableStatusEnum`; any external tooling filtering on the old string will
  no longer match.
- **Demo notification rows changed shape** — `title` / `message` / `isRead` (none
  of which are columns) became `eventId` / `priority` / `status` / `readAt`.
- **The header search input now performs searches.** It previously accepted text
  and did nothing.

## Code migrations

- One new UI primitive: `src/components/ui/popover.tsx` (Base UI Popover,
  styled to match `dropdown-menu.tsx`).
- One new shared component: `src/components/shared/confirm-dialog.tsx` — the
  single confirmation pattern. New destructive or state-advancing mutations
  should use it rather than `window.confirm()` or a bespoke dialog.
- One new feature slice: `src/features/search/` (`globalSearch()` + the header
  panel). It **composes existing public actions only** and adds no dispatcher
  surface.
- Two components deleted: `NotificationCenter.tsx`, `NotificationBadge.tsx`
  (unused, off-design-system; superseded by `notification-bell.tsx`).
- Validation contract widened in `src/features/organizations/schemas.ts`: the
  timezone regex accepts single-segment IANA zones (`UTC`, `GMT`), and both hex
  colour fields accept `""` as "cleared", matching the existing
  `logoUrl`/`website`/`contactEmail` pattern. `normalizeOrganizationInput()`
  persists an emptied field as `NULL`.

## Deployment notes

- No new environment variables.
- No new runtime dependencies (`@base-ui/react` popover ships in the existing
  package).
- Standard Next.js deployment procedure applies.

# Migration Notes - Sprint 12B

## Database Migrations

**None.** No tables, columns, enums, or migrations were added or changed. The
v1.0 schema remains frozen. Every capability in this sprint was built on schema
that already existed — `meeting_attendees`, `meeting_agenda`, `meeting_outcomes`,
`meeting_decisions`, `meeting_action_items`, `meeting_activity`, `task_assignees`,
`task_comments`, `task_activity`, `notification_templates`, `events`,
`file_versions`, `file_shares`, `deliverable_review_sessions`,
`deliverable_approvals`, `deliverable_share_links`, `deliverable_activity`. Most
of them had never been written to or read from.

## Behavioural changes on deploy

- **Meetings become editable.** A meeting can be renamed, rescheduled, cancelled
  and completed. **Status changes are now guarded:** `updateMeeting` refuses a
  transition that is not in `MEETING_STATUS_TRANSITIONS` (for example
  `cancelled → in_progress`). Any external caller relying on setting an arbitrary
  status will start receiving an error. This is intentional — the enum always
  implied the lifecycle and nothing enforced it.
- **`startTaskTimer` returns its entry** instead of `void`. Existing callers that
  ignore the return value are unaffected; the new value is what makes stopping a
  timer possible.
- **Files and tasks gain soft delete.** `deleteFile` sets `deletedAt` **and** the
  `deleted` lifecycle status; `deleteTask` sets `deletedAt`. Every read already
  filtered on `deletedAt`, so deleted records disappear from all lists. Nothing
  is hard-deleted and versions are retained, so both are reversible at the data
  layer — but no action exposes the reversal yet.
- **Deleting a folder is refused while it still holds anything.**
  `files.folderId` is `ON DELETE SET NULL`, so a cascade would silently scatter
  live assets into the project root. The action throws with the reason.
- **`getMeetings()` ordering changed** from an unguarded `startTime DESC` to
  `startTime DESC NULLS LAST`. A meeting with no start time now sorts to the end
  instead of breaking the list.
- **The notification bell shows real copy.** It renders
  `notification_templates.subjectTemplate` / `bodyTemplate` against the event
  payload. **An organisation with no in-app templates seeded will see a fallback
  title** (`"Deliverable · Deliverable"`) rather than a blank row — worth
  seeding templates per organisation before this surface is shown to customers.
- **Mark-as-unread sets `status = 'delivered'`, not `'queued'`.** The
  notification has already been delivered; `queued` would misreport it to any
  consumer reading the status.
- **Global search now returns tasks.** The header placeholder changed to match.

## Code migrations

- One new shared module: `src/features/notifications/templates.ts` — the template
  substitution and feed-composition layer. **Both adapters import it**, which is
  deliberate: rendering logic duplicated per adapter is how demo and production
  copy drift apart. Future channels (email, Slack) should render through it too.
- One new form component: `src/features/meetings/components/meeting-form.tsx`,
  shared by the create dialog and the drawer's edit mode so the two field sets
  cannot diverge.
- Three new panel components under `src/features/meetings/components/`
  (attendees, agenda, outcomes). All mutations route through the existing
  `ConfirmDialog` pattern; no second mutation idiom was introduced.
- `MEETING_STATUS_TRANSITIONS` / `canTransitionMeeting` live in
  `src/features/meetings/constants.ts` rather than in either adapter, because
  both enforce them. **This is a guard over an existing vocabulary, not a new
  state machine** — the frozen workflow engines are untouched.
- Eleven DemoStore collections added and seeded. Several were previously created
  lazily by mock-actions on first write, which is how the drift behind P1-02
  began; all are now declared, seeded and covered by the parity test.

## Deployment notes

- No new environment variables.
- No new runtime dependencies.
- Standard Next.js deployment procedure applies.
- **Before a real deployment:** seed `notification_templates` per organisation
  (event type × `in_app`), or the bell falls back to event-derived titles.
