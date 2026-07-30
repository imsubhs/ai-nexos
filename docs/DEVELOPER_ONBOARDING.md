# AI NEX OS — Developer Onboarding

**Version:** 1.0
**Date:** 2026-07-28
**Applies to:** `v1.0.0-beta`
**Read alongside:** `ENVIRONMENT_SETUP.md`, `NEXOS_v1.0_BASELINE.md`

> `README.md` predates most of the platform (checklist 11.8 ⚠️). **This document supersedes it** until it is rewritten.

---

## 1. What You Are Working On

AI NEX OS is a **multi-tenant enterprise operations platform** for a creative/production agency: clients, projects, production timelines, tasks, digital assets, deliverables with approval and revision cycles, meetings, and a separate client-facing portal.

**19 modules. 199+ tables. 416 TypeScript files. ~47,700 lines in `src/`.**

### The one thing to understand before you read any code

**Nothing in this application has ever talked to a database.**

Every read and write goes through a **dispatcher** that branches on one environment variable:

```
Server Action / RSC
      │
      ▼
 actions.ts  ← the dispatcher (FROZEN)
      │
      ├── DEMO_MODE === "true"  → mock-actions.ts → DemoStore (in-memory, globalThis)
      │
      └── otherwise             → real-actions.ts → Drizzle → Supabase Postgres
```

The `real-*` adapters exist for every action. They typecheck. Their signatures are derived from the mock signatures via `Parameters<typeof real.x>`, so they cannot drift. **Approximately 35 of them have never been executed.** Sprint 13 exists to run them for the first time.

So when you read `real-actions.ts`, you are reading **unverified code that looks verified**. It has the same review polish as everything else and none of the runtime evidence. Treat it accordingly.

---

## 2. Day One — Get It Running

```bash
git clone <remote> ai-nexos && cd ai-nexos
node -v                      # expect 24.x
npm ci

cat > .env.local <<'EOF'
DEMO_MODE="true"
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key"
EOF

npm run dev
```

**Two things that will confuse you if nobody says them** (both detailed in `ENVIRONMENT_SETUP.md` §1):

1. **`DEMO_MODE` is not in `.env.example`.** Copy the template verbatim and you get an app routing every call into never-executed Postgres adapters. Set it manually.
2. **`DATABASE_URL` is required even in demo mode.** `src/db/index.ts` throws at _module evaluation_, so `next build` fails during page-data collection regardless of `DEMO_MODE`. A placeholder is enough — nothing connects.

### Verify

```bash
curl -s http://localhost:3000/api/health     # → "demoMode":true
```

If that reads `false`, stop and fix it. Nothing else will make sense.

Then open `http://localhost:3000/login` and enter **anything**. Demo login validates no password and grants an owner with `{"*":["*"]}`. This is P2-06, known and open — not a bug you found.

### Expected gate results

Run these before touching anything, so you know what "unchanged" looks like:

```bash
npm run lint          # 0 errors, 109 warnings   ← warnings are the baseline
npm run typecheck     # 0 errors
npm test              # 240 passed (240), 22 files
npm run build         # green, 35 routes
npm run format:check  # FAILS — 341 files. Known (F-1). Not you.
```

**109 lint warnings and a failing `format:check` are the current baseline.** Do not "fix" them as a side effect of your change — the prettier sweep is a dedicated commit (see `REPOSITORY_STABILIZATION_REPORT.md` §8, Commit 11) precisely so it does not contaminate a real diff.

---

## 3. Repository Map

