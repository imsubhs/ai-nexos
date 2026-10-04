# AI NEX OS — Phase 4: Authoritative Product & UX Roadmap
## The Operating System for Creative Execution

> **Document Status:** CANONICAL PRODUCT & UX ROADMAP · PHASE 4 AUTHORITATIVE  
> **Target System:** AI NEX OS (`ai-nexos`)  
> **Document Location:** `docs/phase-4/PHASE-4-PRODUCT-UX-ROADMAP.md`  
> **Release Target:** Version 1.0 (Agency SaaS Production Release)  
> **Date:** October 3, 2026  
> **Preceding Certified Baseline:** S7.14 (`Next.js 16.3.8`, `React 19.2.4`, `S6 PASS`, `S7 PASS`, `PRODUCTION LIVE`)  
> **Next Authorized Milestone:** Phase 4A (Product Foundation & UX Audit Baseline)  

---

## 1. Product Identity & Purpose

**AI NEX OS** is the unified **Agency Operating System (Agency OS)** purpose-built for creative agencies, design studios, video production houses, and digital execution consultancies. Known by its canonical tagline, **"The Operating System for Creative Execution,"** AI NEX OS consolidates the three historically fragmented operational pillars of creative service businesses into one coherent system of record:

1. **Workspace Operations**: Project governance, timeline milestones, deliverable versioning, itemized revisions, file digital asset management (DAM), and context-bound decision meetings.
2. **Client Collaboration**: Frictionless, zero-login, cryptographically authenticated client review portals that eliminate feedback ambiguity and streamline client sign-off without forcing client account creation.
3. **Workforce Operations**: Granular employee directory, department structures, verified shift punch-clocks, algorithmic work-validation, and manager review queues.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AI NEX OS                                  │
│              The Operating System for Creative Execution                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    Workspace     │       │   Client Share   │       │    Workforce     │
│    Operations    │       │     Portals      │       │    Operations    │
│ (Production/CRM) │       │ (Zero-Login Hub) │       │ (Validation/HR)  │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## 2. Core Architecture & Tenancy Foundation

AI NEX OS operates on a strict multi-tenant SaaS architecture governed by the constitutional invariant:
> **"The Tenant Is Never a Parameter"**

All agency data is isolated at three defense-in-depth layers:
- **Layer 1 (PostgreSQL RLS):** Tenant-scoped database policies (`app.is_org_member(organization_id)`) enforcing logical data separation at the database engine level.
- **Layer 2 (Application Scoping):** Tenant context resolved from authenticated session cookies (`TenantContext` in `src/features/auth/membership-service.ts`) and injected into Drizzle ORM query predicates.
- **Layer 3 (Static Safety Gate):** AST authorization audit (`scripts/audit-authorization.ts` and `tests/unit/tenant-identity-surface.test.ts`) guaranteeing zero server actions accept caller-supplied tenant arguments.

### The Canonical Entity Hierarchy:
```text
Organization (Legal Tenant Sovereign Entity)
    └── Workspace (Agency Execution Environment)
         ├── Memberships & Workforce (Creators, Directors, PMs, Admins)
         ├── Clients (Client CRM Companies & Contacts)
         └── Projects
              ├── Tasks (Kanban, Subtasks, Time Tracking)
              ├── Timelines & Milestones (Visual Gantt, Phases, Dependencies)
              ├── Files & Assets (Digital Asset Management, Storage Buckets)
              └── Deliverables
                   ├── Revisions & Feedback
                   ├── Reviews & Annotations
                   └── Approvals (Cryptographic Sign-Offs)
                        └── Client Collaboration Portal (Zero-Login Tokenized Access)
```

---

## 3. Empirical Capability Baseline Audit

Prior to establishing Phase 4 milestones, an exhaustive inspection of the production repository (`AIC NEXOS/ai-nexos`) was performed. The following audit reflects empirical code reality:

