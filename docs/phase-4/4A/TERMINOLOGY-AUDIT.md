# AI NEX OS — Phase 4A: Terminology Audit & Brand Decoupling Baseline

**Product:** AI NEX OS — The Operating System for Creative Execution  
**Phase:** 4A — Product Foundation & UX Audit  
**Status:** COMPLETE / CANONICAL AUDIT BASELINE  
**Scope:** Global Repository Surface (`src/`, `database/`, `docs/`, `.env.example`, `config/`)

---

## 1. Executive Summary & Verification Findings

This audit establishes the definitive linguistic, branding, and conceptual lexicon for AI NEX OS.

A rigorous search across all 38 production routes, server actions, Drizzle schemas, and runtime configurations confirms:

1. **Zero Active UI Contamination:** There are **zero occurrences** of the legacy prototype sponsor `"AI Collective"` or `"AIC Agency"` in user-facing application components, page titles, or navigation menus.
2. **Canonical Brand Alignment:** The platform identity is universally defined as **AI NEX OS** with the official tagline **"The Operating System for Creative Execution"** (certified in `src/config/app.ts:4-5`).
3. **Legitimate Technical Identifiers:** The symbol `"AIC"` and prefix `"ai"` in technical files (e.g. `AICostGovernance`, `AICapability`, `aiConversations`, `aiContexts`) represent **core Artificial Intelligence platform capabilities**, not legacy agency branding. They are protected system components.
4. **Historical Migration Isolation:** References to `"AI Collective"` in `database/migrations/0015_organization_code_prefix.sql` represent historical backward-compatibility DDL backfills for pre-existing records and must never be altered.

---

## 2. Terminology Classification & Action Matrix

| Term / Identifier                               | Current Locations                                                                            | Current Classification                                    | Recommended Action              | Detailed Rationale                                                                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **AI NEX OS**                                   | `src/config/app.ts`, `src/app/layout.tsx`, all metadata titles                               | Canonical Product Identity                                | **PRESERVE**                    | The official, agency-agnostic brand name of the SaaS platform.                                                                  |
| **The Operating System for Creative Execution** | `src/config/app.ts`, `src/app/(auth)/login/page.tsx`, `README.md`                            | Canonical Product Tagline                                 | **PRESERVE**                    | Defines the core value proposition for creative agencies, production studios, and brand consultancies.                          |
| **AI Collective**                               | `database/migrations/0015_organization_code_prefix.sql:35`, `docs/audit/`, `docs/product/`   | Legacy Sponsor / Historical Documentation                 | **PRESERVE HISTORICAL ONLY**    | Quarantined in historical docs and immutable SQL migrations. Prohibited from all active UI code and user-facing copy.           |
| **AIC (in code symbols)**                       | `src/lib/ai/`, `src/db/schema/ai-cost-governance.ts`, `src/lib/types/ai.ts`                  | Legitimate Technical Identifier (Artificial Intelligence) | **PRESERVE**                    | Represents modular AI engine components (`AICostGovernance`, `AICapability`, `aiConversations`). Not linked to legacy branding. |
| **Organization**                                | `src/db/schema/organizations.ts`, `src/lib/types/auth.ts`, `src/features/organizations/`     | Canonical Entity (Tenant Data Boundary)                   | **PRESERVE**                    | Represents the legal multi-tenant data container, billing entity, and RBAC security boundary in PostgreSQL.                     |
| **Workspace**                                   | `src/components/layout/organization-switcher.tsx`, `src/config/navigation.ts`, `/onboarding` | Canonical Contextual Surface                              | **PRESERVE WITH SCOPING RULES** | The operational digital environment where agency members work. See §3 for disambiguation rules.                                 |
| **AI Workspace**                                | `src/db/schema/ai-workspace.ts`, `src/app/(dashboard)/intelligence/ai-workspace/`            | Specific Assistive Feature Module                         | **PRESERVE**                    | An assistive AI workflow tool within the platform. Must not be confused with general tenant workspaces.                         |
| **Client**                                      | `src/db/schema/clients.ts`, `/clients`, `/clients/[id]`                                      | Canonical Business Entity                                 | **PRESERVE**                    | Represents external companies or sponsors commissioning creative work.                                                          |
| **Project**                                     | `src/db/schema/projects.ts`, `/projects`, `/projects/[id]`                                   | Canonical Execution Unit                                  | **PRESERVE**                    | The fundamental organizing unit of creative execution.                                                                          |
| **Deliverable**                                 | `src/db/schema/deliverables.ts`, `/deliverables`                                             | Canonical Production Output                               | **PRESERVE**                    | Formal versioned work package submitted for client and internal approval. Distinct from raw files.                              |
| **File (Asset)**                                | `src/db/schema/files.ts`, `/files`                                                           | Canonical Storage Primitive                               | **PRESERVE**                    | Raw digital asset, reference document, working file, or attachment stored in Supabase Storage.                                  |
| **Milestone**                                   | `src/db/schema/timelines.ts`, `/timeline`                                                    | Canonical Scheduling Entity                               | **PRESERVE & DECOUPLE**         | Key delivery checkpoint in a project schedule. Must be decoupled from mandatory task hierarchies.                               |
| **Task**                                        | `src/db/schema/tasks.ts`, `/tasks`                                                           | Canonical Work Item                                       | **PRESERVE & DECOUPLE**         | Actionable unit of labor assigned to team members.                                                                              |
| **Team Member**                                 | `src/app/(dashboard)/settings/members/`                                                      | Canonical Collaborative Role                              | **PRESERVE**                    | An individual with access credentials inside an agency organization.                                                            |
| **Employee**                                    | `src/db/schema/workforce.ts`, `/workforce/employees`, `/attendance`                          | Canonical Workforce / HR Role                             | **PRESERVE**                    | An internal staff member tracked for punch-clock attendance, hourly rates, and payroll reporting.                               |