```
ai-nexos/
├─ src/
│  ├─ app/                        Next.js App Router
│  │  ├─ (auth)/                  login, callback
│  │  ├─ (dashboard)/             internal workspaces — 10 live
│  │  ├─ (internal)/              dashboard shell
│  │  ├─ portal/                  CLIENT-FACING. ⚠️ never code-reviewed
│  │  └─ api/                     health, portal v1, approvals
│  ├─ features/<module>/          ← the unit of work. See §4.
│  ├─ components/{ui,layout,shared,portal}/
│  ├─ db/
│  │  ├─ index.ts                 pooled client. THROWS at import if no DATABASE_URL
│  │  └─ schema/                  Drizzle tables, snake_case casing
│  ├─ lib/
│  │  ├─ demo/store.ts            ~1,400-line in-memory fixture, 40+ collections
│  │  ├─ storage/                 StorageService (real) + mocked provider (TD-02)
│  │  ├─ security/VirusScanner.ts MockVirusScanner ALWAYS returns clean (TD-09)
│  │  ├─ automation/              scheduler + queue. Nothing calls .start()
│  │  ├─ portal/                  portal service layer, JWT/HMAC tokens
│  │  └─ ai/                      provider factory returns a canned string (TD-03)
│  ├─ workers/agent-executor.ts   no invoker
│  └─ proxy.ts                    ⛔ PUBLIC GATEWAY — FROZEN (Baseline Rule 4)
├─ database/
│  ├─ migrations/                 10 journaled. DO NOT hand-edit.
│  └─ drafts/                     non-journaled quarantine (TD-07)
├─ tests/unit/                    22 files, 240 tests — the only committed suite
├─ scripts/seed.ts                never run against a database
├─ docs/                          sprint history, plans, this file
└─ scratch/                       gitignored. Contains the E2E harness (see §7)
```

### Feature module anatomy

Every business module follows the same shape. Learn it once:

| File                                  | Role                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `actions.ts`                          | **Dispatcher.** Branches on `DEMO_MODE`. ⛔ Signatures frozen (Rule 3). |
| `real-actions.ts` / `real-queries.ts` | Drizzle implementation. **Largely never executed.**                     |
| `mock-actions.ts` / `mock-queries.ts` | DemoStore implementation. The only code that has actually run.          |
| `schemas.ts`                          | Zod. Validation boundary for every write.                               |
| `constants.ts`                        | Enums, status transition maps, labels.                                  |
| `components/`                         | Client components for this module only.                                 |

---

## 4. The Eight Baseline Rules

`NEXOS_v1.0_BASELINE.md` §14. These are not style guidance — they are the reason the architecture survived three sprints of feature work without a contract break.

| Rule                                                | Meaning for your change                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1 — No module redesign**                          | Work within the bounded context. No module reads another's tables. Cross-module writes go through server actions.                                                              |
| **2 — No workflow redesign**                        | Approval, Automation and Agent engines are not yours to restructure.                                                                                                           |
| **3 — Repository contracts frozen**                 | Dispatcher signatures do not change. Every new action ships as a `real`/`mock`/dispatcher **triple** with identical types.                                                     |
| **4 — Public gateway frozen**                       | `src/proxy.ts` requires **Principal Architect sign-off**. It has not changed since the baseline.                                                                               |
| **5 — State machines frozen**                       | All 8 transition maps. You may add a _guard over_ an existing vocabulary; you may not add a state.                                                                             |
| **6 — Additive only**                               | No destructive migrations. Removing genuinely dead code with no importers is permitted.                                                                                        |
| **7 — Repository overrides documentation**          | When a doc and the code disagree, **the code is right and the doc is a defect to file.** This has caught real errors — including one in the Phase C documents themselves (§8). |
| **8 — No uncommitted changes at a sprint boundary** | ⚠️ **Currently violated at scale.** 552 files, 2 commits, no tag, no remote. See §6.                                                                                           |

### The mock-parity rule in practice

If you add `doThing`, you add **three** implementations:

```ts
// real-actions.ts
export async function doThing(input: DoThingInput) {
  /* Drizzle */
}

// mock-actions.ts — signature derived, cannot drift
export async function doThing(...args: Parameters<typeof real.doThing>) {
  /* DemoStore */
}

// actions.ts
export async function doThing(...args: Parameters<typeof real.doThing>) {
  return isDemoMode() ? mock.doThing(...args) : real.doThing(...args);
}
```

