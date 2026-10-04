# AI NEX OS — Phase 4A: UX Gaps Backlog
**Product:** AI NEX OS — The Operating System for Creative Execution  
**Phase:** 4A — Product Foundation & UX Audit  
**Status:** COMPLETE / CANONICAL AUDIT BASELINE  
**Classification Standard:** P0 (Critical/Blocking/Security-Tenant Risk), P1 (High/Usability/Structural), P2 (Medium/Refinement/Consistency)  

---

## 1. Executive Summary & Triage Overview

This backlog captures and prioritizes all empirical user experience, architectural, and information architecture deficiencies identified during the Phase 4A audit across the 38 production routes of AI NEX OS. 

Every finding is substantiated with exact source code citations, production route references, and visual correlation from verified production screenshots (`pages (1).png` through `pages (15).png`).

### Severity Breakdown
| Severity | Definition | Count | Target Phase Allocation |
|---|---|:---:|---|
| **P0** | Blocks fundamental product usage, creates cross-tenant or permission crash vectors, or presents critical UX/authorization blind spots | 4 | Phase 4B (Workspace/Nav), Phase 4C (Workforce/Org), Phase 4E (Execution) |
| **P1** | Major usability breakdown, structural fragmentation, dead ends, or disconnected core workflows | 8 | Phase 4B, Phase 4C, Phase 4D, Phase 4E, Phase 4F, Phase 4G, Phase 4H |
| **P2** | Inconsistencies, missing visual feedback/states, accessibility gaps, or secondary polish items | 8 | Phase 4B, Phase 4D, Phase 4F, Phase 4H, Phase 4I |
| **Total** | | **20** | |

---

## 2. Detailed Gap Registry

---

### UXG-01: Hardcoded Milestone UUID & Inflexible Task Hierarchy Scope
- **Area:** Task Management & Project Execution
- **Severity:** `P0`
- **Current State:** 
  The global tasks page (`/tasks`) hardcodes a demo milestone UUID:
  `DEMO_TASK_SCOPE = { projectId: "00000000-0000-4000-8000-000000000300", milestoneId: "00000000-0000-4000-8000-000000000322" }`.
  It renders the fixed subtitle: `"Wireframes milestone · Website Redesign"` on live production (verified in `pages (6).png`). Creating or viewing tasks is locked to this single hardcoded milestone. Tasks cannot be viewed across all projects, nor can users switch project context from the `/tasks` route. Furthermore, the task domain model enforces a 5-level rigid hierarchy (`Organization → Project → Timeline → Phase → Milestone → Task`), preventing fast, direct task creation at the project level.
- **Evidence:**
  - Code: `src/app/(dashboard)/tasks/page.tsx:12-24`
  - Domain Model: `src/lib/types/timeline.ts:24-85`
  - Screenshot: `pages (6).png`
- **User Impact:**
  Real tenants cannot manage operational tasks across multiple active client projects. The task management module appears broken or mocked with hardcoded dummy project titles.
- **Architectural / Product Impact:**
  Blocks core project execution. Prevents workforce members from maintaining a personal "My Tasks" queue across assignments.
- **Proposed Direction:**
  1. Decouple tasks from mandatory phase/milestone hierarchy: allow project-level tasks with optional milestone assignment.
  2. Implement global task view with multi-faceted filtering (By Project, By Assignee, By Priority, By Status).
  3. Introduce a personal "My Tasks" view for logged-in operators.
- **Dependency:** Project context provider, Task domain query updates (`getTasksByOrganization`).
- **Target Phase:** `Phase 4E` (with workspace context hook from `Phase 4B`).

---

### UXG-02: Permission Cascade 500 Unhandled Server Crashes in Files, Deliverables, and Meetings
- **Area:** Authorization / System States / Global Resilience
- **Severity:** `P0`
- **Current State:**
  In `/files`, `/deliverables`, and `/meetings`, the Server Components fetch the project list to populate dropdown selectors by calling `await getProjects(undefined, 100, 0)`.
  If a user has granular read permissions for deliverables or files (e.g. `deliverables.read`, `files.read`, or client review roles) but lacks `projects.read`, `getProjects` throws a `PermissionDeniedError`. Because this call is not wrapped in defensive error handling or role-scoped projection, Next.js throws an unhandled server exception, rendering a 500 crash page.
