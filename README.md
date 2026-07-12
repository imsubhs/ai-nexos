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
| Email      | Resend                                                             |
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

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials
npm run db:migrate           # apply migrations (uses DIRECT_DATABASE_URL)
npm run db:seed              # bootstrap org, roles, departments, owner
npm run dev
```

Local portal testing: `http://portal.localhost:3000` (browsers resolve
`*.localhost` automatically).

## Scripts

| Script                | Purpose                                |
| --------------------- | -------------------------------------- |
| `npm run dev`         | Development server                     |
| `npm run build`       | Production build                       |
| `npm run lint`        | ESLint                                 |
| `npm run typecheck`   | TypeScript                             |
| `npm run format`      | Prettier                               |
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:migrate`  | Apply migrations                       |
| `npm run db:seed`     | Idempotent bootstrap seed              |
| `npm run db:studio`   | Drizzle Studio                         |

## Repository layout

```
src/
  app/            # Routes: (auth), (internal), portal/, auth/callback
  components/     # ui/ (shadcn) + layout/ (shell)
  config/         # App configuration (never hardcode tenant data)
  db/             # Drizzle client + schema (one file per module)
  features/       # Feature-first modules: auth/, permissions/, …
  hooks/          # Shared hooks
  lib/            # Supabase clients, utilities
database/
  migrations/     # Drizzle SQL migrations (0001+ includes RLS)
scripts/
  seed.ts         # Bootstrap seed
```

## Documentation

Source-of-truth product documents live in `../DOCS` (PRD, SDS, TRD, DBD,
API Specification, UI/UX Design System, Development Roadmap). Conflict
priority: PRD → SDS → TRD → DBD → API → UI System.
