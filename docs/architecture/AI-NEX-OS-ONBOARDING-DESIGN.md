# AI NEX OS — Self-Service Identity & Organization Onboarding Architecture
## Phase 4.1: Technical Architecture & State Machine Specification

---

## Document Control

| Attribute | Detail |
| :--- | :--- |
| **Document Path** | `docs/architecture/AI-NEX-OS-ONBOARDING-DESIGN.md` |
| **Version** | 1.0.0 (Phase 4.1 Architectural Baseline) |
| **Status** | **APPROVED TECHNICAL DESIGN & SPECIFICATION** |
| **Date** | September 26, 2026 |
| **Architects** | Principal Software Architect, Security Architect, Database Architect |
| **Repository Root** | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`) |
| **Target Branch** | `phase-2-production-readiness` |
| **Scope** | Global Identity States, Membership States, State Machine Transitions, Invitation Protocol, Self-Service Provisioning, Organization Switching, and Legacy Compatibility. |

---

## 1. Executive Summary & Security Philosophy

The core security principle of **AI NEX OS** is:

> **Authentication is NOT Authorization.**

In legacy single-tenant architectures, a valid authentication credential granted immediate access to the hardcoded organization. In the sovereign multi-tenant architecture of AI NEX OS, authentication only validates the caller's global human identity. Tenant workspace authority is established strictly through the following unidirectional authorization chain:

```
  Authentication (Supabase Auth: auth.users)
          │
          ▼
  Global Identity (public.users profile)
          │
          ▼
  Organization Membership (public.organization_memberships: status = 'active')
          │
          ▼
  Authoritative Role & Permissions (public.roles via membership)
          │
          ▼
  Workspace & Workforce Tenant Access (eq(table.organizationId, context.organizationId))
