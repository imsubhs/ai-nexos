# AI NEX OS — Repository Stabilization Report

**Phase:** C.1 — Repository Stabilization & Enterprise Baseline Freeze
**Date:** 2026-07-28
**Branch:** `phase-03-core-product`
**Authority:** Principal Enterprise Software Architect
**Scope:** Audit, verification and documentation only. **No code was modified, staged, committed, pushed or tagged.**

---

## 1. Executive Summary

The repository is **structurally sound and operationally unprotected.**

Everything Phase C claimed about the _product_ holds up under verification: lint is clean, typecheck is clean, 240/240 tests pass, the build is green, and a simulated fresh clone of the full working tree installs, builds and serves. The domain work is real and it is reproducible.

What is not sound is the **envelope around it.** Three months of work — every sprint since the M0 baseline — exists as 552 files in exactly one directory on one disk, behind two commits, with no tag and no remote. That was already the headline finding of `BETA_FREEZE.md` §5, and it has not moved.

Phase C.1 adds four findings Phase C did not have, all of them found by _executing_ the repository rather than reading it:

| #       | Finding                                                                                                                                                                                                                                                                                 | Severity   |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **F-1** | **CI would fail on two of its five steps, and has never run.** `npm run format:check` fails on 341 files. `npm run build` fails in CI because `.github/workflows/ci.yml` does not provide `DATABASE_URL`. There is no remote, so the workflow has never executed once.                  | **High**   |
| **F-2** | **A fresh clone cannot build at all.** `src/db/index.ts` throws `DATABASE_URL is not set` at module evaluation, during `next build` page-data collection — even with `DEMO_MODE=true`. The "build green" claim is true only on a machine that already has a populated `.env.local`.     | **High**   |
| **F-3** | **`DEMO_MODE` is absent from `.env.example`.** The single variable that selects the entire persistence layer is undocumented in the only template a new developer is given. Following the template verbatim produces an app that routes every call to never-executed Postgres adapters. | **High**   |
| **F-4** | **Phase C's own worker-inventory correction is wrong.** `sla-worker.ts` and `SessionCleanupWorker.ts` **both exist and are both tracked in git.** Baseline TD-05 was accurate; the Phase C "documentation defect" is itself the defect.                                                 | **Medium** |

Two further corrections to the record, both in the _reassuring_ direction:

- **`HEAD` is internally consistent.** The claim in `BETA_FREEZE.md` §5.3, `PRODUCTION_READINESS_CHECKLIST.md` 1.2, `BACKLOG.md` and `TECHNICAL-DEBT-NOTES.md` that "a fresh clone would carry a journal pointing at files that do not exist" is **not true of `HEAD`**, which has 8 journal entries and 8 migration files. The hazard is real but it is a _future_ hazard, and it has a specific trigger — see §4.
- **The recovery test passes.** A simulated clone of the committable tree, with no `.env.local` and no local state, reaches a working dev server. Nothing depends on undeclared local state except the four environment variables in §7.

**Bottom line.** The work is good, it is verifiable, and it is one `rm -rf` away from gone. Nothing in Phase C.1 changes the recommendation that has now been made three times: **commit, tag, and add a remote before Sprint 13 begins.** Phase C.1 adds that the CI pipeline meant to protect that work does not currently function, and should be fixed in the same pass.

---

## 2. Repository Audit (Phase 1)

### 2.1 Location and identity

| Property               | Value                                                                         |
| ---------------------- | ----------------------------------------------------------------------------- |
| Repository root        | `NEXOS Comb /AIC NEXOS/ai-nexos`                                              |
| Branch                 | `phase-03-core-product`                                                       |
| Other branches         | `main` (local only, 2 commits behind)                                         |
| Remotes                | **none**                                                                      |
| Tags                   | **none**                                                                      |
| Commits                | 2 — `1b17234` (M0 stabilization baseline), `c2a9190` (M1 platform foundation) |
| `package.json` version | `0.1.0` — **does not reflect `v1.0.0-beta`**                                  |

Note: the enclosing `WebsiteCreation` directory is itself a separate git repository. `ai-nexos` has its own `.git` and is **not** a submodule of it — it is an unrelated nested repository that the parent does not track. This is not a defect, but it means a backup of the parent repo does **not** back up `ai-nexos`.

### 2.2 File census

| Category                   | Count                    | Notes                                                                                                                   |
| -------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Tracked at `HEAD`          | 316                      |                                                                                                                         |
| Modified (tracked)         | 71                       | +6,970 / −663 lines across 73 changed paths                                                                             |
| Deleted (tracked)          | 2                        | Both intentional — see §3.3                                                                                             |
| Untracked (not ignored)    | 68 paths → **238 files** | 68 porcelain entries, several of which are directories                                                                  |
| **Total committable tree** | **552 files / 12 MB**    | tracked (working-tree content) + untracked-not-ignored                                                                  |
| Ignored on disk            | —                        | `.next` 1.7 GB · `node_modules` 741 MB · `scratch/` 136 KB · `tsconfig.tsbuildinfo` 400 KB · `.env.local` · `.DS_Store` |

