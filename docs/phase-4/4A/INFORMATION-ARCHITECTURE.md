# AI NEX OS — Phase 4A: Information Architecture Specification
## Current Baseline & Proposed Target Architecture

> **Document Status:** CANONICAL INFORMATION ARCHITECTURE SPECIFICATION  
> **Target Repository:** `AIC NEXOS/ai-nexos`  
> **Document Location:** `docs/phase-4/4A/INFORMATION-ARCHITECTURE.md`  
> **Phase:** Phase 4A Baseline & Target Model  
> **Product:** AI NEX OS — The Operating System for Creative Execution  
> **Evaluation Date:** October 3, 2026  
> **Implementation Status:** DESIGN SPECIFICATION ONLY (NO CODE EDITS AUTHORIZED)  

---

## 1. Executive Summary

This document formalizes the Information Architecture (IA) of **AI NEX OS**. It documents the empirical **Current State IA** (as implemented across `src/config/navigation.ts`, `src/components/layout/app-sidebar.tsx`, and all 38 Next.js 16 App Router routes), identifies systemic structural flaws that generate user friction, and defines the authoritative **Target State IA** designed to guide Phases 4B through 4I.

---

## 2. Empirical Current State IA

### 2.1 Complete Current IA Tree & Permission Matrix

```text
AI NEX OS (Root Domain: app.<domain> / Localhost:3000)
│
├── [Global / Shell Context]
│   ├── Organization Switcher (Top Sidebar) ── Select Active Tenant (Cookie: nexos_active_org_id)
│   ├── Header Omnibox (GlobalSearch) ──────── Parallel Read (Projects, Clients, People, Files, Tasks, Deliverables)
│   ├── Theme Controller ───────────────────── Dark / Light (next-themes)
│   ├── Notification Center ────────────────── Bell Menu (unread alerts, mark-as-read)
│   └── User Profile Menu ──────────────────── Profile Deep-Link, Session Sign-Out Form
│
├── SECTION 1: WORKSPACE
│   ├── Dashboard                Route: /dashboard                  Permission: (none / authenticated)
│   │   └── View: 4 KPI Cards (Projects, Clients, Tasks, Approvals)
│   ├── Projects                 Route: /projects                   Permission: [projects, read]
│   │   ├── Project Detail       Route: /projects/[projectId]       Permission: [projects, read]
│   │   └── Project Timeline     Route: /projects/[projectId]/timeline Permission: [projects, read]
│   ├── Clients                  Route: /clients                    Permission: [clients, read]
│   │   └── Client Detail        Route: /clients/[clientId]         Permission: [clients, read]
│   ├── Tasks                    Route: /tasks                      Permission: [tasks, read]
│   │   └── View: Hardcoded Demo Milestone (Wireframes · Website Redesign)
│   ├── Timeline                 Route: /timeline                   Permission: [timeline, read]
│   │   └── View: Read-only feed of all project milestones
│   └── Calendar                 Route: /calendar                   Permission: (composed read lens)
│       └── View: Read-only monthly view of tasks, milestones, meetings
│
├── SECTION 2: PRODUCTION
│   ├── Deliverables             Route: /deliverables               Permission: [deliverables, read]
│   │   └── View: Flat list & drawer with review/approval controls
│   ├── Files                    Route: /files                      Permission: [files, read]
│   │   ├── View A: Flat organization-wide files list
│   │   └── View B: Project folder browser (?projectId=...)
│   └── Meetings                 Route: /meetings                   Permission: [meetings, read]
│       └── View: Meeting list & scheduling dialog
│
├── SECTION 3: WORKFORCE
│   ├── My Attendance            Route: /workforce/attendance       Permission: [attendance, clock]
│   │   └── View: TodayCard, live session timer, shift punch controls
│   ├── History                  Route: /workforce/history          Permission: [attendance, read]
│   │   └── View: Personal monthly table/calendar attendance logs
│   ├── Corrections              Route: /workforce/corrections      Permission: [corrections, create]
│   │   └── View: Punch correction request dialog & status list
│   ├── Review Queue             Route: /workforce/corrections/review Permission: [corrections, review]
│   │   └── View: Manager queue to approve/reject staff corrections
│   ├── Team Attendance          Route: /workforce/team             Permission: [attendance, view_team]
│   │   └── View: Daily whole-organization staff presence roster
│   ├── Employees                Route: /workforce/employees        Permission: [users, read]
│   │   └── Employee Profile     Route: /workforce/employees/[userId] Permission: [users, read]
│   └── Reports [Soon]           Route: /workforce/reports          Permission: [reports, read] (Disabled)
│
├── SECTION 4: INTELLIGENCE
│   ├── AI Workspace [Soon]      Route: /ai                         Permission: [ai, read] (Disabled)
│   └── Analytics [Soon]         Route: /analytics                  Permission: [analytics, read] (Disabled)
│
├── SECTION 5: ORGANIZATION
│   └── Settings                 Route: /settings (Redirects to /settings/organization)
│       ├── Organization         Route: /settings/organization      Permission: [settings, read]
│       ├── Members              Route: /settings/members           Permission: [users, read]
│       ├── Roles & Permissions  Route: /settings/roles             Permission: [roles, read]
│       └── Profile              Route: /settings/profile           Permission: (authenticated self)
│
├── EXTERNAL PORTAL (Subdomain: portal.<domain> / Route: /portal)
│   ├── Portal Landing           Route: /portal                     Public info splash
│   ├── Share Token Link         Route: /portal/s/[token]           Public entry (Currently inactive stub)
│   ├── Portal Overview          Route: /portal/dashboard           Permission: Valid Portal Session
│   ├── Portal Projects          Route: /portal/projects            Permission: Valid Portal Session
│   ├── Portal Deliverables      Route: /portal/deliverables        Permission: Valid Portal Session
│   ├── Portal Revisions         Route: /portal/revisions           Permission: Valid Portal Session
│   ├── Portal Approvals         Route: /portal/approvals           Permission: Valid Portal Session
│   └── Portal Meetings          Route: /portal/meetings            Permission: Valid Portal Session
│
└── SYSTEM BOUNDARY
    ├── Login                    Route: /login                      Public auth
    ├── Onboarding               Route: /onboarding                 Authenticated identity onboarding
    ├── Invite Accept            Route: /invite/[token]             Public/auth invitation acceptance
    ├── Unprovisioned            Route: /unprovisioned              No active membership landing
    └── Unauthorized (403)       Route: /unauthorized               Permission denied fallback
```

