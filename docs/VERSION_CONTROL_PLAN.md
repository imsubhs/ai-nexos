# AI NEX OS — Version Control Plan

**Version:** 1.0
**Date:** 2026-07-28
**Phase:** C.1 — Repository Stabilization
**Status:** Plan only. Nothing has been staged, committed, tagged or pushed.
**Authority:** Principal Enterprise Software Architect

---

## 1. Current State

| Property               | Value                                                      |
| ---------------------- | ---------------------------------------------------------- |
| Branch                 | `phase-03-core-product`                                    |
| Commits                | 2 — `1b17234`, `c2a9190`                                   |
| Tags                   | **none**                                                   |
| Remotes                | **none**                                                   |
| `main`                 | Local only, 2 commits behind, 552-file tree behind reality |
| Working tree           | 71 modified · 2 deleted · 68 untracked paths (238 files)   |
| `package.json` version | `0.1.0` — disagrees with every document in `docs/`         |

Two commits stand between the current tree and an empty repository. There is no second copy. This document exists to end that condition.

---

## 2. Versioning Scheme — SemVer with pre-release identifiers

`MAJOR.MINOR.PATCH[-prerelease]`

| Version     | Meaning at AI NEX OS                                                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MAJOR**   | Breaking change to a frozen contract — dispatcher signature, public gateway, state machine vocabulary, or a destructive schema migration. Baseline Rules 3–6 mean this should be rare. |
| **MINOR**   | New capability, additively. New module, new workspace, new domain action.                                                                                                              |
| **PATCH**   | Defect fix, no contract change, no schema change.                                                                                                                                      |
| **`-beta`** | Certified for demonstration. **Not certified for customer data.**                                                                                                                      |
| **`-rc.N`** | Release candidate. Feature complete _and_ production-substrate complete; undergoing staging soak.                                                                                      |

### Release identity

| Field             | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| **Release name**  | **AI NEX OS v1.0 Beta — "Demo Platform Complete"**                        |
| **Version**       | `1.0.0-beta`                                                              |
| **Git tag**       | `v1.0.0-beta`                                                             |
| **Certified**     | Demonstration, evaluation, design-partner pilots on demo persistence      |
| **Not certified** | Customer production, real customer data, any `DEMO_MODE=false` deployment |

### Why `1.0.0-beta`

Reaffirming `BETA_FREEZE.md` §5.6, because the reasoning still holds:

| Rejected        | Why                                                                       |
| --------------- | ------------------------------------------------------------------------- |
| `v1.0.0`        | Materially misleading. Nothing has executed against a database.           |
| `v0.9.0`        | Understates a certified 19-module architecture with 240 passing tests.    |
| `v1.0-demo`     | Implies the product is permanently a demo. It is a stage, not a category. |
| `v1.0.0-beta.1` | Unnecessary precision. There will be one beta.                            |

`1.0.0-beta` sorts correctly under SemVer (`1.0.0-beta` < `1.0.0-rc.1` < `1.0.0`) and is unambiguous about maturity to anyone reading `git tag`.

### `package.json` must be corrected

`package.json` reads `"version": "0.1.0"`. Every document in `docs/` says v1.0.0-beta, and `/api/health` already returns `"version":"1.0.0"` — so the repository currently reports three different versions of itself.

Set `"version": "1.0.0-beta"` as part of Commit 9, so the tag, the manifest and the docs agree.

---

## 3. Tag Strategy

### Tags to create now

| Tag                   | Points at          | Type          | Purpose                                                       |
| --------------------- | ------------------ | ------------- | ------------------------------------------------------------- |
| **`v1.0.0-beta`**     | Commit 9 (`docs:`) | **Annotated** | The freeze point. Every migration sprint diffs against this.  |
| **`v1.0.0-baseline`** | `1b17234`          | **Annotated** | Retroactive. Gives `NEXOS_v1.0_BASELINE.md` a commit to cite. |

**Annotated, not lightweight.** A lightweight tag is a bare pointer with no author, date or message. The annotation is what makes the tag survive independently of `docs/` — if the documentation directory were ever lost, `git show v1.0.0-beta` should still state what was certified.

