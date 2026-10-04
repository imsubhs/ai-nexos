# AI NEX OS — Phase 4A: Product Implementation Roadmap
**Product:** AI NEX OS — The Operating System for Creative Execution  
**Current Phase:** 4A — Product Foundation & UX Audit (COMPLETE)  
**Execution Sequence:** 4B → 4C → 4D → 4E → 4F → 4G → 4H → 4I  
**Implementation Status:** NOT AUTHORIZED YET (Audit Baseline Delivery Gate)  

---

## 1. Roadmap Architecture & Execution Philosophy

Following the completion of the Phase 4A Product Foundation & UX Audit, the transformation of AI NEX OS into the definitive "Operating System for Creative Execution" proceeds through a strictly sequenced, eight-phase implementation track.

### Guiding Principles:
1. **No Speculative Architecture:** Every phase builds incrementally upon the verified Next.js 16.3.8 / React 19.2.4 / PostgreSQL 17.6 foundation.
2. **Defensive Foundation First:** Core navigation, authorization error handling, and multi-tenant scoping (Phase 4B & 4C) must be secured before complex execution features are introduced.
3. **Project-Centric Execution:** The Project remains the primary organizing unit of creative agency work; CRM, DAM, and Approvals anchor directly into project workflows.
4. **Assistive AI Layer:** AI capabilities are introduced contextually as assistive accelerators in Phase 4H, never as a confusing standalone distraction.
5. **Quality & Polish Gate:** Full accessibility, mobile responsiveness, and defensive resilience culminate in Phase 4I prior to final enterprise release.

---

## 2. Phase-by-Phase Implementation Specifications

---

### Phase 4B — Core Workspace + Global Navigation
- **Objective:** Modernize the application shell, establish defensive authorization boundaries, and deliver rapid wayfinding.
- **UX Scope:**
  - Redesign top header with functional Command Palette (`⌘K` multi-entity search).
  - Consolidate sidebar navigation: reduce Workforce footprint from 7 items to 2 entries (`My Time` and `Team & People`).
  - Introduce dynamic Breadcrumbs in sub-header across deep routes (`/projects/[id]`, `/clients/[id]`).
  - Implement defensive error handling in `/files`, `/deliverables`, and `/meetings` to eliminate 500 crashes for users lacking `projects.read`.
  - Refine active organization switcher and user profile menu.
- **Dependencies:** Phase 4A Audit (`UXG-02`, `UXG-04`, `UXG-06`, `UXG-18`).
- **Affected Modules:**
  - `src/components/dashboard/header.tsx`
  - `src/components/dashboard/sidebar.tsx`
  - `src/components/dashboard/search.tsx`
  - `src/config/navigation.ts`
  - `src/app/(dashboard)/layout.tsx`
  - `src/app/(dashboard)/files/page.tsx`
  - `src/app/(dashboard)/deliverables/page.tsx`
  - `src/app/(dashboard)/meetings/page.tsx`
- **Expected Artifacts:**
  - `docs/phase-4/4B/CORE-WORKSPACE-SPEC.md`
  - `src/components/dashboard/command-palette.tsx`
  - Defensive server action wrappers (`getProjectSummariesForUser`)
- **Acceptance Criteria:**
  - Zero unhandled 500 crashes when accessing `/files`, `/deliverables`, or `/meetings` without `projects.read`.
  - Pressing `⌘K` opens Command Palette with instant search results for Projects, Clients, and Deliverables.
  - Sidebar contains maximum 10 top-level items; Workforce cleanly grouped.
  - Breadcrumbs accurately reflect hierarchy and allow single-click navigation to parent entities.

---

