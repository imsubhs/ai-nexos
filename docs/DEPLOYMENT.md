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

**The application is deployed and serving.**

| App             | https://ai-nexos.vercel.app                                |
| --------------- | ---------------------------------------------------------- |
| **Portal**      | https://ai-nexos-portal.vercel.app                         |
| **Deployment**  | `dpl_8sizC5UiHb2eURyQUFMdAQ5HUQZL` · commit `97c46d1611c7` |
| **Deployed at** | 2026-08-12T13:43:30Z                                       |

| Item                                                  | State                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Configuration enforcement (G2.4-1)                    | **Done and verified** — see [SPRINT-2.4.md](SPRINT-2.4.md) §19.1                                  |
| Local quality gate                                    | **Green** — 489 unit tests · lint 0 errors · typecheck · format · build · `audit:authz`           |
| Production configuration verified (G2.4-3)            | **PASS, in-build** against the real Sensitive values — PostgreSQL 17.6, bucket `documents` (§2.7) |
| Deployed and serving (G2.4-4)                         | **PASS** — READY, healthy and `production` on both hosts                                          |
| Smoke tests (G2.4-5)                                  | **8 of 11 PASS** — see §4. M-06/M-07/M-08 require a real session                                  |
| Deploy gate observed rejecting a bad configuration    | **PASS, by execution** — `BUILD_ERROR`, no promotion (§4.1)                                       |
| Failed deploy leaves previous version serving (P-07)  | **PASS, by execution** — production unchanged after the failed build (§4.1)                       |
| CI deploy job                                         | **Written, not yet exercised** — gated off by `PRODUCTION_DEPLOY_ENABLED` (§2.6)                  |
| Production secrets (`JWT_SECRET`, `SHARE_JWT_SECRET`) | **Generated and installed**, encrypted, 64 chars each (§6)                                        |
| Supabase variables in Vercel                          | **Operator-supplied, Sensitive** — never read, modified or downgraded by tooling (§2.7)           |
| Real user sign-in against a deployed URL (A-01)       | **Not executed** — requires a human session                                                       |
| Byte-identical upload/download in production (M-08)   | **Not executed** — depends on A-01                                                                |
| Backup restore rehearsal (B-10)                       | **Not executed** — no Supabase management access                                                  |

**§0 is the only place that says what is actually true.** Every row above was
moved by an executed command, not by intent.

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

**As provisioned.** These are the live values, read back from the Vercel API.

| Setting         | Value                                                                               |
| --------------- | ----------------------------------------------------------------------------------- |
| Team            | `riansaha321-4968s-projects`                                                        |
| Team ID         | `team_rd4VxH3wAWO6l3IfywaeCgkW`                                                     |
| Project         | `ai-nexos`                                                                          |
| Project ID      | `prj_d86pnPSjmbBvyutWaVCL6OVmW78z`                                                  |
| Plan            | Hobby                                                                               |
| Framework       | Next.js                                                                             |
| Root directory  | `.`                                                                                 |
| Node version    | 24.x — matches `.github/workflows/ci.yml`                                           |
| Install command | `npm ci`                                                                            |
| Build command   | `npm run env:check -- --production --verify && npm run build` — the gate (§2.7, §3) |
| Region          | `hnd1` (Tokyo) — nearest to Supabase `ap-northeast-1`                               |
| Git repository  | linked to `imsubhs/ai-nexos`, **auto-deploy disabled** — see below                  |

`hnd1` was accepted on the Hobby plan. That was not assumed: the region was
applied as a separate API call precisely so a plan restriction would surface as
its own refusal rather than silently reverting the whole project to defaults.

**Git is linked, but automatic deployment is disabled**
(`gitProviderOptions.createDeployments = "disabled"`). The link was added in the
dashboard; the auto-deploy was switched off afterwards, deliberately, and it must
stay off.

The reason is not tidiness. A Git-linked project with auto-deploy enabled builds
and promotes on **every push to its production branch** — and its production
branch is recorded as `main`, which does not contain the Sprint 2.3 or 2.4 work.
So an enabled auto-deploy would ship stale code, on a trigger nobody chose, and
in doing so would bypass nothing less than the gate itself.

That last point deserves care, because it changed. With the gate now living in
the **Build Command** (§2.7), a Vercel-side build _does_ run it, so auto-deploy
would no longer be ungated. What it would still do is deploy the wrong commit
without anyone asking. Keeping `createDeployments` disabled means every
deployment is deliberate and originates from the pipeline or an explicit CLI
invocation. The cost is the loss of Vercel's automatic PR previews.