**And know the limit of that guarantee.** Parity is enforced at the _signature_ level, not the _behavioural_ level. Sprint 12B found the mock timer emitting **no** activity events while the real adapter emitted two — invisible for two sprints, because nothing read task activity until `getTaskActivity` existed. It was found by a browser workflow check, not by any test. TD-17. **Assume more of these exist.**

---

## 5. Security Model — read this before writing any action

### RLS does not protect you

RLS policies exist on all 199+ tables. The Drizzle client in `src/db/index.ts` connects as `postgres` and **bypasses them by design.**

**The service layer is the only authorisation boundary.** Every real action must call `requirePermission(...)` or inherit a validated access check. An action that forgets it is completely unprotected — RLS will not save it.

This has **never been audited exhaustively** (checklist 3.7 ⚠️), and no RLS policy has ever been evaluated by a database (checklist 3.5 ❌). Sprint 13 does both.

### Non-negotiables for a new write action

1. `requirePermission` — or a documented, validated access check.
2. Zod validation at the boundary. Never trust a client payload.
3. Scope by `organization_id`. Multi-tenancy is the platform's central security claim.
4. Append to the module's activity table. Every write is audited.
5. Mirror in `mock-actions.ts` — **including the audit trail** (TD-17).

### Known security debt you will encounter

| Item      | Detail                                                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P2-06** | Demo login accepts any credentials, grants `*:*`. No build-time guard stops `DEMO_MODE=true` reaching production.                                                                                                        |
| **TD-22** | `mock-actions.ts` sets `demo_session` with **no `httpOnly`, `secure` or `sameSite`**. `actions/demo-login.ts` sets the same cookie correctly. Both patterns exist in the repo.                                           |
| **TD-21** | `finalizeFileUpload` matches `sha256Hash` with **no org filter** → cross-tenant blob sharing the moment real storage lands. Its sibling `initializeFileUpload` is correctly scoped. **Must be closed before Sprint 14.** |
| **TD-09** | `MockVirusScanner` always returns `isClean: true`, and it is the exported singleton.                                                                                                                                     |

---

## 6. Repository State — the part that should worry you

| Fact                                                                                   | Consequence                                                                                                                                                    |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2 commits, 552-file working tree**                                                   | Every sprint since M0 — M3.1, 11A, 11B, Stabilization, Phase A, 12A, 12B — is uncommitted.                                                                     |
| **No git remote**                                                                      | The only copy is on one disk.                                                                                                                                  |
| **No tags**                                                                            | Nothing to diff against, nothing to roll back to.                                                                                                              |
| **`main` is 2 commits behind**                                                         | Clone and check out the default branch and you get a skeleton.                                                                                                 |
| **Migrations `0008`/`0009` untracked** while `_journal.json` (tracked) references them | ⛔ **`git add -u` or `git commit -a` commits the journal without the SQL files, producing a repository whose journal points at migrations that do not exist.** |

### Rules until this is resolved

1. **Never run `git checkout .`, `git restore .`, `git reset --hard`, or `git clean -fd`.** Any of them destroys uncommitted sprint work permanently. There is no remote to recover from.
2. **Never `git add -u` or `git commit -a`** while `0008`/`0009` are untracked. Stage migrations with explicit paths.
3. If you are the person who gets approval: `VERSION_CONTROL_PLAN.md` §8 is the ordered execution list. Commit 1 (migrations, atomic) goes first.

The good news, verified in Phase C.1: a clone of the full working tree **installs, typechecks, passes all 240 tests, builds and serves.** The snapshot is coherent. It is simply unprotected.

---

## 7. Testing

