# AI NEX OS — PHASE 5 PRODUCTION PARITY AUDIT

**Product:** AI NEX OS — The Operating System for Creative Execution  
**Phase:** Phase 5 — Cloud Staging / Pre-Production Validation  
**Date:** September 2026  
**Auditor:** Senior Staff & Release-Validation Engineer  
**Classification:** PRODUCTION PARITY & ARCHITECTURAL COMPARISON (ZERO SECRETS)

---

## 1. Executive Summary

This document establishes a rigorous structural, architectural, and operational parity assessment across **Local Rehearsal**, **Supabase Staging**, and **Supabase Production** environments without connecting to or mutating production infrastructure.

### Parity Verdict
- **Database Engine Parity**: **100% MATCH**. Both Supabase Staging (`shnzzbbtydmvfhgeoysg`) and Supabase Production (`gsgseacjcalkhhmunjhx`) run **PostgreSQL 17.6.1.155 (GA)**.
- **Connection Architecture Parity**: **100% MATCH**. Both environments utilize Supavisor with dual endpoints:
  - Port 6543 (Transaction mode) for high-concurrency runtime queries.
  - Port 5432 (Session mode) for DDL migrations and administrative tooling.
- **Codebase & Runtime Parity**: **100% MATCH**. Next.js 16.3.0, React 19.2.4, Drizzle ORM 0.45.2, TypeScript 5.
- **Migration Pipeline Parity**:
  - Full migration chain `0000_init_platform_foundation` through `0017_organization_invitations` (18 migrations, 204 tables) verified in local PostgreSQL rehearsal.
  - Staging migration execution is pending project unpause.

---

## 2. Structural Environment Comparison

| Dimension | Local Rehearsal | Supabase Staging (`AI NEX OS Staging`) | Supabase Production (`ai-nexos`) | Parity Status |
|---|---|---|---|---|
| **Project Ref** | `local_rehearsal` | `shnzzbbtydmvfhgeoysg` | `gsgseacjcalkhhmunjhx` | Isolated |
| **Cloud Region** | Localhost (macOS) | `ap-southeast-1` (Singapore) | `ap-northeast-1` (Tokyo) | Verified Distinct |
| **Status** | Active / Ephemeral | **INACTIVE (PAUSED)** | **ACTIVE_HEALTHY** | Staging Paused |
| **PostgreSQL Version** | PostgreSQL 14/15/16/17 | **17.6.1.155** | **17.6.1.155** | **Identical Engine** |
| **Connection Pooling** | Direct connection | Supavisor (Ports 5432 & 6543) | Supavisor (Ports 5432 & 6543) | Identical Pooler |
| **Public Tables** | 204 tables | Expected 204 post-migration | Baseline production schema | Verified in 0000→0017 |
| **Migrations Applied** | 0000 → 0017 (18 total) | Awaiting 0015→0017 post-resume | 0000 → 0014 applied | Safe Sequence |
| **Storage Buckets** | Mock / Local | `documents` | `documents` | Identical Target |
| **Auth Provider** | Supabase Auth (Synthetic) | Supabase Auth (Synthetic) | Supabase Auth (Live Users) | Safe Isolation |
| **Email Delivery** | Mocked in tests | Unconfigured (`RESEND_API_KEY` unset) | Production configured | Requires Mock/Link |
| **Redis Cache** | In-memory fallback | In-memory fallback | In-memory / Optional Redis | Graceful degradation |
| **App Domains** | `localhost:3000` | Fallback active (`.env.test.local`) | Configured (`.env.local`) | Separate Domains |
| **Portal Domains**| `portal.localhost:3000` | Fallback active (`.env.test.local`) | Configured (`.env.local`) | Separate Domains |

---

## 3. Database Engine & Extension Parity

### PostgreSQL 17.6.1 Compatibility
Supabase Staging and Production both run the latest PostgreSQL 17 engine (`17.6.1.155`).
- **UUID Generation**: Supported natively via `gen_random_uuid()`.
- **JSONB Operations**: Full support for indexed JSONB columns (`working_hours`, metadata).
- **Constraints & Indexes**:
  - `btree` indexing on composite keys `(user_id, organization_id)`.
  - Partial unique indexes (`uq_invitations_token_hash`, `uq_organizations_code_prefix`).
  - Strict foreign key cascading on tenant teardown and `ON DELETE RESTRICT` on role bindings.
