# AI NEX OS — Version 1.0 Beta Freeze

**Effective:** 2026-07-28
**Branch:** `phase-03-core-product`
**Freeze type:** Feature freeze on the demo platform. Not a code freeze — infrastructure migration continues in Sprints 13–17.
**Authority:** Principal Enterprise Software Architect

---

## 1. What Is Frozen

As of this document, the **demo platform is feature complete**. The following are closed to new work until the production migration completes:

| Frozen | Meaning |
|---|---|
| **Business domain surface** | No new capability in any of the 14 business modules. The unsupported list in `SPRINT-12B.md` §4 stays unsupported. |
| **Interaction layer** | No new controls, dialogs, drawers or panels. |
| **DemoStore shape** | No new collections, no new seed entities. It is a fixture, and it is finished. |
| **Schema** | Unchanged since before Sprint 11A: 10 journaled migrations, 199+ tables. No table, column or enum may be added during the migration sprints **except** where a sprint's acceptance criteria explicitly require one (Sprint 13 may add none; see the plan). |
| **All 8 baseline freezes** | Rules 1–6 of `NEXOS_v1.0_BASELINE.md` §14 remain in force verbatim. |

## 2. What Is Not Frozen

| Open | Rationale |
|---|---|
| **Adapter internals** (`real-*.ts`) | Sprints 13–15 will fix defects found when these execute against Postgres for the first time. Signatures stay frozen; bodies may change. |
| **Infrastructure wiring** | Storage provider, email channel, queue consumer, worker invokers, cron. All new, all additive. |
| **Environment and config** | `.env`, deployment config, CI. |
| **Documentation** | Continues throughout. |
| **Tests** | Adding tests is always in scope, and Sprint 13 requires new ones. |

## 3. Freeze Rationale

Three sprints of surface and domain work (11A → 12B) closed every gap that could be closed against an in-memory store. What remains is not a domain question — it is whether the code path customers would actually run works at all, and **that path has never executed.**

Continuing to add features on demo persistence would compound risk: every new adapter is another never-executed code path. The correct move is to stop adding, switch on the real substrate, and find out what breaks.

---

## 4. Freeze Preconditions — Verified

| Precondition | Status | Evidence |
|---|---|---|
| All quality gates green | **PASS** | lint 0 errors / 109 warnings · typecheck 0 · 240/240 tests · build green, 36 routes |
| No known P1 or P2 defects open | **PASS** | Phase A's P1-01, P1-02 and P2-01→P2-05 all closed and verified. **P2-06 remains open** — see §7. |
| Every live module reachable and usable | **PASS** | 10 live workspaces; 39/39 browser workflow checks |
| No runtime errors | **PASS** | 0 page errors; the single console error is an asserted, deliberate domain refusal |
| Domain gaps enumerated, not discovered | **PASS** | `SPRINT-12B.md` §4 |
| Technical debt current | **PASS** | `TECHNICAL-DEBT-NOTES.md` items 1–20 |
| Architecture unmodified | **PASS** | Baseline Rules 1–6 upheld |
| **Working tree committed** | **FAIL** | 136 uncommitted paths. See §5. This violates Baseline Rule 8 and is the single blocking item on this freeze. |

---

## 5. Repository Freeze Review (Phase 5)

### 5.1 Current state

```
Branch:        phase-03-core-product
Commits:       2   (1b17234 chore: Phase 1 + Phase 2 stabilization baseline (M0))
                   (c2a9190 feat: Milestone 1 — platform foundation)
Tags:          none
Remotes/other: main (local)

Working tree:  136 paths
                71 modified (tracked)
                63 untracked
                 2 deleted
```

**This is the most serious process finding in Phase C.** Sprints M3.1, 11A, 11B, Stabilization, Phase A, 12A and 12B — *every sprint since the M0 baseline* — are uncommitted. Two commits stand between the current tree and an empty repository. A single accidental `git checkout .` would destroy roughly three months of work, and there is no remote.

