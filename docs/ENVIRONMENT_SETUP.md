# AI NEX OS — Environment Setup

**Version:** 1.0
**Date:** 2026-07-28
**Applies to:** `v1.0.0-beta` (demo persistence)
**Source of truth for variable _names_:** `.env.example`

> **No secret values appear in this document.** Every value shown is a placeholder or an instruction to obtain one.

---

## 1. Read This First

Two facts are not in `.env.example` and will cost you an hour if you do not know them.

### 1.1 `DEMO_MODE` is missing from `.env.example`

`DEMO_MODE` is the variable that selects the **entire persistence layer**. `DEMO_MODE === "true"` routes every read and write to the in-memory DemoStore, in roughly 20 dispatcher files. It is the only supported mode at `v1.0.0-beta`.

**It is not in the template.** If you copy `.env.example` verbatim, `DEMO_MODE` is unset, unset is falsy, and every call goes to the real Drizzle adapters — **which have never been executed against a database.** With placeholder Supabase credentials every page fails; with real credentials against an unmigrated database every page fails differently. Neither error names the cause.

**Always set `DEMO_MODE="true"` in `.env.local`.**

This is tracked as finding F-3 in `REPOSITORY_STABILIZATION_REPORT.md` §6.1. The fix is a three-line addition to `.env.example` and has not yet been approved.

### 1.2 `DATABASE_URL` is required even in demo mode

`src/db/index.ts` throws `DATABASE_URL is not set` **at module evaluation**, not on first query. `next build` imports the module graph while collecting page data, so any route that transitively reaches it fails the build — regardless of `DEMO_MODE`, because the dispatcher chooses its branch at _call_ time while the import happens at _module_ time.

**A placeholder DSN is sufficient. No database is contacted in demo mode.**

```
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/postgres"
```

Finding F-2 / TD-23. The correct fix is lazy client initialisation; that is a code change and out of scope for Phase C.1.

---

## 2. Prerequisites

| Requirement      | Version    | Notes                                                                                                           |
| ---------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| Node.js          | **24.x**   | Verified on v24.15.0. CI uses 24. **Not pinned in the repo** — no `engines`, no `.nvmrc` (Commit 13 adds them). |
| npm              | 11.x       | Verified on 11.12.1. Lockfile is v3.                                                                            |
| git              | any recent |                                                                                                                 |
| Supabase project | —          | **Not required for demo mode.** Sprint 13 onward only.                                                          |
| PostgreSQL       | —          | **Not required for demo mode.**                                                                                 |

---

## 3. Demo Setup — the 4-variable minimum

This is the whole procedure. It was verified end-to-end against a clean clone with no local state (`REPOSITORY_STABILIZATION_REPORT.md` §7).

```bash
git clone <remote> ai-nexos && cd ai-nexos
npm ci

cat > .env.local <<'EOF'
# ── Persistence mode ──────────────────────────────────────────
# "true" = in-memory DemoStore. The ONLY supported mode at v1.0.0-beta.
DEMO_MODE="true"

# ── Required even in demo mode (module-eval guard; never connected) ──
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/postgres"

# ── Required by the Supabase client constructor (never called in demo) ──
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key"
EOF

npm run dev          # → http://localhost:3000
```

**Three of the four accept placeholders.** Only `DEMO_MODE` needs a real value, and its real value is the literal string `"true"`.

### Verify

```bash
curl -s http://localhost:3000/api/health
# {"status":"healthy","demoMode":true,"version":"1.0.0","environment":"development",...}
```

`"demoMode":true` is the check that matters. If it reads `false`, `DEMO_MODE` is not being picked up and nothing else will work.

Then open `http://localhost:3000/login`. **Demo login accepts any credentials** and grants an owner with `{"*":["*"]}` — this is P2-06, open and known.

---

## 4. Variable Reference

Every variable in `.env.example`, plus `DEMO_MODE`, with its true requirement per environment. Determined empirically, not from the template's comments.

**Legend:** ● required · ◐ optional · ○ not needed · ✕ unused by any code path

