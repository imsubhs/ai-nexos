# Sprint 2.3 — Supabase Production Integration

Connects AI NEX OS to the real Supabase project, replaces presence-based
environment checks with verification that actually connects, and — for the
first time in this codebase — proves Row Level Security by executing it against
a database rather than by reading the policies.

**Status: PASS.** The database is live, all 14 migrations are applied, every
migration hash matches the file that produced it, RLS is enforced and verified,
and the integration suite passes 25/25 against the real project.

**Sprint 2.4 has not started.**

---

## Final state

| Check                          | Result                                                           |
| ------------------------------ | ---------------------------------------------------------------- |
| PostgreSQL                     | 17.6, reachable on both pooler endpoints                         |
| Migrations                     | 14 applied (`0000`–`0013`)                                       |
| Migration hash integrity       | 14 files · 14 journal entries · 14 ledger rows, all matching     |
| Snapshot chain                 | `prevId` unbroken from `0000` to `0013`                          |
| Tables in `public`             | 202 · 52 with RLS · 150 without                                  |
| RLS enabled with zero policies | none                                                             |
| Data API reach                 | `authenticated` → `SELECT` on 52 tables · `anon` → nothing       |
| Tables without a primary key   | none                                                             |
| Storage                        | bucket `documents`, private, signed-URL flow verified end to end |
| Integration suite              | **25/25 passing**                                                |
| Unit suite                     | 423/423 · lint, format, typecheck, build green                   |

The migration-integrity, privilege and RLS rows were re-verified read-only
during the Sprint 2.4 readiness audit. The 25/25 integration result is the
Sprint 2.3 run of `npm run test:integration`; it was not re-executed during
that audit, which was deliberately read-only and the RLS spec provisions real
tenants.

## Connection topology

The direct host `db.<project-ref>.supabase.co` publishes **only an AAAA
record**. It is IPv6-only, so it is unreachable from IPv4-only networks and
from many corporate and CI environments — the failure looks like
`ECONNREFUSED`, which reads as "database down" rather than "no route".

Both connection strings therefore go through **Supavisor**, which is
dual-stack. Both are verified reachable:

| Variable              | Host                                       | Port | Mode        | Used by            |
| --------------------- | ------------------------------------------ | ---- | ----------- | ------------------ |
| `DATABASE_URL`        | `aws-0-ap-northeast-1.pooler.supabase.com` | 6543 | transaction | app runtime        |
| `DIRECT_DATABASE_URL` | `aws-0-ap-northeast-1.pooler.supabase.com` | 5432 | session     | drizzle-kit, tests |

Two rules that cost real debugging time:

1. **The pooler username is `postgres.<project-ref>`**, not bare `postgres`.
   With the wrong form Supavisor answers
   `XX000 tenant/user not found` — which looks like an auth failure but is a
   routing failure.
2. **Migrations need session mode (5432).** Transaction mode multiplexes
   statements across backends and breaks DDL.

The pooler is regional. This project is in **ap-northeast-1**; the region is
part of the hostname, and a wrong region produces the same
`tenant/user not found` error as a wrong username.

`DATABASE_URL` carries `pgbouncer=true`, and `src/db/index.ts` sets
`prepare: false` — transaction mode does not support prepared statements.

## Verifying the environment

```bash
npm run env:check             # presence only
npm run env:check -- --verify # opens a real connection to Postgres and Storage
```

`--verify` exists because presence checks cannot detect a misconfigured
environment. A syntactically valid connection string pointing at a project that
does not exist passes every presence check, and `next build` passes too —
every route in this app is dynamic, so nothing is prerendered against the
database. That combination reports a fully configured environment while nothing
is reachable. `--verify` connects, and names the cause when it cannot.

It prints variable names and states, never values, so it is safe to run in a
deploy pipeline and safe to paste into an issue.

## Storage

`SupabaseStorageProvider` is now wired to Supabase Storage (closes **TD-02**).
It was previously a mock returning `mock.supabase.co` URLs — an upload appeared
to succeed while nothing transferred, and a "signed" URL that no backend
enforced was an unauthenticated one.

```bash
npm run storage:setup   # idempotent; creates the bucket if absent
```

The bucket is **private** and stays private — `storage:setup` corrects it if it
drifts public. Every read goes through a signed URL minted server-side after an
authorisation check; a public bucket would make each object readable by anyone
who learns its path, defeating that flow.

