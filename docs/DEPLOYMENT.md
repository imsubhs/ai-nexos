# AI NEX OS — Deployment, Rollback and Secret Rotation Runbook

**Status:** authoritative for production deployment procedure (Phase 2, Sprint 2.4)
**Specification:** [SPRINT-2.4.md](SPRINT-2.4.md) · **Environment contract:**
[ENVIRONMENT.md](ENVIRONMENT.md) · **Recovery:**
[RECOVERY_CHECKLIST.md](RECOVERY_CHECKLIST.md)

No secret value appears in this document. Every value shown is a placeholder, a
non-secret setting, or an instruction for obtaining one.

---

## 0. What is proven, and what is not

This section is the honest state of the deployment. It is updated by execution,
never by intent.

| Item                                                    | State                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| Configuration enforcement (G2.4-1)                      | **Done and verified** — see [SPRINT-2.4.md](SPRINT-2.4.md) §19.1        |
| Deploy gate implemented in CI                           | **Done** — `.github/workflows/ci.yml`, job `deploy`                     |
| Deploy gate observed rejecting a bad configuration      | **Done at the gate step** — §4.1. Not yet observed in a pipeline run    |
| Local quality gate                                      | **Green** — 489 unit tests · lint 0 errors · typecheck · format · build |
| Supabase project reachable with the production topology | **Verified** — Session Pooler, PostgreSQL 17.6, `documents` bucket      |
| Vercel project                                          | **Not created.** No Vercel credential exists on the build machine       |
| Production URLs                                         | **Not assigned**                                                        |
| Production secrets (`JWT_SECRET`, `SHARE_JWT_SECRET`)   | **Not generated.** Generated only when a target exists to receive them  |
| Real user sign-in against a deployed URL (A-01)         | **Not executed**                                                        |
| Byte-identical upload/download in production (M-08)     | **Not executed**                                                        |
| Backup restore rehearsal (B-10)                         | **Not executed**                                                        |

**Do not read this runbook as evidence of a deployment.** §0 is the only place
that says whether one exists.

---

## 1. Architecture the deployment has to satisfy

The platform is dual-host by design, and the two hosts are not
interchangeable:

```
APP host     →  internal dashboard, /login, /auth/callback, /dashboard
PORTAL host  →  client portal; share links at PORTAL/s/{token}
```

`src/proxy.ts` distinguishes them from the `Host` header alone. `isPortalHost()`
returns true when the host equals `NEXT_PUBLIC_PORTAL_DOMAIN` exactly, or when
it begins with `portal.`. Everything else is treated as the app host.

**Therefore `NEXT_PUBLIC_APP_DOMAIN` and `NEXT_PUBLIC_PORTAL_DOMAIN` must be
different hostnames.** Configuring them identically does not degrade the
deployment, it breaks it: the portal branch would capture `/login`,
`/auth/callback` and every dashboard route, and rewrite them into `/portal/*`.

The deploy job asserts `NEXT_PUBLIC_APP_URL !== NEXT_PUBLIC_PORTAL_URL` before
building, so this cannot reach production silently.

---

## 2. One-time setup

### 2.1 Vercel project

| Setting         | Value                                       |
| --------------- | ------------------------------------------- |
| Repository      | `https://github.com/imsubhs/ai-nexos`       |
| Root directory  | `.`                                         |
| Framework       | Next.js                                     |
| Node version    | 24 — matches `.github/workflows/ci.yml`     |
| Install command | `npm ci`                                    |
| Build command   | `npm run build`                             |
| Region          | choose nearest to Supabase `ap-northeast-1` |

**Region is not cosmetic here.** All 36 routes are dynamic — the nonce-based CSP
requires a per-request header in the root layout, so nothing is prerendered — and
every request reaches Postgres through the pooler. An application deployed far
from `ap-northeast-1` pays that round trip on every request.

**Production branch.** The deploy job is gated on
`phase-2-production-readiness`, which is Phase 2's branch of record. The
repository's default branch is `main`, and `main` does not yet contain the Sprint
2.3 or 2.4 work. When Phase 2 merges to `main`, change the single `if:` line in
the `deploy` job and Vercel's Production Branch setting together.