| Variable                              | Demo  |  CI   | Production  | Notes                                                                                                                                                           |
| ------------------------------------- | :---: | :---: | :---------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`DEMO_MODE`**                       | **●** | **●** |    **●**    | ⚠️ **Absent from `.env.example`.** `"true"` for demo/CI. Sprint 15 must make `"true"` unbootable in a production build (P2-06).                                 |
| **`DATABASE_URL`**                    | **●** | **●** |    **●**    | Demo/CI: any syntactically valid DSN. Production: Supabase **pooler**, port **6543**, `?pgbouncer=true`. Requires `prepare:false` (already set).                |
| **`NEXT_PUBLIC_SUPABASE_URL`**        | **●** | **●** |    **●**    | Placeholder fine in demo/CI.                                                                                                                                    |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**   | **●** | **●** |    **●**    | RLS-enforced, browser-safe. Placeholder fine in demo/CI.                                                                                                        |
| `DIRECT_DATABASE_URL`                 |   ○   |   ○   |    **●**    | Direct connection, port **5432**. **The pooler breaks DDL** — `drizzle-kit migrate` must use this.                                                              |
| `SUPABASE_SERVICE_ROLE_KEY`           |   ○   |   ○   |    **●**    | **Bypasses RLS. Server only. Never prefix `NEXT_PUBLIC_`.** Needed by workers, the portal service layer, and seeding.                                           |
| `NEXT_PUBLIC_APP_DOMAIN`              |   ◐   |   ○   |    **●**    | Unset → localhost:3000.                                                                                                                                         |
| `NEXT_PUBLIC_PORTAL_DOMAIN`           |   ◐   |   ○   |    **●**    | Test locally via `http://portal.localhost:3000`.                                                                                                                |
| `NEXT_PUBLIC_APP_URL`                 |   ◐   |   ○   |    **●**    |                                                                                                                                                                 |
| `NEXT_PUBLIC_PORTAL_URL`              |   ◐   |   ○   |    **●**    |                                                                                                                                                                 |
| `SEED_ORG_NAME`                       |   ◐   |   ○   |    **●**    | `scripts/seed.ts`. Org identity is configuration, never code.                                                                                                   |
| `SEED_ORG_SLUG`                       |   ◐   |   ○   |    **●**    |                                                                                                                                                                 |
| `SEED_ORG_TIMEZONE`                   |   ◐   |   ○   |    **●**    |                                                                                                                                                                 |
| `SEED_ORG_CURRENCY`                   |   ◐   |   ○   |    **●**    |                                                                                                                                                                 |
| `SEED_OWNER_EMAIL`                    |   ◐   |   ○   |    **●**    |                                                                                                                                                                 |
| `SEED_OWNER_PASSWORD`                 |   ◐   |   ○   |    **●**    | ⚠️ Template default is `"change-me-immediately"`. Sprint 15 should **reject this value at seed time**, not merely document it.                                  |
| `SEED_OWNER_FIRST_NAME`               |   ◐   |   ○   |    **●**    |                                                                                                                                                                 |
| `SEED_OWNER_LAST_NAME`                |   ◐   |   ○   |      ◐      |                                                                                                                                                                 |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` |   ◐   |   ○   |    **●**    | Template says `documents`; the migration plan provisions **`nexos-assets`**. **Reconcile in Sprint 14.**                                                        |
| `RESEND_API_KEY`                      |   ○   |   ○   | **●** (S16) | `EmailChannel.deliver()` is `console.log` until Sprint 16.                                                                                                      |
| `SENTRY_DSN`                          |   ○   |   ○   | **●** (S16) | Variable exists; **no SDK installed**.                                                                                                                          |
| `REDIS_URL`                           |   ◐   |   ○   | **●** (S16) | Unset → warning stub. `InMemoryQueueProvider` **throws** in production unless `DEMO_MODE=true` — a deliberate guard that will fire on day one of a real deploy. |
| `OPENAI_API_KEY`                      |   ○   |   ○   |      ○      | Out of v1.0 scope (TD-03). `executeProvider()` returns a canned string.                                                                                         |
| `ANTHROPIC_API_KEY`                   |   ○   |   ○   |      ○      | Same.                                                                                                                                                           |
| `GEMINI_API_KEY`                      |   ○   |   ○   |      ○      | Same.                                                                                                                                                           |
| `NEXTAUTH_SECRET`                     |   ✕   |   ✕   |      ✕      | **Unused.** The platform uses Supabase Auth natively. Remove from `.env.example` at the next revision.                                                          |

### Recommended `.env.example` amendments

Not applied in Phase C.1. Each is a one-line change.

1. **Add `DEMO_MODE`** with the comment block from §1.1. _(Critical.)_
2. **Note that `DATABASE_URL` is required in demo mode** and a placeholder suffices. _(Critical.)_
3. **Remove `NEXTAUTH_SECRET`** — unused by any code path.
4. **Reconcile the storage bucket name** — `documents` vs `nexos-assets`.

---

## 5. CI Environment

`.github/workflows/ci.yml` runs `npm ci` → `lint` → `format:check` → `typecheck` → `build` on Node 24.

**It currently provides only two variables**, and therefore **its build step fails**:

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
```

`DATABASE_URL` is missing, so `npm run build` dies collecting page data for `/api/approvals/verify` (§1.2). `format:check` fails independently on 341 files. There is no remote, so this workflow has **never executed** and neither failure has ever been observed.

