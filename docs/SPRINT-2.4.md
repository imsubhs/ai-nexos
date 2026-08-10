# Sprint 2.4 — Production Deployment & Release Readiness

**Status:** specification, partially implemented. **G2.4-1 (configuration
enforced) is complete**, together with two remediations this document's own
acceptance criteria depended on — the upload byte transfer (§11.1) and
share-link addressing (§9.1). **G2.4-6's pipeline is now built and its gate has
been observed rejecting a bad configuration** (§19.2), but the gate has not yet
run in a pipeline because no deployment target exists. G2.4-2, G2.4-3, G2.4-4,
G2.4-5 and G2.4-7 are **blocked on external platform access**, not on repository
work. See §19.1, §19.2 and §25.
**Phase:** 2 (Production Readiness)
**Predecessor:** [SPRINT-2.3.md](SPRINT-2.3.md) — complete and verified
**Branch of record:** `phase-2-production-readiness`
**Baseline commit:** `711c0ce` (`chore: ignore local development tooling`)

Sprint 2.3 proved the platform works against real infrastructure. Sprint 2.4
puts that infrastructure behind a URL a customer can be given, and defines what
"released" means in objectively checkable terms.

---

## 0. Roadmap authority

This project has **two parallel sprint numbering schemes**, and they are not
isomorphic.

| Scheme          | Defined in                     | Sprints                |
| --------------- | ------------------------------ | ---------------------- |
| Phase 2 (`2.x`) | git history; per-sprint docs   | 2.1 → 2.2 → 2.3 → 2.4  |
| Migration plan  | `PRODUCTION_MIGRATION_PLAN.md` | 13 → 14 → 15 → 16 → 17 |

**The Phase-2 `2.x` sequence is authoritative for current project execution.**

```
2.1  application / security foundation      — configuration, env validation, boot gate
2.2  security / authorization hardening     — authz coverage, CSP, rate limiting, portal sessions
2.3  live database, migrations, RLS,
     storage and integration verification   — real Supabase, 14 migrations, RLS proven live
2.4  production deployment and
     release readiness                      — THIS SPRINT
```

The two schemes cannot be mapped one-to-one: Sprint 2.3 delivered work that
`PRODUCTION_MIGRATION_PLAN.md` assigns to **both** Sprint 13 (persistence,
tenant isolation, integration tests) **and** Sprint 14 (real storage provider,
TD-02 closure). Sprint 2.4 draws on material from the plan's **Sprint 17**
(Production Deployment) but is not equal to it — Sprint 17 also carries load
testing, penetration testing, WAF, legal/compliance and full runbooks, which
are explicitly **non-scope** here (§3).

**Sprints 13–17 documentation is not rewritten by this sprint.** It remains a
valid historical planning artefact. Where this document and the migration plan
disagree, this document governs current execution; the disagreement is recorded
in §22 rather than resolved by editing history.

---

## 1. Sprint objective

**Deploy AI NEX OS to a real production environment, on real domains, backed by
the verified Sprint 2.3 Supabase project, and prove by execution that the
deployed system boots correctly, authenticates a real user, isolates tenants and
moves real bytes — with a deployment pipeline that refuses to ship a
misconfigured build and a documented way back when it does.**

Three properties distinguish this from "it deploys":

1. **Configuration is enforced, not documented.** Every setting the deployed
   system genuinely requires must fail the boot gate or the deploy gate when
   absent. Sprint 2.3 found three that are required in practice and enforced
   nowhere (§6).
2. **Readiness is proven against the deployed URL**, not against localhost and
   not by reading configuration. Every acceptance criterion in §18 is executed
   against production or staging.
3. **The way back exists before it is needed.** `DEMO_MODE=true` — the rollback
   that carried every previous sprint — is a **fatal startup error in
   production** and is therefore unavailable from this sprint onward (§20).

---

## 2. Scope

| #    | Work item                                                                                                 | Section |
| ---- | --------------------------------------------------------------------------------------------------------- | ------- |
| S-01 | Close the three unenforced production settings in `ENV_MANIFEST` / `PRODUCTION_REQUIRED_PUBLIC`           | §6      |
| S-02 | Make `documents` the authoritative default storage bucket; retire the `nexos-assets` default              | §11     |
| S-03 | Generate and install production signing secrets (`JWT_SECRET`, `SHARE_JWT_SECRET`)                        | §7      |
| S-04 | Provision the production deployment environment on the chosen platform                                    | §8      |
| S-05 | Configure production and (if approved) staging environment variables, build-time and runtime              | §6, §8  |
| S-06 | Configure `app.*` and `portal.*` domains with valid TLS                                                   | §9      |
| S-07 | Point the deployment at the verified Sprint 2.3 Supabase project with the correct pooler topology         | §10     |
| S-08 | Run `storage:setup` against production; confirm the `documents` bucket is present and private             | §11     |
| S-09 | Extend CI with a deploy stage gated on lint, format, typecheck, test, build, `audit:deps` and `env:check` | §15     |
| S-10 | Execute the production smoke-test suite against the deployed URLs                                         | §16     |
| S-11 | Verify Supabase backup posture and rehearse a timed restore                                               | §10     |
| S-12 | Write the deployment, rollback and secret-rotation runbooks                                               | §20     |
| S-13 | Add regression tests locking the new boot-gate enforcement                                                | §17     |
| S-14 | Record the sprint outcome and update the affected documentation                                           | §21     |
| S-15 | Complete the client upload so bytes actually reach the `documents` bucket                                 | §11.1   |
| S-16 | Build share links on the configured portal origin, not `window.location.origin`                           | §9.1    |

S-15 and S-16 were added after source verification found that two acceptance
criteria this document already carried (M-08, M-10) described behaviour the code
did not have. They are remediation of a false assumption in this specification,
not new scope — see X-08 and X-09.

**Status at the close of the G2.4-1 work:** S-01, S-02, S-13, S-15 and S-16 are
delivered. S-16 corrects addressing only; M-10 remains blocked by Y-05. S-14 is
this document. Everything else is deployment work and has not started.

**Status after the G2.4-6 repository work:** S-09 and S-12 are additionally
delivered — the deploy stage exists in `.github/workflows/ci.yml` gated on every
existing quality check plus `env:check --production --verify`, and the
deployment, rollback and secret-rotation runbooks are written
([DEPLOYMENT.md](DEPLOYMENT.md)). S-13 gained a second layer: the gate is now
tested as a **process**, by exit code, the way CI invokes it. S-03 through S-08,
S-10 and S-11 require platform access that does not exist on the build machine
(§25).

## 3. Non-scope

Deliberately excluded. Each would extend this sprint materially, and none is
required to reach the objective in §1.

