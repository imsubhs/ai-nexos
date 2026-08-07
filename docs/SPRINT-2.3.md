# Sprint 2.3 — Supabase Production Integration

Connects AI NEX OS to the real Supabase project and replaces presence-based
environment checks with verification that actually connects.

**Status: partially complete.** Storage and the connectivity tooling are done
and verified against the live project. Everything requiring SQL execution
(migrations, RLS, seed) is blocked on one credential — see
[Blocked](#blocked-database-password).

---

## Connection topology

The direct host `db.<project-ref>.supabase.co` publishes **only an AAAA
record**. It is IPv6-only, so it is unreachable from IPv4-only networks and
from many corporate and CI environments — the failure looks like
`ECONNREFUSED`, which reads as "database down" rather than "no route".

Both connection strings therefore go through **Supavisor**, which is
dual-stack:

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

## Verifying the environment

```bash
npm run env:check            # presence only
npm run env:check -- --verify # opens a real connection to Postgres and Storage
```

`--verify` exists because presence checks cannot detect a misconfigured
environment. A syntactically valid connection string pointing at a project that
does not exist passes every presence check, and `next build` passes too —
every route in this app is dynamic, so nothing is prerendered against the
database. That combination reports a fully configured environment while nothing
is reachable. `--verify` connects, and names the cause when it cannot.

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

## Integration suite

```bash
npm test              # hermetic, offline — unchanged
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

RLS is asserted at the database level because **the application's own Drizzle
connection runs as the table owner and bypasses RLS entirely** — `requirePermission`
is the only enforced control on write paths. That makes database-level proof of
the policies necessary rather than redundant.

Two checks worth calling out:

- **RLS enabled with zero policies denies everything.** That is a silent
  outage, not security. `rls.integration.test.ts` fails on it.
- **A blocked `UPDATE` reports zero affected rows rather than raising**, so the
  cross-tenant write test asserts on the row count and then re-reads the row.

## Blocked: database password

The database password in `.env.local` is rejected by the server. Every layer
beneath authentication was verified independently, so the failure is isolated
to one step:

| Step                   | Result                                           |
| ---------------------- | ------------------------------------------------ |
| URL parsing / encoding | ✓ decodes to exactly the intended 12-char value  |
| DNS                    | ✓ pooler resolves (3 A records)                  |
| TCP 5432 / 6543        | ✓ both open                                      |
| SSL negotiation        | ✓ TLSv1.3, `TLS_AES_256_GCM_SHA384`              |
| Pooler tenant routing  | ✓ `postgres.<ref>` accepted as tenant identifier |
| **PostgreSQL auth**    | **✗ `28P01 password authentication failed`**     |

A control run with a deliberately wrong password returns the _identical_
error, which is what establishes that the server treats the configured
password the same way it treats a known-wrong one.

Encoding is not the cause: the value decodes to the intended string
byte-for-byte (verified by SHA-256 fingerprint, with no stray brackets or
whitespace). Neither is routing: a bare `postgres` username fails differently
(`ENOIDENTIFIER`), confirming the `postgres.<ref>` form is correct.

**The database password is a different secret from the service-role API key.**
The API keys in `.env.local` are valid and were used to provision and verify
Storage — the project is real and reachable.

To unblock, `.env.local` needs the project's actual database password.
Supabase does not display it after project creation; it can only be set.
Confirm any change with `npm run env:check -- --verify`.

Blocked until then:

- `npm run db:migrate` — no migration has been applied to this project
- RLS and tenant-isolation verification
- `npm run db:seed`
- `database.integration.test.ts`, `rls.integration.test.ts`
