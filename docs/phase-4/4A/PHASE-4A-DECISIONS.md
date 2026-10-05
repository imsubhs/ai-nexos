# AI NEX OS — Phase 4A: Product & Architectural Decisions

**Product:** AI NEX OS — The Operating System for Creative Execution  
**Phase:** 4A — Product Foundation & UX Audit  
**Status:** COMPLETE / CANONICAL AUDIT BASELINE  
**Decision Governance:** Strictly Evidence-Based Classification (LOCKED · PROPOSED · OPEN QUESTION · BLOCKED)

---

## 1. Governance & Classification Standard

This document formally records all architectural, UX, and product foundation decisions established during Phase 4A. To maintain absolute integrity and avoid unearned consensus:

- **LOCKED:** Fully substantiated by verified repository architecture, certified production baselines, or binding project directives. Cannot be altered without an executive RFC.
- **PROPOSED:** Strongly supported by empirical UX audit evidence and user feedback, pending review prior to Phase 4B implementation.
- **OPEN QUESTION:** Genuine design or architectural tradeoffs requiring explicit stakeholder decision.
- **BLOCKED:** Deferred decisions that depend on unbuilt infrastructure or future phase milestones.

---

## 2. LOCKED Decisions

### DEC-L01: Product Identity, Tagline, and Target Audience

- **Status:** `LOCKED`
- **Decision:** The canonical product name is **AI NEX OS**. The canonical product tagline is **"The Operating System for Creative Execution"**. The product is an agency-agnostic B2B SaaS platform serving creative agencies, advertising firms, production studios, branding consultancies, and independent digital studios.
- **Evidence:** `src/config/app.ts:4-5`, `src/app/layout.tsx:18-24`, PRD V2.
- **Enforcement:** All active UI templates, page metadata, onboarding screens, and marketing surfaces must reflect this exact identity. No agency-specific branding may be hardcoded.

### DEC-L02: Multi-Tenant Data Isolation & Security Boundary

- **Status:** `LOCKED`
- **Decision:** The tenant boundary is strictly defined by `organizations.id`. All tenant data isolation in database queries and server actions must derive exclusively from the cryptographically verified session (`getAuthenticatedSession()`). Caller-supplied tenant IDs in API payloads are strictly forbidden.
- **Evidence:** AST-based security gate (`tests/unit/tenant-identity-surface.test.ts`), 77 RLS policies, Migration 0000–0018.
- **Enforcement:** Zero regression permitted in tenant boundary isolation.

### DEC-L03: Sibling Project Boundary & Context Quarantine

- **Status:** `LOCKED`
- **Decision:** Absolute quarantine from all sibling and external repositories (`BUBU × DUDU`, `Couple Game`, `Couple Game Prototype`, `Game/`, Phase 20.x, LocalOracle, RoomStore, game WebSocket architectures).
- **Evidence:** Executive Project Boundary Directives (§0), `AGENTS.md`.
- **Enforcement:** Under no circumstances should game-project concepts, schemas, or constants be introduced into AI NEX OS.

### DEC-L04: Certified Production Technology Baseline Lockdown

- **Status:** `LOCKED`
- **Decision:** The core platform runtime remains locked to:
  - Next.js: `16.3.8` (App Router, Server Components, Server Actions)
  - React / React DOM: `19.2.4`
  - PostgreSQL: `17.6` with Drizzle ORM
  - Supabase: Auth & Storage
  - Styling: Tailwind CSS v4 with OKLCH semantic tokens
  - UI Primitives: `@base-ui-components/react`
  - Topology: Certified single-instance production deployment (MemoryStore-first rate limiting)
- **Evidence:** `package.json`, Migration 0000–0018 baseline, S7.14 Production Gate certification.
- **Enforcement:** No major dependency upgrades or framework substitutions during Phase 4.

### DEC-L05: Phase 4A Zero-Code-Change Gate

- **Status:** `LOCKED`
- **Decision:** Phase 4A is strictly an audit and product foundation milestone. Zero application source code files, database schemas, migrations, environment variables, or deployments may be altered.
- **Evidence:** Phase 4A Specification §38.
- **Enforcement:** Verified via `git status --short`.

### DEC-L06: Task Hierarchy & Milestone Decoupling

- **Status:** `LOCKED`
- **Decision:** The global task management system must be decoupled from the hardcoded demo milestone UUID (`00000000-0000-4000-8000-000000000322`) and the rigid 5-level hierarchy (`Org → Project → Timeline → Phase → Milestone → Task`). Direct project-level tasks and personal "My Tasks" queues must be supported.
- **Evidence:** `src/app/(dashboard)/tasks/page.tsx:12-24`, `UXG-01`.
- **Enforcement:** Mandatory implementation in Phase 4E.

### DEC-L07: Defensive Authorization & Crash Prevention in Asset Routes