- **Evidence:**
  - Code: `src/app/(dashboard)/files/page.tsx:69`
  - Code: `src/app/(dashboard)/deliverables/page.tsx:51`
  - Code: `src/app/(dashboard)/meetings/page.tsx:33`
  - Server Action: `src/lib/actions/projects.ts` (enforces `projects.read`)
- **User Impact:**
  Non-admin team members and specialized contributors (e.g., freelance video editors or client reviewers) encounter full application crashes when attempting to access production assets.
- **Architectural / Product Impact:**
  Violates least-privilege tenant security and breaks role-based access control (RBAC). Forces organizations to over-privilege users with global project read access just to prevent crash screens.
- **Proposed Direction:**
  1. Replace blanket `getProjects` queries with permission-tolerant minimal selectors (`getProjectSummariesForUser()`).
  2. Wrap secondary entity fetches in `try/catch` blocks that gracefully fall back to contextual IDs or disable project-reassignment dropdowns when project browsing is unauthorized.
  3. Standardize server component error boundaries with user-friendly permission-denied empty states instead of 500 unhandled exceptions.
- **Dependency:** Core Action Security Baseline (`src/lib/actions/`).
- **Target Phase:** `Phase 4B` & `Phase 4E`.

---

### UXG-03: Inverted Organization Invitation Flow (Settings Isolation)
- **Area:** Organization & Membership UX
- **Severity:** `P0`
- **Current State:**
  In `/settings/members` (the standard administrative surface for user management, verified in `pages (12).png`), an organization Owner or Admin can inspect members, change roles (`Owner`, `Admin`, `Member`), and deactivate users. However, there is **no "+ Invite Member" button**, modal, or invite link generator anywhere on the page.
  User invitations are structurally confined to `/onboarding`, which is unreachable once an organization is initialized.
- **Evidence:**
  - Code: `src/app/(dashboard)/settings/members/page.tsx:1-85`
  - Component: `src/components/dashboard/settings/members-table.tsx`
  - Screenshot: `pages (12).png`
- **User Impact:**
  Organization admins cannot invite new colleagues, contractors, or clients after completing initial setup. Onboarding additional staff requires manual database intervention or re-triggering onboarding routines.
- **Architectural / Product Impact:**
  Completely halts tenant viral growth and team expansion. High risk of tenant churn during first-week trial evaluations.
- **Proposed Direction:**
  1. Implement an `InviteMemberDialog` directly within `/settings/members` utilizing the existing `createInvitation` server action.
  2. Provide email dispatch + copyable cryptographic invite link fallback.
  3. Include an "Invited / Pending" tab in the members table with revocation capabilities.
- **Dependency:** `src/lib/actions/invitations.ts`.
- **Target Phase:** `Phase 4C`.

---

### UXG-04: Non-Functional Global Search Mock / Architectural Stub
- **Area:** Global Navigation & Productivity
- **Severity:** `P0`
- **Current State:**
  The top application header features a prominent search input: `"Search projects, clients, people, tasks, files..."` with a keyboard badge `⌘K` (verified in `pages (1).png`).
  Inspecting the component reveals that typing into the input updates local component state, but triggers no server action, database query, modal dialog, or navigation. Pressing `⌘K` registers no global keyboard listener.
- **Evidence:**
  - Code: `src/components/dashboard/search.tsx:1-42`
  - Screenshot: `pages (1).png`, `pages (2).png`
- **User Impact:**
  Users attempting to navigate quickly across projects, clients, and assets encounter an unresponsive input that produces zero search results and zero feedback, creating an impression of broken software.
- **Architectural / Product Impact:**
  Global search is the primary navigation spine of enterprise SaaS. Without multi-entity search, users are forced into slow, multi-click table browsing.
- **Proposed Direction:**
  1. Build a Command Palette (`cmdk` or Base UI Dialog) accessible globally via `⌘K` and header click.
  2. Implement an indexed multi-entity search action querying: Projects, Clients, Deliverables, Tasks, and Members with strict organization scoping (`tenant_id`).
  3. Categorize results with entity badges and instant keyboard routing (`Enter` to navigate).
- **Dependency:** Multi-table search query / Postgres trigram index.
- **Target Phase:** `Phase 4B`.