- **Identifier Length**: PostgreSQL enforces a 63-character limit on constraint names. Noticeable warnings during local rehearsal (`identifier will be truncated to ...`) are purely aesthetic and do not impact constraint enforcement or query execution on Postgres 17.

---

## 4. Connection Pooler vs. Direct Session Execution

The application configuration strictly differentiates between transactional pooler connections and migration connections:

```
+--------------------------------------------------------------------------------+
| RUNTIME APPLICATION (Server Actions, API Routes, Middleware)                  |
| - Connects via: DATABASE_URL (aws-0-ap-southeast-1.pooler.supabase.com:6543)  |
| - Protocol: Transaction pooler mode (Supavisor)                                |
| - Behavior: Multiplexes connections, low memory footprint, high concurrency    |
| - Limitation: Cannot execute transactional schema DDL                          |
+--------------------------------------------------------------------------------+

+--------------------------------------------------------------------------------+
| MIGRATION & REHEARSAL TOOLING (scripts/migrate.ts, scripts/seed.ts)             |
| - Connects via: DIRECT_DATABASE_URL (aws-0-ap-southeast-1.pooler...:5432)       |
| - Protocol: Session mode direct connection                                     |
| - Behavior: Full session state, supports multi-statement DDL transactions      |
| - SSL: Strictly enforced (ssl: "require")                                      |
+--------------------------------------------------------------------------------+
```

---

## 5. Security & Authorization Parity

### Privileged Drizzle Model vs. PostgreSQL RLS
1. **Server Architecture Reality**: In AI NEX OS, server-side Drizzle instances connect using privileged database credentials (table-owner / service connection). Therefore, PostgreSQL Row-Level Security (RLS) is bypassed at the database connection layer during server action execution.
2. **Authoritative Security Layer**: Application-level tenant authorization is the **authoritative boundary**.
   - Identity must be resolved server-side from Supabase Auth (`getCurrentUser()`).
   - Active organization must be derived from verified membership (`getActiveOrganization()`).
   - Tenant repository scoping (`TenantRepository` / `withTenantScope`) enforces `WHERE organization_id = ?` on every query.
3. **AST Static Gate**: The codebase enforces an AST gate (`scripts/audit-authorization.ts`) verifying:
   - 0 exported server actions accept client-controlled `organizationId`.
   - 100% of exported server actions invoke an authorization guard (`requireUser`, `requireActiveMembership`, `requirePermission`).

---

## 6. Migration Delta & Release Sequence

The pending migrations to be applied to Staging (and eventually Production) are strictly additive, non-destructive, and idempotent:

```
[0000 - 0014 Base Platform]
             │
             ▼
[0015_organization_code_prefix.sql]
  - Adds `code_prefix text NOT NULL DEFAULT 'NEX'`
  - Backfills legacy 'ai-collective' with 'AIC'
  - Adds unique index `uq_organizations_code_prefix`
             │
             ▼
[0016_organization_memberships.sql]
  - Creates enum `membership_status` ('active', 'invited', 'suspended', 'pending')
  - Creates table `organization_memberships` (UUID PK, FKs to users, orgs, roles)
  - Adds unique index `uq_user_organization` (prevents duplicate memberships)
  - Deterministically backfills existing `users` into `organization_memberships`
    (active users -> 'active', inactive/deleted -> 'suspended')
             │
             ▼
[0017_organization_invitations.sql]
  - Creates enum `invitation_status` ('pending', 'accepted', 'revoked', 'expired')
  - Creates table `organization_invitations`
  - Stores SHA-256 `token_hash` (raw token NEVER persisted)
  - Enforces unique index `uq_invitations_token_hash`
```

---

## 7. Operational Pre-Flight Checklist for Cloud Staging

Before staging execution can proceed:
- [x] Local test suite clean (847/847 tests).
- [x] TypeScript compiler clean (0 errors).
- [x] Production build clean (44 routes compiled).
- [x] Production/Staging configuration files strictly separated (`.env.local` vs `.env.test.local`).
- [x] Migration scripts tested and verified in local PostgreSQL rehearsal (14/14 checks passed).
- [ ] Staging Supabase project unpaused in Supabase console (User action required).
- [ ] Non-destructive schema and data inspection executed against active staging database.
- [ ] Staging migrations 0015, 0016, 0017 applied and verified.
- [ ] Synthetic multi-tenant acceptance tests executed against cloud staging.
