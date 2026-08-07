# AI NEX OS — Environment Reference

**Status:** authoritative for environment configuration (Phase 2, Sprint 2.1)
**Code of record:** [`src/lib/env.ts`](../src/lib/env.ts) (public) ·
[`src/lib/env.server.ts`](../src/lib/env.server.ts) (server) ·
[`.env.example`](../.env.example) (template)

No secret values appear in this document. Every value shown is a placeholder or
an instruction for obtaining one.

---

## 1. The one command

```bash
npm run env:check                # validate for local development
npm run env:check -- --production   # validate against the production rules
```

It runs exactly the validation the server runs at boot, prints which variables
are set and which fallbacks are in effect, and exits non-zero if the
configuration would refuse to start. Names only — never values.

---

## 2. Classification

Every variable belongs to exactly one class. `ENV_MANIFEST` in
`src/lib/env.server.ts` is the machine-readable source; this table mirrors it.

| Class          | Meaning                                                             | On absence                              |
| -------------- | ------------------------------------------------------------------- | --------------------------------------- |
| **REQUIRED**   | The app cannot function without it, in any environment              | Hard failure                            |
| **PRODUCTION** | Required when `NODE_ENV=production`; a safe substitute exists below | Substitute + warning outside production |
| **OPTIONAL**   | Absence is a supported configuration                                | Documented fallback, no warning class   |
| **DEV ONLY**   | Meaningful only outside production                                  | Refused in production                   |
| **TOOLING**    | Read by scripts (drizzle-kit, seed), never by the running app       | Script-local handling                   |

### 2.1 Variables

| Variable                              | Class      | Exposure | Purpose                                           | Fallback                                                |
| ------------------------------------- | ---------- | -------- | ------------------------------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | REQUIRED   | public   | Supabase project URL; also the CSP-allowed origin | —                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | REQUIRED   | public   | Anon/publishable key, RLS-enforced                | —                                                       |
| `DATABASE_URL`                        | REQUIRED   | server   | Drizzle runtime connection (pooler, **6543**)     | —                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`           | PRODUCTION | server   | Service-role key; bypasses RLS                    | Paths needing it fail individually outside production   |
| `JWT_SECRET`                          | PRODUCTION | server   | Signs approval/review tokens (≥32 chars)          | Random per-process key; tokens die on restart           |
| `SHARE_JWT_SECRET`                    | PRODUCTION | server   | Signs share-link session tokens (≥32 chars)       | Random per-process key; tokens die on restart           |
| `NEXT_PUBLIC_APP_DOMAIN`              | PRODUCTION | public   | Dashboard host                                    | `localhost:3000`                                        |
| `NEXT_PUBLIC_PORTAL_DOMAIN`           | PRODUCTION | public   | Portal host                                       | `portal.localhost:3000`                                 |
| `NEXT_PUBLIC_APP_URL`                 | PRODUCTION | public   | Absolute dashboard URL                            | Derived from `NEXT_PUBLIC_APP_DOMAIN` over `http://`    |
| `NEXT_PUBLIC_PORTAL_URL`              | PRODUCTION | public   | Absolute portal URL (share links)                 | Derived from `NEXT_PUBLIC_PORTAL_DOMAIN` over `http://` |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | OPTIONAL   | public   | Storage bucket for uploads                        | `nexos-assets`                                          |
| `REDIS_URL`                           | OPTIONAL   | server   | Portal cache backend                              | In-memory cache (per-instance, **not shared**)          |
| `NEXT_PUBLIC_BUILD_NUMBER`            | OPTIONAL   | public   | Build id surfaced by `/api/health`                | `local-dev`                                             |
| `DEMO_MODE`                           | DEV ONLY   | server   | Serves the in-memory demo dataset                 | Treated as `false`; `true` in production is fatal       |
| `DIRECT_DATABASE_URL`                 | TOOLING    | server   | drizzle-kit migrations (direct, **5432**)         | `drizzle.config.ts` falls back to `DATABASE_URL` + warn |
| `SEED_*` (8 variables)                | TOOLING    | server   | Bootstrap identity for `npm run db:seed`          | Per-variable defaults in `scripts/seed.ts`              |

An empty string is treated as absent everywhere. Deployment platforms routinely
inject `KEY=""` for a variable that was declared and left blank, and treating
that as a present-but-invalid value is not useful to anyone.

### 2.2 Deliberately absent

No code reads these; they were removed rather than left as validated-but-dead
configuration. Setting them today has no effect.

| Variable                                                | Returns with                               |
| ------------------------------------------------------- | ------------------------------------------ |
| `RESEND_API_KEY`                                        | Notifications/email delivery               |
| `SENTRY_DSN`                                            | Observability (Phase 7)                    |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | A real AI provider (the factory is a stub) |
| `NEXTAUTH_SECRET`                                       | Never — Supabase Auth is native            |