```bash
git tag -a v1.0.0-beta -F - <<'EOF'
AI NEX OS v1.0.0-beta — Demo Platform Complete

CERTIFIED FOR:  design-partner demonstration, internal evaluation,
                investor walkthroughs, guided pilots on demo persistence
NOT CERTIFIED:  customer production, real customer data,
                any deployment with DEMO_MODE=false

ARCHITECTURE      CERTIFIED    9.5/10   19 modules, contracts held
BUSINESS DOMAIN   CERTIFIED    9.0/10   14 modules, complete write surface
INTERACTION       CERTIFIED    8.5/10   39/39 workflows verified in-browser
QUALITY GATES     PASS         lint 0 · types 0 · 240/240 · build green (35 routes)
PLATFORM RUNTIME  NOT CERTIFIED         no worker invoker, no event bus, no scheduler
PERSISTENCE       NOT CERTIFIED         real adapters never executed
SECURITY RUNTIME  NOT CERTIFIED         RLS never evaluated by a database

OVERALL                        7.5/10

Baseline:  NEXOS_v1.0_BASELINE.md (2026-07-20)
Freeze:    docs/BETA_FREEZE.md
Next:      Sprint 13 — Persistence Migration
EOF

git tag -a v1.0.0-baseline 1b17234 -m "M0 architectural baseline — see NEXOS_v1.0_BASELINE.md"
```

### Future tags

| Tag           | When                        | Gate                                                                   |
| ------------- | --------------------------- | ---------------------------------------------------------------------- |
| `v1.0.0-rc.1` | Sprint 16 complete          | Background runtime live, observability wired                           |
| `v1.0.0-rc.N` | Each staging soak iteration | —                                                                      |
| `v1.0.0`      | Sprint 17 sign-off          | `PRODUCTION_READINESS_CHECKLIST.md` fully green; 7 days staging, no P1 |
| `v1.0.1`, …   | Post-release patches        | Hotfix flow, §5                                                        |

---

## 4. Branch Strategy

### The transition

`phase-03-core-product` has served as a de-facto trunk for three months. That is not wrong for a single-engineer project, but it leaves `main` as a trap: anyone who clones and checks out the default branch gets a 2-commit skeleton.

```
  BEFORE                              AFTER

  main  ●──●                          main  ●──●──●──●──●──●──●──●──●──●  ← trunk
           (2 commits)                                              │
                                                              v1.0.0-beta
  phase-03-core-product ●──●
           (same 2 commits,            phase-03-core-product ─┘ (merged, retire)
            552 loose files)
                                      sprint-13-persistence  ●──●──●
                                                              (from main)
```

**Steps, in order:**

1. Execute Commits 1–9 on `phase-03-core-product` (see `REPOSITORY_STABILIZATION_REPORT.md` §8).
2. Tag `v1.0.0-beta` and `v1.0.0-baseline`.
3. **Fast-forward `main`** to `phase-03-core-product` — this is a true fast-forward, no merge commit, because `main` is a strict ancestor.
4. Add a remote and push `main`, `phase-03-core-product` and **both tags**.
5. Make `main` the default branch on the remote.
6. Retire `phase-03-core-product` (keep the ref for provenance; stop committing to it).
7. Execute Commits 10–13 on a short-lived `chore/post-freeze-remediation` branch, merged to `main`.

```bash
git checkout main
git merge --ff-only phase-03-core-product   # fails loudly if not a clean FF — that is the point
```

### Long-term model — trunk-based with short-lived sprint branches

`main` is always releasable-at-its-tier. Work happens on short-lived branches. No long-lived develop branch — with one to two engineers it adds ceremony and no safety.

| Branch pattern          | Cut from            | Merges to                    | Lifetime           |
| ----------------------- | ------------------- | ---------------------------- | ------------------ |
| `main`                  | —                   | —                            | Permanent trunk    |
| `sprint-13-persistence` | `main`              | `main`                       | One sprint         |
| `sprint-14-storage`     | `main`              | `main`                       | One sprint         |
| `sprint-15-auth`        | `main`              | `main`                       | One sprint         |
| `sprint-16-runtime`     | `main`              | `main`                       | One sprint         |
| `sprint-17-deployment`  | `main`              | `main`                       | One sprint         |
| `feat/<slug>`           | `main`              | `main`                       | Days               |
| `fix/<slug>`            | `main`              | `main`                       | Hours to days      |
| `chore/<slug>`          | `main`              | `main`                       | Hours              |
| `docs/<slug>`           | `main`              | `main`                       | Hours              |
| `release/1.0`           | `main` at Sprint 16 | `main` (back-merge)          | Until v1.0.0 ships |
| `hotfix/<slug>`         | Release tag         | `release/1.0` **and** `main` | Hours              |