| Suite                   | Command                | State                                     |
| ----------------------- | ---------------------- | ----------------------------------------- |
| Unit (Vitest)           | `npm test`             | ✅ 240/240, 22 files, 2.7 s               |
| Typecheck               | `npm run typecheck`    | ✅ 0 errors, strict                       |
| Lint                    | `npm run lint`         | ✅ 0 errors / **109 warnings = baseline** |
| Build                   | `npm run build`        | ✅ 35 routes (needs the 4 env vars)       |
| Format                  | `npm run format:check` | ❌ **341 files. Known. Not yours.**       |
| Integration vs Postgres | —                      | ❌ Does not exist. Sprint 13.             |
| **E2E / browser**       | —                      | ⚠️ **See below.**                         |

### There is no committed E2E suite

`@playwright/test` is a devDependency, but there is **no `playwright.config.*`, no `*.spec.ts`, and no `tests/e2e/`**.

The "39/39 browser workflow checks" certified in `VERSION_1.0_BETA.md` were executed by ad-hoc scripts in **`scratch/`** — `scratch/sprint12b/verify.mjs`, `scratch/stabilization/*.mjs` — which is **gitignored**. The verification was genuine. It is **not reproducible from a clone and not re-runnable by you.**

This is finding F-5. If you need browser verification of your change, you are writing the harness. Promoting the scratch harness into a real committed Playwright suite is a recommended Sprint 13 task.

### Tests worth reading first

| File                                          | Why                                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `tests/unit/demo-store-schema-parity.test.ts` | 20 collections, 80 assertions. Shows the parity contract — and, by omission, its behavioural blind spot. |
| `tests/unit/notification-templates.test.ts`   | 21 tests. Rendering shared by both adapters so demo and production cannot show different copy.           |
| `tests/unit/meeting-transitions.test.ts`      | A guard over an existing enum vocabulary — the correct way to add a constraint under Rule 5.             |
| `tests/unit/organizations.test.ts`            | Typical module-level coverage shape.                                                                     |

---

## 8. Documentation — and how to read it

Read in this order:

| #   | Document                                      | Why                                                                                       |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | **`NEXOS_v1.0_BASELINE.md`** (1,043 lines)    | The permanent architectural reference. §14 has the eight rules.                           |
| 2   | **`docs/VERSION_1.0_BETA.md`**                | What is certified and — more usefully — what is not. §6 is the caveat list.               |
| 3   | **`docs/BETA_FREEZE.md`**                     | What you may and may not change during the migration sprints.                             |
| 4   | **`docs/PRODUCTION_MIGRATION_PLAN.md`**       | Sprints 13–17, with per-sprint risk tables. §2.3 names the three seams carrying the risk. |
| 5   | **`docs/TECHNICAL-DEBT-NOTES.md`**            | 23 items. Check it before "discovering" anything.                                         |
| 6   | **`docs/REPOSITORY_STABILIZATION_REPORT.md`** | Current repository state, measured.                                                       |
| 7   | `docs/SPRINT-12A.md`, `SPRINT-12B.md`         | The most recent product work. §4 of 12B is the unsupported-capability list.               |
| 8   | `docs/QA-NOTES.md`                            | Verification method **and stated limitations** per sprint.                                |

### Rule 7 is a working instruction, not a platitude

**When documentation and code disagree, the code is right and the doc is a defect to file.** This is load-bearing here, because the documents are unusually thorough and therefore unusually easy to trust.

A live example: Phase C recorded a "documentation defect" claiming that baseline TD-05 over-stated the worker inventory — that `sla-worker` and `SessionCleanupWorker` did not exist. Phase C.1 checked, and **both files exist and are both tracked in git**:

- `src/features/approvals/sla-worker.ts`
- `src/lib/portal/workers/SessionCleanupWorker.ts`
- `src/workers/agent-executor.ts`

Phase C looked only in `src/workers/`, found one file, and concluded the baseline was wrong. The baseline was right; **the correction was the error**, and it propagated into four documents. All three workers do share the real problem: **none has an invoker** (TD-05).

Verify before you trust. That is the whole rule.

---

## 9. Making a Change

### Before

```bash
git status                # know what was already dirty — a lot is
npm test                  # 240/240 baseline
```