| Capability | Current State in Codebase | Empirical Evidence | Status | Phase 4 Need |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Supabase Auth + `@supabase/ssr`, email/password, magic link, Google OAuth PKCE callback | `src/proxy.ts`, `src/features/auth/real-actions.ts`, `src/app/(auth)/login/page.tsx` | `IMPLEMENTED` | Refine session refresh edge cases and password reset routing. |
| **Organization** | Sovereign tenant in `organizations` with name, slug, brand colors, and `code_prefix` | `src/db/schema/organizations.ts`, `src/features/organizations/organization-service.ts` | `IMPLEMENTED` | Expose full branding controls & code prefix configuration in Settings. |
| **Workspace Shell** | Modern dark-tech layout with sidebar navigation, header context, and user dropdown | `src/components/layout/app-shell.tsx`, `app-sidebar.tsx`, `app-header.tsx` | `IMPLEMENTED` | Add global command palette (`Cmd+K`), breadcrumb navigation, and mobile polish. |
| **Membership & Tenancy** | Additive join table `organization_memberships` (migration `0016`) & context resolver | `src/db/schema/organization-memberships.ts`, `src/features/auth/membership-service.ts` | `PARTIALLY IMPLEMENTED` | Complete transition of remaining legacy queries to membership-first resolution; UI member management. |
| **Roles & Permissions** | 7 canonical system roles (`owner` to `team_member`), 22 modules × 15 actions RBAC matrix | `src/features/permissions/engine.ts`, `src/db/schema/roles.ts`, `0001_security_rls_foundation.sql` | `IMPLEMENTED` | Custom roles UI in Settings; granular permission matrix inspector. |
| **Client Management** | Client CRM companies, contacts, and project associations | `src/db/schema/clients.ts`, `src/features/clients/real-actions.ts`, `src/app/(dashboard)/clients/` | `IMPLEMENTED` | Client portal token management UI; company-level activity feeds. |
| **Project Management** | Full CRUD, project codes (`{code_prefix}-YYYY-XXXX`), budgets, team assignments | `src/db/schema/projects.ts`, `src/features/projects/real-actions.ts`, `src/app/(dashboard)/projects/`| `IMPLEMENTED` | Project health indicators, budget burn velocity, archive/restore workflows. |
| **Timeline & Milestones**| Interactive visual Gantt, milestone markers, phases, and dependencies | `src/db/schema/timelines.ts`, `src/features/timelines/real-actions.ts`, `src/app/(dashboard)/timeline/`| `IMPLEMENTED` | Interactive drag-and-drop schedule adjustment, critical path highlighting. |
| **Task Management** | Kanban boards, task assignments, subtasks, priority, timers, task comments | `src/db/schema/tasks.ts`, `src/features/tasks/real-actions.ts`, `src/app/(dashboard)/tasks/` | `IMPLEMENTED` | Multi-criteria filtering, bulk task status updates, inline quick-create. |
| **File / Asset DAM** | Folder hierarchy, file versioning, Supabase storage prefix isolation `/{org_id}/*` | `src/db/schema/files.ts`, `src/features/files/real-actions.ts`, `src/app/(dashboard)/files/` | `IMPLEMENTED` | Rich asset previews (video player with scrubber, image zoom, PDF preview). |
| **Deliverables** | Multi-type deliverable records, versioning, status lifecycle (`draft` → `approved`) | `src/db/schema/deliverables.ts`, `src/features/deliverables/real-actions.ts` | `IMPLEMENTED` | Side-by-side version comparison; client feedback thread integration. |
| **Reviews & Approvals**| Multi-step approval workflows, legal notes, approver metadata, cryptographic tokens | `src/db/schema/approvals.ts`, `src/features/approvals/real-actions.ts`, `/api/approvals/verify` | `IMPLEMENTED` | Sequential sign-off chains; visual signature / cryptographic seal presentation. |
| **Client Portal** | Dedicated portal (`portal.<domain>` or `/portal/s/[token]`), zero-login client review | `src/proxy.ts`, `src/db/schema/shares.ts`, `src/app/portal/` | `IMPLEMENTED` | Agency white-label branding injection; mobile-optimized review UX. |
| **Notifications** | In-app notification center, real-time counters, user channel preferences | `src/db/schema/notifications.ts`, `src/features/notifications/real-actions.ts` | `IMPLEMENTED` | Category filtering (Tasks, Approvals, System), mark all as read. |
| **Dashboard** | Operational metrics overview (active projects, pending deliverables, tasks, attendance)| `src/app/(internal)/dashboard/page.tsx` | `IMPLEMENTED` | Role-customized dashboard widgets (Executive vs PM vs Creator views). |
| **Search** | Scoped module-level search filters across tasks, deliverables, projects, clients | Module query filters in real actions, `src/features/search/` | `PARTIALLY IMPLEMENTED` | Global omnibox / command palette (`Cmd + K`) indexed by organization. |
| **Settings** | Organization, members, roles, and profile settings pages | `src/app/(dashboard)/settings/*` | `IMPLEMENTED` | Full member role reassignment, invitation revocation/resend UI. |
| **Onboarding** | Self-service agency creation and joining via invite state machine | `src/app/(auth)/onboarding/page.tsx`, `src/features/organizations/onboarding-actions.ts` | `IMPLEMENTED` | Multi-step onboarding wizard polish, template agency starter packs. |
| **Invitations** | Cryptographic SHA-256 tokens, 7-day TTL, pre-assigned roles (migration `0017`) | `src/features/organizations/invitation-service.ts`, `src/app/(auth)/invite/[token]/` | `IMPLEMENTED` | Admin UI table for pending/accepted/revoked invitations with one-click re-invite. |
| **Org Switching** | Top-nav / sidebar dropdown switcher backed by `nexos_active_org_id` cookie | `src/components/layout/organization-switcher.tsx`, `src/features/auth/membership-service.ts`| `IMPLEMENTED` | Visual active indicator polish, keyboard shortcuts for fast switching. |