- **Status:** `LOCKED`
- **Decision:** Server Components in `/files`, `/deliverables`, and `/meetings` must not crash with 500 unhandled errors when users lack `projects.read`. Blanket `getProjects()` calls must be replaced with permission-tolerant selectors or wrapped in defensive try/catch blocks.
- **Evidence:** `UXG-02`, `src/app/(dashboard)/files/page.tsx:69`.
- **Enforcement:** Mandatory resolution in Phase 4B.

### DEC-L08: Workforce Navigation Consolidation

- **Status:** `LOCKED`
- **Decision:** The workforce sidebar navigation must be consolidated from 7 individual items down to 2 top-level entries:
  1. `My Time` (`/attendance`): Individual contributor punch clock, history, and correction requests.
  2. `Team & People` (`/workforce`): Managerial employee directory, team attendance dashboard, review queue, and payroll reports (filtered by role).
- **Evidence:** `UXG-06`, User Direct Guidance (`AI NEX OS (ss)/ai.txt`).
- **Enforcement:** Implementation scheduled for Phase 4B & 4C.

---

## 3. PROPOSED Decisions

### DEC-P01: Project-Centric Scoped Workspace (`/projects/[id]`)

- **Status:** `PROPOSED`
- **Proposal:** Transform `/projects/[id]` from a simple static metadata summary card into a rich Project Workspace featuring nested tabs:
  - `Overview`: Key metrics, team members, creative brief, client contact.
  - `Tasks / Kanban`: Project task board with drag-and-drop status lanes.
  - `Timeline / Gantt`: Project milestones, phases, and schedule dependencies.
  - `Deliverables`: Review and approval status for this engagement's creative outputs.
  - `Files`: Scoped asset repository with drag-and-drop upload.
  - `Meetings`: Meeting agenda notes, creative critiques, and call recordings.
- **Audit Basis:** `UXG-10`. Eliminates severe module fragmentation.
- **Target Phase:** `Phase 4E`.

### DEC-P02: Relational Client CRM Profile (`/clients/[id]`)

- **Status:** `PROPOSED`
- **Proposal:** Upgrade `/clients/[id]` to a multi-dimensional relationship hub:
  - `Overview`: Contacts, contract tier, health status, billing details.
  - `Projects`: Active and archived creative engagements for this client.
  - `Approvals`: Deliverables awaiting client sign-off.
  - `Portal Access`: Direct client portal link generation and activity audit log.
- **Audit Basis:** `UXG-07`. Re-establishes the core CRM chain: `Client → Project → Deliverable → Approval`.
- **Target Phase:** `Phase 4D`.

### DEC-P03: Unified Command Palette for Global Search (`⌘K`)

- **Status:** `PROPOSED`
- **Proposal:** Replace the non-functional header search input with an accessible Command Palette (using `cmdk` or Base UI Dialog) triggered by `⌘K`. Queries across Projects, Clients, Deliverables, Tasks, and Members with strict organization scoping.
- **Audit Basis:** `UXG-04`.
- **Target Phase:** `Phase 4B`.

### DEC-P04: In-Context Organization Member Invitation

- **Status:** `PROPOSED`
- **Proposal:** Add an `+ Invite Member` action button and dialog directly within `/settings/members`. Provide both direct email dispatch and copyable cryptographic invite links.
- **Audit Basis:** `UXG-03`. Fixes the inverted invitation flow.
- **Target Phase:** `Phase 4C`.

### DEC-P05: Operational Command Center Dashboard

- **Status:** `PROPOSED`
- **Proposal:** Re-architect `/dashboard` from a blank canvas with 4 static numbers into an actionable operational command center:
  - Interactive KPI cards routing directly to filtered views (`/projects?status=active`, etc.).
  - "Attention Required" queue: Deliverables awaiting internal sign-off, overdue tasks, active client revision requests.
  - Recent Projects grid with quick status indicators.
  - Personal workfeed ("My Day").
- **Audit Basis:** `UXG-05`.
- **Target Phase:** `Phase 4H` (Foundational shell in `Phase 4B`).

---

## 4. OPEN QUESTIONS

### DEC-O01: Client Portal Domain Topology

- **Status:** `OPEN QUESTION`
- **Issue:** Should client review portals be hosted under a path-based route on the primary domain (`app.nexos.run/portal/s/[token]`) or on a dedicated subdomain (`portal.nexos.run/s/[token]`)?
- **Tradeoffs:**
  - _Path-based (`/portal/s/[token]`):_ Simpler deployment, single SSL certificate, shared middleware, zero DNS configuration for tenants.
  - _Dedicated subdomain (`portal.`):_ Cleaner cookie isolation from internal app sessions, easier white-labeling, stronger perceived branding for external clients.
- **Recommendation:** Proceed with path-based `/portal/s/[token]` for Phase 4G, designing routes so that future subdomain routing can be enabled via middleware without rewriting page components.

### DEC-O02: Realtime Transport for Notifications & Approvals

