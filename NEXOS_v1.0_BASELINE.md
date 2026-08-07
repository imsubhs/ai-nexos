# AI NEX OS — Version 1.0 Enterprise Architecture Baseline

**Document Classification:** Permanent Architectural Reference  
**Effective Date:** 2026-07-20  
**Supersedes:** All prior sprint plans, implementation plans, and phase reports  
**Authority:** Principal Enterprise Software Architect

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Philosophy](#2-platform-philosophy)
3. [Certified Platform Modules](#3-certified-platform-modules)
4. [Certified Business Modules](#4-certified-business-modules)
5. [Current Repository Flow](#5-current-repository-flow)
6. [Current Event Flow](#6-current-event-flow)
7. [State Machine Inventory](#7-state-machine-inventory)
8. [Workflow Inventory](#8-workflow-inventory)
9. [Projection Inventory](#9-projection-inventory)
10. [Quality Gates](#10-quality-gates)
11. [Known Technical Debt](#11-known-technical-debt)
12. [Future Roadmap](#12-future-roadmap)
13. [Sprint History](#13-sprint-history)
14. [Baseline Rules](#14-baseline-rules)
15. [Version Certification](#15-version-certification)

---

## 1. Executive Summary

| Field                   | Value                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **Project Name**        | AI NEX OS — The Operating System for Creative Execution                                                 |
| **Version**             | 1.0                                                                                                     |
| **Certification Date**  | 2026-07-20                                                                                              |
| **Architecture Status** | CERTIFIED — Enterprise-Grade Foundation                                                                 |
| **Quality Status**      | CERTIFIED — Build Green · TypeScript Clean · Lint Passing                                               |
| **Integration Status**  | CERTIFIED — Supabase Auth/DB integrated; advanced services architecturally complete and schema-deployed |
| **Current Stage**       | Platform Foundation Complete · Ready for Sprint 11A                                                     |

### Platform Summary

AI NEX OS is a multi-tenant, enterprise SaaS platform built on Next.js 16 over Supabase/PostgreSQL. It serves as a unified operating system for creative agency and production workflows, providing organizations with a complete suite covering client management, project delivery, task orchestration, digital asset management, approval workflows, client portals, AI-powered workspaces, automation engines, and an enterprise knowledge graph.

The Version 1.0 Baseline certifies the completion of **19 architectural modules** across **Platform** and **Business** layers. The platform has passed the Enterprise Platform Integrity Audit with architecture, security, and database scores of **98–99/100**. All module schemas are migrated, all state machines are implemented, all service engines are architecturally complete, and the dispatcher/DemoStore pattern is certified for development-mode operation.

The platform is an **inverted pyramid in controlled progression**: a production-grade backend architecture (199+ database tables, 8 journaled migrations, 19 modules, real state machines, real engines) built ahead of the UI surface, by deliberate design. Sprint 11A begins the systematic surface-completion phase.

---

## 2. Platform Philosophy

### 2.1 Bounded Contexts

Each module in AI NEX OS owns a strict bounded context. No module directly reads or writes another module's tables. Cross-module communication occurs exclusively through:

- **Server Actions** (synchronous, permission-guarded)
- **Platform Events** (asynchronous, event-bus broadcast)
- **Typed Service Interfaces** (clean API contracts between layers)

Module boundaries are enforced at the filesystem level (`src/features/*`, `src/lib/*`). A violation of bounded context (e.g., Module 19 reading Module 03 tables directly) is a Severity-1 architectural defect.

### 2.2 Repository Pattern

Every data operation in AI NEX OS routes through the Repository pattern. The canonical flow for any UI action is:

```
UI Component
  -> Server Action (in src/features/<module>/actions.ts)
    -> Permission Guard (requirePermission / requireCurrentUser)
      -> Real Repository Action (Drizzle ORM query)
        OR
      -> Mock Repository Action (DemoStore in-memory)
```

This two-path dispatcher is the foundation of the DemoStore Strategy (§2.9). The dispatcher selects the real or mock path based on the `DEMO_MODE` environment variable.

### 2.3 Dispatcher Pattern

The Dispatcher is the router between real and mock implementations. Each feature module exposes a unified actions interface. The dispatcher is implemented as a conditional at the top of every action function:

```typescript
if (process.env.DEMO_MODE === "true") {
  return mockActions.someAction(data);
}
return realActions.someAction(data);
```

This pattern ensures:

- Zero code duplication in business logic
- Safe UI development before Supabase credentials are active
- Demo mode never bleeds into production paths
- Every real action has a mock twin with schema parity

The dispatcher pattern is **frozen**. Interface contracts between dispatcher and implementations are immutable for v1.0.

### 2.4 Public Gateway Pattern

The Public Gateway is implemented in `src/proxy.ts` (Next.js 16 proxy convention). It is the single entry point for all HTTP traffic and is responsible for:

1. **Dual-domain routing** — `app.<domain>` routes to the internal authenticated dashboard; `portal.<domain>` is rewritten to `/portal/*` for the unauthenticated client portal
2. **Supabase session refresh** — JWT revalidated via `getUser()` on every request (never `getSession()`)
3. **Auth gating** — unauthenticated internal requests redirect to `/login`; unauthenticated API requests receive `401 JSON`
4. **Health check exemption** — `/api/health` is always publicly accessible on both domains

The Public Gateway is **frozen**. No new routing logic may be added to `proxy.ts` in Sprint 11A. Domain logic and auth gating behavior are immutable.

### 2.5 State Machines

State machines in AI NEX OS are implemented as explicit transition maps with strict validation. Illegal state transitions throw runtime exceptions, not silently fail. Every state machine is:

- **Deterministic** — given a current state and an event, exactly one next state is possible
- **Validated** — `validateTransition(current, next)` is called before every status mutation
- **Audited** — every state transition is recorded in `activity_logs`
- **Immutable in definition** — the transition map is a frozen constant, never computed at runtime

See §7 for the complete State Machine Inventory.

### 2.6 Projection Engines

Projection engines are read-model builders that consume platform events and project them into denormalized, query-optimized read models. The pattern is:

```
Platform Event -> Event Engine -> Projection Engine -> Read Model Table
```

Projection engines are:

- **Append-only** — they never mutate source operational data
- **Idempotent** — replaying the same event sequence produces the same read model
- **Checkpointed** — high-water marks allow safe resume after interruption
- **Decoupled** — operational modules are unaware of projection engines

See §9 for the complete Projection Inventory.

### 2.7 Workflow Engines

Workflow engines manage multi-step, stateful business processes. Unlike state machines (which manage a single entity's lifecycle), workflow engines orchestrate sequences of actions across multiple entities, with conditional branching, parallel execution, and human-in-the-loop pauses.

The certified workflow engines are:

- **Approval Engine** — manages approval cycle lifecycle, SLA enforcement, and cascading decisions
- **Automation Engine** — event-driven workflow orchestration with DAG execution, policy enforcement, retry/DLQ mechanics
- **Agent Execution Engine** — AI agent DAG planner, executor, observer, and reflector

See §8 for the complete Workflow Inventory.

### 2.8 RBAC

Role-Based Access Control in AI NEX OS is implemented via a synchronized dual-layer permission engine:

- **PostgreSQL Layer** — `app.has_permission(module, action)` SQL function, invoked inside RLS policies. Cannot be bypassed by application code.
- **TypeScript Layer** — `hasPermission()` / `requirePermission()` functions in `src/features/permissions/`. Used for service-layer checks and UI gating.

Both layers share the same permission vocabulary: **20 modules x 13 actions**. Role permissions are stored as JSONB maps with `*` wildcard support.

**Six certified system roles** (seeded, immutable): Owner (`*:*`), Super Admin, Creative Director, Project Manager, Team Member, Finance.

System roles are protected by both RLS `WITH CHECK` clauses and the `trg_protect_users_privileged` PostgreSQL trigger, which blocks self-service escalation.

### 2.9 Event-Driven Architecture

The platform's event bus (Module 12 — Event Engine) provides an asynchronous pub/sub backbone. The certified event contract is:

```
Business Module emits Domain Event
  -> Event Engine receives and routes
    -> Registered Subscribers process:
        - Notification Engine
        - Analytics Projection
        - Knowledge Graph Projection
        - Automation Trigger Evaluator
```

In v1.0, the Event Engine schema is complete and deployed. The instantiation and subscriber wiring is the first task of Sprint 11A's integration phase.

### 2.10 DemoStore Strategy

The DemoStore (`src/lib/demo/store.ts`) is a deterministic in-memory database that:

- Lives on `globalThis` to survive multi-bundle evaluation (RSC + server actions)
- Uses fixed UUIDs and fixed timestamps to ensure Zod validation passes
- Seeds 2 clients, 2 projects (with members), 5-phase timeline, 4 milestones, 3 tasks
- Implements store-backed CRUD: creates append, updates persist, archives soft-delete with cascades
- Generates sequential project codes (`AIC-2026-XXXX`)
- Calls `revalidatePath` so UI refreshes correctly

DemoStore is explicitly non-durable (resets on server restart) and is never deployed to production.

### 2.11 Future Repository Strategy

When Supabase credentials are active and `DEMO_MODE=false`, the dispatcher routes all actions to the real Drizzle ORM repository layer, which:

- Enforces RLS at the database level (org isolation via `organization_id`)
- Enforces permissions at the service level (`requirePermission`)
- Records all mutations in `activity_logs`
- Uses the Supabase transaction pooler (`prepare:false`) for connection efficiency

The migration from DemoStore to real Supabase is a configuration change (`DEMO_MODE=false` + Supabase credentials), not a code change. This is the proven architectural invariant of v1.0.

---

## 3. Certified Platform Modules

The following platform modules have completed implementation, engineering review, hardening sprint (where required), and freeze verification. Their schemas, APIs, and service interfaces are **frozen**.

### 3.1 Repository (Drizzle ORM / PostgreSQL)

| Property       | Value                                                               |
| -------------- | ------------------------------------------------------------------- |
| **Location**   | `src/db/`, `database/migrations/`                                   |
| **Tables**     | 199+ across 23 domains                                              |
| **Migrations** | 8 journaled migrations (0000–0007)                                  |
| **RLS**        | Enabled on all tables; 16+ base policies + module-specific policies |
| **Status**     | FROZEN                                                              |

The Repository module establishes the multi-tenant PostgreSQL foundation. Every operational table carries: `organization_id`, audit fields (`created_at/by`, `updated_at/by`, `deleted_at/by`), `is_archived`, `version`, and soft-delete support. The schema hierarchy is:

```
Organization -> Department -> User
Organization -> Client -> Project -> Timeline -> Phase -> Milestone -> Task -> File
```

### 3.2 Dispatcher

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| **Location**   | Inside each `src/features/<module>/actions.ts`            |
| **Pattern**    | Conditional routing: `DEMO_MODE` = mock; otherwise = real |
| **Mock Store** | `src/lib/demo/store.ts`                                   |
| **Status**     | FROZEN                                                    |

### 3.3 RBAC (Permissions Engine)

| Property         | Value                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| **Location**     | `src/features/permissions/`                                                         |
| **Vocabulary**   | 20 modules x 13 actions                                                             |
| **SQL Layer**    | `app.has_permission()`, `app.is_org_member()`, `app.current_user_organization_id()` |
| **TS Layer**     | `hasPermission()`, `requirePermission()`, `PermissionDeniedError`                   |
| **System Roles** | 6 (Owner, Super Admin, Creative Director, Project Manager, Team Member, Finance)    |
| **Status**       | FROZEN                                                                              |

### 3.4 Audit

| Property     | Value                                                |
| ------------ | ---------------------------------------------------- |
| **Location** | `src/db/schema/` — `activity_logs` table             |
| **Pattern**  | Append-only; no UPDATE or DELETE RLS policies        |
| **Trigger**  | Auto-populated by server actions via `logActivity()` |
| **Status**   | FROZEN                                               |

### 3.5 Notification Engine

| Property     | Value                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| **Location** | `src/features/notifications/`                                                          |
| **Tables**   | 11 tables (`notifications`, `notification_preferences`, `notification_channels`, etc.) |
| **Delivery** | Architecture complete; channel delivery wiring is Sprint 11A scope                     |
| **Status**   | Schema and Actions FROZEN                                                              |

### 3.6 Reporting Engine (Module 15 — Analytics and Reporting)

| Property       | Value                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **Location**   | `src/lib/analytics/`                                                                               |
| **Components** | `ProjectionService`, `ReportEngine`, `ExportService`, `WidgetEngine`, `AnalyticsAPI`               |
| **Schema**     | `src/lib/analytics/db/schema.sql` (materialized views, partitioning, RLS wrappers, audit triggers) |
| **Hardening**  | Module 15.1 completed — streaming exports, idempotent reports, signed URL access, rate limiting    |
| **Status**     | FROZEN                                                                                             |

### 3.7 Analytics (Module 15)

See §3.6. Analytics and Reporting are co-located in Module 15. The analytics layer provides KPI projections, snapshot partitioning, concurrent materialized view refresh, and widget request batching.

### 3.8 Dashboard

| Property          | Value                                                            |
| ----------------- | ---------------------------------------------------------------- |
| **Location**      | `src/app/(internal)/dashboard/`                                  |
| **Status**        | Shell implemented; metric cards wired to live data in Sprint 11A |
| **Auth**          | Render-time `requireCurrentUser()` + proxy-level auth gating     |
| **Freeze Status** | Shell FROZEN                                                     |

### 3.9 Timeline Engine

| Property     | Value                                                  |
| ------------ | ------------------------------------------------------ |
| **Location** | `src/features/timelines/`                              |
| **UI**       | Gantt view, Roadmap view (calendar view = placeholder) |
| **Data**     | Real Drizzle read/write; timeline seeded in DemoStore  |
| **Status**   | FROZEN                                                 |

### 3.10 Automation Engine (Module 17)

| Property       | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Location**   | `src/lib/automation/`                                                                                                                                  |
| **Components** | `compiler.ts`, `execution.ts`, `variables.ts`, `registry.ts`, `webhooks.ts`, `policy.ts`, `expressions.ts`, `scheduler.ts`, `queue.ts`                 |
| **Schema**     | `src/db/schema/automation.ts` (22 tables), `src/db/migrations/automation_rls.sql`                                                                      |
| **Hardening**  | Module 17.1 completed — Redis nonce cache, AST sandboxing (jsep), distributed leases (PostgreSQL FOR UPDATE), payload offloading, DistributedScheduler |
| **Status**     | FROZEN                                                                                                                                                 |

### 3.11 Search

| Property     | Value                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| **Location** | `src/features/clients/`, `src/features/projects/` (server-side search params)   |
| **Scope**    | Client search and Project search implemented; global search is Sprint 11A scope |
| **Status**   | Module-level search FROZEN                                                      |

### 3.12 DemoStore

| Property     | Value                   |
| ------------ | ----------------------- |
| **Location** | `src/lib/demo/store.ts` |
| **Status**   | FROZEN — see §2.10      |

### 3.13 Event Engine (Module 12)

| Property          | Value                              |
| ----------------- | ---------------------------------- |
| **Location**      | `src/features/events/`             |
| **Tables**        | Event schema complete and deployed |
| **Instantiation** | Pending Sprint 11A wiring          |
| **Status**        | Schema and Contracts FROZEN        |

### 3.14 Knowledge Graph (Module 18)

| Property       | Value                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**   | `src/lib/knowledge/`                                                                                                                         |
| **Components** | `query/` (traversal, path, neighborhood, planner), `projection/engine.ts`, `registry/registry.ts`, `cache/invalidator.ts`, `types/models.ts` |
| **Schema**     | `src/lib/knowledge/database/schema.sql` (nodes, edges, projection checkpoints, RLS)                                                          |
| **Pattern**    | Append-only, event-driven projection, non-mutating read model                                                                                |
| **Status**     | Core Layer FROZEN                                                                                                                            |

### 3.15 AI Gateway (Module 16 — AI Workspace)

| Property       | Value                                                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**   | `src/lib/ai/`                                                                                                                                                                                             |
| **Components** | `orchestrator/`, `context-builder/`, `prompt-registry/`, `model-router/`, `providers/`, `tools/`, `memory/`, `governance.ts`, `guardrails.ts`                                                             |
| **Schema**     | `src/db/schema/ai-workspace.ts` (21 tables incl. all missing tables added in 16.1)                                                                                                                        |
| **Hardening**  | Module 16.1 completed — async approval flow, fallback model routing, atomic cost governance, TTL memory management, context budgeting, Prompt Firewall, tenant boundary enforcement, async audit dispatch |
| **Status**     | FROZEN                                                                                                                                                                                                    |

### 3.16 Portal Services (Module 14 — Client Share Portal)

| Property       | Value                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Location**   | `src/lib/portal/`                                                                                                                                                              |
| **Components** | `PortalServiceLayer`, `PortalCache` (Redis + InMemory fallback), `DownloadValidationService`, `DeviceFingerprintProvider`, `SessionCleanupWorker`                              |
| **Schema**     | `src/db/schema/client-portal.ts` (21 tables, composite indexes)                                                                                                                |
| **Hardening**  | Module 14.1 completed — SHA-256 device fingerprinting, real DB download validation pipeline, Redis cache with InMemory fallback, cursor-based pagination, SessionCleanupWorker |
| **Status**     | FROZEN                                                                                                                                                                         |

### 3.17 Security Layer

| Property       | Value                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Location**   | `src/lib/security/`, `src/features/auth/`, `src/features/permissions/`                                                                   |
| **Components** | VirusScanner (stub — Sprint 12A), JWT service (approvals tokens), Share security (HMAC), Auth flows (password, magic-link, Google OAuth) |
| **RLS**        | All tables: `organization_id` isolation + `app.has_permission()` gates                                                                   |
| **Triggers**   | `trg_protect_users_privileged` — blocks self-service role/org/status changes                                                             |
| **Status**     | FROZEN                                                                                                                                   |

---

## 4. Certified Business Modules

The following business modules have completed schema design, server actions, and dispatcher wiring. Their database schemas and server action interfaces are **frozen**.

### 4.1 Organizations (Module 01)

| Property    | Value                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| **Tables**  | `organizations`, `departments`, `roles`, `organizationSequences`                                                      |
| **Actions** | `getOrganization`, `updateOrganization`, `getOrganizationMembers`, `updateUserRole`, `deactivateUser` (+ mock parity) |
| **UI**      | `/settings/organization` page scope (Sprint 11A)                                                                      |
| **Status**  | Schema and Actions FROZEN                                                                                             |

### 4.2 Users (Module 02)

| Property       | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| **Tables**     | `users`                                                                  |
| **Actions**    | Full CRUD via permissions engine; self-update protected by trigger       |
| **Auth Flows** | Password, magic-link, Google OAuth, PKCE callback, unprovisioned landing |
| **Status**     | FROZEN                                                                   |

### 4.3 Clients (Module 03)

| Property    | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| **Tables**  | `clients`, `contacts`, `clientActivity`                                          |
| **Actions** | Full CRUD for clients and contacts; permissioned; zod-validated; activity-logged |
| **UI**      | List DONE · Detail DONE · Create DONE · Edit/Archive (Sprint 11A)                |
| **Status**  | FROZEN                                                                           |

### 4.4 Projects (Module 04)

| Property    | Value                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tables**  | `projects`, `projectMembers`                                                                                                                                                            |
| **Actions** | `createProject`, `getProjects`, `getProjectById`, `updateProject`, `archiveProject`, `addProjectMember`, `removeProjectMember`, `updateProjectMemberRole`, `getProjectDashboardSummary` |
| **UI**      | List DONE · Detail DONE · Create DONE · Edit/Archive (Sprint 11A)                                                                                                                       |
| **Status**  | FROZEN                                                                                                                                                                                  |

### 4.5 Workforce (Users + Roles)

Managed by Modules 01 and 02. Team/Workforce management page is Sprint 11A scope.

### 4.6 Task Management (Module 06)

| Property          | Value                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tables**        | 13 tables: `tasks`, `taskAssignees`, `taskDependencies`, `taskTimerEntries`, `taskComments`, `taskChecklist`, `taskChecklistItems`, `taskLabels`, `labels`, etc. |
| **Actions**       | `createTask`, `updateTask`, `getTasks`, `getTaskById`, `archiveTask`, `getTasksByProject`, assignee/comment/checklist CRUD (+ mock parity)                       |
| **State Machine** | Task Status — see §7                                                                                                                                             |
| **RLS**           | Migration complete (Module 03 Hardening)                                                                                                                         |
| **Status**        | Schema and Actions FROZEN                                                                                                                                        |

### 4.7 Production Timeline (Module 05)

| Property   | Value                                                               |
| ---------- | ------------------------------------------------------------------- |
| **Tables** | `timelines`, `timelinePhases`, `milestones`, `timelineDependencies` |
| **UI**     | Gantt/Roadmap views rendered; timeline seeded in DemoStore          |
| **Status** | FROZEN                                                              |

### 4.8 Digital Asset Management (Module 10 — File Management)

| Property             | Value                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| **Tables**           | 12 tables: `files`, `folders`, `fileVersions`, `fileRelations`, `fileShares`, `fileLabels`, etc. |
| **Actions**          | 2-phase upload (pre-sign -> confirm), quota enforcement, dedup via SHA-256, version promotion    |
| **Storage Provider** | Real Supabase Storage provider (Sprint 11A) — currently returns mock URLs                        |
| **Status**           | Schema and Actions FROZEN                                                                        |

### 4.9 Deliverables (Module 07)

| Property    | Value                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------- |
| **Tables**  | 12 tables incl. `deliverables`, `deliverableVersions`, `deliverableWorkflow`                        |
| **Actions** | `createDeliverable`, workflow verbs (submit, approve, reject); read/list actions added in hardening |
| **Status**  | Schema and Actions FROZEN                                                                           |

### 4.10 Approval Center (Module 08 — Review and Approval)

| Property     | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| **Tables**   | Approval cycles, reviews, SLA tracking, external review tokens           |
| **Engine**   | Approval Engine with cascading decisions, SLA worker, JWT token issuance |
| **Security** | `/api/approvals/verify` hardened with JWT (replaced plaintext compare)   |
| **Status**   | Schema and Actions FROZEN                                                |

### 4.11 Revision Center (Module 09 — Revision Management)

| Property          | Value                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tables**        | 13 tables incl. `revisions`, `revisionComments`, `revisionBranches`                                                                                                 |
| **State Machine** | Revision State Machine — see §7                                                                                                                                     |
| **Hardening**     | Module 10.1 completed — project-level authorization, time tracking single-source-of-truth, dedicated state machine, unique `(deliverableId, branchName)` constraint |
| **Status**        | FROZEN                                                                                                                                                              |

### 4.12 Meeting Center (Module 11 — Meeting Hub)

| Property              | Value                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Tables**            | 18 tables: `meetings`, `meetingAgendaItems`, `meetingDecisions`, `meetingActionItems`, `meetingAttendees`, etc. |
| **Actions**           | Full CRUD + promote-action-item-to-task cross-module insert                                                     |
| **Read Completeness** | Most read-complete business module (real list/detail reads exist)                                               |
| **Status**            | FROZEN                                                                                                          |

### 4.13 Share Portal (Module 13)

| Property      | Value                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Tables**    | 21 tables: `shareSessions`, `shareComments`, `shareAnnotations`, `shareTokenNonces`, `sharePolicies`, etc.                       |
| **Security**  | JWT + HMAC token validation, nonce replay protection (Module 13.1 hardening)                                                     |
| **Hardening** | Module 13.1 completed — single-use nonce tokens, compound pagination indexes, soft delete FK replacement, Module 11 meeting hook |
| **Status**    | FROZEN                                                                                                                           |

### 4.14 Automation (Module 17)

See §3.10. The Automation Engine serves as both a platform module and a business module — it is the automation layer exposed to users for workflow building.

---

## 5. Current Repository Flow

The certified data flow for all UI operations in AI NEX OS v1.0 is:

```
+-------------------------------------+
|              UI Layer               |
|  (React Server Components / RSC)    |
|  Form submission / user action      |
+------------------+------------------+
                   |
                   v  Server Action call
+-------------------------------------+
|          Public Gateway             |
|  src/proxy.ts (Next.js 16)          |
|  - Dual-domain routing              |
|  - Session refresh (getUser())      |
|  - Auth gating (401 / redirect)     |
+------------------+------------------+
                   |
                   v  requireCurrentUser() / requirePermission()
+-------------------------------------+
|     Feature Repository (Actions)    |
|  src/features/<module>/actions.ts   |
|  - Zod schema validation            |
|  - Permission enforcement           |
|  - Activity logging                 |
+------------------+------------------+
                   |
                   v  Dispatcher
              +----+----+
              |         |
     DEMO_MODE=true   DEMO_MODE=false
              |         |
              v         v
+-------------+  +----------------------+
|  DemoStore  |  |   Real Repository    |
| (in-memory) |  | (Drizzle ORM + RLS)  |
| globalThis  |  |                      |
+-------------+  +----------+-----------+
                             |
                             v  [FUTURE -- Sprint 11A+]
                   +---------------------+
                   |      Supabase       |
                   |  PostgreSQL (RLS)   |
                   |  Storage            |
                   |  Realtime           |
                   +---------------------+
```

**Invariant:** The UI never accesses the database directly. The Repository is the only boundary that touches data. The Dispatcher is the only mechanism that selects real vs. mock.

---

## 6. Current Event Flow

The certified event flow for domain events in AI NEX OS v1.0 is:

```
+-------------------------------------+
|         Business Module             |
|  (Task created, Approval submitted, |
|   Deliverable uploaded, etc.)       |
+------------------+------------------+
                   |  Domain Event emitted
                   v
+-------------------------------------+
|          Event Engine               |
|  src/features/events/               |
|  - Event schema + contracts         |
|  - Pub/Sub routing                  |
|  - Subscriber registry              |
|  [WIRING: Sprint 11A]               |
+------+----------+----------+--------+
       |          |          |
       v          v          v
+----------+ +---------+ +-------------------+
| Read     | |Reporting| |   Analytics       |
| Model    | |Engine   | |   Projection      |
| Update   | |(Mod 15) | |   (Mod 15)        |
+----+-----+ +----+----+ +--------+----------+
     |             |               |
     v             v               v
+----------+ +---------+ +-------------------+
|Dashboard | |Reports  | |   Analytics       |
|Widgets   | |& Exports| |   Dashboard       |
+----------+ +---------+ +-------------------+

Additional subscribers (Sprint 11A wiring):
  -> Notification Engine  (user alerts)
  -> Knowledge Graph      (projection feed)
  -> Automation Engine    (workflow triggers)
```

**Note:** The Event Engine schema contracts are frozen. The subscriber wiring loop is the integration target of Sprint 11A.

---

## 7. State Machine Inventory

All certified state machines in AI NEX OS v1.0. Each implements an explicit transition map with runtime validation.

| #   | State Machine                | Location                                        | States                                                                                                                                      | Notes                                                                   |
| --- | ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | **Task Status**              | `src/features/tasks/`                           | `TODO` -> `IN_PROGRESS` -> `IN_REVIEW` -> `DONE` / `BLOCKED` / `CANCELLED`                                                                  | Kanban board reflects state; drag-to-status triggers validateTransition |
| 2   | **Revision Status**          | `src/features/revisions/utils/state-machine.ts` | `CREATED` -> `WIP` -> `READY_FOR_APPROVAL` -> `IN_REVIEW` -> `APPROVED` / `CHANGES_REQUESTED` -> `MERGED` / `REJECTED` / `ARCHIVED`         | Module 10.1 hardening implemented `REVISION_STATE_TRANSITIONS` map      |
| 3   | **Approval Cycle**           | `src/features/approvals/`                       | `DRAFT` -> `ACTIVE` -> `COMPLETED` / `CANCELLED` · Review: `PENDING` -> `APPROVED` / `CHANGES_REQUESTED` / `REJECTED`                       | Cascading decisions; SLA worker enforces deadlines                      |
| 4   | **Deliverable Status**       | `src/features/deliverables/`                    | `DRAFT` -> `IN_PROGRESS` -> `IN_REVIEW` -> `APPROVED` / `REJECTED` / `ARCHIVED`                                                             | Integrates with Approval Engine                                         |
| 5   | **AI Agent Execution**       | `src/lib/agents/engine/executor.ts`             | `CREATED` -> `PLANNING` -> `READY` -> `RUNNING` -> `PAUSED` / `REPLANNING` / `WAITING_FOR_APPROVAL` -> `COMPLETED` / `FAILED` / `CANCELLED` | Strict state machine; `WAITING_FOR_APPROVAL` hooks into Module 09       |
| 6   | **Automation Execution Run** | `src/lib/automation/execution.ts`               | `QUEUED` -> `RUNNING` -> `PAUSED` -> `COMPLETED` / `FAILED` / `CANCELLED` / `COMPENSATING`                                                  | Distributed lease + atomic lock prevents concurrent execution           |
| 7   | **Share Session**            | `src/features/shares/`                          | `ACTIVE` -> `EXPIRED` / `REVOKED` / `PASSWORD_REQUIRED`                                                                                     | Token-based; nonce replay protection (Module 13.1 hardening)            |
| 8   | **Client Portal Session**    | `src/lib/portal/`                               | `ACTIVE` -> `EXPIRED` / `DEVICE_MISMATCH`                                                                                                   | SHA-256 fingerprinting; 15-min signed URL TTL                           |

---

## 8. Workflow Inventory

All certified workflow engines in AI NEX OS v1.0.

### 8.1 Approval Workflow Engine

**Location:** `src/features/approvals/`  
**Purpose:** Manages the full lifecycle of approval cycles — from creation, through multi-reviewer routing, to SLA enforcement and cascading decision resolution.

**Capabilities:**

- Multi-reviewer approval cycles with configurable quorum rules
- SLA monitoring via `approvals/sla-worker.ts` background worker
- External review token issuance (JWT-signed, org-scoped)
- Cascading decisions (one rejection cascades to cycle rejection or triggers re-review)
- Human-in-the-loop pause/resume hook for AI Agent integration (Module 09 <-> Module 19)

### 8.2 Automation Workflow Engine (Module 17)

**Location:** `src/lib/automation/`  
**Purpose:** Event-driven enterprise workflow orchestration across any business module without owning business logic.

**Capabilities:**

- Trigger types: Platform Events, Cron schedules, Webhooks (HMAC-validated), Manual API
- Rule Engine: Boolean groups (AND/OR/NOT), comparisons, AST-sandboxed custom expressions (jsep)
- Execution topologies: Sequential, Parallel, Conditional, Bounded loops
- Resilience: Exponential backoff retries, Dead Letter Queue (DLQ), Pause/Resume, Cancellation, Compensation (rollback)
- Worker architecture: Distributed workers, PostgreSQL atomic leases (`FOR UPDATE`), Redis nonce cache
- Policy Engine: Rate limits (Redis sliding windows), org quotas (DB aggregations), permission validation

### 8.3 AI Agent Workflow Engine (Module 19)

**Location:** `src/lib/agents/`  
**Purpose:** Goal-oriented AI agent orchestration — decomposes goals into DAG execution plans and coordinates all platform modules.

**Components:**

- **Planner** (`planner.ts`) — DAG decomposition, re-planning with plan versioning (`superseded` -> new `planVersion`)
- **Context Builder** (`context.ts`) — immutable context snapshots (`createImmutableContextSnapshot`) for auditable decisions
- **Execution Engine** (`executor.ts`) — validated Agent State Machine (see §7), tool coordination via Module 17
- **Memory Compaction** (`memory/compaction.ts`) — long-session working memory compaction via Module 16 hooks
- **Tool Capability Manifest** (`tools/manifest.ts`) — parses `ai_agent_skills` into typed ToolCapabilityManifest with permissions, I/O, and approval boundaries

**Human-in-the-Loop:** High-risk actions pause to `WAITING_FOR_APPROVAL` state, entering the Module 09 human approval queue.

---

## 9. Projection Inventory

### 9.1 Timeline Projection

**Location:** `src/features/timelines/`  
**Source Events:** Milestone created/updated, Task status changed, Phase boundary changed  
**Read Model:** `timelinePhases`, `milestones` with computed ordering and dependency resolution  
**Status:** Active — used by Gantt/Roadmap UI

### 9.2 Analytics Projection (Module 15)

**Location:** `src/lib/analytics/projections/ProjectionService.ts`  
**Source Events:** Project velocity events, task completion events, time entry events  
**Read Model:** PostgreSQL Materialized Views (`secure_project_velocity` + RLS wrappers)  
**Refresh:** Concurrent MV refresh (UNIQUE INDEX support); snapshot partitioned by `timestamp`  
**Status:** Engine complete — event feed wiring is Sprint 11A scope

### 9.3 Reporting Projection (Module 15)

**Location:** `src/lib/analytics/reports/ReportEngine.ts`  
**Source Events:** Analytics projections + direct DB queries  
**Read Model:** Reports stored in private object storage (signed URL access); idempotency key prevents duplicate generation  
**Status:** Engine complete — Sprint 11A wires to live data

### 9.4 Automation Projection

**Location:** `src/lib/automation/` — `automationExecutionRuns`, `automationExecutionSteps`, `automationExecutionLogs`  
**Source Events:** All workflow execution events  
**Read Model:** Execution logs (partitioned by `created_at`), step-level telemetry, DLQ  
**Status:** Engine complete — wired to worker execution

### 9.5 Knowledge Graph Projection (Module 18)

**Location:** `src/lib/knowledge/projection/engine.ts`  
**Source Events:** Entity lifecycle events (created, updated, deleted) from any business module  
**Read Model:** `knowledge_nodes`, `knowledge_edges` — append-only, version-tracked  
**Pattern:** Deterministic event stream processor; checkpoints to `knowledge_projection_checkpoints`  
**Status:** Core engine complete — event feed subscription is Sprint 11A scope

---

## 10. Quality Gates

The following quality gates are required to pass before any Sprint 11A code is merged.

### 10.1 TypeScript

| Gate                   | Command             | Requirement                                             |
| ---------------------- | ------------------- | ------------------------------------------------------- |
| TypeScript Strict Mode | `npm run typecheck` | 0 errors (strict mode enforced in `tsconfig.json`)      |
| No `any` in core paths | ESLint              | `no-explicit-any` — zero in `src/features/`, `src/lib/` |

**Current Status:** 0 TypeScript errors at v1.0 baseline

### 10.2 Tests

| Gate                       | Command        | Requirement                                       |
| -------------------------- | -------------- | ------------------------------------------------- |
| Vitest unit tests          | `npm run test` | All pass; no regression                           |
| Permission engine coverage | `src/tests/`   | Auth + permissions test suites must remain green  |
| New feature coverage       | Per sprint     | Each new server action requires at least one test |

**Current Status:** 23 tests passing (auth + permissions coverage); test suite expansion is Sprint 11A deliverable

### 10.3 Build

| Gate             | Command              | Requirement                     |
| ---------------- | -------------------- | ------------------------------- |
| Production build | `npm run build`      | Zero errors; all routes compile |
| Route count      | Next.js build output | No route regressions            |

**Current Status:** Build green; 23+ routes compiled

### 10.4 Lint

| Gate     | Command        | Requirement                    |
| -------- | -------------- | ------------------------------ |
| ESLint   | `npm run lint` | 0 errors                       |
| Warnings | ESLint         | Warnings tracked; not blocking |

**Current Status:** 0 errors; approximately 163 warnings (pre-existing, tracked)

### 10.5 Architecture Audit

| Gate                  | Mechanism                  | Requirement                             |
| --------------------- | -------------------------- | --------------------------------------- |
| Bounded context       | Code review                | No direct cross-module DB access        |
| Dispatcher parity     | Code review                | Every real action has mock twin         |
| RLS completeness      | DB inspection              | Every new table has RLS enabled         |
| Permission vocabulary | `permissions/constants.ts` | All new permissions in 20x13 vocabulary |

**Current Status:** Architecture Audit Score 98/100

### 10.6 Integration Audit

| Gate                                     | Status   |
| ---------------------------------------- | -------- |
| Supabase Auth (login/OAuth/magic-link)   | Complete |
| PostgreSQL via Drizzle (core CRUD)       | Complete |
| RLS on all operational tables            | Complete |
| Session management (proxy + `getUser()`) | Complete |
| Module-to-module dispatcher parity       | Complete |

**Current Status:** Integration Audit Security Score 99/100

---

## 11. Known Technical Debt

The following items are **accepted** technical debt at v1.0 baseline, documented for Sprint 11A+ awareness.

| ID    | Category        | Description                                                                                                                                                       | Severity | Sprint Target |
| ----- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| TD-01 | Infrastructure  | `ioredis` installed but Redis not yet wired for Automation/Portal caching in dev env without `REDIS_URL`                                                          | Medium   | Sprint 11A    |
| TD-02 | Storage         | ~~Supabase Storage provider returns mock signed URLs~~ **RESOLVED (Sprint 2.3)** — real provider wired, verified live end-to-end (`docs/SPRINT-2.3.md`)           | High     | Sprint 2.3    |
| TD-03 | AI              | LLM provider factory architecturally complete but no real SDK installed in `package.json`; awaiting provider agreements                                           | High     | Sprint 12A    |
| TD-04 | Notification    | Notification delivery channels are `console.log`; in-app channel queue dequeue pending event bus wiring                                                           | High     | Sprint 11A    |
| TD-05 | Workers         | 3 background workers (`agent-executor`, `sla-worker`, `SessionCleanupWorker`) + `DistributedScheduler` have no runtime invoker — no cron, no queue consumer wired | High     | Sprint 11A    |
| TD-06 | Event Bus       | Event Engine (`src/features/events/`) never instantiated; subscriber wiring pending                                                                               | High     | Sprint 11A    |
| TD-07 | Migrations      | `automation_rls.sql`, analytics `schema.sql`, knowledge graph `schema.sql` are outside the Drizzle journal pipeline                                               | Medium   | Sprint 11A    |
| TD-08 | Migration       | `0003` journal tag/filename mismatch in `drizzle.config.ts`                                                                                                       | Low      | Sprint 11A    |
| TD-09 | Security        | Virus scanner (`src/lib/security/VirusScanner.ts`) is a stub that always returns clean                                                                            | High     | Sprint 12A    |
| TD-10 | Portal          | Client Portal `PortalServiceLayer` hardcoded mock-org-id/mock-client-id; real session auth pending portal pages                                                   | High     | Sprint 11A    |
| TD-11 | Build Config    | Multiple lockfiles cause workspace-root ambiguity; `turbopack.root` not set in `next.config.ts`                                                                   | Low      | Sprint 11A    |
| TD-12 | Lint            | Approximately 163 ESLint warnings (`no-unused-vars` dominant); auto-fixable subset not yet cleaned                                                                | Low      | Sprint 11A    |
| TD-13 | Knowledge Graph | Mocked query actions in `getNeighborhoodAction`, `findShortestPathAction` (stub DB calls)                                                                         | Medium   | Sprint 12A    |
| TD-14 | Auth            | `signOut` header dropdown uses server action on `onSelect` — should become `<form action>` for no-JS resilience                                                   | Low      | Sprint 12A    |

---

## 12. Future Roadmap

The strategic progression from the v1.0 DemoStore baseline to production:

```
CURRENT: AI NEX OS v1.0 — DemoStore Baseline
  - All 19 module schemas deployed
  - All state machines certified
  - All engines architected
  - Dispatcher/DemoStore active
  - Public Gateway frozen

Sprint 11A: Surface Completion — Core Modules
  - Tasks UI: /tasks route, board/list/detail, create form
  - Clients: Edit/archive/contact CRUD UI
  - Projects: Edit/archive/filters/search UI
  - Organizations: /settings/organization page
  - Event Bus instantiation + subscriber wiring
  - Notification delivery (in-app channel)
  - Worker runtime selection (Vercel cron or Supabase Edge)

Sprint 11B: Production Workflow Spine
  - Deliverables UI (list, detail, submit-for-approval)
  - Approvals UI (internal queue, external review page)
  - Revisions UI (list, detail, state transitions)
  - Read/list query layer (5 modules with zero reads)
  - Files UI (browser, upload wired to presigned-URL flow)
  - Supabase Storage provider (real signed URLs)

Sprint 12A: Real Supabase Integration
  - DEMO_MODE=false production path validation
  - Client Portal: real session auth (replace mock IDs)
  - /portal/s/[token] share token validation
  - Portal navigation layout and 5 stub pages wired
  - Meetings UI

Sprint 12B: Settings, Team, Search
  - Settings page
  - Team/Organization management
  - Global search
  - Full pagination UI on all lists

Sprint 13A: AI Workspace
  - LLM SDK integration (OpenAI/Anthropic)
  - Provider factory real implementation
  - AI Workspace UI (chat page)
  - Seeded model profiles and guardrails
  - Supabase Realtime subscriptions

Sprint 13B: Automation + Agents
  - Redis queue wiring for Automation Engine
  - Automation builder UI
  - Agent builder UI
  - Cron-parser scheduler integration

Sprint 14A: Analytics + Knowledge Graph
  - Analytics Dashboard (real data)
  - Reports and Exports
  - Knowledge Graph DB adapter binding
  - Projection feed wiring

Production
  - Full test coverage (Vitest + Playwright E2E)
  - Virus scanning (real provider)
  - Sentry + structured logging
  - Rate limiting (Vercel WAF / Upstash)
  - Admin console
```

---

## 13. Sprint History

This section records every sprint from Sprint 7A through Sprint 10B. Achievements only — defects and resolutions are documented in §11.

### Sprint 7A — Platform Foundation (M1)

**Scope:** Authentication, database schema, RLS, app shell, CI/CD skeleton

**Achievements:**

- Next.js 16 application initialized with Supabase SSR integration (dual-domain: `app.*` + `portal.*`)
- `src/proxy.ts` — Public Gateway: dual-domain routing, session refresh via `getUser()`, auth gating
- PostgreSQL schema: 6 foundation tables (`organizations`, `departments`, `roles`, `users`, `activity_logs`, `background_jobs`) with 4 enums
- Migration `0000` (Drizzle-generated) and `0001` (hand-written security): cross-schema FK to `auth.users`, deferred FKs, `app.*` SQL helper functions, audit triggers, `trg_protect_users_privileged`, 16 RLS policies, Realtime publication
- Permission engine: 20 modules x 13 actions vocabulary; TypeScript + SQL synchronized; 6 system roles seeded
- App shell: collapsible sidebar (4 nav groups), backdrop-blurred sticky header, internal layout, dashboard zero-state, portal shell
- Theme system: Tailwind v4 CSS-first tokens, shadcn base-nova palette, `next-themes`, Geist fonts, semantic CSS variables
- GitHub Actions CI pipeline, `.env.example`, production build green

### Sprint 7B — Core Operations (M2)

**Scope:** Clients, Projects, Timeline, Milestones, Tasks backend + UI wiring

**Achievements:**

- Module 03 (Clients): Full CRUD server actions, list page, detail page, contacts + activity; real Drizzle path + permission guards + Zod
- Module 04 (Projects): Full CRUD + members, list page (Suspense streaming), detail page, member management table, create modal
- Module 05 (Production Timeline): Timeline schema, Gantt view, Roadmap view; milestone and phase read path; seeded data
- Module 06 (Task Management): 13 tables, create/update/list actions, timer tracking, DAG dependency with cycle detection (DFS), task board/list/detail components
- DemoStore mock-actions for clients, projects, timelines, tasks (dispatcher pattern established)
- `(dashboard)/layout.tsx` created with shared `AppShell` and `requireCurrentUser()`; project detail `params` async fix; error/loading/not-found boundaries added; `/api/health` made public; API 401 policy implemented

### Sprint 8A — Production Workflow (M3 — Files, Deliverables, Approvals)

**Scope:** File management, deliverable lifecycle, approval engine architecture

**Achievements:**

- Module 10 (File Management): 12 tables, 2-phase upload (pre-sign -> confirm), quota management, SHA-256 dedup, version promotion, file relations polymorphic bridge
- Module 07 (Deliverables): 12 tables, deliverable workflow verbs, status management, integration with approval pipeline
- Module 08 (Review and Approval): Approval engine with cascading decisions, SLA worker, JWT-signed external review token issuance, `/api/approvals/verify` endpoint
- Migrations `0002` (Clients RLS), `0003` (Projects + Tasks + RLS), `0004` (File Management)
- Platform Integration Audit passed: Architecture 98/100, Security 99/100, Database 98/100, Performance 94/100

### Sprint 8B — Collaboration Layer (Revisions, Meetings, Shares, Notifications)

**Scope:** Revision state machine, meeting hub, share portal, notification pipeline

**Achievements:**

- Module 09 (Revision Management): 13 tables, revision state machine (`state-machine.ts`), branch management, `(deliverableId, branchName)` unique constraint
- Module 11 (Meeting Hub): 18 tables, full CRUD, promote-action-item-to-task cross-module write, decision and action-item tracking
- Module 13 (Client Share Portal): 21 tables, share session security (JWT + HMAC), share comments/annotations, external identity flow
- Module 15 (Notifications): 11 tables, notification queue architecture, channel definitions, notification preferences

### Sprint 9A — Intelligence Platform (Analytics, AI Workspace, Portal Services)

**Scope:** Analytics and Reporting engine, AI Workspace gateway, Client Portal services

**Achievements:**

- Module 15 (Analytics and Reporting): `ProjectionService`, `ReportEngine`, `WidgetEngine`, `ExportService`, `AnalyticsAPI`; materialized views; analytics schema with partitioning
- Module 16 (AI Workspace): Full orchestration pipeline — orchestrator, context-builder, prompt-registry, model-router, providers abstraction, tools registry, memory management, governance, guardrails; 21 AI tables; `ai_guardrails` Prompt Firewall
- Module 14 (Client Portal Services): `PortalServiceLayer`, `PortalCache`, `DownloadValidationService`, `DeviceFingerprintProvider`; `client-portal.ts` schema (21 tables)

### Sprint 9B — Hardening Sprints (Modules 10.1, 14.1, 15.1, 16.1)

**Scope:** Production hardening of Sprint 9A deliverables and Revision module

**Achievements:**

- **Module 10.1 (Revision) hardening**: Project-level authorization in RLS + `validateRevisionAccess`; time tracking single-source-of-truth (removed duplicated fields); dedicated `REVISION_STATE_TRANSITIONS` map + `validateRevisionTransition`; `mergePreviewDataSchema` Zod validation
- **Module 14.1 hardening**: SHA-256 fingerprinting, real DB download validation pipeline (`Portal Session -> Permission -> Share Policy -> Signed URL`), Redis `PortalCache` with InMemory fallback, cursor-based pagination, `SessionCleanupWorker`
- **Module 15.1 hardening**: RLS wrappers on materialized views, signed URL report access with audit log, snapshot partitioning (`PARTITION BY RANGE`), idempotency key for reports, streaming export cursors, concurrent MV refresh, widget batching/deduplication, API rate limiting + IP allow-listing
- **Module 16.1 hardening**: All 7 missing AI tables created; async tool approval flow (pause/persist/resume for Module 09 integration); fallback model routing; atomic cost governance (transactional SQL); memory TTL (`expiresAt`); tokenizer abstraction; context budgeting with structured trimming; Prompt Firewall (DB-driven guardrails); tenant boundary enforcement; async audit log dispatch

### Sprint 10A — Automation Engine (Module 17)

**Scope:** Enterprise Automation Engine architecture and implementation

**Achievements:**

- Module 17 (Automation Engine): Full engine suite — `compiler.ts` (DAG compiler with cycle detection), `execution.ts` (worker leases, heartbeats, compensation), `variables.ts` (strongly-typed variable engine), `registry.ts` (capability registry), `webhooks.ts` (HMAC + timestamp + nonce), `policy.ts` (policy engine), `expressions.ts` (restricted expression engine), `queue.ts` (QueueProvider abstraction), `scheduler.ts`
- Schema: `src/db/schema/automation.ts` (22 tables), `automation_rls.sql`
- 22-table schema covering: workflows, versions, triggers, conditions, condition groups, actions, action queue, execution runs/steps/logs/state, schedules, webhooks, API keys, variables, templates, rate limits, DLQ, retry policy, permissions, statistics, audit

### Sprint 10B — AI Agents + Knowledge Graph (Modules 17.1, 18, 19)

**Scope:** Automation hardening, Knowledge Graph foundation, AI Agent Platform

**Achievements:**

- **Module 17.1 hardening**: Redis nonce cache (replaces in-memory Set); jsep AST sandboxing (replaces regex blockers); PostgreSQL atomic distributed leases (`UPDATE ... WHERE lease_expires_at < NOW()`); payload offloading at 100KB threshold; `SecretValue` class masking plaintext secrets in logs; `InMemoryQueueProvider` production guard; `DistributedScheduler` with `FOR UPDATE SKIP LOCKED`; Redis sliding-window rate limits; `automation_rls.sql` migration
- **Module 18 (Knowledge Graph)**: Core layer — `knowledge_nodes` / `knowledge_edges` / `knowledge_projection_checkpoints` schema (append-only, RLS); `SemanticLayer` enum, `TraversalBudget`, `ProjectionCheckpoint` interfaces; `RelationshipRegistry` with cardinality governance; event-driven `CacheInvalidator` (replaces TTL); `QueryPlanner` (BFS/DFS/BIDIRECTIONAL strategy selection, budget enforcement); `getNeighborhoodAction`, `findShortestPathAction`, `traverseGraphAction` server actions; deterministic `ProjectionEngine` with checkpoint-based resume
- **Module 19 (AI Agents)**: 20-table schema (`ai_agents`, `ai_agent_plans`, `ai_agent_execution_runs`, `ai_agent_execution_steps`, `ai_agent_memory`, `ai_agent_observations`, `ai_agent_reflections`, `ai_agent_human_approvals`, `ai_agent_audit`, etc.); `Planner` (immutable plans, `superseded` re-planning); `Context Builder` (immutable snapshots); `Execution Engine` (10-state machine); `Memory Compaction`; `ToolCapabilityManifest`; `startAgentRunAction`, `pauseAgentRunAction`, `resumeAgentRunAction`, `cancelAgentRunAction`, `submitHumanApprovalAction` server actions; `agent-executor.ts` worker structured

---

## 14. Baseline Rules

The following rules are **immutable** for AI NEX OS v1.0 and apply to all future sprints.

### Rule 1 — No Module Redesign

No certified module architecture may be redesigned in Sprint 11A or beyond. Module boundaries, table schemas, and server action interfaces are frozen. New capabilities are additions, never replacements.

### Rule 2 — No Workflow Redesign

The Approval Engine, Automation Engine, and Agent Execution Engine state machines and workflow contracts are frozen. Their internal logic may be extended only by adding new states or transition paths, never by removing existing ones.

### Rule 3 — Repository Contracts Are Frozen

The dispatcher pattern, action function signatures, and Zod schema contracts are frozen for all 19 modules. Mock-action parity must be maintained — every new real action requires a mock twin with identical TypeScript signature.

### Rule 4 — Public Gateway Is Frozen

`src/proxy.ts` is frozen. No new routing logic, auth strategy, or domain handling may be added without Principal Architect review. The dual-domain architecture, `getUser()` session pattern, and public path allowlist are immutable.

### Rule 5 — State Machines Are Frozen

All 8 certified state machines (§7) have frozen transition maps. New states may only be added with Principal Architect approval and a corresponding migration. Existing state identifiers may never be renamed or removed.

### Rule 6 — Only Additive Development

Sprint 11A and all subsequent sprints operate in **additive-only mode**:

Allowed:

- New UI pages that consume frozen actions
- New server actions that extend frozen schemas (new columns via migration)
- Wiring: connecting frozen engines to the event bus, worker runtime, and Supabase storage

Not Allowed:

- Removing existing action parameters
- Changing existing table column names or types
- Modifying permission vocabulary without Principal Architect approval
- Changing the Dispatcher conditional logic
- Any change to RLS helper functions (`app.has_permission`, `app.is_org_member`, `app.current_user_organization_id`)

### Rule 7 — Repository Always Overrides Documentation

If any implementation detail in this document conflicts with the actual code in `src/`, the code is authoritative. This baseline describes the intended architecture; discrepancies are Sprint 11A defects, not architectural revisions.

### Rule 8 — No Uncommitted Changes at Sprint Boundary

All work must be committed before sprint boundaries. The baseline was established on a clean working tree. Sprint 11A begins from a committed state on the main branch.

---

## 15. Version Certification

```
============================================================================
                        AI NEX OS — VERSION 1.0
                    OFFICIAL ENTERPRISE CERTIFICATION
============================================================================

ARCHITECTURE CERTIFIED
  - 19 Modules Architected and Implemented
  - Bounded Context isolation enforced across all modules
  - Public Gateway frozen (dual-domain, session refresh, auth gating)
  - Dispatcher Pattern certified (real/mock parity)
  - Audit Score: 98/100

INTEGRATION CERTIFIED
  - Supabase Auth (password, magic-link, Google OAuth, PKCE)
  - PostgreSQL via Drizzle ORM (199+ tables, 8 migrations, RLS)
  - Multi-tenant isolation (organization_id on every table)
  - Permission engine synchronized (SQL + TypeScript)
  - Security Score: 99/100

QUALITY CERTIFIED
  - TypeScript: 0 errors (strict mode)
  - ESLint: 0 errors
  - Build: Green (Next.js 16 production build)
  - Tests: 23 passing (auth + permissions coverage)
  - Database Score: 98/100

PLATFORM CERTIFIED
  - 8 State Machines: Frozen and Validated
  - 3 Workflow Engines: Architected and Hardened
  - 5 Projection Engines: Implemented and Documented
  - DemoStore: Deterministic in-memory DB (certified for development)
  - All module schemas deployed to target database

============================================================================

  CERTIFIED BY:    Principal Enterprise Software Architect
  DATE:            2026-07-20
  DOCUMENT:        v1.0.0
  NEXT MILESTONE:  Sprint 11A — Surface Completion (Core Modules)

                   READY FOR SPRINT 11A

============================================================================
```

---

_This document is the permanent v1.0 baseline. All future sprint documentation must reference this document by version. Any proposed change to a frozen element requires Principal Architect review, a new baseline version, and explicit re-certification._

_Repository implementation always overrides this documentation. Consult `src/` as the source of truth for all implementation decisions._

**END OF BASELINE DOCUMENT — AI NEX OS VERSION 1.0**