### 2.2 Hostnames

Two distinct hostnames are required (§1). On Vercel each project is
automatically served at `<project-name>.vercel.app`; additional hostnames are
added under **Project → Settings → Domains**.

Vercel documents that `.vercel.app` deployment URLs are "allocated on a
first-come, first-served basis and cannot be reserved", and does not state
whether a second `.vercel.app` hostname may be attached to an existing project.
**That is an empirical question, answered in the dashboard, not from the
documentation.** Resolve it in this order:

1. Attempt to add the portal hostname to the same project. If Vercel accepts it,
   one project serves both hosts — the preferred architecture.
2. Only if Vercel refuses `.vercel.app` in the Domains form, create a second
   project from the same repository for the portal host, with its own
   environment values. Record the refusal as the reason.

Either way, the deployed code is identical; only the `Host` header differs.

### 2.3 Environment variables

Set in **Project → Settings → Environment Variables**, scope **Production**.
`NEXT_PUBLIC_*` values are substituted by Next at **build** time, so they must be
present in the build environment, and changing one requires a **rebuild, not a
restart**.

| Variable                              | Class      | Value                                                                |
| ------------------------------------- | ---------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | required   | Supabase → Project Settings → API                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | required   | Supabase → Project Settings → API (publishable)                      |
| `DATABASE_URL`                        | required   | Session Pooler host, **port 6543**, `?pgbouncer=true`                |
| `DIRECT_DATABASE_URL`                 | tooling    | Same host, **port 5432**. Absence only warns, but migrations need it |
| `SUPABASE_SERVICE_ROLE_KEY`           | production | Server-only. **Never** prefix `NEXT_PUBLIC_`                         |
| `JWT_SECRET`                          | production | `openssl rand -base64 48` — see §6                                   |
| `SHARE_JWT_SECRET`                    | production | A **separate** `openssl rand -base64 48`                             |
| `NEXT_PUBLIC_APP_DOMAIN`              | production | App hostname, no scheme                                              |
| `NEXT_PUBLIC_PORTAL_DOMAIN`           | production | Portal hostname, no scheme — must differ from the app                |
| `NEXT_PUBLIC_APP_URL`                 | production | `https://<app hostname>`                                             |
| `NEXT_PUBLIC_PORTAL_URL`              | production | `https://<portal hostname>`                                          |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | production | `documents`                                                          |
| `TRUSTED_PROXY_HOPS`                  | optional   | `1` — correct for a single platform edge                             |
| `LOG_LEVEL`                           | optional   | `info`                                                               |
| `NEXT_PUBLIC_BUILD_NUMBER`            | optional   | Build/commit identifier, so `/api/health` is not `local-dev`         |
| `REDIS_URL`                           | optional   | **Intentionally unset** — decision recorded in §2.5                  |
| `EGRESS_ALLOWED_HOSTS`                | optional   | Unset permits any public host; private/loopback/metadata refused     |

**Must not be set in the deployed environment:**

- `DEMO_MODE` — `"true"` with `NODE_ENV=production` is a fatal startup error, by
  design. It is also an authentication bypass, not a data-source toggle.
- `SEED_*` — read only by `npm run db:seed`, never by the running application.

Database connection string rules that produce misleading errors when broken:

- Username is `postgres.<project-ref>`, never bare `postgres`. A bare `postgres`
  yields `XX000 tenant or user not found` — a routing failure that reads as an
  authentication failure.
- The region in the hostname must be `ap-northeast-1`. A wrong region produces
  the identical error.
- Percent-encode special characters in the password (`@` → `%40`).
- Do not use `db.<project-ref>.supabase.co`: it publishes only an AAAA record and
  is unreachable from IPv4-only networks.

### 2.4 Supabase Auth URLs

**Authentication → URL Configuration.**

| Setting       | Value                                      |
| ------------- | ------------------------------------------ |
| Site URL      | `https://<app hostname>`                   |
| Redirect URLs | add `https://<app hostname>/auth/callback` |