| Item                                                                        | Why deferred                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Adding RLS to the 150 currently unprotected tables                          | **Deferred security architecture risk** — see §23                         |
| Database-level write RLS / exercising write policies                        | **Deferred security architecture risk** — see §23                         |
| Changing Drizzle's owner-based write architecture                           | **Deferred security architecture risk** — see §23                         |
| Changing `service_role` privileges                                          | **Deferred security architecture risk** — see §23                         |
| New authentication features (password reset, email verification, invites)   | Feature work, not deployment. §13 verifies what exists                    |
| Exercising all six system roles end to end                                  | Only `owner` has ever run; a full RBAC pass is its own sprint             |
| Load testing at expected concurrency                                        | No traffic model exists yet                                               |
| Penetration testing                                                         | Requires a stable deployed target — this sprint produces the first one    |
| WAF                                                                         | Application-layer rate limiting shipped in 2.2; edge WAF is a later call  |
| Error tracking (Sentry) and structured-logging migration                    | `SENTRY_DSN` is deliberately absent from `.env.example`; no SDK installed |
| Background runtime: queue consumer, workers, scheduler, event bus, realtime | None is instantiated today; delivery is `console.log`                     |
| Legal and compliance (privacy policy, DPA, retention, subject rights)       | Required before real customer data, tracked separately                    |
| Rewriting `PRODUCTION_MIGRATION_PLAN.md` Sprints 13–17                      | Historical artefact — see §0                                              |
| Rewriting `PRODUCTION_READINESS_CHECKLIST.md`                               | Known documentation issue — see §22                                       |
| Creating a `nexos-assets` bucket                                            | The live bucket is `documents`; see §11                                   |
| New database migrations                                                     | Expected to be **zero** — see §12                                         |

## 4. Dependencies on Sprint 2.3

Every item below is a verified Sprint 2.3 output that Sprint 2.4 consumes. A
regression in any of them invalidates this sprint's acceptance criteria.

| Dependency                       | Verified state carried forward                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Supabase project                 | Live, **PostgreSQL 17.6**                                                                 |
| Database topology                | **Session Pooler** is the working production-compatible topology                          |
| Connection endpoints             | `aws-0-ap-northeast-1.pooler.supabase.com` — 6543 transaction, 5432 session               |
| Pooler username form             | `postgres.<project-ref>`, never bare `postgres`                                           |
| Migrations                       | **14 applied, `0000`–`0013`, immutable**                                                  |
| Migration journal hash integrity | **0 mismatches** (14 files · 14 journal entries · 14 ledger rows)                         |
| Snapshot chain                   | `prevId` unbroken `0000` → `0013`                                                         |
| Schema                           | **202 public tables**, all with primary keys · 395 FKs · 482 indexes · 0 invalid          |
| RLS                              | **52 tables with RLS · 74 policies** · 0 RLS-enabled tables without policies              |
| Tenant isolation                 | **Tested against the live database** — cross-tenant reads denied, forged JWT claim denied |
| Data API privileges              | `authenticated` → SELECT on the 52 policed tables · `anon` → nothing                      |
| Storage bucket                   | **`documents`**, private, signed-URL flow verified end to end                             |
| Storage provider                 | `SupabaseStorageProvider` wired to real Supabase Storage (TD-02 closed)                   |
| Connectivity gate                | `npm run env:check -- --verify` opens real Postgres and Storage connections               |
| Integration harness              | 3 specs, 25 tests, **fails when unreachable — never skips**                               |
| Unit suite                       | 423/423 · lint 0 errors · typecheck · format · build · `audit:authz` all green            |

**`nexos-assets` does not exist** in this Supabase project and must not be
created (§11).

## 5. Production environment requirements

| #    | Requirement                                                                                                                                | Verification                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| E-01 | A production environment exists and serves the application. **None exists in the repository today.**                                       | Deployed URL responds                   |
| E-02 | `NODE_ENV=production` in the deployed runtime                                                                                              | `/api/health` → `environment`           |
| E-03 | The boot gate runs and passes: `src/instrumentation.ts` → `assertProductionConfig()`                                                       | `[env]` summary line in the boot log    |
| E-04 | `DEMO_MODE` is unset or `"false"`. `"true"` with `NODE_ENV=production` is a fatal startup error                                            | Process boots; `isDemoMode()` false     |
| E-05 | The Node.js runtime serves the application. The boot gate deliberately skips the Edge runtime and the `phase-production-build` build phase | Documented, not enforced by this sprint |
| E-06 | A staging environment, if approved, mirrors production configuration against the same Supabase project                                     | Decision D-2 (§24)                      |

**Runtime shape.** All 36 routes are dynamic — the nonce-based CSP requires a
per-request header in the root layout, so nothing is prerendered. A build
therefore succeeds with no runtime secrets configured, and **a green build is
not evidence of a working configuration.** That is precisely why E-03 and the
`env:check` deploy gate (§15) exist.

## 6. Environment configuration requirements

`ENV_MANIFEST` in `src/lib/env.server.ts` is the machine-readable authority;
[ENVIRONMENT.md](ENVIRONMENT.md) §2.1 mirrors it and `.env.example` templates it.
All three must agree at the end of this sprint.

### 6.1 The enforcement gap (S-01) — **CLOSED**

Sprint 2.3 identified three settings required in practice and enforced nowhere.
Each was confirmed against source, and each is now enforced — see §6.1.1 for
what shipped.

The state that was found:

| Variable                              | Declared                    | Actually enforced                                 | Consequence when absent in production                                             |
| ------------------------------------- | --------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                 | `requirement: "production"` | **No** — absent from `PRODUCTION_REQUIRED_PUBLIC` | Silently derives an **`http://`** URL from `NEXT_PUBLIC_APP_DOMAIN`               |
| `NEXT_PUBLIC_PORTAL_URL`              | `requirement: "production"` | **No** — absent from `PRODUCTION_REQUIRED_PUBLIC` | Silently derives an **`http://`** URL; share links are built from this            |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | `requirement: "optional"`   | **No** — optional by classification               | Defaults to `nexos-assets`, **which does not exist**; every upload/download fails |

`PRODUCTION_REQUIRED_PUBLIC` previously contained only
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_APP_DOMAIN` and `NEXT_PUBLIC_PORTAL_DOMAIN`.

**Requirements**

| #    | Requirement                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------ |
| C-01 | Add `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_PORTAL_URL` to `PRODUCTION_REQUIRED_PUBLIC`                             |
| C-02 | Reclassify `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` from `optional` to `production` and add it to the enforced set    |
| C-03 | Update `ENVIRONMENT.md` §2.1 and `.env.example` so classification, documentation and enforcement agree             |
| C-04 | An `http://` value for either URL variable in production is a configuration defect — reject it or document why not |
| C-05 | `npm run env:check -- --production` exits non-zero when any of the three is absent                                 |

**A note on `.env.example`.** It already told the reader "PRODUCTION (all
four)" for the domain and URL variables. That comment had been wrong since it
was written: two of the four were not enforced. C-03 made the comment true
rather than deleting it.

### 6.1.1 What shipped

| Requirement | Delivered                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-01        | `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_PORTAL_URL` added to `PRODUCTION_REQUIRED_PUBLIC`                                                            |
| C-02        | `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` reclassified `optional` → `production` and added to the enforced set                                          |
| C-03        | `ENVIRONMENT.md` §2.1 + new §2.1.1, and `.env.example`, now match `ENV_MANIFEST`                                                                    |
| C-04        | **Rejected, not merely documented.** `insecureUrlIssues()` refuses a non-`https` origin and a loopback host for both URL variables in production    |
| C-05        | Verified by executing `npm run env:check -- --production`: it exits non-zero and names all three, alongside the two domain variables, in one report |

Two things went beyond the letter of C-01/C-02, because presence alone does not
make either value correct:

- **Both URL variables are parsed as URLs** (`z.url()`), not strings. A bare
  host previously passed validation and then threw inside the auth callback at
  the first login, which is the worst possible place to discover it.