### While

1. Find the module in `src/features/`.
2. Adding a write? Build the **triple** — `real`, `mock`, dispatcher (§4).
3. `requirePermission`, Zod validation, `organization_id` scoping, activity append (§5).
4. Mutation UI follows the single established pattern, without exception: `ConfirmDialog` → optimistic disable → sonner toast → refresh.
5. **Unsupported is stated, never faked.** This codebase's most disciplined habit is telling the user in plain language that something is unavailable rather than shipping a control that cannot finish the job. Do not break that habit — a disabled-looking button that silently does nothing is worse than a sentence explaining why.
6. Tokens only. No off-token styling survived three sprints; yours will not be the exception.

### After

```bash
npm run lint          # still 0 errors, still ~109 warnings
npm run typecheck     # 0
npm test              # 240 + yours
npm run build         # green
```

### Commit

Conventional Commits (`VERSION_CONTROL_PLAN.md` §5): `feat(tasks): add checklist write path`.

⚠️ **Explicit paths when staging migrations. Never `git add -u`.** See §6.

---

## 10. Traps

Ranked by how much time they will cost you.

| Trap                                                            | Reality                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **`DEMO_MODE` missing from `.env.example`**                     | Set it manually or nothing works.                                         |
| **`DATABASE_URL` needed in demo mode**                          | Module-eval guard. Placeholder is fine.                                   |
| **`git add -u` corrupts the migration journal**                 | Explicit paths only, until Commit 1 lands.                                |
| **`git checkout .` destroys three months of work**              | No remote. No recovery.                                                   |
| **`real-*.ts` has never run**                                   | It looks as reviewed as everything else. It has no runtime evidence.      |
| **Signature parity ≠ behavioural parity**                       | TD-17. Mirror side effects, including audit rows.                         |
| **RLS does not protect the app**                                | Service-role connection bypasses it. `requirePermission` is the boundary. |
| **`format:check` fails on `main`**                              | 341 files. Pre-existing. Don't fold the sweep into your diff.             |
| **109 lint warnings are the baseline**                          | Not a regression you introduced.                                          |
| **Demo data resets on restart**                                 | DemoStore is on `globalThis`. It is a fixture.                            |
| **`/tasks` is pinned to one seeded milestone**                  | `getTasks` is milestone-scoped. Known.                                    |
| **`src/proxy.ts` is frozen**                                    | Architect sign-off required (Rule 4).                                     |
| **`src/app/portal/` has never been reviewed**                   | And it ships to external users first. Tread carefully.                    |
| **`docs/` can be wrong**                                        | Rule 7. §8 has a worked example.                                          |
| **The parent `WebsiteCreation` repo does not track `ai-nexos`** | Backing up the parent backs up nothing here.                              |

---

## 11. Where To Ask

| Question                         | Source                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| "Is this known debt?"            | `docs/TECHNICAL-DEBT-NOTES.md` — 23 items                                                |
| "Is this in scope for v1.0?"     | `docs/PRODUCTION_MIGRATION_PLAN.md` §5 (out of scope), `docs/BETA_FREEZE.md` §1 (frozen) |
| "Why is this control missing?"   | `docs/SPRINT-12B.md` §4 — deliberate, enumerated                                         |
| "What has never been verified?"  | `docs/QA-NOTES.md` (Phase C section), `docs/VERSION_1.0_BETA.md` §6                      |
| "May I change this?"             | `NEXOS_v1.0_BASELINE.md` §14, `docs/BETA_FREEZE.md` §2                                   |
| "What is the repository state?"  | `docs/REPOSITORY_STABILIZATION_REPORT.md`                                                |
| "How do I recover this project?" | `docs/RECOVERY_CHECKLIST.md`                                                             |

---

_Setup instructions verified against a clean clone with no local state (`REPOSITORY_STABILIZATION_REPORT.md` §7). Supersedes `README.md` until it is rewritten._
