# AI NEX OS — PHASE 5 STAGING ENVIRONMENT AUDIT

**Product:** AI NEX OS — The Operating System for Creative Execution  
**Phase:** Phase 5 — Cloud Staging / Pre-Production Validation  
**Date:** September 2026  
**Auditor:** Senior Staff & Release-Validation Engineer  
**Classification:** STRICT AUDIT RECORD — ZERO SECRETS DISCLOSED

---

## 1. Executive Summary

This audit assesses the environment variable configurations, isolation mechanisms, and project-targeting guards between **Local**, **Staging**, and **Production** environments for AI NEX OS.

### Key Findings

1. **Strong Separation Architecture**: The repository implements an explicit environment selection architecture (`scripts/lib/environment.ts` and `scripts/lib/staging-guard.ts`). Tooling and migration commands refuse to run without an explicit `--environment=staging` or `--environment=production` flag, and runtime guards automatically block any staging execution that points to production project references.
2. **Production vs. Staging Files**:
   - `.env.local` is configured with **Production** Supabase project reference (`gsgseacjcalkhhmunjhx`) in `ap-northeast-1`.
   - `.env.test.local` is configured with **Staging** Supabase project reference (`shnzzbbtydmvfhgeoysg`) in `ap-southeast-1`.
3. **Staging Project Status**: The Supabase CLI confirms that the Staging Supabase project (`shnzzbbtydmvfhgeoysg`) is **INACTIVE (PAUSED)**.
4. **Staging Configuration Gaps**: `.env.test.local` currently lacks domain URLs (`NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PORTAL_DOMAIN`, `NEXT_PUBLIC_PORTAL_URL`) and external email provider keys (`RESEND_API_KEY`), which will be required for complete end-to-end invitation email delivery in cloud staging.
5. **Zero Secret Leakage**: No passwords, API keys, JWT secrets, or connection strings are printed or exposed in this audit.

---

## 2. Environment Variable Inventory & Classification

The table below catalogs all environment variables defined in the system manifest (`src/lib/env.server.ts`), `.env.example`, `.env.local`, and `.env.test.local`.

| Variable Name                         | Exposure        | Requirement Scope    | Staging Relevance       | Present in `.env.local` (Prod) | Present in `.env.test.local` (Staging) | Staging Configuration Status             |
| ------------------------------------- | --------------- | -------------------- | ----------------------- | ------------------------------ | -------------------------------------- | ---------------------------------------- |
| `NODE_ENV`                            | Server          | Optional (Platform)  | Informational           | Dynamic (`development`)        | Dynamic (`test`)                       | Correctly set to `test` by tooling guard |
| `NEXT_PUBLIC_SUPABASE_URL`            | Public (Client) | Required             | Critical                | Yes (Points to Prod `gsgs…`)   | Yes (Points to Staging `shnz…`)        | Safely isolated; points to Staging       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Public (Client) | Required             | Critical                | Yes                            | Yes                                    | Safely isolated; points to Staging       |
| `SUPABASE_SERVICE_ROLE_KEY`           | Server Only     | Production / Staging | Critical                | Yes                            | Yes                                    | Safely isolated; points to Staging       |
| `DATABASE_URL`                        | Server Only     | Required             | High (Pooler)           | Yes (Points to Prod `gsgs…`)   | Yes (Points to Staging `shnz…`)        | Safely isolated; port 5432/6543          |
| `DIRECT_DATABASE_URL`                 | Server Only     | Tooling (DDL)        | Critical (Migrations)   | Yes (Points to Prod `gsgs…`)   | Yes (Points to Staging `shnz…`)        | Safely isolated; port 5432 session mode  |
| `INTEGRATION_ALLOWED_PROJECT_REFS`    | Server Only     | Tooling Guard        | Critical (Safety)       | Not present (N/A)              | Yes (`shnzzbbtydmvfhgeoysg`)           | Allow-list active and verified           |
| `JWT_SECRET`                          | Server Only     | Production / Staging | Critical (Signing)      | Yes (Valid length)             | Yes (Valid length ≥ 32 chars)          | Safely isolated; unique staging secret   |
| `SHARE_JWT_SECRET`                    | Server Only     | Production / Staging | Critical (Portal)       | Yes (Valid length)             | Yes (Valid length ≥ 32 chars)          | Safely isolated; unique staging secret   |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Public (Client) | Production / Staging | Medium (Storage)        | Yes (`documents`)              | Yes (`documents`)                      | Matches standard bucket                  |
| `NEXT_PUBLIC_APP_DOMAIN`              | Public (Client) | Production / Staging | High (Routing)          | Yes                            | **NOT SET** (Uses fallback)            | Missing for full staging portal          |
| `NEXT_PUBLIC_PORTAL_DOMAIN`           | Public (Client) | Production / Staging | High (Portal)           | Yes                            | **NOT SET** (Uses fallback)            | Missing for full staging portal          |
| `NEXT_PUBLIC_APP_URL`                 | Public (Client) | Production / Staging | High (Redirects)        | Yes                            | **NOT SET** (Uses fallback)            | Missing for full staging redirect        |
| `NEXT_PUBLIC_PORTAL_URL`              | Public (Client) | Production / Staging | High (Share URLs)       | Yes                            | **NOT SET** (Uses fallback)            | Missing for full staging share           |
| `REDIS_URL`                           | Server Only     | Optional             | Low                     | Not set (In-memory fallback)   | Not set (In-memory fallback)           | Supported fallback active                |
| `RESEND_API_KEY`                      | Server Only     | Optional / Feature   | Medium (Email)          | Not set                        | Not set                                | Email delivery unconfigured (mock/log)   |
| `LOG_LEVEL`                           | Server Only     | Optional             | Low                     | Not set                        | Yes (`warn`/`info`)                    | Configured                               |
| `DEMO_MODE`                           | Server Only     | Development          | Critical (Bypass guard) | Yes (`false`)                  | Yes (`false`)                          | Disabled; real DB mode enforced          |