### Phase 4C — Organization / Membership / Workforce UX
- **Objective:** Streamline multi-tenant membership administration, onboarding invitations, and consolidated workforce management.
- **UX Scope:**
  - Add in-context `+ Invite Member` action and modal directly within `/settings/members`.
  - Support both direct email invitations and copyable cryptographic invite links.
  - Provide "Invited / Pending" tab in members table with revocation controls.
  - Deliver consolidated `My Time` (`/attendance`) personal hub with tabbed views: Punch Clock, Time History, and Correction Requests.
  - Deliver managerial `Team & People` (`/workforce`) hub with Employee Directory, Team Attendance Board, Review Queue, and Payroll Reports (role-permissioned).
- **Dependencies:** Phase 4B shell, `UXG-03`, `UXG-06`.
- **Affected Modules:**
  - `src/app/(dashboard)/settings/members/`
  - `src/app/(dashboard)/attendance/`
  - `src/app/(dashboard)/workforce/`
  - `src/features/organizations/`
  - `src/lib/actions/invitations.ts`
- **Expected Artifacts:**
  - `docs/phase-4/4C/ORGANIZATION-WORKFORCE-SPEC.md`
  - `InviteMemberDialog.tsx`
  - Consolidated tabbed attendance views
- **Acceptance Criteria:**
  - Organization Admins can invite new team members directly from `/settings/members`.
  - Individual contributors have a distraction-free `My Time` punch clock without seeing administrative reports.
  - Managers can review and approve attendance corrections from a single dedicated queue.

---

### Phase 4D — Client CRM + Collaboration
- **Objective:** Transform the client list into an interconnected client relationship management hub.
- **UX Scope:**
  - Re-architect `/clients/[id]` into a multi-tabbed client profile:
    - `Overview`: Primary company contacts, contract tier, health status, billing details.
    - `Projects`: Active, completed, and archived projects commissioned by this client.
    - `Deliverables & Approvals`: Live status of all creative work awaiting client sign-off.
    - `Portal Access`: Direct client review portal link management and access logs.
  - Enhance `/clients` list with tier filtering, active project count badges, and last contact timestamps.
  - Add quick client contact creation modal.
- **Dependencies:** Phase 4B navigation, `UXG-07`.
- **Affected Modules:**
  - `src/app/(dashboard)/clients/`
  - `src/components/dashboard/clients/`
  - Client query actions (`getClientWithRelations`)
- **Expected Artifacts:**
  - `docs/phase-4/4D/CLIENT-CRM-SPEC.md`
  - Client profile tab components (`ClientOverviewTab`, `ClientProjectsTab`, `ClientApprovalsTab`)
- **Acceptance Criteria:**
  - Navigating to any client profile immediately displays their commissioned projects and pending deliverable approvals.
  - Users can generate and copy client portal review links directly from the client profile.

---

### Phase 4E — Project Execution + Kanban + Gantt
- **Objective:** Establish the Project as the central command hub of creative execution, decoupling tasks from rigid milestone UUIDs and adding interactive visual execution tools.
- **UX Scope:**
  - Transform `/projects/[id]` into a comprehensive Project Workspace with nested tabs:
    - `Overview`: High-level progress, budget health, creative brief, assigned team.
    - `Tasks / Kanban`: Drag-and-drop task execution board with status lanes (`Backlog`, `In Progress`, `Review`, `Done`).
    - `Timeline / Gantt`: Visual schedule showing phases, milestones, and dependencies.
    - `Deliverables`: Review and sign-off status for creative packages.
    - `Files`: Dedicated project asset repository.
    - `Discussions & Meetings`: Creative critique notes and meeting agendas.
  - Decouple tasks from mandatory phase/milestone hierarchy: allow fast project-level task creation.
  - Modernize global `/tasks` with multi-project filtering and personal "My Tasks" queue.
  - Deliver interactive Gantt schedule with drag-to-reschedule and milestone detail drawer.
- **Dependencies:** Phase 4B, 4C, 4D; `UXG-01`, `UXG-10`, `UXG-11`.
- **Affected Modules:**
  - `src/app/(dashboard)/projects/`
  - `src/app/(dashboard)/tasks/`
  - `src/app/(dashboard)/timeline/`
  - `src/lib/types/timeline.ts`
  - Project and task server actions