`src/` is **416 TypeScript files / 47,746 lines**.

### 2.3 Generated, temporary and artefact audit

| Path                            | On disk          | Ignored                | Tracked        | Verdict                                            |
| ------------------------------- | ---------------- | ---------------------- | -------------- | -------------------------------------------------- |
| `.next/`                        | 1.7 GB           | ✅                     | ❌             | Correct                                            |
| `node_modules/`                 | 741 MB           | ✅                     | ❌             | Correct                                            |
| `tsconfig.tsbuildinfo`          | 400 KB           | ✅ (`*.tsbuildinfo`)   | ❌             | Correct                                            |
| `.env.local`                    | present          | ✅ (`.env*`)           | ❌             | Correct — and `.env.example` correctly re-included |
| `.DS_Store`                     | 1 (root)         | ✅                     | ❌ (0 tracked) | Correct                                            |
| `scratch/`                      | 136 KB, 20 files | ✅                     | ❌             | Correct as a rule — **but see F-5 below**          |
| `coverage/`                     | absent           | ✅                     | —              | N/A                                                |
| `playwright-report/`            | absent           | ❌ not in `.gitignore` | —              | Harmless today; add pre-emptively                  |
| `test-results/`                 | absent           | ❌ not in `.gitignore` | —              | Same                                               |
| `tmp/`, `logs/`, `screenshots/` | absent           | ❌                     | —              | Same                                               |

**No build output, cache, coverage or test artefact is tracked anywhere in the index.** This was verified directly against `git ls-files`, not inferred from `.gitignore`.

**F-5 — the E2E suite is not in the repository.** `@playwright/test` is a devDependency, but there is **no `playwright.config.*`, no `*.spec.ts`, and no `tests/e2e/`**. The "39/39 browser workflow checks" that `VERSION_1.0_BETA.md` §2.5 certifies were executed by ad-hoc scripts in `scratch/` (`scratch/sprint12b/verify.mjs`, `scratch/stabilization/*.mjs`) — which is **gitignored**. The verification is therefore genuine but **not reproducible from a clone, and not re-runnable by anyone else.** This is a gap between what the certification documents claim as evidence and what the repository can produce.

`scratch/` being ignored is the right call for working notes. The decision that needs making is narrower: **the verification harness is not a working note.** It is the only executable evidence behind the interaction-layer certification.

### 2.4 What belongs in v1.0 Beta

All 552 files. Specifically:

| Group                                                                                                                                                                    | Disposition                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `src/` (416 files), `tests/unit/` (22 files), `scripts/`, `supabase/`, `public/`                                                                                         | **Commit.** Product.                                                                                                     |
| `database/migrations/` incl. untracked `0008`/`0009` + snapshots                                                                                                         | **Commit — atomically with `_journal.json`.** See §4.                                                                    |
| `database/drafts/automation_rls.draft.sql`                                                                                                                               | Already tracked. Leave; TD-07 resolves it in Sprint 13.                                                                  |
| `docs/` (29 `.md`) + `NEXOS_v1.0_BASELINE.md`                                                                                                                            | **Commit.**                                                                                                              |
| `docs/*screenshots*/` — 46 PNGs, 4.6 MB                                                                                                                                  | **Commit.** 4.6 MB against a 12 MB tree is cheap, and without them Phase A and the Stabilization review are unauditable. |
| `LOCAL_REVIEW_CHECKLIST.md`                                                                                                                                              | **Commit.** It is a repeatable review procedure, not a scratch note.                                                     |
| Config: `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `drizzle.config.ts`, `components.json`, `tsconfig.json`, `.prettierrc`, `.prettierignore`, `.github/` | **Commit.**                                                                                                              |

### 2.5 What must never be committed

`.env.local` and any real credential; `node_modules/`; `.next/`; `*.tsbuildinfo`; `.DS_Store`; `coverage/`; and — with the F-5 caveat above — `scratch/`.

---

## 3. Working Tree Report (Phase 2)

### 3.1 `.gitignore` assessment — **correct, with three additions recommended**

The existing 40-line `.gitignore` handles every artefact actually present. Two entries deserve explicit credit for being right:

- `.env*` followed by `!.env.example` — deny-then-allow, the safe ordering.
- `/scratch/` — root-anchored, so a legitimate `src/**/scratch` would not be swallowed.

Recommended additions (pre-emptive; none of these paths exists today):

```gitignore
# playwright
/playwright-report/
/test-results/
/blob-report/
/playwright/.cache/

# misc local
/tmp/
/logs/
*.log
.DS_Store
**/.DS_Store
```

`.DS_Store` is already matched; the `**/.DS_Store` form is added only because macOS creates them in subdirectories and the bare pattern already works — this is belt-and-braces, not a fix.

### 3.2 Cleanup actions required

**None.** No source file needs deleting, and no artefact needs untracking. The working tree contains only intentional project assets plus correctly-ignored local state.

The one _optional_ hygiene action is deleting `.next/` (1.7 GB) to reclaim disk. It is regenerated by `npm run build` and is not tracked. **Not required for stabilization.**

### 3.3 Deleted files — both correct

| File                                                           | Verdict                                                                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/features/notifications/components/NotificationCenter.tsx` | Intentional (Sprint 12A). Dead code, no importers, superseded by `notification-bell.tsx`. **Stage the deletion.** |
| `src/features/notifications/components/NotificationBadge.tsx`  | Same. **Stage the deletion.**                                                                                     |