---

### UXG-05: Empty Dashboard Canvas / Lack of Operational Command Center
- **Area:** Executive & Operational Dashboard
- **Severity:** `P1`
- **Current State:**
  The main dashboard (`/dashboard`, verified in `pages (1).png`) renders only a greeting header (`"Welcome back, Subham Saha"`) and 4 static KPI metric cards:
  - Total Projects (e.g. `2`)
  - Active Clients (e.g. `1`)
  - Open Tasks (e.g. `0`)
  - Pending Approvals (e.g. `0`)
  Below these 4 cards, the entire viewport (approx. 80% of screen height) is completely blank dark canvas. None of the cards are clickable links. There is no list of recent projects, upcoming deadlines, urgent client approvals, or workforce activity.
- **Evidence:**
  - Code: `src/app/(internal)/dashboard/page.tsx:1-120`
  - Screenshot: `pages (1).png`
- **User Impact:**
  The landing experience after login provides near-zero operational utility. Users must immediately leave the dashboard to find out what needs their attention today.
- **Architectural / Product Impact:**
  The dashboard fails its primary mission as the "Operating System for Creative Execution" command center.
- **Proposed Direction:**
  1. Transform KPI cards into interactive filter entry points (`/projects?status=active`, `/tasks?status=open`, etc.).
  2. Implement an Operational Action Center: "Items Requiring Your Attention" (Pending deliverable approvals, overdue tasks, active client reviews).
  3. Add a Recent Projects grid and Personal Daily Workfeed.
- **Dependency:** Aggregated dashboard query (`getDashboardExecutiveSummary`).
- **Target Phase:** `Phase 4H` (Foundations established in `Phase 4B`).

---

### UXG-06: Workforce Navigation Over-Representation in Primary Sidebar
- **Area:** Information Architecture & Navigation
- **Severity:** `P1`
- **Current State:**
  The sidebar navigation dedicates 7 out of 16 total slots to "Workforce":
  - My Attendance (`/attendance`)
  - History (`/attendance/history`)
  - Corrections (`/attendance/corrections`)
  - Review Queue (`/attendance/review`)
  - Team Attendance (`/attendance/team`)
  - Employees (`/workforce/employees`)
  - Reports (`/workforce/reports`)
  Workforce items consume over 40% of the entire sidebar height. Furthermore, personal punch clocks (`/attendance`) are co-located alongside executive payroll/attendance reports (`/workforce/reports`), confusing individual contributors with HR managers.
- **Evidence:**
  - Code: `src/components/dashboard/sidebar.tsx:48-96`
  - Screenshot: `pages (1).png`
  - User Direct Guidance: `AI NEX OS (ss)/ai.txt` ("combine attendance personal and team attendance and remove corrections and review queue from sidebar")
- **User Impact:**
  Overwhelming visual clutter. Agency creatives and project managers are distracted by detailed punch-clock administration menus that obscure core creative production tools.
- **Architectural / Product Impact:**
  Distorts product identity from a "Creative Execution OS" into a time-clock management utility.
- **Proposed Direction:**
  1. Consolidate workforce routes into two clear surfaces:
     - `My Time` (`/attendance`): Tabbed personal view (Clock In/Out, History, Request Correction).
     - `Team & People` (`/workforce`): Tabbed management view (Directory, Team Attendance, Review Queue, Reports) accessible only to Managers/Admins.
  2. Reduce sidebar footprint from 7 items to 2 clean entries.
- **Dependency:** Role-based navigation filtering.
- **Target Phase:** `Phase 4B` & `Phase 4C`.

---

### UXG-07: Disconnected Client Relationship Model (CRM vs. Production Silos)
- **Area:** Client Management & Collaboration
- **Severity:** `P1`
- **Current State:**
  The client list (`/clients`, verified in `pages (4).png`) and client details page (`/clients/[id]`, `pages (5).png`) store basic company metadata (name, email, phone, address, status, tier).
  However, client profiles are completely disconnected from:
  - Associated active projects (no clickable project relationships)
  - Deliverables awaiting client sign-off
  - Invoices and billing contracts
  - Primary external contact persons
  - Client portal sharing links
- **Evidence:**
  - Code: `src/app/(dashboard)/clients/page.tsx:1-92`
  - Code: `src/app/(dashboard)/clients/[id]/page.tsx:1-110`
  - Screenshots: `pages (4).png`, `pages (5).png`
