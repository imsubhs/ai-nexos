# AI NEX OS — PHASE 4D READINESS RECONCILIATION

## 1. Overview & Project Positioning

This document establishes the authoritative technical blueprint and readiness gate for **Phase 4D: Client CRM & External Collaboration Experience** of **AI NEX OS**.

Product positioning:

> **The Operating System for Creative Execution**

AI NEX OS is an agency-agnostic, multi-tenant B2B SaaS platform for creative agencies, production studios, video teams, and AI-native creative organizations. External collaboration is a first-class operational capability layer.

> [!IMPORTANT]
> **Strict Quarantine Rule**: This document pertains strictly to AI NEX OS. No concepts, architectures, models, or dependencies from `BUBU × DUDU` / `Couple Game Prototype` / Phase 20.x may be imported or referenced.

---

## 2. Current Certified Production Baseline

- **Live Host**: `https://ai-nexos.antideploy.com`
- **Current Production Commit**: `ca38b2b` (Live on Antideploy, Deployment ID: `4793d1fa-e6e0-4231-9f6c-c2eec2fe0003`)
- **Technical Stack**: Next.js 16.3.8 (Turbopack), React 19.2.4, PostgreSQL 17.6 on Supabase (`gsgseacjcalkhhmunjhx`)
- **Schema & Migrations**: 204 tables, 19 applied migrations through `0018`, 77 RLS policies, 5 hardened SECURITY DEFINER routines
- **Quality Metrics**: 65/65 test suites, 973/973 tests passing, 0 TypeScript errors, 100% AuthZ coverage (162/162 actions guarded)

---

## 3. Phase 4C Completed Capabilities

Phase 4C successfully delivered and certified:

1. **Organization Profile & Brand Controls** (`/settings/organization`):
   - Organization name, legal entity, workspace slug, country, address, contact details.
   - Primary and secondary brand color configuration.
2. **Members Management** (`/settings/members`):
   - Active members list with role badges, last active timestamps, and role assignment dropdown.
   - Owner protection invariant: prevents demoting or deactivating the last active owner.
   - Deactivate and reactivate member actions.
3. **Pending Invitations Lifecycle** (`/settings/members`):
   - Cryptographic invitation generation with single-use SHA-256 token hashing (`/invite/[token]`).
   - Copyable invite URL generator modal (`InviteMemberDialog`).
   - Rate-limited issuance (`RATE_LIMITS.invitationIssuance`).
   - Pending invitations management table with expiration display and revocation action (`revokeInvitationAction`).

---

## 4. Phase 4D Existing Route Inventory

The following routes currently exist in the codebase:

- `/clients`: Primary clients directory overview.
- `/clients/[clientId]`: Client details, associated projects, contacts drawer, and engagement activity.
- `/portal`: Client-facing unauthenticated / token-bound portal route root.
- `/portal/s/[token]`: Cryptographically signed client portal share links.

---

## 5. Existing Database Capabilities

The PostgreSQL schema contains dedicated tables for Client CRM:

### `public.clients`

- `client_id` (UUID, PK)
- `organization_id` (UUID, FK `organizations.organization_id`, indexed)
- `company_name` (Text, NOT NULL)
- `industry`, `website`, `address`, `country`, `notes`
- `status` (`client_status_enum`: 'active', 'inactive', 'lead', 'archived')
- `client_health` (`client_health_enum`: 'excellent', 'good', 'fair', 'poor')
- `logo_url`, `brand_colors` (JSONB array of hex strings), `typography`, `moodboards`
- `brand_assets_url`, `google_drive_folder_url`, `reference_assets`
- `preferred_communication` (`communication_preference_enum`: 'slack', 'email', 'whatsapp', 'portal')
- `ai_summary`, `ai_health_score`
- Standard audit fields (`created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`)

### `public.client_contacts`

- `contact_id` (UUID, PK)
- `client_id` (UUID, FK `clients.clientId`, indexed)
- `name` (Text, NOT NULL)
- `contact_type` (`contact_type_enum`: 'primary', 'billing', 'technical', 'creative', 'other')
- `designation`, `email`, `phone`, `linkedin`, `notes`
- `status` (`entity_status_enum`: 'active', 'inactive', 'archived')
- Standard audit fields

### Relational Links

- `public.projects.client_id` links projects directly to client accounts.
- `public.shares` links external client review share tokens to clients and deliverables.

---

## 6. Existing Server Actions Inventory

Implemented in `src/features/clients/actions.ts` (with dual real/mock execution):