`/auth/callback` is the real path — verified in
`src/app/auth/callback/route.ts`, which handles both the PKCE (`?code=`) and
token-hash (`?token_hash=&type=`) flows. It builds its redirect from the
configured `APP_URL` rather than from the request's `Host` header, deliberately:
the header is caller-supplied, and a redirect derived from it would be
attacker-steerable _after_ the session cookie is set.

Leave existing localhost redirect URLs in place. Development needs them and they
grant nothing in production.

### 2.5 Redis — a decision, not a default (C-09, D-5)

`REDIS_URL` is optional and its absence is a supported configuration: the rate
limiter and brute-force counters fall back to a per-process in-memory store
(`src/lib/security/rate-limit.ts`), and the portal cache does the same.

**The specification's fallback option — "pin production to a single instance" —
does not exist on Vercel.** Serverless functions scale horizontally on demand
and cannot be pinned to one instance, so the effective limit is the configured
limit multiplied by the number of concurrent instances. A sign-in limit of 5
becomes 5 × N.

So there are exactly two honest positions:

1. **Provision Redis** (Upstash via the Vercel Marketplace is the low-friction
   option) and set `REDIS_URL`. Rate limits then mean what they say.
2. **Accept the weakness explicitly** and record that sign-in and share-password
   throttling is per-instance in production.

**Decision: option 2.** `REDIS_URL` is intentionally left unset for the first
production deployment. No Redis instance is provisioned, and this is a recorded
acceptance rather than an oversight.

What that buys and what it costs:

- Rate limiting still functions. The weighted sliding window is unchanged; only
  its scope narrows from the fleet to one instance.
- The limits that matter — sign-in, magic link, auth callback, approval verify,
  portal session and share passwords — are weaker by exactly the concurrent
  instance count. A limit of 5 sign-in attempts is 5 × N in the worst case.
- This is a throttle, not the authentication boundary. Supabase Auth still
  verifies every credential; the weakening is in how quickly an attacker may
  retry, not in whether a wrong password is accepted.

The boot log warns about this on every start. **Do not silence the warning** —
it is the record that the deployment is running in the accepted-weakness
configuration, and it is how the decision gets revisited when traffic justifies
it. Revisit when the deployment sees real concurrent load, or before any
credential-stuffing exposure is a realistic concern.

Reversing the decision is one environment variable and a redeploy: provision
Redis, set `REDIS_URL`, and `getRedisStore()` picks it up on the next boot. No
code change is involved.

### 2.6 GitHub Actions secrets

The deploy job needs three, and only three:

| Secret              | Where it comes from                                          |
| ------------------- | ------------------------------------------------------------ |
| `VERCEL_TOKEN`      | Vercel → Account Settings → Tokens                           |
| `VERCEL_ORG_ID`     | `.vercel/project.json` after `vercel link`, or the dashboard |
| `VERCEL_PROJECT_ID` | Same                                                         |

Production application values are **not** duplicated into GitHub. The pipeline
runs `vercel pull --environment=production` and gates on that, so the
configuration checked and the configuration deployed are the same object. A
second copy in a second store is a second thing to drift.

---

## 3. Routine deployment

Deployment is a push to the production branch. Nothing is deployed by hand.

```bash
git rev-parse --show-toplevel        # confirm the right repository first
git status --short --branch
git push origin phase-2-production-readiness
```

The pipeline then runs, in order:

```
lint → format:check → typecheck → test → build → audit:deps      (job: quality)
        ↓  all must pass
vercel pull  →  env:check --production --verify  →  storage:setup
        ↓  the gate
vercel build --prod  →  vercel deploy --prebuilt --prod
        ↓
post-deploy health check on both hosts
```

Three properties of that order are deliberate:

- **The gate runs before the build.** A misconfigured deployment fails the
  pipeline, not the users. The boot gate in `src/instrumentation.ts` also catches
  it, but that fires at process start — on Vercel, after the deployment is live.
- **`--verify` opens real connections.** A syntactically perfect connection
  string pointing at a project that does not exist passes every presence check,
  and `next build` passes too, because no route is prerendered against the
  database. That combination reads as a fully configured environment while
  nothing is reachable.