- **Expected Artifacts:**
  - `docs/phase-4/4E/PROJECT-EXECUTION-SPEC.md`
  - `ProjectWorkspaceTabs.tsx`
  - `KanbanBoard.tsx`
  - `InteractiveTimeline.tsx`
- **Acceptance Criteria:**
  - Hardcoded milestone UUID (`00000000-0000-4000-8000-000000000322`) completely removed.
  - Operators can create and reassign tasks directly inside individual project workspaces.
  - Dragging a task card across Kanban columns updates status with optimistic UI and server persistence.
  - Timeline milestones can be inspected and rescheduled interactively.

---

### Phase 4F — Creative Assets + Deliverable Management / DAM
- **Objective:** Establish clear operational boundaries and linking between raw working files and client-facing review deliverables.
- **UX Scope:**
  - Redesign `/files` as a modern Digital Asset Management (DAM) repository: drag-and-drop multi-file upload zone, folder organization, search, file type filtering, and lightbox asset preview.
  - Redesign `/deliverables` as a structured creative review pipeline: clear versioning (`V1`, `V2`, `Final`), review status badges (`Draft`, `In Review`, `Approved`, `Changes Requested`), and file attachment linking.
  - Enable attaching stored files directly to a deliverable version.
  - Full-screen asset viewer primitive for video playback, high-res images, and multi-page PDFs.
- **Dependencies:** Phase 4B, Phase 4E; `UXG-08`.
- **Affected Modules:**
  - `src/app/(dashboard)/files/`
  - `src/app/(dashboard)/deliverables/`
  - Supabase Storage upload helpers
  - Asset preview primitives
- **Expected Artifacts:**
  - `docs/phase-4/4F/DAM-DELIVERABLES-SPEC.md`
  - `FileDropzone.tsx`
  - `AssetViewer.tsx`
  - `DeliverableVersionManager.tsx`
- **Acceptance Criteria:**
  - Users can upload multiple files via drag-and-drop with progress bars.
  - Deliverables explicitly list and link to attached asset files.
  - Clicking an asset opens the full-screen lightbox preview with zoom and playback controls.

---

### Phase 4G — Client Portal + Approval Chains
- **Objective:** Launch the zero-login, secure external client review portal and structured approval workflow.
- **UX Scope:**
  - Activate `/portal/s/[token]` with HMAC cryptographic token verification.
  - Build clean, white-labeled client review interface displaying project identity, deliverable description, version history, and interactive media preview.
  - Provide one-click client approval actions: "Approve Deliverable" and "Request Changes" with mandatory revision notes.
  - Internal audit logging: capture client reviewer identity, IP/timestamp, and review comments.
  - Automatic status reflection inside internal agency project workspace.
- **Dependencies:** Phase 4F (Deliverables & DAM), `UXG-09`.
- **Affected Modules:**
  - `src/app/portal/`
  - `src/lib/actions/portal.ts`
  - Token generation and verification utilities
- **Expected Artifacts:**
  - `docs/phase-4/4G/CLIENT-PORTAL-SPEC.md`
  - Client review portal layout and action components
  - Approval chain state machine
- **Acceptance Criteria:**
  - External clients can access and review deliverables via secure links without creating internal user accounts.
  - Client approval instantly updates deliverable status to `Approved` in the agency workspace.
  - Change requests log structured feedback and trigger internal notifications.

---