Verified: no file in `src/` or `tests/` imports either symbol.

---

## 4. Migration Audit (Phase 3)

**No migration file, snapshot or journal entry was modified.**

### 4.1 Integrity — clean

| Check                          | Result                                                 |
| ------------------------------ | ------------------------------------------------------ |
| Journal entries                | 10 (`idx` 0–9, contiguous, no gaps)                    |
| Migration `.sql` files on disk | 10                                                     |
| Snapshot `.json` files         | 10                                                     |
| Journal tag ↔ filename match   | **10/10 exact**                                        |
| `idx` ordering                 | Sequential 0→9, no duplicates                          |
| `when` timestamps              | **Strictly ascending** — 1783799227859 → 1784319321213 |
| `version` / `dialect`          | `"7"` / `postgresql`, uniform across all entries       |
| Duplicate migrations           | **None**                                               |
| Out-of-order migrations        | **None**                                               |
| Broken references              | **None**                                               |
| Missing migrations             | **None**                                               |

The migration set is **internally consistent and correctly ordered.** Drizzle would apply it cleanly.

### 4.2 The tracking hazard — real, but precisely characterised

The prior documents state the hazard incorrectly, and the correction matters because it changes what you have to be careful about.

| State                        | Journal entries    | `.sql` files present | Consistent?   |
| ---------------------------- | ------------------ | -------------------- | ------------- |
| **`HEAD` (committed)**       | 8 (`0000`–`0007`)  | 8                    | ✅ **Yes**    |
| **Working tree**             | 10 (`0000`–`0009`) | 10                   | ✅ **Yes**    |
| **`git add -u` then commit** | **10**             | **8**                | ❌ **BROKEN** |

`_journal.json` is a **tracked, modified** file. `0008_*.sql`, `0009_*.sql` and their two snapshots are **untracked**.

So: a clone of `HEAD` today is fine, and a clone after committing everything is fine. The failure mode is the **middle** state, and it is reached by `git add -u` / `git commit -a` — which stage modifications to tracked files and _ignore untracked files_. That is the most natural command anyone would reach for, and it silently produces a repository whose journal references two migrations that do not exist.

**Mitigation — non-negotiable:** the migration commit must be made with explicit paths and must be atomic:

```bash
git add database/migrations/0008_same_johnny_storm.sql \
        database/migrations/0009_mute_wallow.sql \
        database/migrations/meta/0008_snapshot.json \
        database/migrations/meta/0009_snapshot.json \
        database/migrations/meta/_journal.json
git status --short database/   # verify all five, nothing missing
```

Never `git add -u` while `0008`/`0009` are untracked. This is Commit 1 in §8 for exactly this reason.

### 4.3 Non-journaled SQL

`database/drafts/automation_rls.draft.sql` is **tracked** and correctly quarantined outside `database/migrations/`. Drizzle will not see it. TD-07 stands; Sprint 13 journals or deletes it. **Not a stabilization blocker.**

---

## 5. Dependency Audit (Phase 6)

**Nothing was upgraded, added or removed.**

### 5.1 Toolchain

| Component           | Version                   | Pinned?                                      |
| ------------------- | ------------------------- | -------------------------------------------- |
| Node (local)        | v24.15.0                  | **No pin** — no `engines` field, no `.nvmrc` |
| npm                 | 11.12.1                   | —                                            |
| CI Node             | 24 (`actions/setup-node`) | Pinned in workflow only                      |
| `package-lock.json` | lockfileVersion 3         | ✅ present and tracked                       |
| Next.js             | 16.2.10 (exact)           | ✅                                           |
| React / React DOM   | 19.2.4 (exact)            | ✅                                           |
| TypeScript          | ^5                        | Loose                                        |
| Tailwind            | ^4                        | Loose                                        |
| Drizzle ORM / Kit   | ^0.45.2 / ^0.31.10        | Loose                                        |
| Supabase JS / SSR   | ^2.110.2 / ^0.12.0        | Loose                                        |
| Vitest              | ^4.1.10                   | Loose                                        |
| Playwright          | ^1.61.1                   | Loose — **and unused, see F-5**              |
| ESLint              | ^9                        | Loose                                        |

**Gap:** Node is not pinned in the repository. CI pins `node-version: 24`; a developer's machine is unconstrained. Add `"engines": { "node": ">=24 <25" }` and an `.nvmrc` containing `24`. Low effort, prevents a class of "works on my machine".

### 5.2 Unused dependencies — 4 confirmed

Verified by grepping `src/`, `tests/` and `scripts/` for every import specifier, then hand-checking each candidate:

| Package                 | Evidence                                                                                     | Verdict                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `@tanstack/react-query` | Zero imports; no `QueryClient`, no provider anywhere                                         | **Unused**                                              |
| `framer-motion`         | Zero imports under either `framer-motion` or the v12 `motion/react` specifier                | **Unused**                                              |
| `zustand`               | Zero imports. Only textual hit is a string literal in `work-validation/architecture.test.ts` | **Unused**                                              |
| `shadcn`                | Zero runtime imports. This is the **CLI**, consumed via `components.json`                    | **Misplaced** — belongs in `devDependencies` or nowhere |

Cleared as **false positives** (flagged by the grep, genuinely required):

- `tw-animate-css` — imported by CSS: `src/app/globals.css:2`.
- `react-dom` — required peer of `next`/`react`; not imported directly by application code, correctly present.

**Recommendation:** remove the four in a dedicated commit **after** the v1.0.0-beta tag, so the tag captures the tree exactly as certified. Do not fold it into the stabilization commits.

### 5.3 Vulnerabilities — 19 (13 high, 6 moderate, 0 critical)

`npm audit` on a clean `npm ci` in the simulated clone:

| Severity | Package                                                                                                                                    | Direct? |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| high     | `next` (≤16.3.0-preview.7)                                                                                                                 | **Yes** |
| high     | `eslint`                                                                                                                                   | **Yes** |
| high     | `eslint-config-next`                                                                                                                       | **Yes** |
| high     | `sharp` (<0.35.0) — libvips CVEs, via `next`                                                                                               | No      |
| high     | `postcss`, `brace-expansion`, `minimatch`, `fast-uri`, `@eslint/config-array`, `@eslint/eslintrc`, `eslint-plugin-{import,jsx-a11y,react}` | No      |
| moderate | 6 further transitive                                                                                                                       | No      |

The advertised fix for `next` is **16.2.12** — a patch bump inside the current minor. It is the highest-value single upgrade available and it is _not_ a breaking change.

**Not applied.** This phase does not upgrade. Checklist item 7.13 (dependency vulnerability audit) moves from ❌ to ⚠️ — the audit now exists; the remediation does not. **Recommendation: schedule the `next` patch bump as the first action of Sprint 13, before any Supabase work**, since it is the only high-severity direct dependency with a non-breaking fix.

### 5.4 Duplicates

`npm dedupe --dry-run` reports 6 packages dedupable — routine transitive skew, no version conflict affecting application code. `npm ci` reported 4 extraneous `@emnapi/*` packages (optional native deps of `sharp`). **No action; not a stabilization concern.**

---

## 6. Environment Audit (Phase 7)

**No secret value appears in this document or in any Phase C.1 deliverable.** Variable _names_ only; `.env.local` was inspected with a name-only extraction.

### 6.1 `.env.example` vs `.env.local` — one critical asymmetry

`.env.example` declares **25** variables. `.env.local` defines **21**.

| Direction                                        | Variables                                                                                                            | Assessment                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| In `.env.local`, **missing from `.env.example`** | **`DEMO_MODE`**                                                                                                      | ⛔ **F-3 — critical.** See below.                                                                        |
| In `.env.example`, absent from `.env.local`      | `SENTRY_DSN`, `NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_PORTAL_DOMAIN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PORTAL_URL` | ✅ Correct. Sentry has no SDK; the four domain vars are documented as intentionally unset for localhost. |

**F-3 in full.** `DEMO_MODE` is the variable the entire dispatcher pattern routes on — `DEMO_MODE === "true"` selects the DemoStore in ~20 dispatcher files. It is the difference between a working demo and an application making calls into 35 adapters that have never executed. It is **not in `.env.example`.**

A developer who does exactly what the template says — copy `.env.example` to `.env.local`, fill in values — gets `DEMO_MODE` unset, which is falsy, which routes every read and write to Postgres. With placeholder Supabase credentials, every page fails. With _real_ credentials against an unmigrated database, every page fails differently. Neither failure names the cause.

This is the single highest-value one-line fix in the repository:

```bash
# ── Persistence mode ─────────────────────────────────────────
# "true"  → in-memory DemoStore (the ONLY supported mode at v1.0.0-beta)
# "false" → real Drizzle/Postgres adapters — NEVER EXECUTED. See PRODUCTION_MIGRATION_PLAN.md
DEMO_MODE="true"
```

### 6.2 Minimum viable environment — measured, not assumed

Determined empirically against the simulated fresh clone (§7):