**Sprint branch discipline.** Sprints 14 and 15 may overlap after 13 lands (`PRODUCTION_MIGRATION_PLAN.md` §4). Both cut from `main` after 13 merges — not from each other. If they must share a change, it goes to `main` first.

### Release branches

`release/1.0` is cut at Sprint 16 completion, not before. Its purpose is to let Sprint 17's deployment hardening stabilise while post-v1.0 feature work resumes on `main`.

- Only fixes go to `release/1.0`. No new capability.
- Every fix on `release/1.0` is back-merged to `main` in the same session. A fix that exists on only one branch is a future regression.
- `v1.0.0-rc.N` and `v1.0.0` are tagged on `release/1.0`.

### Hotfix flow

```
v1.0.0 (tag on release/1.0)
   │
   └─ hotfix/portal-token-expiry ──┬──▶ release/1.0 ──▶ tag v1.0.1
                                   └──▶ main
```

Cut from the **tag**, not from `release/1.0` HEAD, so the hotfix contains nothing but the fix. Merge to both targets before closing. A hotfix that skips the `main` merge is how a fixed bug returns in the next release.

---

## 5. Commit Conventions

**Conventional Commits.** Already the de-facto style in the two existing commits (`chore:`, `feat:`) — this formalises it.

```
<type>(<scope>): <imperative subject, lower case, no trailing period>

<body: why, not what. wrap at 72.>

<footer: refs, BREAKING CHANGE:>
```

| Type       | Use                                                                            |
| ---------- | ------------------------------------------------------------------------------ |
| `feat`     | New capability                                                                 |
| `fix`      | Defect fix                                                                     |
| `chore`    | Tooling, deps, housekeeping                                                    |
| `docs`     | Documentation only                                                             |
| `test`     | Tests only                                                                     |
| `refactor` | No behaviour change                                                            |
| `perf`     | Performance                                                                    |
| `style`    | Formatting only — **no logic**                                                 |
| `ci`       | Pipeline                                                                       |
| `db`       | Migration or schema (project-specific; keeps migrations findable in `git log`) |

Scopes follow the module vocabulary: `platform`, `workforce`, `tasks`, `files`, `deliverables`, `meetings`, `timelines`, `notifications`, `auth`, `search`, `portal`, `db`, `ui`, `interaction`, `domain`, `deps`.

### Rules

1. **Migrations never travel alone and never travel partially.** A commit touching `_journal.json` must contain every `.sql` and every snapshot it references. Stage migration commits with **explicit paths** — never `git add -u`, never `git commit -a`. See `REPOSITORY_STABILIZATION_REPORT.md` §4.2 for what happens otherwise.
2. **A frozen-contract change is `BREAKING CHANGE:`** and requires Principal Architect sign-off in the footer. Frozen: dispatcher signatures (Rule 3), `src/proxy.ts` (Rule 4), state machine vocabularies (Rule 5).
3. **`style:` commits contain no logic.** Verify with `git diff --stat` before committing; a formatting commit that changes behaviour is undiscoverable later.
4. **Never commit `.env*` except `.env.example`.**
5. **Baseline Rule 8 — no uncommitted changes at a sprint boundary.** This plan exists because that rule was suspended for three months.

---

## 6. Protection Rules

To apply once the remote exists. None can be applied today because there is nothing to protect them on.

| Rule            | `main`                                                   | `release/*` |
| --------------- | -------------------------------------------------------- | ----------- |
| Force push      | **Blocked**                                              | **Blocked** |
| Branch deletion | **Blocked**                                              | **Blocked** |
| Direct push     | Discouraged; allowed while single-engineer               | **Blocked** |
| PR required     | Once a second engineer joins                             | **Yes**     |
| Required checks | `lint` · `format:check` · `typecheck` · `test` · `build` | Same        |
| Linear history  | Preferred (squash or rebase)                             | Required    |
| Signed commits  | Optional at v1.0; recommended before customer data       | Recommended |