### Phase 4H — Executive Dashboard + Operational Intelligence
- **Objective:** Transform the main dashboard into an actionable operational command center and surface assistive AI capabilities.
- **UX Scope:**
  - Re-architect `/dashboard`:
    - Turn KPI cards into interactive filter links (`Total Projects`, `Active Clients`, `Open Tasks`, `Pending Approvals`).
    - Implement "Action Required" queue: deliverables awaiting internal sign-off, overdue milestones, client revision submissions.
    - Add Recent Projects grid with live health indicators (`On Track`, `At Risk`, `Delayed`).
    - Add personal operator workfeed ("My Day").
  - Contextual AI Assistive Layer:
    - AI Creative Brief Assistant inside Project creation.
    - AI Task Effort Estimator inside Task forms.
    - Executive Project Health Summary.
  - Connect notification bell popover to live database event stream.
- **Dependencies:** Phases 4B through 4G; `UXG-05`, `UXG-12`, `UXG-13`.
- **Affected Modules:**
  - `src/app/(internal)/dashboard/`
  - `src/components/dashboard/`
  - `src/lib/ai/`
  - Executive summary queries
- **Expected Artifacts:**
  - `docs/phase-4/4H/DASHBOARD-INTELLIGENCE-SPEC.md`
  - `ExecutiveSummaryWidgets.tsx`
  - `ActionRequiredFeed.tsx`
  - Contextual AI helper hooks
- **Acceptance Criteria:**
  - Dashboard replaces the 80% blank canvas with rich, real-time operational feeds.
  - All KPI cards navigate to filtered entity lists on click.
  - AI features act strictly as assistive accelerators without blocking standard workflows.

---

### Phase 4I — Accessibility + UX Hardening + Polish
- **Objective:** Rigorous WCAG 2.1 AA accessibility audit, responsive mobile/tablet optimization, data integrity guards, and final production certification.
- **UX Scope:**
  - Enforce keyboard focus trapping and ARIA labeling across all Base UI dialogs, drawers, and popovers.
  - Implement responsive card fallbacks for all data tables on viewports < 768px.
  - Add dirty-state confirmation guards on modal dialogs to prevent accidental loss of unsaved form data.
  - Implement active session watchdog to prevent silent token expiration during work sessions.
  - Final visual polish: micro-animations, loading skeletons, and unified empty state graphics.
- **Dependencies:** All preceding phases (4B–4H); `UXG-14`, `UXG-15`, `UXG-16`, `UXG-17`, `UXG-19`, `UXG-20`.
- **Affected Modules:**
  - Global UI primitives (`src/components/ui/`)
  - Shared composites (`src/components/shared/`)
  - Error boundaries and layout wrappers
- **Expected Artifacts:**
  - `docs/phase-4/4I/ACCESSIBILITY-POLISH-REPORT.md`
  - Automated Playwright a11y test suites
  - Final Phase 4 Production Gate Certification
- **Acceptance Criteria:**
  - 100% WCAG 2.1 AA automated compliance check.
  - Flawless usability on mobile viewports (375px–768px) with zero horizontal table clipping.
  - Zero data loss on modal dismissal.

---

## 3. Phase Sequencing & Gate Matrix

```
[Phase 4A: Audit & Foundation] (COMPLETE)
       │
       ▼
[Phase 4B: Workspace Shell & Nav] ────────► [Phase 4C: Org & Workforce UX]
       │                                           │
       ▼                                           ▼
[Phase 4D: Client CRM] ───────────────────► [Phase 4E: Project Execution]
       │                                           │
       ▼                                           ▼
[Phase 4F: DAM & Deliverables] ───────────► [Phase 4G: Client Portal]
       │                                           │
       └───────────────────┬───────────────────────┘
                           ▼
              [Phase 4H: Dashboard & AI]
                           │
                           ▼
              [Phase 4I: a11y & Polish]
```

---

## 4. Execution Guardrail & Next Gate

Phase 4A is complete. **Zero implementation is authorized at this time.**

### Conditions to Begin Phase 4B:
1. Formal human review and acceptance of the Phase 4A Audit deliverables.
2. Sign-off on the Phase 4B Core Workspace & Navigation specification.
3. Explicit authorization to begin Phase 4B implementation.