---

## 3. Disambiguation Rules

### 3.1 Organization vs. Workspace

To prevent cognitive confusion for both users and developers, the following strict scoping rules are established:

1. **Organization (Data & Admin Boundary):**
   - Use **"Organization"** in database schemas (`organizations`), API payloads, billing/subscription contexts, legal agreements, and top-level administrative settings (`/settings/organization`, `/settings/billing`).
   - _Example:_ "Organization Settings", "Organization ID", "Active Organization Subscription".
2. **Workspace (Operational Experience):**
   - Use **"Workspace"** when referring to the interactive day-to-day work environment in the user interface, switcher dropdowns, and onboarding flows.
   - _Example:_ "Switch Workspace", "Workspaces (3)", "Set up your agency workspace".
3. **Workspace Navigation Section:**
   - In the sidebar navigation, rename the top-level section label from `"Workspace"` to `"Workplace"` or `"Production Workspace"` to avoid collision with the organization switcher dropdown header.

### 3.2 Artificial Intelligence (AI) vs. Legacy "AI Collective" (AIC)

- Any symbol prefixed with `ai` or `AIC` in `src/` represents **Artificial Intelligence** capabilities:
  - `aiConversations`: AI chat threads
  - `aiContexts`: RAG retrieval contexts
  - `AICostGovernance`: Budgeting and token spending limits for LLM inference
  - `AICapability`: Feature flags controlling model access
- Under no circumstances should these symbols be renamed to eliminate the letters "AIC". They are standard, clean technical abstractions.

### 3.3 Deliverable vs. File

- **File (Digital Asset):** Any uploaded binary stored in Supabase Storage (e.g. `.png`, `.mp4`, `.pdf`, `.fig`). It has metadata (size, mime type, uploader) and belongs to a project.
- **Deliverable (Review Package):** A business milestone submitted for review and approval (e.g., "Brand Identity V1", "Hero Commercial Cut"). A deliverable contains version history, review statuses (`Draft`, `In Review`, `Approved`, `Changes Requested`), client sign-off signatures, and links to underlying files.

---

## 4. Agency-Agnostic Terminology Verification

The audit confirms that all default copy, placeholder text, and system messages are fully agency-agnostic:

- **Default Organization Seed:** Neutralized to `"Acme Creative Studio"` with code prefix `"ACM"` in `.env.example` (line 151).
- **Target Organization Verticals:** Copy across marketing and onboarding accommodates:
  - Creative Agencies
  - Design & Branding Studios
  - Video & Film Production Companies
  - Advertising Agencies
  - Content Studios & Digital Labs
  - Independent Creative Collectives

---

## 5. Audit Conclusion

The product terminology is clean, modernized, and structurally decoupled from legacy single-tenant assumptions.

- **UI Contamination:** 0% (CLEAN)
- **Technical Symbols:** Legitimate AI engine primitives verified.
- **Database Migrations:** Historical integrity preserved.
- **Action Required:** Preserve these terminology standards during all subsequent Phase 4 implementation gates.