- **`DEFAULT_STORAGE_BUCKET` changed from `nexos-assets` to `documents`.** The
  variable is required in production either way; the default is what keeps local
  development working, and a default naming a bucket that has never existed is
  not a default, it is a hidden failure.

### 6.2 Build-time versus runtime

`NEXT_PUBLIC_*` values are **substituted by Next at build time** and baked into
the bundle. Server values are read at runtime.

| #    | Requirement                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| C-06 | Every `NEXT_PUBLIC_*` variable is present in the **build** environment, not only the runtime environment         |
| C-07 | Changing a `NEXT_PUBLIC_*` value triggers a **rebuild**, not a restart — recorded in the deployment runbook      |
| C-08 | The build environment must not require server secrets; `next build` succeeding without them is a proven property |

This is the single most likely cause of a deployment that boots green and then
fails in the browser with `NEXT_PUBLIC_… is not set`.

### 6.3 Operational settings that change security posture

Each of these is currently optional, warns at boot in production, and materially
changes behaviour. Sprint 2.4 must make a recorded decision on each — not
necessarily set it, but not leave it unconsidered.

| #    | Variable                   | Decision required                                                                                                                                                                                              |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-09 | `REDIS_URL`                | Unset → rate limits and brute-force counters are **per-instance**; behind N instances the effective limit is N × the configured value. Provision Redis, or pin production to a single instance and record that |
| C-10 | `TRUSTED_PROXY_HOPS`       | Must match the real edge topology. Too high → a caller can spoof `X-Forwarded-For` for a fresh rate-limit budget. Too low → every request behind the edge shares one bucket                                    |
| C-11 | `EGRESS_ALLOWED_HOSTS`     | Unset → automation webhooks may reach any public host. Private, loopback and `169.254.169.254` are refused either way                                                                                          |
| C-12 | `LOG_LEVEL`                | Defaults to `info`. Confirm the deployed value                                                                                                                                                                 |
| C-13 | `NEXT_PUBLIC_BUILD_NUMBER` | Set so `/api/health` reports a real build identity rather than `local-dev`                                                                                                                                     |
| C-14 | `SEED_*`                   | TOOLING only — read by `npm run db:seed`, never by the running app. Must **not** be configured in the deployed environment                                                                                     |

## 7. Production secrets requirements

| #    | Requirement                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| K-01 | `JWT_SECRET` generated with `openssl rand -base64 48` and installed in the production environment                            |
| K-02 | `SHARE_JWT_SECRET` generated **separately** with its own `openssl rand -base64 48` and installed                             |
| K-03 | Both are ≥ 32 characters — the schema rejects anything shorter                                                               |
| K-04 | `SUPABASE_SERVICE_ROLE_KEY` installed, server-side only, **never** prefixed `NEXT_PUBLIC_`                                   |
| K-05 | `DATABASE_URL` and `DIRECT_DATABASE_URL` carry the current database password (§10)                                           |
| K-06 | No secret value appears in the repository, in CI logs, in `/api/health`, or in this document                                 |
| K-07 | A secret-rotation runbook is written, stating that rotation invalidates outstanding approval links and active share sessions |

**Both signing secrets are already production-required and already enforced** —
they are in `PRODUCTION_REQUIRED` and the boot gate rejects their absence. The
Sprint 2.3 finding is not that enforcement is missing but that **production
values have never been generated**. No deployment can boot without them.

Outside production, `getSigningSecret()` generates a random per-process key and
warns. That is why tokens stop verifying across a local restart, and it is
deliberate: there is no constant fallback that could ever sign a real token.

**Secrets are not generated by this specification.** K-01 and K-02 are
implementation tasks.

## 8. Deployment infrastructure requirements

| #    | Requirement                                                                                                                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I-01 | A deployment platform is chosen and recorded. **Vercel is the evidenced intent** — `.env.example` and `.github/workflows/ci.yml` both name it — but no platform configuration exists in the repository. Requires confirmation (Decision D-1, §24) |
| I-02 | Production project/environment created and bound to the `phase-2-production-readiness` branch or its merge target                                                                                                                                 |
| I-03 | Environment variables configured for **both** build and runtime scopes (§6.2)                                                                                                                                                                     |
| I-04 | Node.js 24 runtime, matching CI                                                                                                                                                                                                                   |
| I-05 | The application region is chosen with the database region in mind — Supabase is in **ap-northeast-1**                                                                                                                                             |
| I-06 | Deployment is reproducible from a commit SHA; the deployed SHA is discoverable                                                                                                                                                                    |
| I-07 | Staging environment provisioned, if approved (Decision D-2)                                                                                                                                                                                       |

**Region matters more than usual here.** Every route is dynamic and every
request reaches the database through the pooler. An application deployed far
from `ap-northeast-1` pays that round trip on every request, and no performance
measurement has ever been taken under real network latency.

## 9. Domain and TLS requirements

The platform is dual-domain by design: internal dashboard on `app.*`, client
portal on `portal.*`, share links at `portal.*/s/{token}`.

| #    | Requirement                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------ |
| D-01 | `app.<domain>` resolves and serves the dashboard                                                       |
| D-02 | `portal.<domain>` resolves and serves the client portal                                                |
| D-03 | Valid TLS certificates on both hosts, auto-renewing                                                    |
| D-04 | HTTP redirects to HTTPS on both hosts                                                                  |
| D-05 | `NEXT_PUBLIC_APP_DOMAIN` / `NEXT_PUBLIC_PORTAL_DOMAIN` match the real hosts exactly                    |
| D-06 | `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_PORTAL_URL` are absolute **`https://`** URLs matching those hosts |
| D-07 | `/api/health` is reachable on **both** domains — an uptime monitor cannot hold a session               |
| D-08 | Supabase Auth redirect URLs include the production callback origins                                    |

`.env.example` carries `app.aicollective.agency` and
`portal.aicollective.agency` as the intended hosts. Confirm before purchase or
DNS change (Decision D-3).

**Why D-06 is a security requirement, not cosmetics.** `NEXT_PUBLIC_PORTAL_URL`
builds share links. Left unset it derives an `http://` URL — so every share link
issued would be an unencrypted URL carrying a token that grants unauthenticated
portal access.

**Correction (X-08).** As originally written, that paragraph described an
architecture the code did not have. `NEXT_PUBLIC_PORTAL_URL` was exported from
`src/config/app.ts` and **consumed by nothing**; both share dialogs built
`${window.location.origin}/portal/s/{token}` instead — the _app_ origin, on the
_internal_ route shape, which `src/proxy.ts` redirects back to `/`. The
statement is now true because the code was changed to match it, not because it
was ever accurate: `buildShareUrl()` in
`src/features/shares/utils/share-url.ts` is the single consumer, and both
dialogs go through it (§9.1).

### 9.1 Share-link addressing

| #    | Requirement                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| D-09 | A share link is `PORTAL_URL/s/{token}` — the configured portal origin plus the public path                       |
| D-10 | No share link contains the internal `/portal/...` route shape                                                    |
| D-11 | No share link is built from `window.location.origin`                                                             |
| D-12 | The proxy rewrite `portal.<domain>/s/{token}` → `/portal/s/[token]` is the only place the internal shape appears |