---

## 3. Structural Deficiencies of Current IA

### 3.1 Cognitive & Hierarchical Flaws
1. **Misplaced Command Center (The "Dashboard in Workspace" Problem):**
   - In `src/config/navigation.ts`, Dashboard is nested under "Workspace" as item 1.
   - User feedback confirms this feels unprofessional: the dashboard is an overarching executive hub, not a workspace tool like "Tasks" or "Clients".
2. **Artificial Cleavage Between Projects and Assets:**
   - Creative agencies operate around projects. Every file, deliverable, and meeting is produced for a project.
   - Current IA splits Projects into "Workspace" while pushing Files and Deliverables into "Production." Users struggle to understand where to look.
3. **Severe Workforce Navigation Sprawl:**
   - Workforce occupies 7 sidebar items. Attendance alone is fractured across 5 separate routes (`/attendance`, `/history`, `/corrections`, `/corrections/review`, `/team`).
   - For creative directors and editors, this dominates the sidebar with administrative time-clock tooling.
4. **Disjointed Team Management (Employees vs. Members):**
   - Viewing staff is under `Workforce → Employees` (`/workforce/employees`).
   - Editing roles and statuses is under `Settings → Members` (`/settings/members`).
   - Inviting staff is missing entirely from both surfaces and only accessible during new agency onboarding (`/onboarding`).
5. **Task Context Disconnect:**
   - The top-level `/tasks` view cannot show cross-project tasks because the database model binds tasks to milestones.
   - It defaults to a hardcoded demo milestone UUID (`00000000-0000-4000-8000-000000000322`).
6. **Dead-End "Coming Soon" Noise:**
   - Three sidebar items (Reports, AI Workspace, Analytics) render disabled badges, taking up vertical screen real estate without providing functionality.