- **User Impact:**
  Account managers cannot see what is currently in production for a client when viewing their profile. They must manually cross-reference the Projects and Deliverables tables.
- **Architectural / Product Impact:**
  Prevents client-centric collaboration and breaks the conceptual chain: `Client → Project → Deliverable → Approval`.
- **Proposed Direction:**
  1. Re-architect `/clients/[id]` with a tabbed profile:
     - `Overview`: Key client contacts, company health, active contract tier.
     - `Projects`: Live portfolio of projects commissioned by this client.
     - `Deliverables & Approvals`: Current review status of creative work.
     - `Portal Access`: Direct client portal link generation and activity audit log.
- **Dependency:** Relational client query (`getClientWithProjectsAndDeliverables`).
- **Target Phase:** `Phase 4D`.

---

### UXG-08: File Storage vs. Deliverable Conceptual Collision
- **Area:** Creative Assets & Deliverables (DAM)
- **Severity:** `P1`
- **Current State:**
  The navigation groups "Files" and "Deliverables" under an ambiguous "Production" header.
  - `/files` (`pages (8).png`) displays raw files (source assets, reference PDFs, design templates) with upload dates, sizes, and project tags.
  - `/deliverables` (`pages (7).png`) displays client-facing milestones (e.g. "Brand Identity Package", "Homepage Design V1") with review statuses (`Draft`, `In Review`, `Approved`, `Rejected`).
  However, deliverables do not link to their underlying stored asset files, and files cannot be promoted or attached to deliverables directly from the UI.
- **Evidence:**
  - Code: `src/app/(dashboard)/files/page.tsx:1-125`
  - Code: `src/app/(dashboard)/deliverables/page.tsx:1-118`
  - Screenshots: `pages (7).png`, `pages (8).png`
- **User Impact:**
  Users are confused about where to upload work. A designer uploading a final video cut does not know whether to put it in "Files" or "Deliverables".
- **Architectural / Product Impact:**
  Creates data fragmentation in Supabase Storage. Assets lack clear version lineage and client review metadata.
- **Proposed Direction:**
  1. Clearly establish the taxonomy:
     - **Files (Assets):** Raw project storage, working assets, resources, and attachments.
     - **Deliverables:** Formal, versioned output packages submitted for internal and client sign-off, containing one or more verified file attachments.
  2. Allow attaching stored files directly to a deliverable version.
  3. Move Files and Deliverables into a unified context or associate them as sub-tabs within individual Projects.
- **Dependency:** Deliverable-Asset junction schema (`deliverable_assets` or attachment metadata).
- **Target Phase:** `Phase 4F`.

---

### UXG-09: Inactive Client Approval Portal Stub
- **Area:** Client Portal & Approvals
- **Severity:** `P1`
- **Current State:**
  The public client portal route (`src/app/portal/s/[token]/page.tsx`) renders an unstyled, static placeholder:
  `"This link is not active. Please request a new review link from your agency contact."`
  External clients cannot review deliverables, leave feedback, or approve assets through zero-login shared links.
- **Evidence:**
  - Code: `src/app/portal/s/[token]/page.tsx:1-35`
- **User Impact:**
  Agency teams cannot use the platform to present finished work to clients. Approval workflows must happen outside the platform (via email, Slack, or Google Drive).
- **Architectural / Product Impact:**
  The entire client-facing value proposition of the "Agency Operating System" is blocked at the external boundary.
- **Proposed Direction:**
  1. Implement token validation via HMAC/cryptographic link matching (`verifyPortalToken`).
  2. Build a dedicated, zero-login, white-labeled client review interface.
  3. Provide full preview capabilities (Images, Videos, PDFs), revision history, and one-click "Approve" / "Request Changes" actions with feedback logging.
- **Dependency:** Token validation action (`src/lib/actions/portal.ts`), Asset preview primitives.
- **Target Phase:** `Phase 4G`.

---