The Stabilization Report flagged this in July and it has not moved. Each subsequent sprint brief carried a "do not commit" stop condition, which was correctly obeyed — but the cumulative effect is a freeze that cannot actually freeze anything.

**Recommendation: commit before anything else in Sprint 13.** Not as a step within Sprint 13 — as its precondition.

### 5.2 Deleted files (2)

| File | Disposition |
|---|---|
| `src/features/notifications/components/NotificationCenter.tsx` | Intentional (Sprint 12A). Dead code, off-design-system, superseded by `notification-bell.tsx`. |
| `src/features/notifications/components/NotificationBadge.tsx` | Intentional (Sprint 12A). Same. |

Both deletions are correct and should be staged.

### 5.3 Untracked material requiring a decision

| Path | Size | Recommendation |
|---|---|---|
| `docs/phase-a-screenshots/` | 2.4 MB | **Commit.** Review evidence; small enough, and losing it makes Phase A unauditable. |
| `docs/stabilization-screenshots/` | 1.2 MB | **Commit.** Same. |
| `docs/sprint-12b-screenshots/` | 984 KB | **Commit.** Same. |
| `LOCAL_REVIEW_CHECKLIST.md` | small | **Commit** or gitignore — a decision, not a default. |
| `database/migrations/0008_*`, `0009_*` + snapshots | small | **Commit — highest priority.** Untracked migrations are a correctness hazard: the journal references them, so a fresh clone would have a journal pointing at files that do not exist. |
| `scratch/` | — | Already gitignored. Correct; leave it. |
| `.env.local` | — | Already gitignored. Correct. `.env.example` is tracked. |

### 5.4 Recommended commit grouping

Nine commits, ordered so that each leaves the tree buildable. **This is a recommendation only — nothing was committed or staged in Phase C.**

| # | Message | Contents |
|---|---|---|
| 1 | `fix(db): journal migrations 0008 and 0009` | `database/migrations/0008_*`, `0009_*`, `meta/*snapshot.json`, `meta/_journal.json` |
| 2 | `feat(platform): M3.1 navigation, organizations, settings` | `src/config/navigation.ts`, `src/features/organizations/`, `src/features/users/`, `src/app/(dashboard)/settings/`, `src/app/(dashboard)/unauthorized/` |
| 3 | `feat(workforce): employee directory and profile` | `src/features/workforce/`, `src/db/schema/workforce.ts`, `src/app/(dashboard)/workforce/` |
| 4 | `feat(reads): Sprint 11B global read layer` | `deliverables`/`files`/`meetings`/`timelines` read functions + their `*.test.ts` |
| 5 | `feat(ui): Sprint 11A workspaces` | `src/app/(dashboard)/{deliverables,files,meetings,tasks,timeline}/`, feature `components/`, `src/components/shared/` |
| 6 | `fix(stabilization): v1.0.1 defect sweep` | The 36 files in `STABILIZATION_REPORT.md` §3, `next.config.ts` |
| 7 | `feat(interaction): Sprint 12A write surface` | Sign-out fix, search, notification bell, confirm-dialog, popover, task/deliverable/file/meeting write components, `demo-store-schema-parity.test.ts` |
| 8 | `feat(domain): Sprint 12B domain completion` | The files in `SPRINT-12B.md` §§5–6 |
| 9 | `docs: v1.0 baseline through 1.0 beta freeze` | `NEXOS_v1.0_BASELINE.md`, all of `docs/`, screenshot directories |

Splitting 2–8 by sprint preserves the sprint history in `git log`, which is worth more than a single "everything" commit given how thoroughly each sprint is documented.

**If time is short**, a single `chore: v1.0.0-beta — sprints M3.1 through 12B` is materially better than the status quo. Nine imperfect commits beat two commits and 136 loose files; one imperfect commit also beats it.

### 5.5 Recommended tags