---

## 4. Proposed Target Information Architecture

The **Target IA** is engineered around three core operational pillars:
1. **Command & Executive Overview** (System-level navigation)
2. **Creative Production Engine** (Project-centric execution: CRM, Projects, Tasks, Assets, Approvals)
3. **Agency Operations & Workforce** (Consolidated staff directory, time tracking, and administration)

### 4.1 Target IA Tree Representation

```text
AI NEX OS (Operating System for Creative Execution)
│
├── [Global System Header & Command Layer]
│   ├── Organization / Workspace Switcher (Sovereign Tenant Context)
│   ├── Global Command Palette (Cmd + K Omnibox across all entities)
│   ├── Quick Create Action Menu (+ Project, + Client, + Task, + Asset)
│   ├── Live Clock / Session Pill (Active Punch Status & Mini-Timer)
│   ├── Notification Center (Categorized In-App Activity & Approvals)
│   └── Profile & Settings Dropdown (Direct Access to Settings & Sign-out)
│
├── [Pillar 1: Command Hub]
│   └── Dashboard                Route: /dashboard                  Global Operational Command Center
│       ├── Executive KPI Cards (Clickable: Projects, Clients, Tasks, Approvals)
│       ├── Active Projects Stream & Health Status
│       ├── My Assigned Tasks (Kanban / List quick toggle)
│       ├── Client Approvals Requiring Action (Urgent sign-offs)
│       └── Recent Activity Feed (Team deliverable & file uploads)
│
├── [Pillar 2: Creative Execution (Production)]
│   ├── Projects                 Route: /projects                   Agency Projects Hub
│   │   ├── Project List & Grid (Filters: Status, Health, Client, PM)
│   │   └── Project Workspace    Route: /projects/[projectId]       Unified Project Context
│   │       ├── Overview (Summary, Team, Health, Burn)
│   │       ├── Tasks (Project Kanban & List)
│   │       ├── Timelines (Visual Milestone Gantt & Phases)
│   │       ├── Assets & Files (Project Folder DAM & Previews)
│   │       └── Deliverables (Client Review Versions & Sign-Offs)
│   │
│   ├── Clients                  Route: /clients                    Client CRM & Brand Hub
│   │   ├── Client Directory (Companies, Status, Health)
│   │   └── Client Profile       Route: /clients/[clientId]         Client Account Center
│   │       ├── Brand Overview & Assets
│   │       ├── Associated Projects & Budget
│   │       ├── Client Contacts & Reviewer Roles
│   │       └── Portal Access Links & Share Security
│   │
│   ├── My Tasks                 Route: /tasks                      Personal & Project Task Center
│   │   ├── My Work (Tasks assigned to current user across all projects)
│   │   ├── Team Backlog (Unassigned project tasks)
│   │   └── Board & List Views with Multi-Criteria Filtering
│   │
│   ├── Schedule & Timelines     Route: /schedule                   Cross-Project Timeline & Calendar
│   │   ├── Gantt Timeline Lens (All project milestones)
│   │   └── Calendar Lens (Unified view of deadlines, milestones, meetings)
│   │
│   └── Assets & Deliverables    Route: /assets                     Cross-Project Asset & Review Hub
│       ├── Deliverables Tab (Client sign-offs, version comparisons, reviews)
│       └── Files DAM Tab (Cross-project digital asset library, folder browser)
│
├── [Pillar 3: Agency Workforce & Operations]
│   ├── Workforce                Route: /workforce                  Unified Workforce Center
│   │   ├── Team Directory Tab (All employees, departments, designations)
│   │   ├── Attendance & Time Tab (Today punch clock, personal history, team roster)
│   │   └── Corrections & Review Tab (Punch requests & manager approval queue)
│   │
│   └── Meetings                 Route: /meetings                   Agency Decision & Review Calls
│       ├── Scheduled Meetings (Internal & Client-Facing)
│       └── Meeting Room Context (Notes, agendas, linked deliverables)
│
├── [Pillar 4: Governance & Settings]
│   └── Settings                 Route: /settings                   Agency Administration Hub
│       ├── Organization Tab (Branding, Logo, Domain, Code Prefix, Timezone)
│       ├── Team & Invitations Tab (Role assignments, direct invite link generator)
│       ├── Custom Roles & RBAC Tab (Permission matrix, module capabilities)
│       └── Personal Profile Tab (Profile details, notifications, credentials)
│
└── [External Boundary: Client Collaboration Portal]
    └── Portal                   Route: portal.<domain> / /portal/s/[token]
        ├── Zero-Login Cryptographic Authentication Hub
        ├── Client Deliverable Review & High-Res Annotation Canvas
        ├── Version Diff & Comparison Viewer
        ├── Legal Sign-Off & Cryptographic Seal Verification
        └── Client Project Schedule & Decision History
```