- **Status:** `OPEN QUESTION`
- **Issue:** How should live updates (e.g. deliverable approved, task reassigned, punch clock update) be delivered to the client?
- **Tradeoffs:**
  - _Supabase Realtime (PostgreSQL CDC):_ Native Postgres replication, but requires WebSocket client connections and careful RLS filtering.
  - _Server-Sent Events (SSE) / Polling:_ Simpler, stateless, works seamlessly with single-instance Antideploy topology without distributed state.
- **Recommendation:** Utilize lightweight SWR / React Query polling (10–30s interval) for Phase 4B/4H, reserving Supabase Realtime for Phase 4G client collaborative markup.

### DEC-O03: Granular Project Role Overrides vs. Organization RBAC

- **Status:** `OPEN QUESTION`
- **Issue:** Should team members have project-specific roles (e.g., Jane is a "Creative Director" on Project A, but only a "Contributor" on Project B), or should permissions be strictly governed by the organization-level role (`Owner`, `Admin`, `Member`)?
- **Tradeoffs:**
  - _Organization-only RBAC:_ Simple, predictable, already implemented in database schema.
  - _Project-level overrides:_ Highly requested by larger agencies, but adds permission complexity and requires join queries on every project action.
- **Recommendation:** Maintain organization-level RBAC as the authoritative security floor; introduce lightweight `project_members.project_role` descriptors for workflow assignment in Phase 4E without granting privilege escalation.

---

## 5. BLOCKED Decisions

### DEC-B01: Standalone AI Creative Studio / Generative Workspace

- **Status:** `BLOCKED`
- **Reason:** Blocked pending Phase 4H. Product Principle §27 firmly establishes that AI is an assistive layer integrated into existing workflows (e.g. creative brief drafting inside Projects, smart task estimation), not a disconnected generative sandbox.
- **Unblocking Criteria:** Successful delivery of core creative execution workflows (Phases 4B through 4G).

### DEC-B02: Multi-Tenant Custom Domains (e.g. `creative.agencyname.com`)

- **Status:** `BLOCKED`
- **Reason:** Blocked pending production infrastructure review of edge routing, automated Let's Encrypt SSL provisioning, and wildcard DNS configuration.
- **Unblocking Criteria:** Post-Phase 4 enterprise feature review.

---

## 6. Summary Matrix

| ID          | Title                                   |     Status      | Impact Area                |    Target Phase    |
| ----------- | --------------------------------------- | :-------------: | -------------------------- | :----------------: |
| **DEC-L01** | Product Identity & Tagline              |    `LOCKED`     | Brand / Platform           |  Global Baseline   |
| **DEC-L02** | Tenant Boundary & Session Isolation     |    `LOCKED`     | Security / Auth            |  Global Baseline   |
| **DEC-L03** | Sibling Project Boundary & Quarantine   |    `LOCKED`     | Governance                 |  Global Baseline   |
| **DEC-L04** | Technology Baseline Lockdown            |    `LOCKED`     | Runtime / Dependencies     |  Global Baseline   |
| **DEC-L05** | Phase 4A Zero-Code-Change Gate          |    `LOCKED`     | Process / Audit            |      Phase 4A      |
| **DEC-L06** | Task Milestone Decoupling               |    `LOCKED`     | Tasks / Projects           |      Phase 4E      |
| **DEC-L07** | Defensive Authorization in Asset Routes |    `LOCKED`     | Authorization / Resilience |      Phase 4B      |
| **DEC-L08** | Workforce Navigation Consolidation      |    `LOCKED`     | Navigation / IA            |   Phase 4B / 4C    |
| **DEC-P01** | Project-Centric Scoped Workspace        |   `PROPOSED`    | Projects                   |      Phase 4E      |
| **DEC-P02** | Relational Client CRM Profile           |   `PROPOSED`    | Clients                    |      Phase 4D      |
| **DEC-P03** | Unified Command Palette (`⌘K`)          |   `PROPOSED`    | Search / Navigation        |      Phase 4B      |
| **DEC-P04** | In-Context Member Invitations           |   `PROPOSED`    | Settings / Workforce       |      Phase 4C      |
| **DEC-P05** | Operational Command Center Dashboard    |   `PROPOSED`    | Dashboard                  | Phase 4H (Init 4B) |
| **DEC-O01** | Client Portal Domain Topology           | `OPEN QUESTION` | Client Portal              |      Phase 4G      |
| **DEC-O02** | Realtime Notification Transport         | `OPEN QUESTION` | Notifications              |      Phase 4H      |
| **DEC-O03** | Project-Specific Role Overrides         | `OPEN QUESTION` | RBAC / Projects            |      Phase 4E      |
| **DEC-B01** | Standalone AI Creative Studio           |    `BLOCKED`    | Intelligence               |      Phase 4H      |
| **DEC-B02** | Custom Domain White-Labeling            |    `BLOCKED`    | Infrastructure             |    Post-Phase 4    |