### UXG-10: Lack of Scoped Project Workspace (Module Fragmentation)
- **Area:** Project Experience & Creative Execution
- **Severity:** `P1`
- **Current State:**
  When clicking into a project (`/projects/[id]`, verified in `pages (3).png`), the user is shown a simple summary card (Status, Client, Dates, Budget, Team).
  However, the user cannot view or manage that project's tasks, files, deliverables, timeline, or meetings from within `/projects/[id]`. To view tasks for this project, the user must navigate to the global `/tasks` page; to view files, they must navigate to `/files` and filter by project name.
- **Evidence:**
  - Code: `src/app/(dashboard)/projects/[id]/page.tsx:1-98`
  - Screenshot: `pages (3).png`
- **User Impact:**
  High cognitive load and constant context switching. Creatives cannot "enter" a project and find everything related to that engagement in one place.
- **Architectural / Product Impact:**
  The project is treated as an isolated database record rather than the central orchestrator of creative execution.
- **Proposed Direction:**
  1. Transform `/projects/[id]` into a comprehensive Project Workspace with contextual sub-tabs:
     - `Overview`: High-level metrics, team, creative brief, client contact.
     - `Tasks / Kanban`: Project-specific task execution board.
     - `Timeline / Gantt`: Phase schedule and milestone tracking.
     - `Deliverables`: Review and approval status for this project.
     - `Files`: Dedicated project asset repository.
     - `Discussions & Meetings`: Meeting notes and creative reviews.
- **Dependency:** Nested route architecture (`/projects/[id]/[tab]`) or client tab state.
- **Target Phase:** `Phase 4E`.

---

### UXG-11: Timeline / Gantt Read-Only Static Visualization
- **Area:** Timeline & Project Schedule
- **Severity:** `P1`
- **Current State:**
  The Timeline page (`/timeline`, verified in `pages (9).png`) renders horizontal milestone bars across calendar columns.
  However, the timeline is completely static and read-only:
  - Bars cannot be dragged or resized to update milestone dates.
  - Dependencies between milestones are not visually connected or editable.
  - Filtering by project or assignee is absent.
  - Clicking a bar does not open the milestone or its child tasks.
- **Evidence:**
  - Code: `src/app/(dashboard)/timeline/page.tsx:1-115`
  - Screenshot: `pages (9).png`
- **User Impact:**
  Producers and project managers cannot reschedule projects interactively. Schedule adjustments require tedious form edits in individual sub-menus.
- **Architectural / Product Impact:**
  Lacks enterprise Gantt capabilities required for complex creative productions (commercial shoots, multi-phase rebranding).
- **Proposed Direction:**
  1. Build interactive Gantt canvas with drag-to-reschedule, duration expansion, and dependency lines.
  2. Implement instant project filtering and milestone detail drawer on bar click.
- **Dependency:** Interactive timeline library or SVG canvas primitive.
- **Target Phase:** `Phase 4E`.

---

### UXG-12: Disconnected Notification Bell / Lack of Activity Center
- **Area:** Global Navigation & User Feedback
- **Severity:** `P1`
- **Current State:**
  The header renders a notification bell icon with an unread badge counter (`"3"`, verified in `pages (1).png`).
  Clicking the bell opens a minimal popover that lists mock notifications. However, notifications are not tied to real database events (e.g. deliverable approved, task assigned, mention), and clicking a notification item does not navigate to the corresponding entity.
- **Evidence:**
  - Code: `src/components/dashboard/header.tsx:42-88`
  - Screenshot: `pages (1).png`
- **User Impact:**
  Team members miss urgent project updates, client approvals, and task hand-offs. The notification bell creates false expectations.
- **Architectural / Product Impact:**
  Requires a centralized notification dispatch mechanism connected to business logic triggers.
- **Proposed Direction:**
  1. Wire the notification popover to a persistent `notifications` table.
  2. Support deep linking to relevant routes (`/projects/[id]`, `/deliverables/[id]`, `/attendance/review`).
  3. Include "Mark as Read" and preference settings.
- **Dependency:** Notification service and server actions.
- **Target Phase:** `Phase 4H` (Interaction foundation in `Phase 4B`).

---

### UXG-13: Uninformative "Soon" Badges in Intelligence Menu
- **Area:** Intelligence & AI Capabilities
- **Severity:** `P2`
- **Current State:**
  The sidebar includes an "Intelligence" section containing:
  - AI Workspace (`/intelligence/ai-workspace`) — badged with a prominent `"Soon"` pill (verified in `pages (1).png`).
  - Analytics (`/intelligence/analytics`) — badged with `"Soon"`.
  Clicking these links navigates to generic placeholder screens that explain neither what capabilities are coming nor when they will be enabled.