---

## 4. Phase 4 Milestone Roadmap

The Phase 4 roadmap is structured into 9 coherent, non-overlapping milestones designed to elevate AI NEX OS from a hardened backend baseline to an industry-leading, high-craft creative operating experience.

```text
PHASE 4 EXECUTION ROADMAP
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4A: Product Foundation & UX Audit Baseline                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4B: Core Workspace Experience & Global Navigation (Cmd+K)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4C: Organization, Multi-Tenant Memberships & Workforce UI        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4D: Client CRM & External Collaboration Experience               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4E: Project Execution, Kanban & Gantt Timeline Experience        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4F: Creative Asset & Deliverable Digital Management (DAM)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4G: Frictionless Client Portal & Cryptographic Approval Chains   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4H: Executive Dashboard & Operational Intelligence               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4I: UX Hardening, Accessibility (WCAG 2.1 AA) & Polish Gate      │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 4A — Product Foundation & UX Audit Baseline
**Goal:** Establish the comprehensive design system audit, tokens, typography guidelines, and component inventory before touching user-facing flows.
- **Scope:**
  - Audit existing UI components against modern Swiss dark-tech aesthetic (Geist Sans, high-contrast borders, refined glassmorphism).
  - Verify layout responsiveness across Desktop (1920×1080, 1440×900), Tablet (1024×768), and Mobile (390×844).
  - Inventory all loading skeletons, error states, and empty states across the 38 active routes.
  - Define unified design token guidelines in `src/app/globals.css`.
- **Exit Criteria:** Zero layout shift, consistent typography scale, documented component tokens.

---

### Phase 4B — Core Workspace Experience & Global Navigation
**Goal:** Deliver instantaneous, high-velocity navigation across the entire agency workspace.
- **Scope:**
  - Implement global command palette (`Cmd + K` / `Ctrl + K`) indexing projects, tasks, clients, deliverables, and team members.
  - Add contextual breadcrumb navigation to all nested detail routes (`/projects/[id]`, `/clients/[id]`, `/workforce/[id]`).
  - Enhance `OrganizationSwitcher` with search filtering, keyboard navigation, and clear active-tenant badge indicators.
  - Refine notification popover with category tabs (All, Tasks, Approvals, Mentions) and "Mark All as Read" action.
- **Exit Criteria:** `Cmd+K` opens in <50ms; keyboard navigable; tenant-scoped search results only.

---

### Phase 4C — Organization, Multi-Tenant Memberships & Workforce Experience
**Goal:** Unify organization settings, multi-agency membership management, and workforce administration into a seamless operational suite.
- **Scope:**
  - Build out `/settings/members` with complete membership lifecycle controls (invite, change role, deactivate, archive).
  - Implement Pending Invitations management table with "Resend Invitation" and "Revoke Link" actions.
  - Deliver `/settings/organization` branding controls (upload agency logo, favicon, define primary/secondary brand colors).
  - Polish Workforce live attendance board (`/workforce/team`), punch history (`/workforce/history`), and supervisor review queue (`/workforce/corrections/review`).
- **Exit Criteria:** Admins can invite, assign roles, and revoke members; freelancers can switch organizations seamlessly.

---

### Phase 4D — Client CRM & External Collaboration Experience
**Goal:** Provide agencies with a comprehensive directory of client companies, brand stakeholders, and active engagements.
- **Scope:**
  - Polish `/clients` directory with company cards, active project counts, and total deliverable volume.
  - Build rich `/clients/[clientId]` detail view displaying associated projects, client contacts, portal access links, and billing terms.
  - Contact management modal (add contact, designate primary stakeholder, assign portal access permissions).
  - Client engagement activity feed displaying past approvals, meeting decisions, and active revisions.
- **Exit Criteria:** Full client lifecycle tracking; client contacts directly bindable to deliverables and share links.

---

### Phase 4E — Project Execution, Kanban & Gantt Timeline Experience
**Goal:** Equip project managers and creative teams with frictionless, real-time work management tools.
- **Scope:**
  - Kanban task board enhancements: drag-and-drop column transitions, multi-assignee avatars, priority badges, and inline subtask checklists.
  - Quick-task creation with auto-generated task codes (`{code_prefix}-T-YYYY-XXXX`).
  - Interactive Gantt timeline (`/projects/[projectId]/timeline` and `/timeline`): drag-to-resize milestone phases, dependency line rendering, and critical path highlighting.
  - Project health indicators (On Track, At Risk, Blocked) computed from milestone deadlines and overdue tasks.
- **Exit Criteria:** Task moves update state optimistically; Gantt reflects dependency constraints; zero code prefix collision.

---

### Phase 4F — Creative Asset & Deliverable Digital Management (DAM)
**Goal:** Deliver a modern digital asset management environment tailored for creative production files and deliverable review cycles.
- **Scope:**
  - File asset manager (`/files`): grid vs. list view, folder tree hierarchy, multi-file drag-and-drop uploads to Supabase storage.
  - Rich asset preview modals: HTML5 video player with frame-by-frame scrubbing, high-res image zoom/pan, and multi-page PDF viewer.
  - Deliverables hub (`/deliverables`): version comparison (v1 vs v2 diffing), deliverable status tracking (`draft` → `in_review` → `approved`).
  - Contextual annotation layer: pin comments to specific timestamps in video or coordinates on images.
- **Exit Criteria:** Frame-accurate video preview; storage isolated strictly by `/{organization_id}/*`; zero cross-tenant asset leaks.

---

### Phase 4G — Frictionless Client Portal & Cryptographic Approval Chains
**Goal:** Perfect the client-facing presentation layer so agency clients can review and legally sign off on creative work without friction.
- **Scope:**
  - Branded zero-login portal experience (`portal.<domain>/s/[token]`): agency logo, brand colors, clean non-technical presentation.
  - Deliverable review module: high-res playback, client feedback submission with itemized revision requests.
  - Formal approval sign-off modal: legal sign-off statement, approver name/email capture, and immutable cryptographic approval record creation.
  - Share link management for agency staff: set token expiry, revoke access, password protection, and download permissions toggle.
- **Exit Criteria:** Portal loads without authentication; sign-offs generate immutable audit logs; expired tokens reject access with clear UX.

---

### Phase 4H — Executive Dashboard & Operational Intelligence
**Goal:** Provide agency leadership and creative directors with at-a-glance operational clarity across all active accounts.
- **Scope:**
  - Role-adaptive dashboard widgets:
    - *Creative Director:* Pending approvals queue, high-priority deliverable reviews, creative milestone deadlines.
    - *Project Manager:* Project schedule burn-down, overdue tasks, team allocation capacity.
    - *Executive / Owner:* Active client count, ongoing projects, workforce punch-clock summary.
  - Recent activity feed streaming immutable activity logs (`public.activity_logs`) across the tenant workspace.
  - Quick-action shortcuts (New Project, New Deliverable, Generate Client Share Link, Clock In/Out).
- **Exit Criteria:** Dashboard renders in <200ms; displays accurate tenant data; zero cross-tenant data leakage.

---

### Phase 4I — Product Polish, Accessibility (WCAG 2.1 AA) & UX Hardening
**Goal:** Ensure the entire platform meets rigorous enterprise usability, accessibility, and visual quality benchmarks.
- **Scope:**
  - Comprehensive keyboard accessibility audit: focus-visible outlines, logical tab ordering, aria-labels across all interactive controls.
  - Screen reader compliance for modal dialogs, dropdowns, and form validation messages.
  - Dark-tech aesthetic polish: consistent border radii, micro-transitions on hover/press, and refined contrast ratios (exceeding WCAG AA 4.5:1).
  - Network resilience: offline toast warnings, optimistic UI rollbacks on server action errors, and graceful error boundary fallbacks.
- **Exit Criteria:** 100% automated a11y pass on core flows; zero unhandled promise rejections; zero visual regression.

---

## 5. Architectural Role of AI in AI NEX OS

To prevent future boundary contamination, the architectural role of artificial intelligence in AI NEX OS is formally codified:

### 5.1 Constitutional Principles of AI in AI NEX OS
1. **Assistive, Not Authoritative:** AI assists human creators and managers with repetitive operational burdens. AI never makes authoritative business, financial, or employment decisions.
2. **Provider Agnostic:** AI NEX OS is decoupled from any single proprietary AI model. The system uses a pluggable multi-provider abstraction (`src/lib/ai/provider-factory.ts`) supporting OpenAI, Anthropic, Google Gemini, or local models.
3. **Strict Non-Dependency:** The platform remains 100% operational if external AI APIs suffer downtime. Every feature with an AI assistant provides a full manual workflow fallback.
4. **Tenant Token Governance:** All AI usage is intercepted by `AICostGovernance` (`src/lib/ai/governance.ts`) and checked against the organization's monthly token budget (`public.ai_budgets`).

### 5.2 Approved Future AI Capabilities (Post-Phase 4)
- **AI Meeting Summarizer:** Converting recorded client meeting transcripts into decision records and itemized action items.
- **AI Revision Parser:** Extracting itemized task checklists from unstructured client feedback emails.
- **AI Task Breakdown Assistant:** Suggesting standard subtasks and milestones based on creative brief inputs.
- **AI Project Risk Analyzer:** Heuristic schedule analysis highlighting timeline bottlenecks and dependency slips.

---

## 6. Explicit Non-Goals for Phase 4

The following items are **STRICTLY OUT OF SCOPE** for Phase 4:
1. **No Game Mechanics:** Zero game engines, turn loops, question card synthesis, couples/relationship features, or player seat assignments.
2. **No In-Browser Creative Suite Competitor:** AI NEX OS will not build a browser-based DAW, 3D engine, or timeline video editor. It manages metadata, previews, and approvals of assets created in professional tools (Premiere, After Effects, Figma, Blender).
3. **No Automated Invoicing / Stripe Billing:** Billing tables and Stripe Customer Portals are designated for Phase 7. Phase 4 focuses strictly on workspace execution and client collaboration.
4. **No Unauthenticated Internal Access:** All internal agency workspace routes require authenticated session tokens; only external client share links operate without login.

---

## 7. Milestone Dependency Matrix

```text
Phase 4A (Design System & Baseline Audit)
   │
   ├──▶ Phase 4B (Core Workspace & Navigation)
   │       │
   │       └──▶ Phase 4C (Memberships & Workforce UI)
   │               │
   │               └──▶ Phase 4D (Client CRM Experience)
   │                       │
   │                       └──▶ Phase 4E (Project Execution & Timelines)
   │                               │
   │                               └──▶ Phase 4F (DAM & Deliverables)
   │                                       │
   │                                       └──▶ Phase 4G (Client Portal & Approvals)
   │                                               │
   │                                               └──▶ Phase 4H (Dashboard Intelligence)
   │                                                       │
   │                                                       └──▶ Phase 4I (Hardening Gate)
```

---

## 8. First Authorized Implementation Milestone

Upon formal approval of this roadmap by the system operator, the first implementation milestone to execute is:

```text
================================================================================
FIRST AUTHORIZED IMPLEMENTATION MILESTONE:
PHASE 4A — PRODUCT FOUNDATION & UX AUDIT BASELINE
================================================================================
```

### Objectives of Phase 4A:
1. Conduct an empirical component audit across all 38 routes in `src/app/`.
2. Standardize color tokens, border definitions, and typography scales in `src/app/globals.css`.
3. Verify viewport responsiveness across mobile, tablet, and desktop breakpoints.
4. Establish standardized empty, loading, and error states across all major feature domains.
5. Execute regression tests to ensure zero impact on the S7.14 security and authorization baseline.
