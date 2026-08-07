# AI NEX OS

**The Operating System for Creative Execution.**

Enterprise SaaS-grade operating system for creative agencies: projects, clients,
production timelines, deliverables, approvals, files, meetings, analytics, and
AI workflows in one platform. Internal teams authenticate; clients collaborate
through secure, login-free share links.

## Architecture

| Layer      | Technology                                                         |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4  |
| UI         | shadcn/ui (base-nova) · Lucide · Framer Motion                     |
| State/Data | Zustand · TanStack Query · React Hook Form · Zod                   |
| Backend    | Supabase (PostgreSQL · Auth · Storage · Realtime · Edge Functions) |
| ORM        | Drizzle ORM + Drizzle Kit migrations                               |
| Email      | Not yet integrated (see docs/ENVIRONMENT.md §2.2)                  |
| Deployment | Vercel (dual domain)                                               |

### Domain topology

- `app.<domain>` — internal dashboard (authenticated)
- `portal.<domain>` — client portal (login-free)
- `portal.<domain>/s/{secure_token}` — secure share links

Host-based routing lives in [src/proxy.ts](src/proxy.ts).

### Architectural invariants

1. Explicit primary keys (`organization_id`, `project_id`, …) — never generic `id`.
2. Every operational table carries `organization_id`; all RLS policies,
   queries, and storage paths are organization-aware (multi-tenant-ready).
3. The tenant is data, not code — organization identity is never hardcoded.
4. Clients never authenticate and never touch RLS-internal tables; the portal
   goes through a token-validated service layer.
5. All async work flows through the `background_jobs` queue (file pipeline).
6. Realtime (Supabase) powers live dashboards; module tables join the
   `supabase_realtime` publication in their migrations.
7. Soft deletes + audit fields (`created_by`, `updated_at`, `version`, …) on
   every table; `activity_logs` is append-only.
8. **The tenant is never a parameter.** `organizationId` is derived from the
   authenticated user, or for external callers from a verified share token —
   never accepted as an argument. Every write is additionally scoped by
   `organization_id` in its `WHERE` clause. Enforced by
   `tests/unit/authorization-coverage.test.ts`; see
   [docs/SECURITY.md](docs/SECURITY.md).
9. Most write paths use Drizzle, which **bypasses RLS**. On those paths
   `requirePermission()` is the only authorization control, not a second layer.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials
npm run env:check            # validate configuration before starting
npm run db:migrate           # apply migrations (uses DIRECT_DATABASE_URL)
npm run db:seed              # bootstrap org, roles, departments, owner
npm run dev
```

### Environment

[`.env.example`](.env.example) is the template; every variable is classified
REQUIRED / PRODUCTION / OPTIONAL / DEV ONLY / TOOLING.
[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) is the full reference — what each
variable does, what happens when it is absent, and when validation fires.

Three things worth knowing up front:

- A misconfigured server **refuses to start** and lists every problem at once
  (`src/instrumentation.ts`). It does not boot and fail one request at a time.
- `next build` requires no secrets. Enforcement happens at boot, not at build,
  because the build stage has no runtime environment.
- `NEXT_PUBLIC_*` values are baked into the bundle at build time. Changing one
  needs a rebuild, not a restart.

Run `npm run env:check` (or `npm run env:check -- --production`) to validate
without starting the app.

Local portal testing: `http://portal.localhost:3000` (browsers resolve
`*.localhost` automatically).

## Scripts

| Script                | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Development server                       |
| `npm run build`       | Production build                         |
| `npm run lint`        | ESLint                                   |
| `npm run typecheck`   | TypeScript                               |
| `npm test`            | Vitest suite                             |
| `npm run env:check`   | Validate environment configuration       |
| `npm run audit:authz` | Report server actions with no auth guard |
| `npm run audit:deps`  | Dependency advisories (high and above)   |
| `npm run format`      | Prettier                                 |
| `npm run db:generate` | Generate migration from schema changes   |
| `npm run db:migrate`  | Apply migrations                         |
| `npm run db:seed`     | Idempotent bootstrap seed                |
| `npm run db:studio`   | Drizzle Studio                           |

## Repository layout

```
src/
  app/            # Routes: (auth), (internal), portal/, auth/callback
  components/     # ui/ (shadcn) + layout/ (shell)
  config/         # App configuration (never hardcode tenant data)
  db/             # Drizzle client + schema (one file per module)
  features/       # Feature-first modules: auth/, permissions/, …
  hooks/          # Shared hooks
  lib/            # Supabase clients, security primitives, utilities
    security/     # Rate limiting, CSP, egress guard, hashing, logging, errors
database/
  migrations/     # Drizzle SQL migrations (0001+ includes RLS)
scripts/
  seed.ts                  # Bootstrap seed
  check-env.ts             # Environment pre-flight
  audit-authorization.ts   # Static authorization audit
```

## Documentation

Security:

- [docs/SECURITY.md](docs/SECURITY.md) — the controls: authentication,
  authorization, tenant isolation, headers, input handling, egress. Includes
  what is still unproven and an operational pre-production checklist.
- [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) — assets, adversaries, attack
  paths and residual risk.
- [docs/SECURITY-DEPENDENCY-BACKLOG.md](docs/SECURITY-DEPENDENCY-BACKLOG.md) —
  dependency advisories and the reasoning behind each accept-or-upgrade call.
- [docs/PRODUCTION_READINESS_CHECKLIST.md](docs/PRODUCTION_READINESS_CHECKLIST.md)
  — the full release gate.

Source-of-truth product documents live in `../DOCS` (PRD, SDS, TRD, DBD,
API Specification, UI/UX Design System, Development Roadmap). Conflict
priority: PRD → SDS → TRD → DBD → API → UI System.