**Delivered.** `buildShareUrl()` is the single construction point, covered by
`tests/unit/share-url.test.ts`. It is a pure function of configuration, so a
`window` in scope cannot change its result.

**Not delivered, and outside this sprint (see §23, Y-05).** The route
`src/app/portal/s/[token]/page.tsx` still discards its token and renders "This
link is not active". Correct addressing is necessary for a working share link
and is not sufficient — D-09…D-12 fix where the link points, not what answers
there.

## 10. Supabase requirements

| #    | Requirement                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| B-01 | The deployment targets the **existing verified Sprint 2.3 project**. No new project is provisioned                                             |
| B-02 | `DATABASE_URL` → Session Pooler host, **port 6543**, transaction mode, `pgbouncer=true`. `src/db/index.ts` sets `prepare: false`               |
| B-03 | `DIRECT_DATABASE_URL` → same host, **port 5432**, session mode. Migrations require it; transaction mode breaks DDL                             |
| B-04 | Username is `postgres.<project-ref>`. A bare `postgres` yields `XX000 tenant/user not found` — a routing failure that reads as an auth failure |
| B-05 | The region in the hostname is `ap-northeast-1`. A wrong region produces the identical `tenant/user not found` error                            |
| B-06 | Special characters in the password are percent-encoded (`@` → `%40`)                                                                           |
| B-07 | `db.<project-ref>.supabase.co` is **not** used — it publishes only an AAAA record and is unreachable from IPv4-only networks                   |
| B-08 | Supabase Auth is configured with the production site URL and redirect allow-list                                                               |
| B-09 | Backup posture confirmed: PITR and/or scheduled logical dumps, appropriate to the project plan                                                 |
| B-10 | **A restore is rehearsed and timed, and the RTO recorded.** An unrehearsed backup is not a backup                                              |

**Supavisor credential caching.** After a database password reset the pooler may
keep rejecting the **new** password with `28P01` for roughly two minutes, then
accept it unchanged. Do not diagnose "wrong password" from a single post-reset
attempt — retry first, then confirm with `npm run env:check -- --verify`.

**The database password and the service-role API key are independent secrets**
and can be in different states. A healthy Supabase project tells you nothing
about the database password. Supabase does not display it after creation; it can
only be set.

## 11. Storage requirements

**`documents` is the authoritative NEX OS storage bucket.** This is the verified
live Supabase state, established in Sprint 2.3.

| #    | Requirement                                                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-01 | `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=documents` in every deployed environment                                                                                                                 |
| T-02 | `DEFAULT_STORAGE_BUCKET` in `src/lib/env.ts` changes from `nexos-assets` to `documents`                                                                                                       |
| T-03 | **`nexos-assets` is not created.** It does not exist in this project and must not be introduced                                                                                               |
| T-04 | `ENVIRONMENT.md` §2.1, `.env.example` and `PRODUCTION_MIGRATION_PLAN.md`'s stale `nexos-assets` reference are reconciled — the plan reference is recorded as a known defect (§22), not edited |
| T-05 | `npm run storage:setup` is run against production. It is idempotent and re-privatises the bucket if it has drifted                                                                            |
| T-06 | The bucket is **private**. Every read goes through a signed URL minted server-side after an authorisation check                                                                               |
| T-07 | Object paths remain `{organizationId}/{projectId}/{fileId}/{versionId}.{ext}` — tenant first                                                                                                  |
| T-08 | The provider makes no access decision of its own; callers authorise before requesting a URL. This does not change                                                                             |

**Why T-02 matters even with T-01 in place.** A default that names a nonexistent
bucket converts one missing environment variable into a runtime failure on every
upload and download while the application reports itself healthy. Changing the
default makes the failure mode "wrong bucket configured" instead of "silently
broken by omission". C-02 and T-02 are belt and braces, deliberately.

**T-02 delivered.** `DEFAULT_STORAGE_BUCKET` is now `documents`, asserted by
`tests/unit/env-validation.test.ts`. T-01, T-05 and the live checks remain
deployment work.

### 11.1 The upload path actually transfers bytes (X-09)