| Variable                              | Demo (dev + build)               | Production                                        | CI                                  |
| ------------------------------------- | -------------------------------- | ------------------------------------------------- | ----------------------------------- |
| `DEMO_MODE`                           | **Required** (`"true"`)          | `"false"` — Sprint 15 must make `true` unbootable | `"true"`                            |
| `DATABASE_URL`                        | **Required — even in demo mode** | Required (pooler, 6543)                           | **Required (placeholder suffices)** |
| `NEXT_PUBLIC_SUPABASE_URL`            | **Required** (placeholder OK)    | Required                                          | Required                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | **Required** (placeholder OK)    | Required                                          | Required                            |
| `DIRECT_DATABASE_URL`                 | Not needed                       | Required (DDL, 5432)                              | Not needed                          |
| `SUPABASE_SERVICE_ROLE_KEY`           | Not needed                       | Required                                          | Not needed                          |
| `NEXT_PUBLIC_*_DOMAIN` / `_URL` (×4)  | Optional (localhost default)     | Required                                          | Not needed                          |
| `SEED_*` (×8)                         | Optional                         | Required for `db:seed`                            | Not needed                          |
| `RESEND_API_KEY`                      | Optional                         | Sprint 16                                         | —                                   |
| `SENTRY_DSN`                          | Optional                         | Sprint 16                                         | —                                   |
| `REDIS_URL`                           | Optional (stub fallback)         | Sprint 16                                         | —                                   |
| `OPENAI_/ANTHROPIC_/GEMINI_API_KEY`   | Optional                         | Out of v1.0 scope                                 | —                                   |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Optional                         | Sprint 14                                         | —                                   |
| `NEXTAUTH_SECRET`                     | **Unused**                       | **Unused**                                        | —                                   |