Object paths are `{organizationId}/{projectId}/{fileId}/{versionId}.{ext}` —
tenant first, so a storage policy can scope access with a prefix match.

Signing requires the service-role key, so URLs can only be minted server-side.
**The provider makes no access decision of its own** — callers must authorise
the request before asking for a URL.

The live bucket is named `documents`, so any deployment must set
`NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=documents`. The code default is
`nexos-assets`, which does not exist in this project — left unset, uploads and
downloads fail at runtime while the app boots green.

## Migrations

Fourteen migrations, `0000` through `0013`, all applied. The last four were
written during this sprint and are the substance of it:

| Migration | Does                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| `0010`    | `GRANT SELECT` to `authenticated` on the 52 RLS-protected tables                      |
| `0011`    | Revokes a hand-run blanket grant, then restores `0010`'s grant                        |
| `0012`    | Revokes the standing `ALTER DEFAULT PRIVILEGES` rule for `anon` and `authenticated`   |
| `0013`    | Composite primary key on `organization_sequences`, guarded because it is already live |

**The find that mattered.** The first nine migrations created 202 tables and 74
policies on 52 of them, but never granted a single privilege to the Supabase
Data API roles. PostgreSQL checks table privileges _before_ it consults row
policies, so every one of those policies was unreachable: RLS had never once
been evaluated. `getCurrentUser()` — the single PostgREST read path, in
`src/features/auth/current-user.ts` — took `42501` and returned `null`, which
silently broke login for every real user outside demo mode. `0010` is the fix,
and it grants `SELECT` only, and only where a policy already governs the rows.

**Why `0011` and `0012` both exist.** While diagnosing the above, a
`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated` was run by
hand. `0011` revokes it from the tables that existed. But a default-privilege
rule is not a grant — it is a standing instruction that re-applies to every
table created afterwards — so `0012` revokes that separately. Without `0012`
the next `CREATE TABLE` in `public` would hand `anon` full read/write and
quietly undo `0011`.

**Why `0013` is guarded.** The composite primary key was first added by editing
`0004` _after_ `0004` had already been applied. That desynchronised drizzle's
recorded content hash from the file, so the repository claimed a history the
migrator had never run. `0004` was reverted to what was actually applied and
the change re-expressed as `0013`, generated by `drizzle-kit` so the snapshot
chain carries it properly. The `DO $$` guard tests `contype = 'p'` rather than a
constraint name — the constraint is already live on this database, and a bare
`ADD CONSTRAINT` would abort with `42P16` and leave the migration permanently
unapplyable here while still being required on a database replayed from empty.

### Hash integrity

The red gate this sprint opened is closed. Every `.sql` file hashes to the
value recorded against it in `drizzle.__drizzle_migrations`, in order:

```
sql files: 14   journal entries: 14   ledger rows: 14   mismatches: 0
```

**Migrations `0000`–`0013` are immutable.** Editing an applied file — even a
comment — changes its SHA-256 and re-opens this gate. Corrections go in `0014`
and later.

## Data API privilege posture

The state that actually protects the data, verified against the live database:

| Role            | Privileges in `public`                              |
| --------------- | --------------------------------------------------- |
| `authenticated` | `SELECT` on 52 tables — exactly the RLS-policed set |
| `anon`          | none                                                |
| `service_role`  | `TRUNCATE`, `REFERENCES`, `TRIGGER` only — no DML   |
| `postgres`      | owner; this is the role Drizzle connects as         |

Three properties follow, and each was checked rather than assumed:

- No RLS-policed table is ungranted, and no granted table is unpoliced — the
  two sets are identical.
- The 150 tables without RLS hold no Data API grant, so they are unreachable
  through PostgREST. **The protection is the absence of a grant, not a policy.**
  A single future `GRANT` re-opens all 150 at once.
- `service_role` cannot read or write application tables. Nothing depends on
  that today — Storage uses the Storage API and the portal share layer goes
  through Drizzle — but the doc comment in `src/lib/supabase/service.ts` claims
  the portal service layer uses this client, so treat any move of a table read
  onto `createServiceClient()` as a change that needs a privilege decision
  first.

RLS is asserted at the database level because **the application's own Drizzle
connection runs as the table owner and bypasses RLS entirely** —
`requirePermission()` plus tenant-scoped `WHERE` clauses remain the only
enforced control on write paths. That makes database-level proof of the
policies necessary rather than redundant. Recorded as R1/R2 in
`docs/THREAT-MODEL.md`.