**A separate Vercel project, `narratix-lab`
(`prj_bzGzDEDTyJmGq2ZZERH0ekDhMxjC`), exists in the same team and is unrelated
to this application.** It is not to be modified by any AI NEX OS operation.

### 2.1.1 Which repository this deploys

`https://github.com/imsubhs/ai-nexos`, branch `phase-2-production-readiness`.
The Vercel account's GitHub installation can see that namespace, so linking
would be possible — it is declined for the reason above, not because it is
unavailable.

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
That was an empirical question, and it has now been answered by execution.

**Answer: Vercel accepts it. One project serves both hosts.**

| Host                         | Role   | How it was obtained                     |
| ---------------------------- | ------ | --------------------------------------- |
| `ai-nexos.vercel.app`        | App    | Auto-assigned from the project name     |
| `ai-nexos-portal.vercel.app` | Portal | Added to the **same** project, verified |

No second Vercel project was needed, and none was created. The deployed code is
identical on both hosts; only the `Host` header differs, and `src/proxy.ts`
branches on it.

Both hostnames answered `DEPLOYMENT_NOT_FOUND` before creation, confirming
neither was claimed by anyone else.

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

Production application values are **not** duplicated into GitHub. A second copy
in a second store is a second thing to drift.

The deploy job is additionally gated on a repository **variable**,
`PRODUCTION_DEPLOY_ENABLED`. While it is unset the job is **skipped**, so the
pipeline is not permanently red before the three secrets exist. Set it to `true`
only once they do. A skipped job is visibly not a passed job; if it were made to
pass vacuously, the pipeline would report success while deploying nothing.

Use a **project-scoped** token. The one in use cannot see any other project in
the team — `narratix-lab` returns `404 not_found` and the project list contains
only `ai-nexos`. That makes the unrelated project structurally unreachable
rather than merely out of scope by convention.

### 2.7 Sensitive variables, and what they cost

The five Supabase variables are Vercel **Sensitive** variables and are to stay
that way. Sensitive means write-only: the value cannot be read back by the API,
the CLI, or the dashboard, only replaced.

Two consequences follow, and both are load-bearing.

**1. `vercel pull` cannot see them.** It returns the keys with a redacted
placeholder. Measured, not assumed:

| Variable                        | Type      | Length returned by `vercel pull` |
| ------------------------------- | --------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | sensitive | 11 — placeholder                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sensitive | 11 — placeholder                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | sensitive | 11 — placeholder                 |
| `DATABASE_URL`                  | sensitive | 11 — placeholder                 |
| `DIRECT_DATABASE_URL`           | sensitive | 11 — placeholder                 |
| `JWT_SECRET`                    | encrypted | 64 — the real value              |
| `NEXT_PUBLIC_APP_URL`           | plain     | 27 — the real value              |

A real anon key is a ~200-character JWT and a pooler URL is ~120 characters, so
an 11-character uniform result is unambiguous.

**This is worse than the variables being absent**, and that is the whole reason
the gate had to move. Every _presence_ check passes against a placeholder. A
presence-only gate would go green and deploy an application carrying the literal
placeholder as its Supabase URL — broken in the browser, healthy to a monitor.

**2. The gate must run where the values are.** Hence the Build Command (§3), and
hence `vercel deploy` **without** `--prebuilt`: a locally built bundle would
have the placeholders baked in.

**Their type cannot be changed in place.** Vercel answers
`You cannot change the type of a Sensitive Environment Variable`, so the only
route to a readable type is delete-and-recreate, which needs the values. Do not
attempt it as a convenience.

**One caveat worth knowing.** `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are `NEXT_PUBLIC_*`, so Next inlines them into
the client bundle and any visitor can read them from the browser regardless of
the flag. Marking them Sensitive protects them from dashboard and API readback
only. That is harmless — the anon key is designed to be public and RLS-enforced
— but the confidentiality benefit is real only for the other three.

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
GitHub Actions ── job: quality
  lint → format:check → typecheck → test → build → audit:deps
        ↓  all must pass
GitHub Actions ── job: deploy
  vercel deploy --prod          (remote build; NOT --prebuilt)
        ↓
Vercel build ──────────────────────────────────── THE GATE
  npm run env:check -- --production --verify
        ↓  non-zero  →  build fails  →  NO deployment exists
  npm run build
        ↓
  promote to both hostnames
        ↓
GitHub Actions
  post-deploy health check on both hosts
```