- **Promotion is last.** A failed gate, build or upload leaves the previous
  production deployment serving, untouched.

### 3.1 First deployment only

Run once, after §2 and before trusting the pipeline:

```bash
npm run storage:setup            # idempotent; asserts `documents` exists and is private
npm run env:check -- --production --verify
```

Migrations are **not** part of deployment. Migrations `0000`–`0013` are already
applied and immutable; Sprint 2.4 adds none.

---

## 4. Verifying a deployment

Run against the deployed URLs. Reading configuration is not a substitute for any
of these.

```bash
APP=https://<app hostname>
PORTAL=https://<portal hostname>

curl -s "$APP/api/health"      # 200, status healthy, environment production
curl -s "$PORTAL/api/health"   # 200 — the portal host resolves and serves
curl -sI "$APP" | grep -i strict-transport   # TLS terminating
curl -sI "http://<app hostname>" | grep -i location   # HTTP → HTTPS
curl -sI "$APP/login" | grep -i content-security-policy   # per-request nonce
```

The health payload must **withhold** `services`, `usingFallback` and `demoMode`
in production — that redaction is what keeps `/api/health`, the one endpoint an
anonymous scanner is guaranteed to reach, from being a reconnaissance map.

Then, in a browser, and not by inference:

1. Sign in as a real user on the app host.
2. Confirm the dashboard renders that user's identity and real organisation data.
3. Upload a file, download it, and compare SHA-256.
4. Confirm an unsigned request for the stored object path is refused.
5. Sign out and confirm a protected route redirects to `/login`.

### 4.1 The negative deployment test (M-14)

A deploy gate that has never rejected anything is an untested gate. The gate's
rejection is verified two ways.

**Automated**, in the suite, on every run:
`tests/unit/production-deploy-gate.test.ts` spawns `scripts/check-env.ts` as a
process — the way CI invokes it — and asserts the exit code. 21 cases: a valid
configuration exits 0; each of the eleven production-required variables exits
non-zero when absent; empty strings, `http://` origins, loopback origins, bare
hosts, a short signing secret and `DEMO_MODE=true` all exit non-zero; and no
secret value appears in the output.

**Executed manually**, against the gate exactly as the pipeline runs it:

| Case                                       | Exit code |
| ------------------------------------------ | --------- |
| Complete production configuration          | **0**     |
| `NEXT_PUBLIC_PORTAL_URL` removed           | **1**     |
| `NEXT_PUBLIC_PORTAL_URL` set to `http://…` | **1**     |
| Configuration restored                     | **0**     |

The removal case reports
`NEXT_PUBLIC_PORTAL_URL: Absolute portal URL used to build share links.`; the
`http://` case reports `must use https:// in production — it is the base of a
redirect that carries a secure cookie.`

**Still outstanding:** observing the _pipeline_ stop. GitHub Actions fails a job
at the first failing step, so a non-zero gate means `vercel build` and
`vercel deploy` never run — but that has not yet been watched happen, because no
Vercel project exists to deploy to. It is recorded as unverified in §0 rather
than assumed.

---

## 5. Rollback

### 5.1 The rollback that no longer exists

Every sprint before 2.4 could fall back to `DEMO_MODE=true`. **That is gone.**
`DEMO_MODE=true` under `NODE_ENV=production` is a fatal startup error, and
`isDemoMode()` returns false in production unconditionally regardless. A shared
demo identity carrying owner permissions on every module is a security
regression, not a recovery.

### 5.2 What to do instead

| Failure                         | Rollback                                                                                    | Cost                                |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| Bad application build           | Vercel → Deployments → previous deployment → **Promote to Production**                      | Low — no data change                |
| Bad configuration value         | Correct it, then **redeploy**. A `NEXT_PUBLIC_*` change needs a rebuild                     | Low, slower than operators expect   |
| Enforcement change breaks boot  | Revert the `env.server.ts` change; the deployment refuses to boot until fixed               | Low — caught before traffic         |
| Storage bucket misconfigured    | Correct `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`, rebuild, re-run `storage:setup`              | Low — objects are not lost          |
| Database credential rejected    | Reset the password; **wait ~2 min for the Supavisor cache**; re-verify                      | Medium — full outage while it lasts |
| Data corruption                 | PITR only, and lossy. Treat as an incident — [RECOVERY_CHECKLIST.md](RECOVERY_CHECKLIST.md) | High                                |
| Hostname / TLS misconfiguration | Remove the bad domain from the project; TLS re-issues on the previous host                  | Medium — propagation delay          |