- **Evidence:**
  - Code: `src/components/dashboard/sidebar.tsx:98-115`
  - Screenshot: `pages (1).png`
- **User Impact:**
  Gives the impression of an unfinished prototype rather than an enterprise operating system.
- **Architectural / Product Impact:**
  Violates clean progressive disclosure. AI capabilities should be seamlessly integrated into user workflows (e.g. AI Creative Brief Assistant inside Projects, AI Task Estimator) rather than presented as empty standalone menu stubs.
- **Proposed Direction:**
  1. Hide or de-emphasize incomplete intelligence routes until Phase 4H.
  2. For available analytical features, provide rich contextual previews explaining upcoming assistive capabilities without dead-end clicks.
- **Dependency:** Feature flag controller / Navigation configuration.
- **Target Phase:** `Phase 4B` (Nav cleanup) & `Phase 4H` (Intelligence release).

---

### UXG-14: Inconsistent Empty States & Lack of Explanatory CTAs
- **Area:** System States & Onboarding
- **Severity:** `P2`
- **Current State:**
  Several tables (e.g. `/files`, `/deliverables`, `/meetings`, `/clients`) render basic text empty states (e.g. `"No files found"`, `"No deliverables found"`) with no contextual illustration, explanation of what the entity does, or primary action CTA (e.g. `+ Upload File`, `+ Create Deliverable`).
- **Evidence:**
  - Code: `src/components/shared/empty-state.tsx`
  - Screenshots: `pages (7).png`, `pages (8).png`
- **User Impact:**
  New users entering a fresh organization face austere, unhelpful empty screens with zero guidance on how to get started.
- **Architectural / Product Impact:**
  Increases onboarding friction and reduces product activation rates.
- **Proposed Direction:**
  1. Standardize the `EmptyState` component across all tables with:
     - Contextual SVG icon / illustration
     - Clear descriptive heading & 1-sentence value proposition
     - Prominent primary CTA button with permission-aware rendering.
- **Dependency:** Design system primitive refinement.
- **Target Phase:** `Phase 4B` & `Phase 4I`.

---

### UXG-15: Inconsistent Form Error Feedback (Alerts vs. Toasts vs. Inline)
- **Area:** Form Ergonomics & Feedback
- **Severity:** `P2`
- **Current State:**
  Different modal forms across the application handle errors inconsistently:
  - Some forms (e.g., Client creation) render an `Alert` banner with red borders at the top of the modal.
  - Other forms (e.g., Task creation) rely on Sonner toasts at the bottom-right of the screen.
  - Several forms lack inline field-level validation errors, leaving the user guessing which field failed validation.
- **Evidence:**
  - Code: `src/components/dashboard/clients/create-client-dialog.tsx`
  - Code: `src/components/dashboard/projects/create-project-dialog.tsx`
- **User Impact:**
  Inconsistent mental model for error recovery. Users frequently miss toast notifications on wide desktop displays when focused inside a modal.
- **Architectural / Product Impact:**
  Violates design system consistency and form ergonomics.
- **Proposed Direction:**
  1. Standardize form error patterns:
     - Field-level inline errors under the offending input (Zod/React Hook Form).
     - Global form submission errors in an inline `Alert` above the submit button.
     - Successful operations confirmed via Sonner toasts.
- **Dependency:** Form primitive audit.
- **Target Phase:** `Phase 4B` & `Phase 4I`.

---

### UXG-16: Missing Keyboard Accessibility & Focus Trapping in Modals
- **Area:** Accessibility (a11y)
- **Severity:** `P2`
- **Current State:**
  While modal dialogs use Base UI primitives, several custom drawers and dropdown menus (e.g., the User Profile Menu and Status Filters) do not trap keyboard focus properly. Pressing `Tab` inside certain open overlays cycles through background table elements. Screen readers do not announce dynamic table updates.
- **Evidence:**
  - Code: `src/components/dashboard/header.tsx:89-130`
  - Code: `src/components/ui/dialog.tsx`
- **User Impact:**
  Keyboard-only users and screen-reader operators experience navigation disarray and loss of reading position.