| Tag | Points at | Purpose |
|---|---|---|
| `v1.0.0-beta` | Commit 9 | **The freeze point.** The demo platform, feature complete. Every migration sprint diffs against this. |
| `v1.0.0-baseline` | `1b17234` (retroactive) | Marks the M0 architectural baseline so the baseline document has a commit to reference. |

Tag `v1.0.0-beta` **annotated**, not lightweight — the annotation should carry the certification summary from `VERSION_1.0_BETA.md` §5, so the freeze survives independently of the docs directory.

Later, per the migration plan: `v1.0.0-rc.1` after Sprint 16, `v1.0.0` at Sprint 17 sign-off.

### 5.6 Recommended release naming

**`v1.0.0-beta`** — SemVer pre-release, sorts correctly, and is unambiguous about maturity.

Rejected alternatives: `v1.0-demo` (implies it is only ever a demo), `v0.9.0` (understates a certified architecture), `v1.0.0` (materially misleading — nothing has run in production).

### 5.7 Branch strategy

`phase-03-core-product` has served as a long-lived trunk. Recommendation:

1. Commit and tag on `phase-03-core-product`.
2. **Fast-forward `main` to it** and make `main` the trunk again. A `main` two commits behind reality is a trap for anyone who joins.
3. Cut migration work as `sprint-13-persistence`, `sprint-14-storage`, … off `main`, merging back per sprint.
4. **Add a remote.** There is none. Everything above is theatre while the only copy is on one disk.

---

## 6. Freeze Exit Criteria

The beta freeze lifts when **all** of the following hold:

1. Sprints 13–16 complete with their acceptance criteria met.
2. `PRODUCTION_READINESS_CHECKLIST.md` is fully green.
3. A staging environment has run `DEMO_MODE=false` for **≥ 7 consecutive days** with no P1 defects.
4. Multi-tenant isolation is **proven by test** — a second organisation exists and cannot read the first's rows.
5. A restore-from-backup has been rehearsed and timed, not merely configured.
6. Sign-off is recorded from the Principal Architect.

---

## 7. Open Items Carried Into the Freeze

Recorded so the freeze is honest about what it contains.

| Item | Severity | Note |
|---|---|---|
| **136 uncommitted files, no remote, no tags** | **Critical** | §5. Blocks the freeze from meaning anything. |
| **P2-06 — `DEMO_MODE` accepts any credentials and grants `*:*`** | **High** | Phase A raised it; still open. `enterDemoWorkspace()` is guarded and sets cookie flags correctly, but `mock-actions.ts` sets `demo_session` with **no `httpOnly`, no `secure`, no `sameSite`**, and validates no password. Harmless while `DEMO_MODE=true` is never deployed — which nothing currently enforces at build time. |
| **RLS never evaluated by a database** | **High** | The platform's central security claim is unverified. Sprint 13 exists to close this. |
| **No worker, scheduler or event-bus invoker** | **High** | TD-05, TD-06. Sprint 16. |
| **Virus scanner always returns clean** | **High** | TD-09. Must land with or before Storage (Sprint 14). |
| **Baseline TD-05 over-states worker inventory** | **Low** | Names three workers; one exists. Correct the baseline at the next revision. |
| **Client portal never reviewed** | **Medium** | Flagged in Stabilization; still true. |
| **Non-owner RBAC never exercised in a browser** | **Medium** | Six roles defined, one used. |

---

## 8. Statement

> The AI NEX OS demo platform is **feature complete** and certified as **Version 1.0 Beta** for demonstration, evaluation and design-partner use.
>
> It is **not** certified for customer production. The production migration path is defined in `PRODUCTION_MIGRATION_PLAN.md` and gated by `PRODUCTION_READINESS_CHECKLIST.md`.
>
> This freeze is **provisional** until the working tree is committed and tagged. Until then there is no artefact to freeze.

**Awaiting architecture approval. No code was modified, committed, or pushed in Phase C.**