**Correction.** This specification assumed a working end-to-end upload when it
set M-08. It was not working, and the checklist row that said so
(`PRODUCTION_READINESS_CHECKLIST.md` 4.4, "Upload path transfers bytes ⚠️ … no
bytes move") was one of the few in that stale document that was still accurate.

Sprint 2.3 closed TD-02 **at the provider layer**: `SupabaseStorageProvider`
mints real signed URLs, verified live by `storage.integration.test.ts`. The
**client** layer was never completed. `initializeFileUpload` returned a real
`uploadUrl`; the upload dialog discarded it, called `finalizeFileUpload`
regardless, and displayed "File uploaded". Every record, version and SHA-256 was
genuine and the object behind it did not exist.

| #    | Requirement                                                                              |
| ---- | ---------------------------------------------------------------------------------------- |
| T-09 | The browser PUTs the selected bytes to the signed URL returned by `initializeFileUpload` |
| T-10 | Bytes go **browser → Supabase Storage**, never through a Next route handler              |
| T-11 | `finalizeFileUpload` runs only after a successful transfer                               |
| T-12 | A failed or rejected transfer surfaces as an error; no success is reported               |
| T-13 | A deduplicated upload, which needs no transfer, still finalises                          |

**Delivered.** `src/features/files/upload.ts` owns the ordering; the dialog
calls `performFileUpload()`. Covered by `tests/unit/file-upload.test.ts`,
including the two cases that matter — a failed transfer must not finalise, and a
network error must not finalise.

**M-08 therefore stands as an acceptance criterion.** It was never descoped; the
implementation was brought up to meet it.

## 12. Database requirements

| #    | Requirement                                                                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-01 | **Zero new migrations expected.** Sprint 2.4 is deployment and configuration work                                                                                                               |
| Q-02 | Migrations `0000`–`0013` remain **immutable**. Editing an applied file — even a comment — changes its SHA-256 and re-opens the integrity gate                                                   |
| Q-03 | Any correction that proves genuinely necessary is expressed as `0014`+, generated by `drizzle-kit` so the snapshot chain carries it                                                             |
| Q-04 | Migration hash integrity remains **0 mismatches** at sprint end                                                                                                                                 |
| Q-05 | Schema shape unchanged: 202 tables, all with primary keys                                                                                                                                       |
| Q-06 | Data API privileges unchanged: `authenticated` → SELECT on 52 tables · `anon` → nothing · `service_role` unchanged                                                                              |
| Q-07 | No `GRANT` is issued in this sprint. **A single grant would expose all 150 unprotected tables at once** — their protection is the absence of a grant, not a policy                              |
| Q-08 | If production requires seeded data, `npm run db:seed` is run deliberately and its effect recorded. Users must be seeded through the Auth API — `users.user_id` is foreign-keyed to `auth.users` |

## 13. Authentication requirements

Scope here is **verification of what exists in the deployed environment**, not
new authentication features. New flows are non-scope (§3).

| #    | Requirement                                                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-01 | A real user completes sign-in against the deployed URL. **This has never been executed** — it is the single highest-value check in this sprint                                                                          |
| A-02 | `getCurrentUser()` resolves a real identity through PostgREST. Migration `0010` was the fix for the `42501` that made it return `null`; the fix has been proven at the privilege layer but **not through a real login** |
| A-03 | Session cookies carry `httpOnly`, `secure`, `sameSite=lax` on the deployed origin                                                                                                                                       |
| A-04 | Sign-out clears the session; the protected route redirects to sign-in                                                                                                                                                   |
| A-05 | The demo identity is unreachable. `isDemoMode()` returns false under `NODE_ENV=production` unconditionally, independent of the boot gate                                                                                |
| A-06 | A portal share link issued in production resolves over HTTPS and establishes a portal session scoped to its own organisation and client. **Retained. Addressing delivered (§9.1); token resolution is blocked by Y-05** |
| A-07 | Auth flows beyond primary sign-in (magic link, OAuth, password reset, verification) are **verified if configured, recorded as unverified if not** — they are not implemented here                                       |

**A-02 is the honest centre of this sprint.** Sprint 2.3 proved the privilege
grant exists and that RLS evaluates correctly under a synthetic JWT. It did not
put a real human through a real browser login. Until A-01 passes, "login works"
remains an inference.

## 14. Authorization and security requirements

Sprint 2.4 **preserves** the Sprint 2.2 and 2.3 posture. It does not extend it.

| #    | Requirement                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| Z-01 | `npm run audit:authz` passes — `requirePermission()` on every real server action                                          |
| Z-02 | `tests/unit/authorization-coverage.test.ts` stays green; a regression blocks the deploy                                   |
| Z-03 | Nonce-based CSP is emitted per request on the deployed origin, with no `'unsafe-inline'` for scripts                      |
| Z-04 | The full static security header set is present on production responses                                                    |
| Z-05 | Rate limiting is active on sign-in, magic link, auth callback, approval verify, portal session and share passwords        |
| Z-06 | `/api/health` withholds service detail in production — it is the one endpoint an anonymous scanner is guaranteed to reach |
| Z-07 | Tenant isolation remains proven by `rls.integration.test.ts` against the live database                                    |
| Z-08 | `npm run audit:deps` passes at `--audit-level=high`                                                                       |
| Z-09 | No new grant, policy, role or privilege change (Q-07)                                                                     |

**The write-path control is unchanged and must be stated plainly.** Application
writes through Drizzle run as the table owner and therefore bypass database RLS.
`requirePermission()` plus tenant-scoped `WHERE` clauses remain the only enforced
control on write paths. Sprint 2.4 does not change this (§23).

## 15. CI/CD requirements

CI today runs **lint → format:check → typecheck → test → build → audit:deps** on
push to `main` and on every pull request. **It does not deploy.**

| #    | Requirement                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | A deploy stage exists and runs only after every existing quality gate passes                                                                                    |
| P-02 | `npm run env:check -- --production` gates the deploy — a misconfigured deployment must fail the pipeline, not the users                                         |
| P-03 | The deploy stage runs only on the designated branch; pull requests validate without deploying                                                                   |
| P-04 | Secrets reach CI through the platform's secret store. No secret is echoed, and `env:check` prints names and states only                                         |
| P-05 | The integration suite's placement is decided: it requires live credentials and **fails rather than skips** when the database is unreachable (Decision D-4, §24) |
| P-06 | The deployed commit SHA is recorded in the pipeline output                                                                                                      |
| P-07 | A failed deploy leaves the previous version serving                                                                                                             |

**Why `env:check` and not the boot gate alone.** The boot gate fires at process
start, which on most platforms is after the deployment is already live. Checking
in the pipeline moves the failure from "users see errors" to "the deploy stops".

**Why the build cannot enforce configuration.** `next build` must succeed with no
runtime secrets — CI proves this deliberately by leaving `NODE_ENV` unset and
supplying only placeholder public values. Enforcement belongs at boot and in the
deploy gate.

## 16. Production smoke-test requirements

Executed **against the deployed URLs**, after deployment, by a human or a
scripted run. Reading configuration is not a substitute for any of these.

| #    | Check                                                                                | Passes when                                                                                                |
| ---- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| M-01 | `GET https://app.<domain>/api/health`                                                | `200`, `status: "healthy"`, `environment: "production"`                                                    |
| M-02 | `GET https://portal.<domain>/api/health`                                             | `200` — the portal domain resolves and serves                                                              |
| M-03 | Health payload withholds `services` / `usingFallback` / `demoMode`                   | Production redaction is active                                                                             |
| M-04 | Boot log carries the `[env]` summary line                                            | The boot gate ran and passed                                                                               |
| M-05 | Boot log carries no unexpected `[env]` warning                                       | Redis / egress / direct-URL warnings are absent or accepted                                                |
| M-06 | A real user signs in on `app.<domain>`                                               | Dashboard renders with that user's identity (A-01)                                                         |
| M-07 | The dashboard shows **real database data**, not demo data                            | `DEMO_MODE` is genuinely off end to end                                                                    |
| M-08 | A file uploads and downloads byte-identically through the `documents` bucket         | Real bytes move; the signed-URL flow works in production                                                   |
| M-09 | An unsigned read of a stored object is refused                                       | The bucket is private in production                                                                        |
| M-10 | A share link issued in production opens over HTTPS and establishes a portal session  | `NEXT_PUBLIC_PORTAL_URL` is correct and TLS terminates. **Addressing fixed (§9.1); still blocked by Y-05** |
| M-11 | Both domains serve valid TLS and redirect HTTP → HTTPS                               | D-03 / D-04                                                                                                |
| M-12 | Security headers and a per-request CSP nonce are present on a production response    | Z-03 / Z-04                                                                                                |
| M-13 | Rate limiting triggers on repeated sign-in failures                                  | Z-05                                                                                                       |
| M-14 | A deliberately misconfigured deploy is rejected by the pipeline                      | P-02 — proven by executing it, not by reading it                                                           |
| M-15 | `npm run env:check -- --production --verify` passes against production configuration | Presence **and** reachability                                                                              |

**M-14 is not optional and is easy to skip.** A deploy gate that has never
rejected anything is an untested gate.

## 17. Regression-test requirements

| #    | Requirement                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| R-01 | `tests/unit/env-validation.test.ts` gains assertions that production configuration missing `NEXT_PUBLIC_APP_URL` fails the boot gate            |
| R-02 | Same for `NEXT_PUBLIC_PORTAL_URL`                                                                                                               |
| R-03 | Same for `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` once reclassified                                                                                |
| R-04 | A test asserts the default storage bucket is `documents`                                                                                        |
| R-05 | **All 468 pre-sprint unit tests remain green.** No existing test is weakened or deleted to accommodate this sprint. The suite now stands at 489 |
| R-06 | The 25 integration tests remain green against the live project                                                                                  |
| R-07 | `npm run lint` 0 errors · `npm run typecheck` clean · `npm run format:check` clean · `npm run build` green                                      |
| R-08 | `npm run audit:authz` passes                                                                                                                    |
| R-09 | Migration hash integrity re-verified: 14 files · 14 journal entries · 14 ledger rows · 0 mismatches                                             |

## 18. Acceptance criteria

Every criterion is objectively checkable. Nothing here is satisfied by reading
code or configuration.

**Configuration**

- [ ] `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_PORTAL_URL` are enforced by the boot gate in production
- [ ] `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` is production-required and enforced
- [ ] `DEFAULT_STORAGE_BUCKET` is `documents`
- [ ] `ENV_MANIFEST`, `ENVIRONMENT.md` §2.1 and `.env.example` agree on every variable's class
- [ ] `npm run env:check -- --production` exits non-zero when any newly enforced variable is absent

**Secrets**

- [ ] `JWT_SECRET` and `SHARE_JWT_SECRET` hold distinct production values of ≥ 32 characters
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set server-side only
- [ ] No secret value appears in the repository, CI logs or `/api/health`
- [ ] The secret-rotation runbook exists

**Infrastructure**

- [ ] The application is deployed and reachable on `app.<domain>` and `portal.<domain>`
- [ ] Valid TLS on both hosts; HTTP redirects to HTTPS
- [ ] The deployment targets the verified Sprint 2.3 Supabase project through the Session Pooler
- [ ] `npm run env:check -- --production --verify` passes against the production configuration

**Storage**

- [ ] The `documents` bucket exists, is private, and is the configured bucket
- [ ] `nexos-assets` was not created
- [ ] A file uploads and downloads byte-identically in production
- [ ] An unsigned read of a private object is refused in production

**Database**

- [ ] Zero new migrations, or any that was required is journaled, generated by `drizzle-kit`, and documented
- [ ] Migration hash integrity: 0 mismatches
- [ ] 202 tables · 52 with RLS · 74 policies — unchanged
- [ ] Data API privileges unchanged; no new `GRANT`

**Authentication**

- [ ] **A real user signs in against the deployed URL and sees real data** (A-01)
- [ ] Session cookies carry `httpOnly`, `secure`, `sameSite=lax` in production
- [ ] The demo dataset is unreachable in production

**CI/CD**

- [ ] The pipeline deploys only after lint, format, typecheck, test, build, `audit:deps` and `env:check` pass
- [ ] A deliberately misconfigured deployment is **observed** to fail the pipeline (M-14)
- [ ] A failed deploy leaves the previous version serving

**Backup**

- [ ] Backup posture confirmed for the project plan
- [ ] **A restore has been rehearsed, timed, and the RTO recorded**

**Regression**

- [x] **489/489 unit tests** — 468 carried forward plus 21 new deploy-gate cases, no existing test weakened
- [ ] 25/25 integration tests
- [x] lint 0 errors · typecheck clean · format clean · build green · `audit:authz` pass

**Documentation**

- [ ] Deployment, rollback and secret-rotation runbooks written
- [ ] This document updated with the sprint outcome
- [ ] Remaining contradictions recorded (§22), not silently corrected

## 19. Sprint gates

Ordered. **A gate does not open until every criterion beneath it is green**, and
a later gate cannot be worked around by skipping an earlier one.

| Gate       | Name                   | Opens when                                                                                                                                         | Blocks         |
| ---------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **G2.4-1** | Configuration enforced | C-01…C-05 done; R-01…R-04 green; full local gate suite green — **OPEN** (see §19.1)                                                                | All deployment |
| **G2.4-2** | Secrets provisioned    | K-01…K-06 done; no secret in the repository or logs                                                                                                | G2.4-3         |
| **G2.4-3** | Environment reachable  | `env:check -- --production --verify` passes against the production configuration                                                                   | G2.4-4         |
| **G2.4-4** | Deployed and serving   | Application reachable on both domains with valid TLS; boot gate passed                                                                             | G2.4-5         |
| **G2.4-5** | Smoke-tested           | M-01…M-15 pass, **including M-06 real login and M-14 rejected bad deploy**                                                                         | G2.4-6         |
| **G2.4-6** | Pipeline enforced      | Deploy stage gated on all quality checks; failed deploy leaves the previous version serving — **built, gate proven, pipeline run pending** (§19.2) | G2.4-7         |
| **G2.4-7** | Recoverable            | Backup posture confirmed; **restore rehearsed and timed**; rollback runbook written and walked through                                             | DONE           |

**G2.4-1 is deliberately first.** Deploying before the enforcement gap is closed
means deploying the exact misconfiguration this sprint exists to prevent — an
environment that boots green with a storage bucket that does not exist and share
links built over `http://`.

**G2.4-7 carries the most weight and is the easiest to defer.** A backup nobody
has restored is a belief, not a control.

### 19.1 G2.4-1 — open

Delivered and verified locally, with no infrastructure touched:

- C-01…C-05 complete (§6.1.1), C-04 enforced rather than documented.
- The three variables are refused at boot when absent, malformed, `http://`, or
  loopback — demonstrated by executing `npm run env:check -- --production`, not
  only by unit test.
- `DEFAULT_STORAGE_BUCKET` is `documents`.
- Regression tests added for each rule, and no existing test was weakened.

Two remediations shipped alongside it because this document's own acceptance
criteria depended on them: the upload transfer (§11.1) and share-link addressing
(§9.1).

**No migration, no schema change, no grant, no policy, no Supabase change and no
Vercel change was required or made.**

### 19.2 G2.4-6 — pipeline built, gate proven, run pending

The deploy stage exists in `.github/workflows/ci.yml` as job `deploy`, with
`needs: quality`, so lint, format, typecheck, test, build and `audit:deps` all
gate it (P-01). It is `push`-only and branch-restricted, so a pull request
validates without deploying (P-03).

**The gate validates the configuration pulled from Vercel, not a copy of it.**
`vercel pull --environment=production` writes the production environment, which
is staged where `check-env.ts` reads it, and `env:check --production --verify` runs
against that. Duplicating every production value into GitHub secrets would allow
the pipeline to pass against values the build never sees; this way the thing
checked and the thing deployed are the same object, and only three secrets
(`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) reach CI at all (P-04).

`--verify` is used rather than presence-only because a syntactically valid
connection string pointing at a project that does not exist passes every presence
check, and the build passes too. That is M-15 executed in the pipeline.

**M-14 — the gate rejecting a bad configuration — has been observed**, two ways:

| Evidence                                             | Result                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `tests/unit/production-deploy-gate.test.ts`          | 21 cases green; spawns the script and asserts **exit codes** |
| Gate executed manually, complete configuration       | exit **0**                                                   |
| Gate with `NEXT_PUBLIC_PORTAL_URL` removed           | exit **1**, naming the variable                              |
| Gate with `NEXT_PUBLIC_PORTAL_URL` set to `http://…` | exit **1**, naming the https requirement                     |
| Gate with configuration restored                     | exit **0**                                                   |

The new test file covers the gate as a **process**, which is what the pipeline
consumes. `env-validation.test.ts` covers `assertProductionConfig()` as a
function; a deploy stage is gated on a non-zero exit, and that had never been
asserted anywhere.

**What is still unverified:** the _pipeline_ stopping. GitHub Actions fails a job
at its first failing step, so a non-zero gate means `vercel build` and
`vercel deploy` never execute — but no pipeline run has been watched, because
there is no deployment target. G2.4-6 is therefore **not declared open**.

### 19.3 G2.4-2 … G2.4-5 and G2.4-7 — blocked on platform access

Everything remaining is infrastructure, and none of it can be executed from the
repository. See §25 for the exact blockers. What was established without touching
any infrastructure:

| Fact                                                  | How it was verified                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Supabase project reachable on the production topology | `env:check -- --verify` → `aws-0-ap-northeast-1.pooler.supabase.com:5432`, PostgreSQL 17.6 |
| Storage state                                         | **exactly one bucket, `documents`**. `nexos-assets` does not exist and was not created     |
| Schema shape unchanged                                | 202 public base tables · 52 with RLS · 74 policies · 14 applied migrations                 |
| Migration tree untouched                              | `0000`–`0013` present, no `0014`                                                           |
| Candidate hostnames unclaimed                         | `ai-nexos.vercel.app`, `ai-nexos-portal.vercel.app` both answer `DEPLOYMENT_NOT_FOUND`     |
| Auth callback path                                    | `/auth/callback` — read from `src/app/auth/callback/route.ts`, not assumed                 |
| Existing tenant                                       | 1 organisation, 1 user, 7 roles, 0 clients/projects/files                                  |

The single-organisation state matters for M-07 and for tenant isolation: real
data exists, but a _second_ tenant does not, so cross-tenant isolation in
production can only be demonstrated by the live integration suite
(`rls.integration.test.ts`), not by two accounts in a browser, unless a second
organisation is deliberately created.

## 20. Rollback and failure criteria

### 20.1 The rollback that no longer exists

Every sprint before this one could roll back with `DEMO_MODE=true`. **That
rollback is unavailable from Sprint 2.4 onward.** `DEMO_MODE=true` with
`NODE_ENV=production` is a fatal startup error, by design — a shared demo
identity in a production deployment is a security regression, not a recovery.

### 20.2 Available rollbacks

| Failure                        | Rollback                                                                                       | Cost                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| Bad application build          | Redeploy the previous commit SHA                                                               | Low — no data change                  |
| Bad configuration value        | Correct it and redeploy. **`NEXT_PUBLIC_*` requires a rebuild, not a restart**                 | Low, but slower than operators expect |
| Enforcement change breaks boot | Revert the `env.server.ts` change; the deployment refuses to boot until configuration is fixed | Low — caught before traffic           |
| Storage bucket misconfigured   | Correct `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`, rebuild, re-run `storage:setup`                 | Low — objects are not lost            |
| Database credential rejected   | Reset the password; **wait ~2 min for Supavisor cache**; re-verify                             | Medium — full outage while it lasts   |
| Data corruption                | **PITR only, and lossy.** Treat as an incident, not a routine                                  | High                                  |
| Domain / TLS misconfiguration  | Revert DNS; TLS re-issues on the previous host                                                 | Medium — propagation delay            |

### 20.3 Failure criteria — stop and escalate

Sprint 2.4 is **failed, not partially delivered**, if any of these holds:

1. A real user cannot sign in against the deployed URL (A-01 / M-06).
2. Tenant isolation cannot be demonstrated against the deployed system.
3. Any existing test must be weakened or deleted to make the sprint pass.
4. Migration hash integrity shows a mismatch.
5. A `GRANT` was issued to `anon` or `authenticated` (Q-07).
6. A secret is found in the repository, in CI output, or in a health response.
7. The deploy pipeline cannot be made to reject a misconfigured deployment.
8. `documents` cannot be reached from production, or `nexos-assets` was created.

**Do not work around a failure criterion.** Each one exists because working
around it produces a system that looks released and is not.

## 21. Definition of DONE

Sprint 2.4 is DONE when **all** of the following are true:

1. **G2.4-1 through G2.4-7 are all open.**
2. Every acceptance criterion in §18 is checked, and each was checked by
   execution rather than inspection.
3. A real user has signed in to the deployed production application and seen
   real data from the Sprint 2.3 Supabase project.
4. A file has moved real bytes to and from the `documents` bucket in production.
5. Both domains serve the application over valid TLS.
6. The pipeline deploys only after every quality gate passes, and has been
   observed rejecting a misconfigured deployment.
7. A restore has been rehearsed and timed, and the RTO is written down.
8. 489/489 unit tests, 25/25 integration tests, lint 0 errors, typecheck clean,
   format clean, build green, `audit:authz` pass.
9. Migration hash integrity is 0 mismatches and no new `GRANT` was issued.
10. Deployment, rollback and secret-rotation runbooks exist and someone who did
    not write them has walked through the rollback.
11. This document records the outcome, and every deferred item is listed in §23
    or §22 rather than left implied.

**Not DONE** if the deployment works but the pipeline is ungated; if the
pipeline is gated but has never rejected anything; if backups are configured but
never restored; or if login has been reasoned about rather than performed.

## 22. Known documentation issues

Recorded, **not corrected in this sprint.** Correcting them is separate approved
work.

| #    | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-01 | **`PRODUCTION_READINESS_CHECKLIST.md` is stale.** Dated 2026-07-28 and explicitly "not re-audited". It still records ❌ for 2.3 (Supabase provisioned), 2.4 (migrations applied), 3.5 / 7.6 (RLS evaluated by a database), 4.2 (real storage provider), 9.9 (integration tests against Postgres) and 13.13 (production values verified against a real project) — **all delivered and verified in Sprint 2.3.** Its headline score of 43/115 (37%) is therefore wrong in the optimistic direction for the reader who trusts it, and wrong in the pessimistic direction for the project. **Do not treat it as current.** A re-audit is recommended as its own task |
| X-02 | The same checklist routes those items to "Sprint 13 / 14 / 15 / 17", compounding the numbering conflict resolved in §0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| X-03 | `PRODUCTION_MIGRATION_PLAN.md` §3 Sprint 14 specifies creating a `nexos-assets` bucket. The live bucket is `documents`. The plan was not updated after Sprint 2.3 and is not updated here                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| X-04 | The "Sprint 2.4 readiness audit" cited twice in `SPRINT-2.3.md` exists only as its three summary conclusions. There is no standalone audit document, so its scope and method are unauditable. **This specification supersedes it** as the authority for Sprint 2.4                                                                                                                                                                                                                                                                                                                                                                                               |
| X-05 | Phase 2 has no `SPRINT-2.1.md` or `SPRINT-2.2.md`. Those sprints are reconstructible only from git history and from sections of `ENVIRONMENT.md`, `SECURITY.md` and `THREAT-MODEL.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| X-06 | `docs/BACKLOG.md` ends at Phase C.1 and contains no Phase-2 entries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| X-07 | Migration `0012`'s header comment misattributes a statement to `0001`. Recorded in `SPRINT-2.3.md`; **must not be fixed by editing the migration** — its hash is in the applied ledger                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| X-08 | **This document was wrong about share links.** §9 claimed `NEXT_PUBLIC_PORTAL_URL` built them and that leaving it unset would issue `http://` links. The variable had **no consumer at all**; both dialogs used `window.location.origin`. **Resolved** by making the claim true in code — see §9.1                                                                                                                                                                                                                                                                                                                                                               |
| X-09 | **This document assumed a working upload.** M-08 was written as though bytes moved end to end. They did not: the client discarded the signed URL. **Resolved** by implementing the transfer — see §11.1. M-08 was not descoped                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| X-10 | `nexos-assets` appears in **eight further documents** beyond the one recorded in X-03 — `ENVIRONMENT_SETUP.md` (which already flags the conflict), `TECHNICAL-DEBT-NOTES.md`, `M3.1-WP4.5-PROFILE-IMPLEMENTATION-PLAN.md`, `BACKLOG.md`, `VERSION_1.0_BETA.md`. Only the single code occurrence mattered for correctness, and it is fixed; the prose is left alone                                                                                                                                                                                                                                                                                               |
| X-11 | **`assertProductionConfig()` reports server problems before public ones.** It calls `getServerEnv()` first, which throws on a missing `JWT_SECRET`, so the public-variable report is not reached until the server half is clean. An operator can therefore need two passes, which is in tension with this module's "every problem at once" design. Pre-existing; not changed here because it is boot-gate control flow, not configuration                                                                                                                                                                                                                        |

## 23. Deferred Security Architecture Risks

These are **real, documented, open risks**. They are **outside Sprint 2.4 unless
separately approved**, and none may be silently addressed as part of this
sprint's implementation.

They are deferred because each changes the platform's security architecture
rather than its deployment posture, each requires its own design, verification
and test plan, and attempting any of them alongside a first production
deployment would make both harder to reason about and impossible to roll back
independently.

| #    | Risk                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Status                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Y-01 | **150 of 202 public tables have no RLS.** Their protection today is the **absence of a Data API grant**, not a policy. That is a real control and it is currently intact — but it is one `GRANT` away from being gone, and a future `CREATE TABLE` plus a careless grant re-opens all 150 at once                                                                                                                                                                                                                                                                                                                                                                                    | Deferred. Not a Sprint 2.4 task         |
| Y-02 | **Write policies have never been exercised.** `authenticated` holds `SELECT` only, so PostgreSQL refuses writes at the table-privilege layer before any write policy is consulted. The write policies are therefore unproven                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Deferred. Not a Sprint 2.4 task         |
| Y-03 | **Application writes bypass RLS.** Drizzle connects as the table owner. `requirePermission()` plus tenant-scoped `WHERE` clauses are the only enforced write-side control                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Deferred. Architecture unchanged in 2.4 |
| Y-04 | **`service_role` privileges.** Currently `TRUNCATE`, `REFERENCES`, `TRIGGER` only — no DML on application tables. The doc comment in `src/lib/supabase/service.ts` claims the portal service layer uses this client; it does not read tables through it today. Any move of a table read onto `createServiceClient()` needs a privilege decision first                                                                                                                                                                                                                                                                                                                                | Deferred. No privilege change in 2.4    |
| Y-05 | **The share-link route does not resolve its token.** `src/app/portal/s/[token]/page.tsx` discards the token and renders a fixed "not active" state. Wiring it is not a small fix: there are **three incompatible share-token systems** — `deliverableShareLinks` (32-byte hex), `fileShares` (uuid, and its `passwordHash` is the literal `"hashed_placeholder"`), and `shareSessions` + `ShareSecurityMiddleware` (HS256 JWT with nonce, lifecycle and password enforcement). No unified resolver exists, so the route cannot know which namespace a token belongs to. Building one is share-architecture work, and doing it carelessly risks exposing another tenant's deliverable | **Deferred. Blocks M-10 and A-06.**     |

**What Sprint 2.4 owes these risks: preservation, not progress.** Q-07 and Z-09
exist so that this sprint cannot quietly change the posture in either direction.
Deploying to production does not make any of Y-01…Y-04 worse — but it does make
them live, and that should be a deliberate, recorded acceptance rather than a
side effect of shipping.

Each requires separate approval, its own specification, and its own verification
plan before any work begins.

## 24. Open decisions

These block implementation and are **not** decided by this document.

| #   | Decision                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1 | **Deployment platform.** Vercel is the evidenced intent (`.env.example` §6 and the CI comment both name it) but nothing is configured. Confirm or choose otherwise |
| D-2 | **Staging environment.** Deploy straight to production, or stand up staging first? Staging against the same Supabase project shares one database                   |
| D-3 | **Domains.** Confirm `app.aicollective.agency` and `portal.aicollective.agency`, and who controls the DNS zone                                                     |
| D-4 | **Integration suite in CI.** It needs live credentials and fails rather than skips. Run it in the pipeline, or as a gated pre-deploy step run manually?            |
| D-5 | **Redis.** Provision it, or pin production to a single instance and accept per-instance rate limits with that constraint recorded? (C-09)                          |
| D-6 | **Supabase plan and backup posture.** PITR availability depends on the project plan; B-09/B-10 may have a cost implication                                         |
| D-7 | **Seeding production.** Does production start empty, or is `npm run db:seed` run once? (Q-08)                                                                      |

### 24.1 Decisions taken

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1 | **Vercel, confirmed.** The evidenced intent is the decision                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D-2 | **No staging.** Deploy straight to production. Staging against the same Supabase project shares one database, which makes it a second front door to production data rather than an isolated environment                                                                                                                                                                                                                                                                                                 |
| D-3 | **Resolved, and not as this document assumed.** `app.aicollective.agency` / `portal.aicollective.agency` are **withdrawn** — no custom domain is owned and none is to be purchased. Production uses Vercel-assigned `.vercel.app` hostnames. `.env.example` still carries the withdrawn hosts and is corrected once the real ones are assigned                                                                                                                                                          |
| D-4 | **Integration suite stays out of the deploy job.** It needs live credentials and fails rather than skips; the deploy gate's `--verify` already opens a real database and storage connection, which is the reachability property the pipeline needs                                                                                                                                                                                                                                                      |
| D-5 | **Decided: no Redis.** The stated fallback — "pin production to a single instance" — is not possible on Vercel, where functions scale horizontally on demand, so the real choice was between provisioning Redis and accepting the weakness. Per-instance rate limiting is **accepted and recorded**: `REDIS_URL` stays unset, the boot warning stays unsilenced as the standing record of it, and reversal is one variable plus a redeploy with no code change. See [DEPLOYMENT.md](DEPLOYMENT.md) §2.5 |
| D-6 | Open — requires reading the Supabase project's plan, which needs dashboard or management-API access                                                                                                                                                                                                                                                                                                                                                                                                     |
| D-7 | **Production does not need seeding.** One organisation, one user and seven roles already exist in the verified project. `db:seed` is not run                                                                                                                                                                                                                                                                                                                                                            |

## 25. Blockers

Every remaining gate depends on external platform access the build machine does
not have. Recorded rather than worked around.

| Blocker                                            | Evidence                                                                                                                                                                                                  | Consequence                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **No Vercel credential of any kind**               | No `vercel` CLI installed; no `~/.local/share/com.vercel.cli`; no `~/.vercel`; no `.vercel/` in the repository; no `VERCEL_*` variable in the environment; `api.vercel.com` answers `403` unauthenticated | G2.4-2, G2.4-3, G2.4-4 and G2.4-5 cannot be executed                                    |
| **No Supabase dashboard or management-API access** | Only `~/.supabase/telemetry.json` exists — there is no CLI login                                                                                                                                          | Auth URL configuration and D-6 backup posture are unreadable; G2.4-7 cannot be executed |
| **No credential for a real user**                  | One `auth.users` row exists and its password is stored as a hash                                                                                                                                          | A-01 / M-06 cannot be executed                                                          |

**No secret was generated.** K-01 and K-02 are deliberately deferred until a
production environment exists to receive the values, so that a live signing
secret never sits unused on a developer machine.

---

_G2.4-1 complete and verified. G2.4-6 built, and its gate proven by execution;
the pipeline run itself is pending a deployment target. G2.4-2 through G2.4-5 and
G2.4-7 are blocked per §25. No migration was created, no schema, grant, policy or
privilege was changed, no Supabase configuration was altered, no secret was
generated, and no deployment exists._