- **Architectural / Product Impact:**
  Fails WCAG 2.1 AA compliance standards required for enterprise B2B software.
- **Proposed Direction:**
  1. Audit and enforce Base UI focus trapping across all dialogs, sheets, and popovers.
  2. Implement proper `aria-labelledby`, `aria-describedby`, and `role="dialog"` attributes.
- **Dependency:** Base UI component audit.
- **Target Phase:** `Phase 4I` (Pre-flight checks in `Phase 4B`).

---

### UXG-17: Table Viewport Breakdown on Mobile Devices (< 768px)
- **Area:** Responsive UX
- **Severity:** `P2`
- **Current State:**
  Data tables in `/projects`, `/clients`, `/files`, and `/workforce/employees` feature 6 to 8 columns. On viewports below 768px (tablets and mobile phones), tables clip horizontally, requiring awkward multi-directional scrolling that cuts off status badges and action menus.
- **Evidence:**
  - Code: `src/components/dashboard/projects/projects-table.tsx`
  - Code: `src/components/dashboard/clients/clients-table.tsx`
- **User Impact:**
  Agency executives and creatives checking project status or client information on mobile devices cannot comfortably read tables or access action menus.
- **Architectural / Product Impact:**
  Limits mobile usability to read-only browsing with significant friction.
- **Proposed Direction:**
  1. Implement responsive card fallbacks: on screens < 768px, render data as stacked card lists rather than wide HTML tables.
  2. Preserve high-priority columns (Title, Status, Due Date) and collapse secondary metadata into expandable accordion cards.
- **Dependency:** Responsive table wrapper component.
- **Target Phase:** `Phase 4B` & `Phase 4I`.

---

### UXG-18: Absence of Breadcrumbs in Deep Entity Routes
- **Area:** Navigation & Wayfinding
- **Severity:** `P2`
- **Current State:**
  When navigating to `/projects/[id]` or `/clients/[id]`, the header displays only the entity name (e.g. `"Brand Refresh"`, `"Nike Inc."`). There is no breadcrumb path (`Projects > Nike Inc. > Brand Refresh`) allowing users to climb back up the organizational hierarchy. Users must rely on browser "Back" buttons or click the sidebar to re-enter lists.
- **Evidence:**
  - Code: `src/app/(dashboard)/projects/[id]/page.tsx`
  - Code: `src/app/(dashboard)/clients/[id]/page.tsx`
  - Screenshots: `pages (3).png`, `pages (5).png`
- **User Impact:**
  Loss of hierarchical orientation when navigating through deep project or client work streams.
- **Architectural / Product Impact:**
  Degrades wayfinding and creates friction in multi-project agencies.
- **Proposed Direction:**
  1. Introduce a standardized `Breadcrumb` bar in the application sub-header for all dynamic routes (`[id]`).
  2. Display active organization context, parent entity, and current record name with active clickable ancestors.
- **Dependency:** Global layout header updates.
- **Target Phase:** `Phase 4B`.

---

### UXG-19: Unsaved Changes / Dirty Form State Loss
- **Area:** Form Ergonomics & Data Integrity
- **Severity:** `P2`
- **Current State:**
  When editing long descriptions in Project creation, Client notes, or Deliverable review submissions, pressing `Esc` or clicking the modal backdrop immediately closes the dialog and destroys all entered text without confirmation.
- **Evidence:**
  - Code: `src/components/dashboard/projects/create-project-dialog.tsx`
  - Code: `src/components/dashboard/clients/create-client-dialog.tsx`
- **User Impact:**
  Accidental loss of creative briefs, feedback notes, or client data due to misclicks.
- **Architectural / Product Impact:**
  Creates user frustration and damages trust during data-heavy operational workflows.
- **Proposed Direction:**
  1. Add dirty-state tracking to modal dialogs.
  2. Warn users when attempting to dismiss a modal with uncommitted form inputs (`"Discard unsaved changes?"`).
- **Dependency:** Form hook standardization (`useFormDirtyCheck`).
- **Target Phase:** `Phase 4I`.

---

