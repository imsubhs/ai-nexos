# Authorization remediation backlog

**Status:** opened by the Phase 2.5.1 security hotfix
**Model:** [AUTHORIZATION-CONTROLS.md](AUTHORIZATION-CONTROLS.md) — the four
controls referenced throughout are numbered there.

Everything in this file is **open**. The hotfix closed CRIT-1, CRIT-2 and
H-1…H-4; what follows is the remainder, recorded rather than fixed so that a
security hotfix stayed a security hotfix.

Nothing here is a known cross-tenant read or write. These are missing **control
(2)** — role checks — on paths that already hold **(1)**, **(3)** and **(4)**.
The practical consequence is uniform: _any_ member of an organisation can
perform the operation, regardless of the role they were given. That is a real
privilege-boundary defect and a poor fit for a product about to take paying
customers, but it is not a tenancy breach.

---

## 1. Identity-only actions, by module

Each of these calls `requireCurrentUser()` and scopes its queries by
`user.organizationId`, but never consults `requirePermission()`.

### tasks — `src/features/tasks/real-actions.ts`

| Action                                                                                      | Suggested permission                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `getTasks`, `getTaskAssignees`, `getTaskComments`, `getTaskActivity`, `getMyOpenTasksCount` | `tasks.read`                                                           |
| `updateTask`                                                                                | `tasks.update`                                                         |
| `addTaskDependency`                                                                         | `tasks.update`                                                         |
| `startTaskTimer`, `stopTaskTimer`, `getActiveTaskTimer`                                     | `tasks.update` (self-scoped by `userId`, so lowest risk in this table) |

### meetings — `src/features/meetings/real-actions.ts`, `real-queries.ts`

`createMeeting`, `createDecision`, `createActionItem` and
`promoteActionItemToTask` gained checks in the hotfix. Still open:

| Action                                                                                    | Suggested permission |
| ----------------------------------------------------------------------------------------- | -------------------- |
| `getMeetingsForProject`, `getMeetingById`, `getMeetingDecisions`, `getMeetingActionItems` | `meetings.read`      |

### revisions — `src/features/revisions/real-actions.ts`

`createRevision` and `createRevisionRequest` gained `revisions.create` in the
hotfix. Still open:

| Action                                   | Suggested permission                    |
| ---------------------------------------- | --------------------------------------- |
| `updateRevisionStatus`, `assignRevision` | `revisions.update`                      |
| `mergeRevision`                          | `revisions.update` (arguably `approve`) |
| `rollbackRevision`                       | `revisions.restore`                     |

### deliverables — `src/features/deliverables/real-actions.ts`

| Action               | Suggested permission   | Note                                                                                                          |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `approveRevision`    | `deliverables.approve` | **Highest-value item in this document.** Approval authority currently rests on organisation membership alone. |
| `requestRevision`    | `revisions.create`     |                                                                                                               |
| `startReviewSession` | `deliverables.review`  |                                                                                                               |
| `generateShareLink`  | `share_links.create`   | An unauthenticated credential is minted here.                                                                 |

### calendar — `src/features/calendar/action-core.ts`

| Action               | Suggested permission                         |
| -------------------- | -------------------------------------------- |
| the read entry point | `projects.read` or a `calendar`-shaped grant |

### approvals — `src/features/approvals/real-actions.ts`

| Action                     | Note                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPendingApprovalsCount` | Scoped to `reviewerId = user.userId` and the caller's organisation, so it is correct; it has no `requirePermission` because a count of one's own queue is self-scoped. Recorded so it is not "fixed" by mistake. |

---

## 2. Structural items

### S-1 · `checkOwnerProtectionMock` is exported from a `"use server"` file

`src/features/organizations/mock-actions.ts`

An internal helper published on the action surface — the same class as H-4,
but demo-only: it takes the in-memory store as its first argument and cannot
reach the database. Allow-listed in
`tests/unit/tenant-identity-surface.test.ts` with that reason. Fix by moving it
to a plain module alongside the store.

### S-2 · `stopTaskTimer` accepts a defaulted transaction

`src/features/tasks/real-actions.ts`

`tx: typeof db | DbTransaction = db` on a public action. Milder than H-4 (the
default makes it callable standalone, and it is scoped by `userId`), but the
parameter has no business on the public signature. Changing it is a behavioural
change and was left out of a security hotfix deliberately. The static gate
targets _required_ `tx` parameters for this reason.

### S-3 · `promoteActionItemToTask` generates task codes from `Math.random()`

`src/features/tasks` code format `AIC-T-<year>-<0..9999>`. A collision is a
duplicate business identifier, not a security issue, but it belongs with the
sequence generator used elsewhere (`organizationSequences`).

### S-4 · `createApprovalCycle` does not validate `entityId`

The entity is polymorphic across nine `entityType` values, so validating it
means a switch across nine tables. The cycle is stamped with the caller's
organisation and `workflowId` is now checked, so the residual risk is a cycle
pointing at a non-existent or foreign entity id — a data-integrity defect, not
a disclosure. Wants a resolver keyed on `entityType`.

---

## 3. The audit engine

Recorded here because remediating §1 without fixing this leaves no way to know
when it is done.

| #   | Gap                                                                                           | Effect                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A-1 | Action regex is `export async function` only                                                  | `export const x = async` modules are invisible — this is why CRIT-2 passed CI                                           |
| A-2 | Only four filenames are scanned (`real-actions`, `real-index`, `real-queries`, `action-core`) | `form-actions.ts`, `read-model-actions.ts`, `policy-actions.ts`, `search/actions.ts`, `demo-login.ts` are never checked |
| A-3 | `requireCurrentUser` and `getCurrentUser` count as guards                                     | Control (1) alone scores as covered — every item in §1 passes                                                           |
| A-4 | `getCurrentUser` does not throw                                                               | An action that ignores its `null` is scored as protected                                                                |
| A-5 | Substring matching, not call-graph analysis                                                   | The word `requirePermission` in a comment satisfies it                                                                  |
| A-6 | No notion of tenant scoping                                                                   | No IDOR is detectable at all                                                                                            |

**Suggested shape for the repair:** report three states per action —
`authenticated`, `authorized`, `tenant-scoped` — instead of one boolean, and
make the last two advisory until §1 is cleared, then blocking. Until then
`tests/unit/tenant-identity-surface.test.ts` covers the narrow case that
actually produced a critical.

---

## 4. Test coverage still missing

From the Phase 2.5.1 audit, unchanged by this hotfix:

1. **`src/proxy.ts` is untested** — the auth gate itself.
2. **The integration suite never runs in CI.** Every executed tenant-isolation
   proof is local-only. This is the single highest-value item here.
3. No test that a lower-privilege user calling a real action against a real
   database is denied. The hotfix tests assert the _predicate_; only the
   integration suite asserts the _row_.
4. Share-token validation (expiry, revocation, password, view caps) is untested
   end to end.
5. No E2E tests. `@playwright/test` is installed; there is no config and no
   `e2e/` directory.
