# AI NEX OS — Canonical Terminology Dictionary
## Phase 1A: Standardization & Architectural Glossary

**Document Path:** `docs/product/AI-NEX-OS-TERMINOLOGY.md`  
**Date:** September 25, 2026  
**Auditor:** Antigravity AI Engineering Assistant  
**Status:** Canonical Reference Standard  
**Scope:** Defines the authoritative naming conventions, conceptual definitions, and usage rules governing all UI strings, API models, database schemas, and documentation.

---

## 1. Terminology Translation Matrix

The table below maps obsolete internal terminology to canonical multi-tenant B2B SaaS vocabulary:

| Old Term | Canonical Term | Meaning | Usage Rule | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AI Collective** (as product) | **AI NEX OS** | The multi-tenant operating system for creative agencies and production organizations. | Use across all branding, UI headers, marketing pages, metadata, and documentation. | **CANONICAL** |
| **AI Collective** (as company) | **Organization** or **Agency** | A specific tenant, creative agency, design studio, or production company operating on the platform. | Use "Organization" in data models and API layers; use "Agency" or "Studio" in marketing copy. | **CANONICAL** |
| **AIC** | **AI NEX OS** / **{ORG_CODE}** | Product abbreviation or tenant code prefix. | In product references, use "AI NEX OS". In sequential codes (projects, tasks, employees), use the tenant's dynamic `codePrefix` (e.g., `NEX`, `ACME`). | **DEPRECATED** |
| **AIC Nex OS** / **AIC Nexus OS** | **AI NEX OS** | Stale draft variations of the product name. | Strictly forbidden in UI, titles, and active documentation. Preserve only in historical merge archives. | **BANNED** |
| **AI Collective Employee** | **Team Member** / **Employee** | An active member of an agency's workforce who has an account and role within the workspace. | Use "Team Member" in collaborative UI contexts; use "Employee" in workforce, payroll, and HR management contexts. | **CANONICAL** |
| **AI Collective Workspace** | **Agency Workspace** / **Workspace** | The operational digital environment where a creative agency manages projects, clients, tasks, and files. | Use "Workspace" in navigation, switcher menus, and general application context. | **CANONICAL** |
| **AI Agency Management System** | **Agency Operating System** | The market category for AI NEX OS. | Never describe the product as an "AI agency tool" or "project management software". Position as "The Operating System for Creative Execution". | **CANONICAL** |
| **Internal User** | **Workspace Member** / **Member** | An authenticated individual with an active membership and role in an organization. | Use "Member" in settings, project teams, and permissions. Use "User" only when referring to global identity (`public.users`). | **CANONICAL** |
| **External User** | **Client Contact** / **Guest Reviewer** | An external stakeholder, client executive, or reviewer interacting via secure share links. | Never refer to external clients as "unauthenticated users". Use "Client" or "Reviewer". | **CANONICAL** |
| **Single Organization** | **Multi-Tenant SaaS** | The architectural model where isolated organizations share platform infrastructure securely. | Fundamental architectural baseline for all Phase 1+ engineering. | **CANONICAL** |
| **Unprovisioned Account** | **Pending Onboarding** | An authenticated identity that has not yet created or joined an organization workspace. | Replace the hostile "Account not set up" page with an onboarding wizard (Create Workspace or Enter Invite Code). | **CANONICAL** |
| **Hardcoded Seed Org** | **Tenant Provisioning** | Dynamically creating an agency workspace during self-service signup or admin onboarding. | Replaces environment-variable-only seed scripts (`scripts/seed.ts`) with runtime registration services. | **CANONICAL** |
| **AIC-YYYY-XXXX** | **{PREFIX}-YYYY-XXXX** | Sequential project code format. | Prefix must be derived dynamically from `organization.code_prefix` (defaults to `NEX`). | **CANONICAL** |
| **AIC-T-YYYY-XXXX** | **{PREFIX}-T-YYYY-XXXX** | Sequential task code format. | Prefix must be derived dynamically from `organization.code_prefix` (defaults to `NEX-T`). | **CANONICAL** |

---

## 2. Core Domain Taxonomy

### 2.1 Identity & Access Hierarchy
To prevent architectural confusion, the following terms represent four distinct layers:

1. **Authentication (Identity)**:
   - *Definition*: Proof of who a person is via Supabase Auth (email/password, OAuth, OTP).
   - *Entity*: `auth.users` and `public.users` (user ID, verified email, name, avatar).
   - *Rule*: Identity contains **no** organization permissions or tenancy claims.
2. **Organization (Tenant)**:
   - *Definition*: A distinct creative agency, studio, or corporate team that owns projects and data.
   - *Entity*: `public.organizations` (organization ID, name, slug, settings, branding).
   - *Rule*: All business data belongs to exactly one Organization.
3. **Membership (Tenancy Association)**:
   - *Definition*: The bridge linking an Identity to an Organization.
   - *Entity*: `organization_memberships` (user ID, organization ID, role ID, status).
   - *Rule*: A single Identity may possess multiple Memberships across different Organizations.
4. **Role & Permissions (Authorization)**:
   - *Definition*: The set of permitted operations within a specific Organization.
   - *Entity*: `public.roles` and JSONB `permissions` map.
   - *Rule*: Roles are evaluated strictly within the context of the active Organization membership.

### 2.2 Operational Domains
- **Workspace**: The project-execution environment. Encompasses Clients, Projects, Tasks, Timelines, Deliverables, Revisions, Files, Meetings, and Approvals.
- **Workforce**: The operational people-management environment. Encompasses Employees, Departments, Shift Attendance, Time Tracking, Punches, Corrections, Review Queues, and Work Validation.
- **Client Portal**: The zero-friction, unauthenticated, token-governed public surface where external clients view project progress, inspect deliverables, annotate revisions, and submit approvals.
- **Intelligence Layer**: The platform-wide AI assistance services (meeting summarization, revision changelogs, task generation, schedule risk analysis) that augment human creative execution.

---

## 3. Usage Rules for Engineers & Writers

1. **Never use "AIC" as a product abbreviation**: Always write **AI NEX OS**.
2. **Never hardcode "AI Collective" in application code**: "AI Collective" is permissible only when quoting legacy requirements or citing historical project artifacts in `docs/`.
3. **Maintain the Distinction between AI and Agency**: "AI" denotes artificial intelligence capabilities (LLMs, computer vision, automated transcription). It must never be used as shorthand for a specific client agency.
4. **Preserve Exact Tagline**: **The Operating System for Creative Execution.** Always punctuate with the terminal period.