### UXG-20: Silent Session Expiry & Token Refresh Dropouts
- **Area:** Authentication & Tenant Session UX
- **Severity:** `P2`
- **Current State:**
  When an operator leaves the browser tab open and Supabase Auth session tokens expire, subsequent interactions (such as submitting a form or clicking a table row) fail silently or produce generic "Fetch failed" console errors. There is no automatic token refresh modal or re-authentication banner.
- **Evidence:**
  - Code: `src/lib/supabase/client.ts`
  - Code: `src/middleware.ts`
- **User Impact:**
  Operators waste time filling out project forms only to have submissions fail without clear explanation when sessions lapse.
- **Architectural / Product Impact:**
  Degrades perceived platform stability during extended work sessions.
- **Proposed Direction:**
  1. Implement an active session watchdog in the root dashboard layout.
  2. Display an unobtrusive "Session Expired" re-auth modal that re-establishes credentials without discarding in-flight component state.
- **Dependency:** Supabase Auth listener integration.
- **Target Phase:** `Phase 4B` & `Phase 4I`.

---

## 3. Prioritized Resolution Matrix

| ID | Issue Title | Severity | Area | Proposed Phase | Core Dependencies |
|---|---|:---:|---|:---:|---|
| **UXG-01** | Hardcoded Task Milestone Scope | `P0` | Tasks / Projects | Phase 4E | Project Context Provider |
| **UXG-02** | Permission Cascade 500 Crashes | `P0` | Authorization | Phase 4B | Defensive Server Actions |
| **UXG-03** | Inverted Member Invite Flow | `P0` | Organization UX | Phase 4C | Invitation Action Integration |
| **UXG-04** | Non-Functional Global Search | `P0` | Navigation | Phase 4B | Multi-Entity Search Query |
| **UXG-05** | Empty Dashboard Canvas | `P1` | Dashboard | Phase 4H (Init 4B) | Aggregated Executive Queries |
| **UXG-06** | Workforce Sidebar Navigation Bloat | `P1` | Navigation / IA | Phase 4B / 4C | Role-Filtered Navigation Config |
| **UXG-07** | Disconnected Client Relationships | `P1` | Client CRM | Phase 4D | Relational Client Projections |
| **UXG-08** | File vs. Deliverable Collision | `P1` | Production / DAM | Phase 4F | Deliverable Attachment Schema |
| **UXG-09** | Inactive Client Portal Stub | `P1` | Client Portal | Phase 4G | HMAC Portal Link Verification |
| **UXG-10** | Missing Scoped Project Workspace | `P1` | Projects | Phase 4E | Nested Tab Routing |
| **UXG-11** | Read-Only Static Timeline | `P1` | Timeline / Gantt | Phase 4E | Interactive Timeline Engine |
| **UXG-12** | Disconnected Notification Bell | `P1` | Navigation | Phase 4H (Init 4B) | Real-time Notification Engine |
| **UXG-13** | Uninformative "Soon" Badges | `P2` | Intelligence | Phase 4B / 4H | Nav Config & Feature Flags |
| **UXG-14** | Inconsistent Empty States | `P2` | Design System | Phase 4B / 4I | Standardized EmptyState Component |
| **UXG-15** | Inconsistent Form Error Feedback | `P2` | Form UX | Phase 4B / 4I | Inline Error Standard |
| **UXG-16** | Focus Trapping & a11y Gaps | `P2` | Accessibility | Phase 4I | Base UI Primitive Hardening |
| **UXG-17** | Table Viewport Breakdown on Mobile | `P2` | Responsive UX | Phase 4B / 4I | Responsive Card Table Wrapper |
| **UXG-18** | Absence of Breadcrumbs | `P2` | Navigation | Phase 4B | Dynamic Breadcrumb Bar |
| **UXG-19** | Unsaved Changes State Loss | `P2` | Form UX | Phase 4I | Modal Dirty-State Guard |
| **UXG-20** | Silent Session Expiry Dropouts | `P2` | Auth / Session | Phase 4B / 4I | Session Watchdog |

---

## 4. Phase 4A Audit Conclusion & Guardrail Notice

This backlog represents the canonical defect and enhancement registry for the Phase 4 execution sequence.
- **Implementation Status:** NOT AUTHORIZED. Zero code edits have been made during Phase 4A.
- **Next Gate:** Resolution of P0 items (`UXG-02`, `UXG-04`) must be addressed immediately during **Phase 4B** (Core Workspace & Global Navigation).