Required fix (Commit 10):

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
  DATABASE_URL: postgresql://placeholder:placeholder@localhost:5432/postgres
  DEMO_MODE: "true"
```

`format:check` needs `npm run format -- --write` across 341 files — its own commit (11), after the tag.

**No real secret belongs in CI at v1.0.0-beta.** Every build-time need is satisfiable with placeholders because CI never contacts a database.

---

## 6. Production Environment

⛔ **Not provisioned. Nothing below has been executed.** Sprints 13–17. See `PRODUCTION_MIGRATION_PLAN.md`.

### 6.1 Variable groups by sprint

| Sprint               | Variables to configure                                                                                                                                           | Gate                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **13 — Persistence** | `DATABASE_URL` (pooler 6543), `DIRECT_DATABASE_URL` (direct 5432), `SUPABASE_SERVICE_ROLE_KEY`, real `NEXT_PUBLIC_SUPABASE_*`, all 8 `SEED_*`, `DEMO_MODE=false` | Tenant isolation proven by test         |
| **14 — Storage**     | `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (reconciled)                                                                                                               | Real virus scanning; org-scoped dedup   |
| **15 — Auth**        | OAuth redirect URLs, all four `NEXT_PUBLIC_*_DOMAIN`/`_URL`                                                                                                      | `DEMO_MODE=true` fails to start         |
| **16 — Runtime**     | `RESEND_API_KEY`, `REDIS_URL`, `SENTRY_DSN`                                                                                                                      | Delivery, scheduler, observability live |
| **17 — Deployment**  | TLS, DNS, rate limiting, backup                                                                                                                                  | Restore rehearsed and timed             |

### 6.2 The pooler/direct split

This is the one production configuration detail that reliably wastes a day if missed.

| Connection | Port | Mode        | Used by                                                                                                                                                      |
| ---------- | ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pooler** | 6543 | Transaction | The app at runtime — `DATABASE_URL`. Requires `?pgbouncer=true` and `prepare: false` (both already configured in `src/db/index.ts` and `drizzle.config.ts`). |
| **Direct** | 5432 | Session     | `drizzle-kit migrate` only — `DIRECT_DATABASE_URL`. **DDL fails through the transaction pooler.**                                                            |

### 6.3 Secrets management

| Item                                           | Current state                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `.env*` gitignored, `.env.example` re-included | ✅ Correct. Deny-then-allow ordering.                                        |
| Any `.env` tracked in git                      | ✅ None — verified against `git ls-files`.                                   |
| Real secrets in `.env.example`                 | ✅ None. All placeholders.                                                   |
| Vault / secret manager                         | ❌ None. Checklist 7.15 ⚠️                                                   |
| Rotation policy                                | ❌ None.                                                                     |
| Production secret store                        | ❌ Not provisioned. Vercel environment variables are the intended mechanism. |

**Rules that hold regardless of provisioning state:**

1. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is server-only. A `NEXT_PUBLIC_` prefix on it is a full data breach.
2. Never commit `.env.local` — and never `git add -f` it "just this once".
3. Rotate any credential that has appeared in a terminal shared over screen-share, a log, or a chat message.
4. `SEED_OWNER_PASSWORD` must not survive first login.

---

## 7. Troubleshooting

| Symptom                                                                                          | Cause                                                   | Fix                                                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------- |
| `Error: DATABASE_URL is not set` during `npm run build`                                          | §1.2 — module-eval guard                                | Add a placeholder `DATABASE_URL`                                 |
| Build fails collecting page data for `/projects/[projectId]/timeline` or `/api/approvals/verify` | Same                                                    | Same                                                             |
| `/api/health` reports `"demoMode":false`                                                         | `DEMO_MODE` unset or not `"true"`                       | Set `DEMO_MODE="true"`; restart dev server                       |
| Every page errors; stack traces mention Drizzle or `postgres`                                    | `DEMO_MODE` falsy → real adapters, which have never run | Set `DEMO_MODE="true"`                                           |
| `npm run format:check` exits 1                                                                   | Known — 341 files unformatted (F-1)                     | Not your change. Commit 11.                                      |
| `drizzle-kit migrate` hangs or errors on DDL                                                     | Using the pooler                                        | Use `DIRECT_DATABASE_URL`, port 5432                             |
| Portal routes 404 locally                                                                        | Portal is domain-routed                                 | `http://portal.localhost:3000`                                   |
| Data resets on restart                                                                           | Expected                                                | DemoStore lives on `globalThis`; it is a fixture, not a database |
| CI red on `build`                                                                                | Workflow omits `DATABASE_URL`                           | Commit 10                                                        |

---

_Demo setup verified against a clean clone with no local state (`REPOSITORY_STABILIZATION_REPORT.md` §7). Production sections are unverified — no environment has been provisioned._