---

## 3. Production vs. Staging Isolation Architecture

The project enforces ironclad isolation through three distinct layers:

```
+-----------------------------------------------------------------------------------------+
|                                    CLI EXECUTION                                        |
|  npm run db:migrate -- --environment=staging  |  npm run env:check -- --environment=... |
+-----------------------------------------------------------------------------------------+
                                             │
                                             ▼
+-----------------------------------------------------------------------------------------+
| LAYER 1: Explicit Target Requirement (scripts/lib/environment.ts)                       |
| - Unnamed targets throw EnvironmentGuardError immediately. No silent production default.|
| - Staging forces resolution to .env.test.local. Production resolves to .env.local.     |
+-----------------------------------------------------------------------------------------+
                                             │
                                             ▼
+-----------------------------------------------------------------------------------------+
| LAYER 2: Staging Target Guard & Deny-List (scripts/lib/staging-guard.ts)                |
| - Checks INTEGRATION_DENIED_PROJECT_REFS (auto-populated from .env.local).              |
| - Verifies target ref matches INTEGRATION_ALLOWED_PROJECT_REFS.                         |
| - Confirms NEXT_PUBLIC_SUPABASE_URL ref matches DIRECT_DATABASE_URL ref.               |
| - If target matches production ref gsgseacjcalkhhmunjhx, aborts immediately with error. |
+-----------------------------------------------------------------------------------------+
                                             │
                                             ▼
+-----------------------------------------------------------------------------------------+
| LAYER 3: Target Validation & Redacted Reporting                                         |
| - Prints sanitized target summary with redacted ref (e.g., shnz…oysg).                  |
| - Never logs plain secrets, passwords, or connection strings.                           |
+-----------------------------------------------------------------------------------------+
```

### Isolation Audit Findings

- **Deny-List Protection**: Verified. Attempting to run staging tooling against the project in `.env.local` is trapped and aborted by `assertStagingTarget`.
- **Ref Match Verification**: Verified. Both the Supabase API URL and the PostgreSQL connection string in `.env.test.local` target project ref `shnzzbbtydmvfhgeoysg`.
- **No Production Fallback**: Verified. If `.env.test.local` is deleted or missing, staging commands immediately throw `EnvironmentGuardError` rather than falling back to `.env.local`.

---

## 4. Potentially Dangerous Configurations & Gaps

1. **Paused Staging Project**:
   - The Supabase Staging project (`shnzzbbtydmvfhgeoysg`) is currently **INACTIVE / PAUSED**.
   - Any attempt to run network validation (`--verify`) or database migration (`db:migrate`) will fail until the project is explicitly resumed by the user in the Supabase Cloud dashboard.
2. **Missing Staging Routing Hosts**:
   - `NEXT_PUBLIC_APP_DOMAIN` and `NEXT_PUBLIC_PORTAL_DOMAIN` are unset in `.env.test.local`.
   - While the local test harness provides defaults, live staging verification requires explicit domains (e.g., `staging-app.domain` and `staging-portal.domain`) to test subdomain routing and multi-tenant cookie domain partitioning.
3. **Email Provider Configuration**:
   - `RESEND_API_KEY` is not present in `.env.test.local`.
   - Team member invitation emails cannot be dispatched via SMTP/REST in staging. Staging validation must test invitation creation, token hashing, and link redemption via internal link extraction rather than external inbox delivery.

---

## 5. Secure Remediation & Preparation Steps

To prepare staging for live execution without risking production or leaking secrets:

1. **Verify Staging Project State in Supabase Dashboard**:
   - Log in to the Supabase Cloud management console.
   - Navigate to project `AI NEX OS Staging` (`shnzzbbtydmvfhgeoysg`).
   - If paused, evaluate subscription/compute limits and unpause/resume via the Supabase UI when ready.
2. **Do Not Share Credentials**:
   - Never paste the database password or service-role key into chat, commits, or issue trackers.
   - Credentials already reside in the local git-ignored `.env.test.local` file.
3. **Keep Staging Isolated**:
   - Ensure `INTEGRATION_ALLOWED_PROJECT_REFS=shnzzbbtydmvfhgeoysg` remains in `.env.test.local`.
   - Maintain `DEMO_MODE=false` in `.env.test.local` to ensure all tests execute against real PostgreSQL tables.