---

## 5. Architectural Transformation Rationale

| Area | Current State Issue | Target State Resolution | Phase |
| :--- | :--- | :--- | :--- |
| **Dashboard** | Nested inside Workspace; renders empty 4-card stub. | Elevated to root command center; integrates active project cards, assigned tasks, approval queues, and attendance widget. | Phase 4B / 4H |
| **Projects & Assets** | Split into Workspace (Projects) vs. Production (Files/Deliverables). | Project Workspace unified with contextual tabs (Overview, Tasks, Timeline, Assets, Deliverables). Global `/assets` acts as cross-project DAM. | Phase 4E / 4F |
| **Tasks** | Hardcoded to demo milestone UUID `00000000-0000-4000-8000-000000000322`. | Decoupled from mandatory milestone hierarchy; `/tasks` displays real user-assigned tasks across all projects with filters. | Phase 4E |
| **Workforce** | 7 fragmented menu items crowding the sidebar. | Consolidated into 1 primary `Workforce` hub with tabbed sub-views (Directory, Attendance, Corrections). | Phase 4C |
| **Invitations & Team**| No invite generator in Settings; only accessible during onboarding. | Direct `+ Invite Member` modal and copyable share link generator integrated directly into `Settings → Team & Invitations`. | Phase 4C |
| **Search** | Hidden on mobile; no command palette. | Global `Cmd+K` Command Palette accessible on all viewport sizes with cross-entity search and quick actions. | Phase 4B |
| **Calendar** | Separate top-level navigation item. | Unified into `/schedule` alongside Gantt Timeline as a switchable lens (Gantt vs Calendar). | Phase 4B / 4E |
| **Disabled Items** | AI Workspace, Analytics, Reports show "Soon" badges in sidebar. | Removed from primary sidebar until functional. Ambient AI capabilities surfaced within task/project workflows. | Phase 4B / 4H |

---

## 6. Route Scoping & Authorization Classification

| Area / Route | Scope | Primary Entities | Required Permission |
| :--- | :--- | :--- | :--- |
| `/dashboard` | Workspace-Scoped | Aggregates (Projects, Tasks, Approvals) | Authenticated Member |
| `/projects` | Workspace-Scoped | `projects`, `clients`, `users` | `projects.read` |
| `/projects/[id]` | Project-Scoped | `projects`, `tasks`, `timelines`, `files` | `projects.read` |
| `/clients` | Workspace-Scoped | `clients`, `client_contacts` | `clients.read` |
| `/clients/[id]` | Client-Scoped | `clients`, `projects`, `shares` | `clients.read` |
| `/tasks` | User & Project | `tasks`, `projects`, `users` | `tasks.read` |
| `/schedule` | Workspace-Scoped | `timelines`, `milestones`, `meetings` | `timeline.read` |
| `/assets` | Workspace-Scoped | `files`, `deliverables`, `revisions` | `files.read` \| `deliverables.read` |
| `/workforce` | Organization-Scoped | `attendance_records`, `users`, `departments` | `attendance.clock` \| `users.read` |
| `/meetings` | Workspace-Scoped | `meetings`, `meeting_attendees` | `meetings.read` |
| `/settings` | Organization-Scoped | `organizations`, `roles`, `memberships` | `settings.read` \| `roles.read` |
| `/portal/s/[token]` | Client-Facing | `shares`, `deliverables`, `approvals` | Cryptographic Token Proof |