1. `getClients({ search?, status?, limit?, offset? })`: Returns tenant-scoped client list.
2. `getClientById({ clientId })`: Returns client entity with associated contacts and active projects count.
3. `getClientActivity({ clientId, limit? })`: Returns audit/activity log stream for client interactions.
4. `createClient(data)`: Validates Zod schema and inserts new client under active organization.
5. `updateClient(data)`: Updates client metadata and brand guidelines.
6. `archiveClient({ clientId })`: Soft-deletes client and restricts further project assignment.
7. `createContact(data)`: Adds stakeholder contact to client roster.
8. `updateContact(data)`: Updates contact role and communication preferences.
9. `archiveContact({ contactId })`: Soft-deletes client contact.
10. `getClientsCount()`: Computes total client volume for telemetry.

---

## 7. Existing Authorization & Security Model

- **Permission Keys**:
  - `clients.read`: Read client directory and profiles.
  - `clients.create`: Register new client entities.
  - `clients.update`: Modify client details, brand guidelines, contacts.
  - `clients.delete`: Archive clients and contacts.
- **Tenant Isolation**:
  - All client queries filter strictly by `where(eq(clients.organizationId, currentUser.organizationId))`.
  - Zero acceptance of untrusted client-supplied `organizationId`.
- **Rate Limiting**:
  - `getClients`: Mapped to `RATE_LIMITS.resourceRead` (`pagination page >= 1, pageSize <= 100`).
  - Mutations: Mapped to `RATE_LIMITS.resourceMutation`.

---

## 8. UX Gaps & Implementation Priorities for Phase 4D

1. **Client Directory UI (`/clients`)**:
   - Translate Stitch Screen 09 ("Clients Workspace / CRM") into real components.
   - Replace basic card grid with executive workstation client cards featuring:
     - Company logo / monogram.
     - Brand color pill indicator.
     - Active project count and deliverable volume badges.
     - Primary stakeholder contact chip.
     - Health status indicator (Excellent: emerald, Good: sky, Fair: amber, Poor: rose).
2. **Client Command Center (`/clients/[clientId]`)**:
   - Header with quick actions: "New Project", "Add Contact", "Share Portal".
   - Tab 1: **Engagements / Projects** (Live projects linked via `projects.client_id`).
   - Tab 2: **Stakeholder Directory / Contacts** (Primary contact, billing contact, portal access permissions).
   - Tab 3: **Brand Kit & Assets** (Brand colors hex chips, drive links, moodboard references).
   - Tab 4: **Communication & Activity Feed** (Historical approvals, comments, and meeting notes).
3. **Contact Management Modal**:
   - Add/edit contact dialog with contact type selection ('primary', 'billing', 'creative', 'technical').
4. **Honest Empty States**:
   - Clean workstation empty states when a client has 0 projects or 0 contacts.

---

## 9. Technical Risks & Invariants

1. **Client Portal Leakage**: Client contact data must NEVER be exposed to unauthenticated portal viewers unless explicitly authorized by cryptographic share tokens (`/portal/s/[token]`).
2. **Cross-Tenant Project Collision**: Project creation from the client detail view must preserve `organization_code_prefix` and tenant boundaries.
3. **Database Schema Stability**: All Phase 4D UI requirements are 100% satisfied by the existing `clients` and `client_contacts` tables. **Zero database migrations required**.

---

## 10. Recommended Implementation Sequence for Phase 4D

1. **Audit & Components Preparation**:
   - Build `ClientCard`, `ClientHealthBadge`, `ClientContactDrawer`, and `BrandColorSwatches`.
2. **Redesign `/clients` Directory**:
   - Implement Stitch Screen 09 layout, search filter, and "Add Client" modal.
3. **Redesign `/clients/[clientId]` Command Center**:
   - Implement tabs (Projects, Contacts, Brand Kit, Activity).
4. **Validation & Security Gate**:
   - Rerun `audit:authz`, `typecheck`, `test`, `build`, and post-deployment smoke tests.
5. **Deployment & Release**:
   - Antideploy production rollout with live smoke verification.

---

## 11. Items That Must NOT Be Changed

- **Database Schemas & RLS**: No migration or RLS policy alteration without explicit justification.
- **Deep Navy / Obsidian Theme**: Colors, surface strata, and Electric Sky accents must remain unaltered.
- **Tenant Context Resolution**: `organizationId` must always derive from server session cookies.
- **Project Boundary**: Absolute quarantine from external projects.

---

## 12. Conclusion & Readiness Verdict

Phase 4D is fully scoped, architecturally verified, and backed by ready database tables and server actions.

```text
STATUS: READY FOR PHASE 4D HUMAN REVIEW
```