There is no Stripe integration in this codebase; billing is out of scope for the
current phase.

---

## 3. Public vs server: why two modules

`src/lib/env.ts` holds only `NEXT_PUBLIC_*` values and is safe to import from a
client component, the proxy, or `next.config.ts`. `src/lib/env.server.ts` holds
the secrets, their schema, `ENV_MANIFEST`, and the boot gate.

The split is not cosmetic. When both halves lived in one module, importing it
from the browser Supabase client pulled the server schema — and the _name_ of
every secret — into a client chunk. No values were ever exposed (Next only
inlines `NEXT_PUBLIC_*`), but that surface does not belong in a browser bundle.

Consequences worth knowing:

- Never import `env.server.ts` from a file with `"use client"`. It has a runtime
  `typeof window` guard, but the import itself is the mistake.
- Public values are read as **literal** `process.env.NEXT_PUBLIC_…` references,
  because Next substitutes them at build time. A dynamic lookup
  (`process.env[name]`) yields `undefined` in the browser. Do not "simplify"
  `rawPublicEnv` into a loop.
- Public values are therefore **baked into the build**. Changing one requires a
  rebuild, not just a restart. Server values are read at runtime.

---

## 4. When failures happen

| Moment                | What is validated                                                       | On failure                                        |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| Module import         | Public shape only, non-fatally. Bad values are dropped and recorded     | Nothing throws — pages still render               |
| `next build`          | Nothing environment-dependent. The boot gate is skipped during build    | Build succeeds with no secrets configured         |
| Server boot           | `src/instrumentation.ts` → `assertProductionConfig()` + diagnostics log | Process refuses to start, **all** problems listed |
| First server env read | `getServerEnv()` parses and caches                                      | Throws with every problem listed                  |
| Point of use          | `requirePublicEnv()` for a value the caller cannot work without         | Throws naming the variable and where to get it    |
| `/api/health`         | Reports diagnostics; answers 503 `misconfigured` rather than throwing   | Monitor-visible, still informative                |

"Build vs boot" matters for CI and for Vercel: the build stage has no runtime
secrets, so requiring them there would make every deployment fail before the
variables are ever consulted. Enforcement belongs at boot, which is where
`src/instrumentation.ts` runs.

---

## 5. Local setup

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL
npm run env:check
npm run dev
```

Minimum for a demo walkthrough (no database contacted):

```
DEMO_MODE="true"
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="placeholder-anon-key"
```

`DATABASE_URL` is still listed because it is REQUIRED by class, not because
demo mode reads it — the Drizzle client is lazily initialised (Phase 1), so a
placeholder DSN is never dialled.

Set `JWT_SECRET` and `SHARE_JWT_SECRET` locally too if you are working on
approvals or share links. Without them each restart generates a new random key
and previously issued tokens stop verifying — which looks like a bug in the
token code.

---

## 6. Production deployment

1. Set every REQUIRED and PRODUCTION variable in the platform's environment
   (Vercel: Project → Settings → Environment Variables).
2. Generate the two signing secrets **separately**:
   `openssl rand -base64 48`.
3. Confirm `DEMO_MODE` is unset or `"false"`. `true` is a fatal startup error.
4. Confirm `SUPABASE_SERVICE_ROLE_KEY` is **not** prefixed `NEXT_PUBLIC_`.
5. Deploy, then check the boot log for the `[env]` summary line and
   `GET /api/health`.

Rotating a signing secret invalidates every token it signed: outstanding
approval links and active share-link sessions stop working. Rotate deliberately.

---

## 7. Troubleshooting

| Symptom                                                | Cause                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| Server exits at start with a list of variables         | Working as intended. Fix all of them; the list is complete              |
| `NEXT_PUBLIC_… is not set` at runtime                  | Set in the platform but not at **build** time, or set after the build   |
| Tokens stop verifying after a restart                  | `JWT_SECRET`/`SHARE_JWT_SECRET` unset outside production                |
| `SUPABASE_SERVICE_ROLE_KEY is not set`                 | Portal/worker path reached without the service-role key                 |
| Migrations fail with a prepared-statement or DDL error | `DIRECT_DATABASE_URL` unset; drizzle-kit fell back to the pooler (6543) |
| Real data expected, demo data shown                    | `DEMO_MODE="true"`                                                      |
| Cache behaves inconsistently across instances          | `REDIS_URL` unset; the in-memory cache is per-instance                  |
| `/api/health` returns 503 `misconfigured`              | The environment is invalid; the payload names the problem               |