```

Under this model:
1. An authenticated Supabase user without an active organization membership **CANNOT** access any tenant workspace or workforce data.
2. Email domain matching alone **NEVER** grants tenant authority.
3. Client-supplied `organization_id` inputs in query parameters, form bodies, or headers are **NEVER** trusted as proof of membership.
4. Server-side identity is derived exclusively from the cryptographically verified Supabase session (`supabase.auth.getUser()`).
5. Organization membership and active status are verified server-side on every request.

---

## 2. Identity & Membership State Machine

### 2.1 Global Identity States

| Identity State | Definition | Permitted Route Surface |
| :--- | :--- | :--- |
| **`AUTHENTICATED_UNAFFILIATED`** | User holds valid Supabase credentials (`auth.users`) but has zero active organization memberships. | `/onboarding`, `/invite/*`, `/api/health`, `/auth/*`, `/settings/profile` |
| **`AUTHENTICATED_MEMBER`** | User holds exactly 1 active organization membership (`status = 'active'`). | Workspace (`/dashboard`, `/projects`, `/tasks`, `/deliverables`), Workforce, Settings |
| **`AUTHENTICATED_MULTI_MEMBER`** | User holds $\ge 2$ active organization memberships across distinct sovereign agencies. | Full Workspace & Workforce scoped to active tenant context + Organization Switcher |
| **`AUTHENTICATED_INVITED`** | User has a pending, valid invitation token addressed to their identity or entered manually. | `/invite/[token]`, `/onboarding?invite=[token]` |
| **`AUTHENTICATED_SUSPENDED`** | User's membership in the active organization has `status = 'suspended'`. | `/unauthorized` (Tenant access strictly blocked) |

---

### 2.2 Organization Membership States

The `membership_status` enum (`active`, `invited`, `suspended`, `pending`) governs a user's rights within an organization:

| Status | Semantics & Authorization Privileges |
| :--- | :--- |
| **`active`** | Full access to organization workspace according to assigned role permissions. Can be set as default active organization. |
| **`suspended`** | User retains historical attribution (audit trails, activity logs, author fields) but is strictly denied tenant execution and read access. |
| **`invited`** | Placeholder record indicating user has been invited to the organization. Cannot establish active tenant context until accepted. |
| **`pending`** | Membership awaiting administrative review/approval (under `APPROVAL_REQUIRED` registration mode). |

---

### 2.3 Valid State Transitions

```
[Unauthenticated Visitor]
         │ (Sign in / Sign up via Supabase Auth)
         ▼
[AUTHENTICATED_UNAFFILIATED]
         │
         ├──────────────────────────────────────────────┐
         │ (Action: createOrganization)                 │ (Action: acceptInvitation)
         ▼                                              ▼
[Provision Org + Owner Role]                   [Validate Token & Role]
         │                                              │
         ▼                                              ▼
[Insert organization_memberships (active)]     [Insert organization_memberships (active)]
         │                                              │
         ▼                                              ▼
[Set nexos_active_org_id Cookie]               [Set nexos_active_org_id Cookie]
         │                                              │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
                      [AUTHENTICATED_MEMBER]
                                │
                                │ (Accepts second invitation OR creates second org)
                                ▼
                   [AUTHENTICATED_MULTI_MEMBER]
                                │
                                ├─► (switchActiveOrganization) ──► [Context Switched]
                                │
                                └─► (Admin deactivates member) ──► [AUTHENTICATED_SUSPENDED]
```

#### Detailed Transition Rules:
1. **Transition T-01: Unaffiliated User Creates Organization**
   - **Pre-condition**: Caller is authenticated (`auth.users.id`). Caller has no active membership or is creating a secondary tenant.
   - **Trigger**: Caller invokes `createOrganization({ organizationName, slug?, codePrefix? })`.
   - **Operations**:
     1. Validate name, slug, and code prefix.
     2. Insert `organizations` row (`status = 'active'`).
     3. Insert default `SYSTEM_ROLES` for the organization.
     4. Locate the newly created `owner` role.
     5. Ensure `public.users` row exists for caller (`status = 'active'`).
     6. Insert `organization_memberships` row (`user_id`, `organization_id`, `role_id: ownerRoleId`, `status: 'active'`, `is_default: true`).
     7. Initialize `organization_sequences` row for sequential identifiers.
     8. Set `nexos_active_org_id` cookie.
   - **Post-condition**: User enters `AUTHENTICATED_MEMBER` (or `AUTHENTICATED_MULTI_MEMBER`). Workspace access granted with Owner permissions.

2. **Transition T-02: Invited User Accepts Invitation**
   - **Pre-condition**: Caller is authenticated. Valid invitation exists (`status = 'pending'`, `expires_at > now()`).
   - **Trigger**: Caller invokes `acceptInvitation(rawToken)`.
   - **Operations**:
     1. Verify token hash against `organization_invitations`.
     2. Ensure caller's authenticated email matches invitation email (case-insensitive).
     3. Ensure `public.users` row exists for caller.
     4. Insert `organization_memberships` (`user_id`, `organization_id`, `role_id: invitation.role_id`, `status: 'active'`).
     5. Update invitation: `status = 'accepted'`, `accepted_at = now()`, `accepted_by_user_id = caller.id`.
     6. Set `nexos_active_org_id` cookie.
   - **Post-condition**: User transitions to `AUTHENTICATED_MEMBER` or `AUTHENTICATED_MULTI_MEMBER`. Replay of the same token is permanently blocked.

3. **Transition T-03: Multi-Member Switches Active Organization**
   - **Pre-condition**: Caller has active memberships in Org A and Org B. Active cookie points to Org A.
   - **Trigger**: Caller invokes `switchOrganizationAction({ targetOrgId: Org B })`.
   - **Operations**:
     1. Verify caller has `status = 'active'` and `deleted_at IS NULL` membership in Org B.
     2. Update `nexos_active_org_id` cookie to Org B.
     3. Trigger `router.refresh()` on client to reload server components.
   - **Post-condition**: Active context updates to Org B. Authorization rules and role permissions re-evaluated against Org B's role.

---

### 2.4 Invalid & Forbidden Transitions (Fail-Closed Enforcement)

| Attempted Transition | Failure Mode & Security Response |
| :--- | :--- |
| **Unaffiliated &rarr; Tenant Workspace Direct Access** | Redirected to `/onboarding`. Direct attempts to access `/dashboard` or `/projects` fail render-time guard `requireCurrentUser()`. |
| **Suspended Member &rarr; Active Workspace Access** | Access denied. `resolveActiveOrganizationContext()` throws `MEMBERSHIP_INACTIVE`. User redirected to `/unauthorized`. |
| **Caller &rarr; Switch to Non-Member Organization** | Access denied. `switchActiveOrganization()` throws `ORGANIZATION_UNAUTHORIZED`. Cookie is NOT modified. |
| **Caller &rarr; Switch to Suspended Membership Org** | Access denied. `switchActiveOrganization()` throws `MEMBERSHIP_INACTIVE`. Cookie is NOT modified. |
| **Caller &rarr; Accept Expired Invitation** | Acceptance rejected (`INVITATION_EXPIRED`). No membership is created. |
| **Caller &rarr; Accept Revoked Invitation** | Acceptance rejected (`INVITATION_REVOKED`). No membership is created. |
| **Caller &rarr; Replay Already Accepted Invitation** | Acceptance rejected (`INVITATION_ALREADY_ACCEPTED`). Unique constraint prevents duplicate membership. |
| **Caller &rarr; Self-Assign Arbitrary Role on Creation** | Caller role is hardcoded to the seeded `owner` role of the newly created organization. Any client-provided role ID is discarded. |

---

## 3. Registration Policy Architecture (`REGISTRATION_MODE`)

In accordance with **ADR-008**, registration mode is governed by the environment configuration `REGISTRATION_MODE`:

1. **`SELF_SERVICE` (Default for Phase 4)**:
   - Any authenticated user without an organization can immediately create a sovereign workspace via `/onboarding`.
   - The user immediately becomes the `Owner` with full administrative privileges over that workspace.
2. **`INVITE_ONLY`**:
   - Organization creation via `/onboarding` is restricted. Users must redeem a valid invitation token.
3. **`APPROVAL_REQUIRED`**:
   - Organization creation creates an organization in `pending` status pending platform administrative review.

---

## 4. Organization Creation Pipeline

The organization creation pipeline must guarantee transactional consistency:

```typescript
export interface CreateOrganizationInput {
  organizationName: string;
  slug?: string;
  codePrefix?: string;
  timezone?: string;
  currency?: string;
}
```

### 4.1 Derivation Rules:
- **Slug**: Generated from `organizationName` via lowercase hyphenation (e.g., `"Acme Creative"` &rarr; `"acme-creative"`). If slug collisions occur, a random 4-character hex suffix is appended.
- **Code Prefix**: If provided, validated against `codePrefixSchema` (2-8 uppercase alphanumeric, not in `RESERVED_CODE_PREFIXES`). If omitted, derived from uppercase initials of `organizationName` (minimum 2 chars, max 4 chars), defaulting to `"NEX"`.

---

## 5. Tokenized Invitation Protocol

### 5.1 Cryptographic Design
To prevent leakage via database snapshot exposure:
1. **Raw Token**: 32 bytes of cryptographically secure random entropy (`crypto.randomBytes(32).toString("hex")`, 64 hex characters).
2. **Storage**: Only the SHA-256 / HMAC-SHA256 digest (`token_hash`) is stored in `public.organization_invitations`.
3. **Redemption**: The client submits the raw token; the server recomputes the hash and queries `token_hash = hash(rawToken)`.
4. **Expiry**: Invitations expire 7 calendar days after issuance (`expires_at = now() + 7 days`).

---

## 6. Legacy Compatibility Invariants

During Phase 4, the target architecture preserves 100% backward compatibility:
- `public.users.organization_id` (`uuid NOT NULL`) is preserved and populated with the user's primary/first organization during creation.
- `public.users.role_id` (`uuid NOT NULL`) is preserved and populated with the user's primary/first role.
- Dual-read logic in `getCurrentUser()` ensures seamless operation whether querying via `organization_memberships` or fallback legacy columns.
- No columns are dropped. No destructive migrations are executed.
