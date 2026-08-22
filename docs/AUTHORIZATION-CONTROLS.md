# Authorization controls — the four things that are not the same thing

**Status:** current as of the Phase 2.5.1 security hotfix
**Related:** [SECURITY.md](SECURITY.md) · [THREAT-MODEL.md](THREAT-MODEL.md) ·
[AUTHORIZATION-REMEDIATION.md](AUTHORIZATION-REMEDIATION.md)

This document exists because the Phase 2.5.1 audit found two critical and four
high-severity defects in code that `npm run audit:authz` reported as fully
covered, and the reason it did is a category error that is easy to make and
hard to see: **the audit measures one control and the codebase needs four.**

---

## 1. The four controls

| #   | Control                        | Question it answers                                     | Mechanism here                                                             |
| --- | ------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | **Authentication**             | Is there a caller, and who are they?                    | `requireCurrentUser()` / `getCurrentUser()`                                |
| 2   | **Authorization (RBAC)**       | May this _role_ perform this _kind of_ operation?       | `requirePermission(user.permissions, module, action)`                      |
| 3   | **Object-level authorization** | Is this _particular record_ this caller's to act on?    | ownership checks — `review.reviewerId === user.userId`, project membership |
| 4   | **Tenant isolation**           | Does this record belong to the caller's _organisation_? | `eq(table.organizationId, user.organizationId)` in every predicate         |

They are independent. An action can hold any subset. The audit script only ever
asked whether **(1)** was reachable.

### What each one does not give you

- **(1) without (4)** — `submitReview()` before the hotfix. A real, signed-in
  user, correctly authenticated, updating another organisation's row by
  primary key. Authentication says the caller exists; it says nothing about
  what they may touch.
- **(2) without (3)** — an organisation-wide `approvals.review` grant is
  permission to take part in reviews, not permission to cast _someone else's_
  vote. Without an ownership check, every member can decide every review.
- **(2) without (4)** — role checks are evaluated against the caller's own
  permission map, which is derived from their own organisation. They are
  therefore _always_ satisfied for a cross-tenant request, and contribute
  nothing to isolation.
- **(4) without (2)** — correctly scoped to the tenant, and every member of it
  can do the operation regardless of role. This is the bulk of the outstanding
  MEDIUM findings.
- **(3)/(4) derived from caller input** — the CRIT-2 shape. A predicate that
  filters on `organizationId` _supplied in the request body_ is not tenant
  isolation. It looks exactly like it in a diff, which is what makes it
  dangerous.

---

## 2. The rule that makes (4) hold

> **The tenant is never a parameter.**

`organizationId` comes from `requireCurrentUser()`, or for external callers from
a verified token. It is never read from a request body, a form field, or a
component prop.

Where an action legitimately needs to name _another_ user — adding a project
member, delegating a review — that id is a **subject**, not an identity claim,
and it must itself be resolved inside the caller's organisation before use. See
`addProjectMember` and `delegateReview`.

This is enforced statically by
[`tests/unit/tenant-identity-surface.test.ts`](../tests/unit/tenant-identity-surface.test.ts),
which fails the build if any `"use server"` export accepts `userId`,
`organizationId`, `orgId` or `tenantId` as a top-level parameter. The allow-list
is deliberately tiny and every entry carries a written reason.

---

## 3. Why the existing audit missed all of it

`scripts/audit-authorization.ts` walks exported actions and asks whether any of
a set of guard names is reachable within four call hops. Its own header is
honest that it "cannot prove that the guard which is reached checks the right
permission for the right resource". Three concrete consequences:

1. **`requireCurrentUser` satisfies it.** Control (1) alone scores as covered,
   so every finding in the hotfix passed.
2. **It only matches `export async function`.** The entire notifications module
   uses `export const x = async (…) =>`, so the audit found _zero_ actions in the
   file that contained the platform's worst defect and reported nothing missing.
3. **`getCurrentUser` counts as a guard.** It returns `CurrentUser | null` and
   does not throw; an action that ignores the null is scored as protected.

The hotfix did not rewrite the audit. It added a narrower gate that catches the
specific shape (§2), and this document so the next change to the audit is made
against a stated model rather than an implied one.

---

## 4. Writing a new server action

```ts
export async function doSomething(resourceId: string, input: Input) {
  //  (1) authentication
  const user = await requireCurrentUser();

  //  (2) authorization — may this role do this at all?
  requirePermission(user.permissions, "module", "action");

  //  (3) + (4) object-level authz and tenant isolation, together, before any
  //  mutation. Prefer a feature-local validate*Access helper so the walk is
  //  written once.
  const resource = await validateResourceAccess(resourceId, user);

  //  ...mutate, with organizationId still in the predicate.
}
```

Feature helpers that already do this correctly and are worth copying:

| Helper                                                          | Feature   |
| --------------------------------------------------------------- | --------- |
| `validateInternalReviewAccess` / `validateExternalReviewAccess` | approvals |
| `validateFileAccess`                                            | files     |
| `validateRevisionAccess` / `validateDeliverableAccess`          | revisions |
| `loadMeetingForWrite` / `loadActionItemForWrite`                | meetings  |
| `authorizeTimelineEdit`                                         | timelines |
| `authoriseShareToken` + `requireItemInSession`                  | shares    |

---

## 5. Two notes on judgement

**Self-scoped resources are authorised by ownership, not by RBAC.** A user's own
notifications are reached with control (3) and (4) and deliberately _no_
`requirePermission()`. Three of the seven system roles (`team_member`,
`finance`, `hr`) hold no `notifications` permission at all, so gating the bell on
one would deny most of an organisation access to their own inbox. Adding a
permission check there would be security theatre that breaks the product.

**External callers have no permissions.** An external reviewer is not a row in
`users`; controls (1) and (2) do not apply to them. The signed token _is_ the
authorization, which is why `validateExternalReviewAccess` checks signature,
expiry, subject binding, and the stored revocation record — four checks standing
in for the two controls that are unavailable.