## Integration suite

```bash
npm test                  # hermetic, offline — unchanged
npm run test:integration  # runs against the REAL project in .env.local
```

The suites are separate configs so `npm test` never depends on network or
credentials.

**The integration suite fails when the database is unreachable. It does not
skip.** A silently skipped integration suite reports green while verifying
nothing, which is the failure mode this harness exists to eliminate.

| Spec                           | Verifies                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `storage.integration.test.ts`  | sign → upload → sign → download → delete, private-bucket enforcement            |
| `database.integration.test.ts` | tables, columns, FKs, indexes, primary keys, enums, `app.*` functions, triggers |
| `rls.integration.test.ts`      | RLS active, every table policed, anon denied, tenant isolation, RBAC            |

Schema expectations are read from the Drizzle snapshot rather than a hardcoded
list, so adding a table extends the suite automatically. The RLS spec creates
two real tenants (with real `auth.users` identities, since `users.user_id` is
foreign-keyed to them) and queries through connections carrying each tenant's
JWT claims under the same `authenticated` role PostgREST uses.

Four checks worth calling out:

- **RLS enabled with zero policies denies everything.** That is a silent
  outage, not security. `rls.integration.test.ts` fails on it.
- **A blocked `UPDATE` reports zero affected rows rather than raising**, so the
  cross-tenant write test asserts on the row count and then re-reads the row.
- **Anonymous callers are refused twice over**, and the spec accepts either
  layer: `anon` holds no privilege at all, so PostgreSQL raises `42501` before
  a policy is consulted; were that grant ever restored, every policy targets
  `authenticated` and no `auth.uid()` means no organisation. Only a read that
  returns rows is a failure.
- **Foreign-key assertions compare against a 63-byte identifier**, which is
  where PostgreSQL truncates constraint names.

## Resolved: the database password

For most of this sprint every SQL path was blocked on one credential. The
password in `.env.local` was rejected with `28P01`, and each layer beneath
authentication verified clean: URL parsing, DNS, TCP on both ports, TLSv1.3,
and pooler tenant routing. A raw PostgreSQL v3 client showed the full
SCRAM-SHA-256 exchange completing — real salt, 4096 iterations, client proof
sent — before the server rejected it in its own `auth.c:auth_failed`. Four
independent clients including `psql` (C/libpq, sharing no code with the
JavaScript drivers) returned the identical result.

The resolution was to set a new database password from the Supabase dashboard.
Two things are worth carrying forward:

- **The database password and the service-role API key are independent
  secrets, and were in different states here.** The API keys were valid
  throughout and were used to provision and verify Storage. A healthy Supabase
  project tells you nothing about the database password. Supabase does not
  display it after project creation; it can only be set.
- **Supavisor caches the tenant credential.** Immediately after a dashboard
  reset the pooler kept rejecting the _new_ password with `28P01` for roughly
  two minutes, then accepted it unchanged. Do not conclude "wrong password"
  from a single post-reset attempt — retry before diagnosing.

Confirm any password change with `npm run env:check -- --verify`.

## Known documentation defects

Recorded rather than corrected, because correcting them in place would require
editing an applied migration:

- **`0012`'s header comment misattributes a statement to `0001`.** It states
  that "Migration 0001 now ends with `ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated`."
  **`0001` contains no such statement** — its only grants are `USAGE ON SCHEMA
app` and `EXECUTE` on three `app.*` functions, both to `authenticated`. The
  blanket grant that `0011` and `0012` clean up was run by hand against the
  live database, never committed to a migration.

  The consequence is benign in the direction that matters: replaying the
  history from empty is _cleaner_ than the comment describes, because the
  default-privilege rule is never created and `0012`'s revokes degrade to
  no-ops. The end state is the same either way, which is what `0012` was
  reaching for. Only the stated reason is wrong.

  **`0012` must not be edited to fix this.** Its hash is recorded in the
  applied-migration ledger; changing a comment changes the file's SHA-256 and
  re-opens the integrity gate closed above. This note is the correction.

## Sprint 2.4

**Not started.** See the readiness audit for what must be in place first: no
deployment environment exists yet, `JWT_SECRET` and `SHARE_JWT_SECRET` have
never been generated, and three production settings
(`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PORTAL_URL`,
`NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`) are required in practice but not
enforced by the boot gate.
