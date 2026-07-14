# M0 — Repository Readiness Report

**Date:** 2026-07-14 · **Reviewer:** Technical Lead (M0) · **Plan:** PHASE-03-CORE-PRODUCT-PLAN.md

## Findings

### Git branch
- `ai-nexos/` is its own nested git repository, on **`main`**, with exactly **one commit** (`c2a9190 feat: Milestone 1 — platform foundation`). The `phase-01-stabilization` branch reported at session start belongs to the **outer** WebsiteCreation repo, not this one.
- No `phase-03` branch exists. Per plan M0, work should not continue directly on `main` with this much uncommitted history.

### Git status
- **93 dirty paths**: ~15 modified tracked files plus the entire Phase 1 + Phase 2 output untracked — migrations 0002–0007, all docs (audit, phase reports, Phase 3 plan), `(dashboard)/` route group, feature modules, demo store, `supabase/` config. Effectively **all work since Milestone 1 is unversioned and unrecoverable if lost**.
- `.env.local` is present and correctly ignored (`.env*` with `!.env.example`). ✅
- `scratch/` is untracked and **not** in `.gitignore` — will pollute the M0 commit unless added.
- Stray file `src/db/migrations/automation_rls.sql` sits outside the drizzle `out` dir (`database/migrations`) — hand-written RLS not journaled; needs relocation or an explicit apply story.

### Migration journal & ordering
- `meta/_journal.json` idx 0–7 sequential, timestamps monotonic. ✅
- **Confirmed defect:** idx 3 tag is `0003_messy_sunset_bain` but the file on disk is `0003_project_management.sql`. `drizzle-kit migrate` resolves files by journal tag → **migration run will fail at step 3** until the tag or filename is aligned (snapshot `0003_snapshot.json` exists and is fine).

### package.json
- Scripts present: dev/build/lint/typecheck/db:generate/migrate/studio/seed/format. ✅
- **No `test` script** despite vitest + Playwright being installed (planned for M7; acceptable now).
- Dependencies match the plan's stack assumptions (Next 16.2.10, Drizzle 0.45.2, zod 4, RHF, Supabase SSR). `@tanstack/react-query` is missing from deps? — no: present. `vitest`/`@playwright/test` in devDeps. ✅

### Environment variables
- `.env.example` is a complete, well-documented template. ✅
- `.env.local` exists (new since audit): all keys populated; `DEMO_MODE=true`; database URLs point to **localhost:5432** — and **Postgres is not listening on 5432** (connection test failed). Supabase CLI is not installed despite the new `supabase/config.toml`.
- Net: demo mode fully functional; **real mode still unverifiable** (no reachable DB, cloud creds unconfirmed). Matches the plan's standing blocker.

### Build configuration
- `npm run typecheck` → **clean, 0 errors**. ✅
- `npm run build` → **succeeds**; full route tree emitted incl. `(dashboard)` routes and proxy middleware. ✅
- `next.config.ts` is an empty default — no custom config to audit. ESLint/Prettier configs present.

### Demo Mode
- `DEMO_MODE=true` active in `.env.local`; dispatcher pattern (`actions.ts` → mock/real) intact across clients/projects/tasks/auth; demo login + `demo_session` cookie path present in proxy and current-user. Consistent with plan assumptions. ✅

### Next.js configuration
- Modified Next 16.2.10 build (per AGENTS.md — consult `node_modules/next/dist/docs/` before unfamiliar APIs). `proxy.ts` in place of middleware, group-level loading/error/not-found boundaries present from Phase 2. ✅

## M0 Checklist (from the plan, with verified status)

| # | Item | Status |
|---|---|---|
| 1 | Create `phase-03` branch off `main` | ❌ Not done — required before any commit |
| 2 | Add `scratch/` to `.gitignore`; decide fate of `src/db/migrations/automation_rls.sql` | ❌ New finding, fold into M0 |
| 3 | Commit the 93-path working tree (review diff; no secrets — `.env.local` ignored) | ❌ Not done — the core M0 task |
| 4 | Fix journal↔file mismatch on migration 0003 | ❌ Confirmed defect |
| 5 | Build green | ✅ Verified |
| 6 | Typecheck green | ✅ Verified |

## Risk Assessment

| Risk | Severity | Notes |
|---|---|---|
| All post-M1 work uncommitted | **High** | Single accidental reset/clean destroys Phases 1–2 + docs. Fix first, before anything else. |
| Migration 0003 tag mismatch | **High (latent)** | Harmless today (no reachable DB) but guarantees a failed `db:migrate` the moment real mode starts. Must be fixed in M0, before any DB is provisioned. |
| No reachable database / Supabase CLI absent | **Medium** | Blocks real-mode verification only (M7 concern). Demo mode unaffected. Decide: local Supabase (`supabase start`) vs cloud project creds. |
| Stray un-journaled RLS SQL (`automation_rls.sql`) | **Medium** | Would silently never be applied by `db:migrate`. |
| `scratch/` not ignored | **Low** | Commit hygiene only. |
| No `test` script | **Low** | Already scheduled for M7. |

## Recommendation

**GO** — with the four ❌ checklist items as the mandatory contents of M0 itself, executed in this order:

1. Ignore `scratch/`; relocate or document `automation_rls.sql`.
2. Fix the 0003 journal tag (rename file or edit tag — pick one, keep snapshot consistent).
3. Create `phase-03` branch; review and commit the full working tree.
4. Record the DB decision (local Supabase vs cloud creds) as the standing blocker for real-mode verification — does not gate M1/M2.

No blocker prevents starting M0; two of the findings (uncommitted tree, journal mismatch) are exactly what M0 exists to fix. M1 must not begin until items 1–3 are done and verified.