**Required checks cannot be enabled until CI is fixed.** Two of the five steps currently fail (`REPOSITORY_STABILIZATION_REPORT.md` §7.4). Enabling required checks against a broken pipeline blocks all merges. Order: fix CI (Commits 10–11) → confirm green on the remote → then enable required checks.

---

## 7. Remote Strategy

**This is the highest-priority action in the repository.** Everything else in this document is bookkeeping; this is the difference between work that exists and work that exists in one place.

### Requirements

| Requirement                                   | Rationale                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Private**                                   | The repository contains no secrets, but it is a commercial product with a full architecture.    |
| Supports annotated tags and branch protection | §3, §6                                                                                          |
| GitHub Actions available                      | `.github/workflows/ci.yml` already targets it                                                   |
| Org-owned, not personal                       | Survives one person's account. Relevant for a product with a migration plan measured in months. |

**Recommendation: a private GitHub repository under an organisation account**, named `ai-nexos`.

```bash
git remote add origin git@github.com:<org>/ai-nexos.git
git push -u origin main
git push origin phase-03-core-product
git push origin --tags          # both annotated tags
git remote -v                   # verify
```

### Verify the push actually protected the work

Pushing is not the same as having a backup. Confirm:

```bash
git ls-remote --tags origin              # v1.0.0-beta and v1.0.0-baseline present?
git rev-parse HEAD                       # matches origin/main?
git rev-parse origin/main
```

Then perform the clone-elsewhere check in `RECOVERY_CHECKLIST.md` §2. A remote that has never been cloned from is an assumption, not a backup.

### Secondary copy

A single remote is one provider outage or one account lockout from unavailability. Once `origin` exists, add either a second remote mirror or a scheduled `git bundle` to separate storage:

```bash
git bundle create ai-nexos-$(date +%Y%m%d).bundle --all
```

A bundle is a single file containing the entire history and is restorable with `git clone <file>`. Cheap, and it does not depend on any hosting provider.

**Also note:** the enclosing `WebsiteCreation` directory is a _separate_ git repository that does **not** track `ai-nexos`. Backing up the parent does not back up this project. Anyone who assumes otherwise has no backup at all.

---

## 8. Execution Order

The complete sequence, blocking-first.

| #   | Action                                                                   | Blocks                             |
| --- | ------------------------------------------------------------------------ | ---------------------------------- |
| 1   | **Commit 1** — journal + `0008`/`0009` + snapshots, **explicit paths**   | Everything                         |
| 2   | **Commits 2–8** — sprint history                                         | Tag                                |
| 3   | **Commit 9** — docs; set `package.json` to `1.0.0-beta`                  | Tag                                |
| 4   | **Tag** `v1.0.0-beta` (annotated) and `v1.0.0-baseline`                  | Push                               |
| 5   | **Fast-forward `main`** (`--ff-only`)                                    | Push                               |
| 6   | **Add remote; push `main`, branch, both tags**                           | ⛔ **Everything after this point** |
| 7   | **Verify** — `git ls-remote`, then clone elsewhere and run the gates     | Sprint 13                          |
| 8   | **Commits 10–11** — fix CI (`DATABASE_URL`, `DEMO_MODE`; prettier sweep) | Required checks                    |
| 9   | Confirm CI green on the remote                                           | Required checks                    |
| 10  | Enable branch protection and required checks                             | —                                  |
| 11  | **Commits 12–13** — drop unused deps; pin Node; `.gitignore` additions   | —                                  |
| 12  | Cut `sprint-13-persistence` from `main`                                  | Sprint 13                          |

**Steps 1–7 are Gate G1** (`PRODUCTION_READINESS_CHECKLIST.md` items 1.1–1.5). Sprint 13 does not begin until step 7 passes — not as its first task, as its precondition. `PRODUCTION_MIGRATION_PLAN.md` §3 Sprint 13 states this: _"Migrating on 136 uncommitted files means a failed migration has nothing to roll back to."_

---

_Plan only. Nothing was staged, committed, tagged or pushed in Phase C.1. Awaiting architecture approval._