Four properties of that order are deliberate:

- **The gate runs inside the Vercel build, not in CI.** That is not a weakening;
  it is the only place the Sensitive values exist (§2.7). A gate in CI would be
  validating redacted placeholders and reporting success.
- **The deploy is not `--prebuilt`.** A locally built bundle would carry the
  placeholders instead of the real Supabase URL.
- **`--verify` opens real connections.** A syntactically perfect connection
  string pointing at a project that does not exist passes every presence check,
  and `next build` passes too, because no route is prerendered against the
  database. That combination reads as a fully configured environment while
  nothing is reachable.
- **Promotion is last, and conditional.** A failed gate means the build fails,
  which means no deployment is ever created — so there is nothing to promote and
  the previous deployment keeps serving. The guarantee is structural rather than
  sequential: a misconfigured deployment cannot exist, not merely cannot be
  reached.

**The trade against the earlier design.** Moving the gate into the build means CI
cannot refuse to _upload_ a misconfigured commit — it finds out one step later,
when the build fails. Nothing reaches users either way. This is the cost of
keeping the five variables Sensitive, and it is a fair price: the gate now checks
the real configuration instead of a copy of it.

### 3.1 First deployment only

Run once, after §2 and before trusting the pipeline:

```bash
npm run storage:setup -- --environment=production   # idempotent; asserts `documents` exists and is private
npm run env:check -- --production --verify
```

Migrations are **not** part of deployment. Migrations `0000`–`0013` are already
applied and immutable; Sprint 2.4 adds none.

#### 3.2 Why these commands now name their target

Phase 2.5.1A.2-B removed the implicit `.env.local` load from `migrate.ts`,
`seed.ts`, `storage-setup.ts`, `check-env.ts` and `drizzle.config.ts`. Each of
those made **production the silent default** for a command that writes: nothing
distinguished "I meant production" from "I forgot to say". They now refuse to
run until the environment is named:

```bash
npm run db:migrate    -- --environment=production
npm run storage:setup -- --environment=production
npm run db:seed       -- --environment=production --confirm-production
TOOL_ENV=production npm run db:migrate:kit
```

`--environment=staging` selects `.env.test.local` instead, and a staging
selection can never resolve to `.env.local` — see `scripts/lib/environment.ts`.

**The Vercel Build Command is unchanged and needs no edit.** It runs
`npm run env:check -- --production --verify && npm run build`, and `--production`
is honoured as an explicit production selection precisely so that this gate
keeps working. What did change: `env:check --verify` **without** a named
environment now fails closed rather than verifying production by default.

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

**Executed against production infrastructure — the real thing.** `DEMO_MODE=true`
was injected as a **build-only** environment override, so no project variable was
created, modified or restored:

```bash
vercel deploy --prod --yes --build-env DEMO_MODE=true
```

Result:

```
Running "npm run env:check -- --production --verify && npm run build"
Invalid environment configuration:
· DEMO_MODE: DEMO_MODE must not be "true" in production — it serves the
  in-memory demo dataset instead of the database. Unset it or set it to "false".
✖ Invalid. The server would refuse to start with this configuration.
Error: Command "..." exited with 1
```

```json
{
  "id": "dpl_Y9iezVvHBbbQhjyWpbAZgPkhhsbD",
  "readyState": "ERROR",
  "error": { "name": "BUILD_ERROR" }
}
```

And the half that matters more, **P-07**, checked immediately afterwards:

| Check after the failed deploy | Result                                                |
| ----------------------------- | ----------------------------------------------------- |
| App `/api/health`             | 200 · `healthy` · `production` · build `97c46d1611c7` |
| Portal `/api/health`          | 200 · `healthy` · `production` · build `97c46d1611c7` |
| Deployment history            | `ERROR` alongside the earlier `READY`; no replacement |
| Both hostnames still attached | yes                                                   |

So the gate rejected a genuinely invalid production configuration, no deployment
was created, and the previously good deployment continued serving throughout.
`DEMO_MODE=true` was chosen deliberately: it is an authentication bypass rather
than a cosmetic misconfiguration, so it is the rule whose enforcement matters
most, and being build-only it left nothing to restore afterwards.

**Still outstanding:** the same rejection observed through a _GitHub Actions_
run. The deploy job is written but has never executed, because
`PRODUCTION_DEPLOY_ENABLED` is unset and the three Vercel secrets are not in
GitHub. The gate itself is proven; the CI wiring around it is not. Recorded as
such in §0 rather than assumed.

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