**Four variables** are the entire demo requirement: `DEMO_MODE`, `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Three of the four accept placeholders. Full matrix in `ENVIRONMENT_SETUP.md`.

### 6.3 `DATABASE_URL` required in demo mode — F-2

This is the finding that breaks the fresh clone, and it is architecturally interesting rather than merely annoying.

`src/db/index.ts` throws `DATABASE_URL is not set` **at module evaluation**, not on first query. `next build` imports the module graph while collecting page data, so any route that transitively reaches `src/db/index.ts` fails the build — regardless of `DEMO_MODE`, because the dispatcher branch is chosen at _call_ time and the import happens at _module_ time.

Observed failures in a clean clone with no env: `/projects/[projectId]/timeline`, then `/api/approvals/verify`. Adding a syntactically-valid but never-connected `DATABASE_URL` produces a fully green build, 35 routes.

**A placeholder DSN is sufficient.** No database is contacted. The correct long-term fix is to defer the throw to first use (lazy client init), which would let the demo path build with no database configuration at all — but that is a code change and out of scope here. Recorded as new technical debt **TD-23**.

### 6.4 Secrets posture

| Check                                          | Result                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `.env*` gitignored, `.env.example` re-included | ✅                                                                                                                                |
| Any `.env` file tracked                        | ✅ None (verified against `git ls-files`)                                                                                         |
| Real secret in `.env.example`                  | ✅ None — all placeholders                                                                                                        |
| Secret leaked into the simulated clone         | ✅ None (verified)                                                                                                                |
| `SEED_OWNER_PASSWORD` in template              | ⚠️ `"change-me-immediately"` — a placeholder, but it will be copied verbatim by someone. Sprint 15 should reject it at seed time. |
| Vault / rotation policy                        | ❌ None. Checklist 7.15 stays ⚠️                                                                                                  |

---

## 7. Recovery Verification (Phase 8)

A genuine end-to-end recovery test was executed, not simulated on paper.

### 7.1 Method

The exact file set that _would_ exist after committing the working tree was enumerated with `git ls-files -c -o --exclude-standard` (tracked files at working-tree content, plus untracked-not-ignored, excluding everything `.gitignore` covers). The two deleted paths were removed from the list. The resulting **552 files** were copied to a clean directory outside the project and committed to a fresh repository.

This reproduces a clone of the proposed `v1.0.0-beta` tag. Critically, it carries **no `.env.local`, no `node_modules`, no `.next`, no `scratch/`** — so any dependency on local-only state would surface.

### 7.2 Results

| Step                             | Result      | Detail                                                                               |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| File set completeness            | ✅ **PASS** | 552/552 copied; 10 migrations + 10-entry journal, consistent                         |
| Secret containment               | ✅ **PASS** | `.env.local` absent; `scratch/` absent                                               |
| `npm ci`                         | ✅ **PASS** | exit 0, clean install from `package-lock.json`                                       |
| `npm run lint`                   | ✅ **PASS** | exit 0 — 0 errors, 109 warnings                                                      |
| `npm run typecheck`              | ✅ **PASS** | exit 0, strict                                                                       |
| `npm test`                       | ✅ **PASS** | **240/240, 22 files**, 2.72 s                                                        |
| `npm run format:check`           | ❌ **FAIL** | **exit 1 — 341 files** unformatted (F-1)                                             |
| `npm run build` — no env         | ❌ **FAIL** | `DATABASE_URL is not set` (F-2)                                                      |
| `npm run build` — CI's exact env | ❌ **FAIL** | Same. **CI's build step is broken** (F-1)                                            |
| `npm run build` — 4-var minimum  | ✅ **PASS** | Compiled 3.4 s, **35 routes**                                                        |
| `npm run dev`                    | ✅ **PASS** | Ready in 176 ms                                                                      |
| `GET /api/health`                | ✅ **PASS** | `{"status":"healthy","demoMode":true,"version":"1.0.0","environment":"development"}` |
| `GET /login`                     | ✅ **PASS** | HTTP 200, 1657 ms cold                                                               |

### 7.3 Verdict

**The repository is recoverable.** A fresh clone reaches a working application, and nothing depends on undeclared local state beyond the four documented environment variables. The 240 tests and both static gates pass with **zero** configuration.

Two caveats travel with that verdict:

1. **`npm run build` and `npm run dev` require the 4-variable minimum**, one of which (`DATABASE_URL`) is needed for a mode that never contacts a database. Undocumented until now.
2. **`format:check` fails**, so a literal reading of the CI pipeline fails even before the build does.

Note that route count is **35**, not the 36 quoted throughout `VERSION_1.0_BETA.md` and `PRODUCTION_READINESS_CHECKLIST.md`. Minor, but it is the kind of drift that erodes trust in the numbers around it. Corrected in the QA notes.

### 7.4 CI pipeline status — never executed, currently broken

`.github/workflows/ci.yml` runs five steps on `push: [main]` and `pull_request`. There is **no remote**, so it has never run.

| Step                   | Would it pass today?                               |
| ---------------------- | -------------------------------------------------- |
| `npm ci`               | ✅                                                 |
| `npm run lint`         | ✅                                                 |
| `npm run format:check` | ❌ **341 files**                                   |
| `npm run typecheck`    | ✅                                                 |
| `npm run build`        | ❌ **`DATABASE_URL` not provided by the workflow** |

The moment a remote is added and anything is pushed, CI goes red on two steps. Both fixes are trivial and both are **recommended, not applied** — see §8 Commits 10 and 11.

The build fix is one line in the workflow's `env:` block:

```yaml
DATABASE_URL: postgresql://placeholder:placeholder@localhost:5432/postgres
DEMO_MODE: "true"
```

The `format:check` fix is `npm run format -- --write`, which touches 341 files and must therefore be its own commit, made **after** the tag.

---

## 8. Recommended Commit Strategy (Phase 4)

**Nothing was staged or committed.** This is a plan awaiting approval.

It refines the nine-commit plan in `BETA_FREEZE.md` §5.4 with three changes: the migration commit is made explicit and atomic (§4.2); `NEXOS_v1.0_BASELINE.md` and `LOCAL_REVIEW_CHECKLIST.md` are placed; and two remediation commits are added **after** the tag so the tag captures the tree exactly as certified.

| #      | Message                                                                                | Contents                                                                                                                                                                                                                          | Tag               |
| ------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **1**  | `fix(db): journal migrations 0008 and 0009`                                            | `database/migrations/0008_*.sql`, `0009_*.sql`, `meta/0008_snapshot.json`, `meta/0009_snapshot.json`, `meta/_journal.json` — **explicit paths, atomic**                                                                           |                   |
| **2**  | `feat(platform): M3.1 navigation, organizations, settings`                             | `src/config/navigation.ts`, `src/features/organizations/`, `src/features/users/`, `src/app/(dashboard)/settings/`, `src/app/(dashboard)/unauthorized/`, `src/features/permissions/constants.ts`                                   |                   |
| **3**  | `feat(workforce): employee directory and profile`                                      | `src/features/workforce/`, `src/db/schema/workforce.ts`, `src/app/(dashboard)/workforce/`, `src/db/schema/index.ts`                                                                                                               |                   |
| **4**  | `feat(reads): Sprint 11B global read layer`                                            | `deliverables`/`files`/`meetings`/`timelines` read functions + `mock-*.test.ts`                                                                                                                                                   |                   |
| **5**  | `feat(ui): Sprint 11A workspaces`                                                      | `src/app/(dashboard)/{deliverables,files,meetings,tasks,timeline}/`, feature `components/`, `src/components/shared/`, `src/components/ui/popover.tsx`                                                                             |                   |
| **6**  | `fix(stabilization): v1.0.1 defect sweep`                                              | The 36 files in `STABILIZATION_REPORT.md` §3, `next.config.ts`                                                                                                                                                                    |                   |
| **7**  | `feat(interaction): Sprint 12A write surface`                                          | Sign-out fix, `src/features/search/`, `notification-bell.tsx`, confirm-dialog, task/deliverable/file/meeting write components, `demo-store-schema-parity.test.ts`; **the two `NotificationCenter`/`NotificationBadge` deletions** |                   |
| **8**  | `feat(domain): Sprint 12B domain completion`                                           | The files in `SPRINT-12B.md` §§5–6, `src/features/notifications/templates.ts`, `src/features/events/domain-publisher.ts`, remaining `tests/unit/*.test.ts`                                                                        |                   |
| **9**  | `docs: v1.0 baseline through 1.0 beta freeze`                                          | `NEXOS_v1.0_BASELINE.md`, `LOCAL_REVIEW_CHECKLIST.md`, all of `docs/` incl. the three screenshot directories and the five Phase C.1 documents                                                                                     | **`v1.0.0-beta`** |
| **10** | `ci: provide DATABASE_URL and DEMO_MODE to the build step`                             | `.github/workflows/ci.yml` — fixes F-1's build failure                                                                                                                                                                            |                   |
| **11** | `style: apply prettier across the repository`                                          | 341 files, formatting only. **Verify `git diff --stat` shows no logic change.**                                                                                                                                                   |                   |
| **12** | `chore(deps): drop unused react-query, framer-motion, zustand; move shadcn to devDeps` | `package.json`, `package-lock.json`                                                                                                                                                                                               |                   |
| **13** | `chore: pin node 24; ignore playwright artefacts`                                      | `package.json` `engines`, `.nvmrc`, `.gitignore` additions from §3.1                                                                                                                                                              |                   |

### Ordering rationale

- **Commit 1 first, always.** It is the only commit that fixes a correctness hazard rather than adding history, and leaving it later means every intermediate commit has a journal referencing absent files.
- **Commits 2–8 by sprint.** Each sprint is thoroughly documented; preserving that boundary in `git log` is worth more than a tidy diff. Note that these commits will **not** each be independently buildable — the tree is a single three-month snapshot and the sprints interleave across shared dispatcher files. Do not spend effort trying to make them bisectable; that is not achievable retroactively and pretending otherwise wastes days.
- **Commit 9 carries the tag**, so `v1.0.0-beta` points at the tree that was actually certified — including its formatting and its unused dependencies.
- **Commits 10–13 come after the tag.** They are remediation. Folding them in would mean the tag no longer matches what §7 verified.

### If time is short

`BETA_FREEZE.md` §5.4's judgement stands and is worth repeating: **one commit is dramatically better than none.** A single `chore: v1.0.0-beta — sprints M3.1 through 12B` plus the tag plus a remote eliminates the entire class of catastrophic risk. Commit 1's atomicity is the only detail that must survive any shortcut — and if everything goes in one commit, it is satisfied automatically.

---

## 9. Git Tag & Branch Strategy (Phase 5)

Full detail in `VERSION_CONTROL_PLAN.md`. Summary:

| Item                   | Recommendation                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Release name**       | **AI NEX OS v1.0 Beta — "Demo Platform Complete"**                                                                                                    |
| **Version**            | `1.0.0-beta` (SemVer pre-release). **Also update `package.json` from `0.1.0`** — currently it disagrees with every document in `docs/`.               |
| **Primary tag**        | `v1.0.0-beta` — **annotated**, on Commit 9, annotation carrying the certification block from `VERSION_1.0_BETA.md` §5                                 |
| **Retroactive tag**    | `v1.0.0-baseline` on `1b17234`, so the baseline document has a commit to cite                                                                         |
| **Trunk**              | Fast-forward `main` to `phase-03-core-product`; `main` becomes trunk again                                                                            |
| **Migration branches** | `sprint-13-persistence`, `sprint-14-storage`, `sprint-15-auth`, `sprint-16-runtime`, `sprint-17-deployment` — cut from `main`, merged back per sprint |
| **Release branches**   | `release/1.0` cut at Sprint 16; `v1.0.0-rc.1` tagged there; `v1.0.0` at Sprint 17 sign-off                                                            |
| **Hotfix**             | `hotfix/<issue>` from the release tag, merged to both `release/1.0` and `main`                                                                        |
| **Remote**             | ⛔ **The highest-priority action in the repository.** Everything above is ceremony while one disk holds the only copy.                                |

---

## 10. Quality Gates

Re-verified in the working tree at Phase C.1, and independently in the simulated clone.

| Gate                   | Phase C claim          | Phase C.1 — working tree      | Phase C.1 — fresh clone           |
| ---------------------- | ---------------------- | ----------------------------- | --------------------------------- |
| `npm run lint`         | 0 errors, 109 warnings | ✅ **0 errors, 109 warnings** | ✅ 0 errors                       |
| `npm run typecheck`    | 0 errors               | ✅ **0 errors**               | ✅ 0 errors                       |
| `npm test`             | 240/240, 22 files      | ✅ **240/240, 22 files**      | ✅ 240/240                        |
| `npm run build`        | Green, 36 routes       | ✅ **Green, 35 routes**       | ✅ Green with 4 vars / ❌ without |
| `npm run format:check` | _not reported_         | ❌ **FAIL — 341 files**       | ❌ FAIL                           |

**No regressions.** Every gate Phase C reported still holds at the same numbers, and no gate was made worse by this phase — which was guaranteed, since no code was touched.

The one correction is that Phase C reported four gates and the CI pipeline enforces five. `format:check` was never part of the certified set, so calling it a regression would be wrong; calling it an unreported failing gate is accurate.

---

## 11. Remaining Risks

Ordered by what would hurt most.

| #      | Risk                                                                                                                                 | Severity     | Owner / Sprint          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------------------- |
| **1**  | **No remote. 552 files, three months of work, one disk.** A disk failure, an `rm -rf`, or a `git checkout .` is total loss.          | **Critical** | **Before Sprint 13**    |
| **2**  | **Uncommitted tree, no tag.** Nothing to roll back to if a migration goes wrong. Violates Baseline Rule 8.                           | **Critical** | **Before Sprint 13**    |
| **3**  | **`git add -u` produces a broken journal** (§4.2). One habitual command corrupts the migration set.                                  | **High**     | Commit 1                |
| **4**  | **RLS never evaluated by a database.** The platform's central security claim, unverified.                                            | **High**     | Sprint 13               |
| **5**  | **~35 real adapters never executed.** The code path customers would run has never run.                                               | **High**     | Sprint 13               |
| **6**  | **CI broken and never run** (F-1). The safety net does not function, and adding a remote is what reveals it.                         | **High**     | Commits 10–11           |
| **7**  | **P2-06 — `DEMO_MODE` accepts any credentials, grants `*:*`, no build-time guard.**                                                  | **High**     | Sprint 15               |
| **8**  | **Cross-tenant file dedup** (TD-21) — `finalizeFileUpload` matches `sha256Hash` with no org filter.                                  | **High**     | **Before** Sprint 14    |
| **9**  | **`MockVirusScanner` always returns clean** (TD-09).                                                                                 | **High**     | Sprint 14               |
| **10** | **`next` 16.2.10 — high-severity advisory, non-breaking fix available (16.2.12).** Plus 12 further high transitive.                  | **High**     | Sprint 13, first action |
| **11** | **E2E verification not reproducible** (F-5). The evidence behind the interaction-layer certification lives in gitignored `scratch/`. | **Medium**   | Sprint 13               |
| **12** | **`DEMO_MODE` undocumented** (F-3). Every new developer's first hour is a debugging session.                                         | **Medium**   | Immediate               |
| **13** | **`DATABASE_URL` required to build a demo-mode app** (F-2, TD-23).                                                                   | **Medium**   | Sprint 13               |
| **14** | **Node not pinned.** No `engines`, no `.nvmrc`.                                                                                      | **Low**      | Commit 13               |
| **15** | **`package.json` says `0.1.0`** while every document says v1.0.0-beta.                                                               | **Low**      | Commit 9                |
| **16** | **Non-owner RBAC never exercised in a browser.** 6 roles defined, 1 used.                                                            | **Medium**   | Sprint 13/15            |
| **17** | **Client portal surface never reviewed** — and it ships to external users first.                                                     | **Medium**   | Sprint 17               |
| **18** | **Enclosing `WebsiteCreation` repo does not track `ai-nexos`.** A backup of the parent is not a backup of this project.              | **Low**      | Note in recovery docs   |

---

## 12. Production Readiness

`PRODUCTION_READINESS_CHECKLIST.md` stood at **29 / 115 (25%)** after Phase C. Phase C.1 implemented nothing, so the score does not move — but three items change status because the _evidence_ changed.

| Item                                | Was                                | Now | Reason                                                                                                        |
| ----------------------------------- | ---------------------------------- | --- | ------------------------------------------------------------------------------------------------------------- |
| 1.2 Migrations tracked in git       | ❌ _"fresh clone would be broken"_ | ❌  | Still ❌ — but the **justification is corrected**: `HEAD` is consistent; the hazard is `git add -u` (§4.2)    |
| 1.7 `.gitignore` correct            | ✅                                 | ✅  | Confirmed against `git ls-files`, not just the file. Three pre-emptive additions recommended                  |
| 7.13 Dependency vulnerability audit | ❌                                 | ⚠️  | **Audit performed** — 19 vulns, 13 high, 3 direct. Remediation not started                                    |
| 9.7 CI runs the gates               | ⚠️ _"no deploy stage"_             | ❌  | **Downgraded.** CI has never run and **two of five steps fail** (F-1). "No deploy stage" understated it       |
| 10.4 Env vars documented            | ⚠️                                 | ⚠️  | `ENVIRONMENT_SETUP.md` now provides the per-environment matrix; `DEMO_MODE` still missing from `.env.example` |
| 11.8 Developer onboarding           | ⚠️                                 | ⚠️  | `DEVELOPER_ONBOARDING.md` written; `README.md` still predates the platform                                    |

**Revised total: 29 / 115 (25%)** — 1.7 confirmed, 7.13 up, 9.7 down. Net zero, which is the honest outcome of an audit phase.

### Gate G1 — Committed

`G1` (checklist 1.1–1.5) remains the gate that blocks every other gate. Phase C.1's contribution to it is that the recovery test (§7) now **proves** the tree is worth committing: 552 files that install, test and build from nothing. There is no longer any uncertainty about whether the snapshot is coherent.

**The work is verified. It is not protected. Those are now the only two facts that matter before Sprint 13.**

---

## 13. Statement

> The AI NEX OS repository is **audited, verified recoverable, and unprotected.**
>
> Its migration set is internally consistent, its `.gitignore` is correct, its dependency tree is installable, and a clone of its full working tree reaches a running application with four environment variables and no local state.
>
> It has **no remote, no tag, and 552 files behind two commits.** Its CI pipeline has never executed and would currently fail. Neither condition is a code defect, and neither will be fixed by more engineering.
>
> **Recommendation: execute §8 Commits 1–9, tag `v1.0.0-beta`, add a remote, push. Then Commits 10–13. Then Sprint 13.**

**No code was modified. Nothing was staged, committed, pushed or tagged. Awaiting architecture approval.**