**Supavisor credential caching.** After a database password reset the pooler may
keep rejecting the **new** password with `28P01` for roughly two minutes, then
accept it unchanged. Do not diagnose "wrong password" from a single post-reset
attempt: retry, then confirm with `npm run env:check -- --production --verify`.

Promoting a previous deployment does **not** roll back environment variables.
They are project state, not deployment state. A configuration mistake has to be
corrected and rebuilt.

---

## 6. Secret rotation

Two signing secrets, rotated independently. Both are ≥ 32 characters, enforced
by the schema.

```bash
openssl rand -base64 48      # JWT_SECRET
openssl rand -base64 48      # SHARE_JWT_SECRET — generate separately
```

**Rotation invalidates every token the old key signed.** Specifically:

| Secret             | What stops working immediately             |
| ------------------ | ------------------------------------------ |
| `JWT_SECRET`       | Outstanding external review/approval links |
| `SHARE_JWT_SECRET` | Active client share-link portal sessions   |

Rotate deliberately, and tell whoever holds those links first.

Procedure:

1. Generate the new value locally. Do not paste it into chat, a ticket, a commit,
   `.env.example`, or this document.
2. Update it in Vercel → Settings → Environment Variables (Production).
3. Redeploy. These are server-side values read at runtime, so a redeploy is
   enough — but redeploy rather than restart, so the deployed SHA and the
   configuration stay associated.
4. Confirm `/api/health` is `healthy` and the boot log carries `[env]` with no
   new warning.

`SUPABASE_SERVICE_ROLE_KEY` rotates in Supabase, not here. It is server-only and
bypasses RLS; if it is ever exposed, rotate it before anything else.

**The database password and the service-role API key are independent secrets and
can be in different states.** A healthy Supabase project tells you nothing about
the database password. Supabase does not display it after creation — it can only
be set.

---

## 7. Backups and recovery

Backup capability depends on the Supabase project's plan and must be read from
the project, not from documentation that says what it ought to be. See
[RECOVERY_CHECKLIST.md](RECOVERY_CHECKLIST.md) for the source-rebuild path, which
is verified, and §0 above for whether a data restore has actually been rehearsed.

An unrehearsed backup is a belief, not a control.

---

## 8. Known limitations at deployment time

| #   | Limitation                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Share-token resolution does not work (Y-05).** `src/app/portal/s/[token]/page.tsx` discards its token and renders "This link is not active". Share link _addressing_ is correct; what answers there is not implemented. Three incompatible token systems exist and no unified resolver does |
| 2   | **Rate limits are per-instance. Accepted deliberately** — `REDIS_URL` is unset by decision, so sign-in, share-password and brute-force budgets are multiplied by the concurrent instance count (§2.5)                                                                                         |
| 3   | **150 of 202 tables have no RLS.** Their protection is the absence of a Data API grant, not a policy. Intact, and one `GRANT` away from being gone                                                                                                                                            |
| 4   | **Application writes bypass RLS.** Drizzle connects as the table owner; `requirePermission()` plus tenant-scoped `WHERE` clauses are the only enforced write control                                                                                                                          |
| 5   | **No error tracking.** No Sentry SDK is installed; `SENTRY_DSN` is deliberately absent                                                                                                                                                                                                        |
| 6   | **No background runtime.** Queue consumer, workers, scheduler and event bus are not instantiated; notification delivery is `console.log`                                                                                                                                                      |
| 7   | Only the `owner` role has ever been exercised end to end                                                                                                                                                                                                                                      |

Items 3 and 4 are pre-existing architecture risks recorded in
[SPRINT-2.4.md](SPRINT-2.4.md) §23. Deploying does not make them worse, but it
does make them live — which should be a recorded acceptance rather than a side
effect of shipping.
