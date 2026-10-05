# AI NEX OS — TENANT AUTHORIZATION COVERAGE & BOUNDARY HARDENING AUDIT

**Phase 4.4 Technical Audit & Pre-Production Boundary Verification**
**Date:** September 2026  
**Status:** COMPLETE & VERIFIED  
**Repository Identity:** AI NEX OS — The Operating System for Creative Execution

---

## 1. Scope

This document records the exhaustive tenant authorization audit, defense-in-depth boundary hardening, and object-level authorization verification executed in Phase 4.4.

The audit addresses the primary architectural risk of the AI NEX OS service layer:

> **Server-side Drizzle operates with privileged database credentials (bypassing Postgres Row Level Security). Tenant isolation therefore relies on application-level authorization, identity resolution, active tenant context derivation, and strict object-level validation.**

Phase 4.4 proves that the application-level authorization chain:
$$\text{CLIENT INPUT} \longrightarrow \text{AUTHENTICATED IDENTITY} \longrightarrow \text{ACTIVE ORGANIZATION} \longrightarrow \text{ACTIVE MEMBERSHIP} \longrightarrow \text{ROLE / PERMISSION} \longrightarrow \text{TENANT-SCOPED DATA ACCESS} \longrightarrow \text{AUTHORIZED OPERATION}$$
cannot be bypassed by arbitrary IDs, forged cookies, cross-tenant object manipulation, or parameter injection.

---

## 2. Trust Boundaries

AI NEX OS enforces four strict trust boundaries:

```
+-----------------------------------------------------------------------------------+
| CLIENT BROWSER / PORTAL CONSUMER (UNTRUSTED)                                     |
| - Arbitrary headers, forged cookies, manipulated route params, poisoned payloads  |
+-----------------------------------------------------------------------------------+
                                         │  (HTTP Request / Next.js Action)
                                         ▼
+-----------------------------------------------------------------------------------+
| BOUNDARY 1: AUTHENTICATION & EDGE GATEWAY                                         |
| - Supabase Auth (JWT verification via createClient() / getUser())                |
| - Demo Session Validator (cryptographically verified HMAC or reject)              |
| - Output: Verified authUserId (never client-supplied)                             |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| BOUNDARY 2: MEMBERSHIP & ACTIVE TENANT RESOLUTION                                 |
| - nexos_active_org_id cookie treated strictly as a context HINT                  |
| - Authoritative lookup: public.organization_memberships                           |
|   WHERE user_id = authUserId AND organization_id = hint AND status = 'active'     |
| - Fallback: Default active membership (is_default = true)                         |
| - Output: Validated TenantContext (organizationId, membershipId, roleId)          |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| BOUNDARY 3: ROLE & CAPABILITY ENFORCEMENT                                         |
| - Module/action permission resolution via app.has_permission / requirePermission  |
| - Wildcard {"*": ["*"]} restricted to verified active owner membership           |
| - Client-submitted roleId / roleKey rejected if foreign to active organization   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| BOUNDARY 4: OBJECT-LEVEL RESOURCE OWNERSHIP & DATA ACCESS (DRIZZLE ORM)           |
| - TenantRepository / withTenantScope auto-injects eq(table.organizationId, orgId) |
| - Direct Drizzle queries require resource-level tenant verification               |
| - Cross-tenant foreign keys (e.g. attaching task to Org B project) blocked        |
+-----------------------------------------------------------------------------------+
```

---

## 3. Authentication Source

All protected entry points derive identity exclusively from verified platform mechanisms:

1. **Production / Staging / Non-Demo Mode**:
   - `createClient().auth.getUser()`: Verifies cryptographic JWT signature against Supabase Auth.
   - `getCurrentIdentity()`: Extracts verified `authUserId`.
   - Never trusts `userId` from client request headers, bodies, or query strings.
2. **Demo Mode (`DEMO_MODE=true`)**:
   - Validated against deterministic demo sessions (`nexos-demo-session`).
   - Demo session token checked via constant-time comparison.
   - Demo user cannot be spoofed through random strings.

---

## 4. Active Tenant Resolution

The active workspace organization is resolved via `resolveActiveOrganizationContext`:

1. **Candidate Organization Hint**:
   - Extracted from `nexos_active_org_id` cookie.
   - Sanitized via UUID parser. Invalid UUID formats immediately discarded.
2. **Authoritative Membership Verification**:
   - Queries `organization_memberships` for `(user_id = authUserId, organization_id = hint, status = 'active', deleted_at IS NULL)`.
   - If found: Derives active tenant context from this membership record.
3. **Cookie Forgery & Stale Cookie Resilience**:
   - If the cookie contains an organization ID where the user has no active membership (or membership is suspended/deleted):
   - **The cookie is completely ignored.**
   - System automatically queries the user's active memberships ordered by `is_default DESC, created_at ASC` and falls back to the legitimate default active organization.
4. **Unaffiliated State Handling**:
   - If the user holds zero active memberships across all tenants, tenant context resolution fails safely (`MembershipError("MEMBERSHIP_NOT_FOUND")`), routing the user to onboarding.

---

## 5. Membership Authority

`public.organization_memberships` is the sole source of truth for:

- Tenant membership status (`active`, `invited`, `suspended`, `pending`).
- Tenant role assignment (`role_id`).
- Tenant department assignment (`department_id`).
- Tenant designation (`designation`).

Invariant:

- **A user cannot perform any operation within an organization without an active, non-deleted membership in that organization.**
- Suspended memberships (`status = 'suspended'`) and soft-deleted memberships (`deleted_at IS NOT NULL`) cannot resolve an active context.

---

## 6. Role & Permission Authority

- Roles are scoped to organizations: `roles.organization_id` references `organizations.organization_id`.
- System roles (Owner, Admin, Member, Guest) are seeded per tenant with distinct UUIDs and immutable permission profiles.
- Client submissions of `roleId` (e.g., during member invitation or role updating) are verified against the caller's active organization:
  ```typescript
  const [role] = await db
    .select({ roleId: roles.roleId })
    .from(roles)
    .where(
      and(
        eq(roles.roleId, input.roleId),
        eq(roles.organizationId, user.organizationId),
      ),
    );
  if (!role)
    throw new Error("Role not found or belongs to another organization");
  ```
- Cross-tenant role injection and privilege escalation through foreign role UUIDs are rejected.

---

## 7. TenantRepository Model

The `TenantRepository` provides a tenant-bound query facade:

- **Construction Requirement**: Valid `TenantContext` containing verified `organizationId`, `userId`, and `membershipId`. Constructing without these throws `SecurityViolationError`.
- **Query Auto-Scoping**: Automatically appends `eq(table.organizationId, this.orgId)` and `isNull(table.deletedAt)` to read, update, and delete operations.
- **withScope Helper**: Produces an equality predicate binding arbitrary tables to `this.orgId`.
- **Resource Lookups**: Injects both `resourceId` and `organizationId` into where clauses:
  $$\text{where: } \text{and}(\text{eq}(\text{table.id}, \text{targetId}), \text{eq}(\text{table.organizationId}, \text{orgId}))$$

---

## 8. Global vs Tenant-Scoped Tables

The AI NEX OS database schema is classified into two distinct operational scopes:

| Classification        | Tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Isolation Model                                                                                                  | Access Policy                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TENANT-SCOPED**     | `organizations`, `roles`, `departments`, `organization_memberships`, `organization_invitations`, `projects`, `clients`, `timelines`, `project_phases`, `milestones`, `timeline_dependencies`, `tasks`, `task_dependencies`, `task_time_logs`, `files`, `file_folders`, `file_versions`, `deliverables`, `deliverable_revisions`, `deliverable_review_sessions`, `deliverable_approvals`, `deliverable_share_links`, `meetings`, `meeting_agenda_items`, `meeting_transcripts`, `meeting_action_items`, `activity_logs`, `notifications`, `attendance_records`, `attendance_breaks`, `work_sessions`, `intervals`, `ai_workspace_*` | Partitioned strictly by `organization_id` foreign key. Unique constraints composite on `(organization_id, ...)`. | **Strict Tenant Isolation**: Every query must filter by `organization_id`. Cross-tenant mutations blocked.                                                     |
| **GLOBAL / PLATFORM** | `users` (Global Identity profile), `auth.users` (Supabase Auth credentials), `background_jobs` (Worker execution queue), Platform system reference constants                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Shared infrastructure / global entity tables.                                                                    | **Controlled Global Access**: `users` queried only for identity lookup and authentication; `background_jobs` claimed by worker with payload tenant validation. |

---

## 9. Server Action Audit & Hardening

Every exported server action across `src/features/**/real-actions.ts` was systematically audited:

| Module                                           | Hardening Actions Applied                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files (`src/features/files`)**                 | 1. Schema updated: `organizationId` made optional in `createFolderSchema` and `initializeUploadSchema`.<br>2. Action updated: Server actions strictly inject `user.organizationId` into storage quotas, folders, files, and file versions.<br>3. Client-supplied `organizationId` completely ignored.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Projects (`src/features/projects`)**           | 1. `updateProjectMemberRole` and `removeProjectMember` hardened: Joined `projectMembers` with `projects` to verify `projects.organizationId === user.organizationId` before updating or deleting member records.<br>2. BOLA / IDOR vulnerability on member ID eliminated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Tasks (`src/features/tasks`)**                 | 1. `createTask` hardened: Verifies `data.projectId` belongs to `user.organizationId` before creating task.<br>2. `assignTask` hardened: Verifies assigned user belongs to caller's organization.<br>3. `stopTaskTimer` hardened: Scoped to both `user.userId` and `user.organizationId`.<br>4. `addTaskDependency` hardened: Validates access on both predecessor and successor tasks.                                                                                                                                                                                                                                                                                                                                                                                        |
| **Deliverables (`src/features/deliverables`)**   | 1. `createDeliverable` hardened: Validates `data.projectId` belongs to caller's active organization.<br>2. Validates optional `clientId` and `taskId` belong to caller's organization.<br>3. Cross-tenant deliverable grafting blocked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Organizations (`src/features/organizations`)** | 1. `createInvitation` hardened: Validates `input.roleId` belongs to `input.organizationId`.<br>2. `revokeInvitation` hardened: Accepts `targetOrganizationId` and scopes DB update to `and(eq(id), eq(orgId))`.<br>3. `revokeInvitationAction` hardened: Passes `currentUser.organizationId` to `revokeInvitation`.<br>4. `updateUserRole` hardened: Scopes role query to `user.organizationId`, and synchronizes `organizationMemberships.roleId` in addition to legacy `users.roleId`.<br>5. `deactivateUser` / `reactivateUser` hardened: Synchronizes `organizationMemberships.status` with `users.status`.<br>6. `getOrganizationMembers` upgraded: Queries `organizationMemberships` with joins to `users` and `roles`, enabling full multi-membership member listings. |
| **Workforce (`src/features/workforce`)**         | All operations filter by `user.organizationId` and enforce attendance policy timezones resolved from the active organization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## 10. Direct Drizzle Exceptions

Direct privileged Drizzle calls (using `db.select`, `db.insert`, `db.update`, `db.delete`) are permitted only under strict criteria:

1. **Module contains explicit caller identity and permission checks** (`requireCurrentUser()`, `requirePermission()`).
2. **Every SQL query includes an explicit predicate on `table.organizationId = user.organizationId`**.
3. **Cross-table mutations verify parent/child relationship ownership** (e.g. project ownership checked when creating a task).
4. Direct queries that fail to filter by `organizationId` are detected and flagged by the static authorization gate.

---

## 11. Legacy `users.organization_id` Compatibility

Phase 3 and Phase 4 operate under Stage C Dual-Read architecture:

- `organization_memberships` is the **authoritative** source of active tenant context and multi-membership.
- `users.organization_id` is maintained for backwards compatibility with legacy routes and scripts.
- **Security Rule**: In any context where `organization_memberships` exists, it takes precedence. `users.organization_id` is NEVER permitted to override an active membership context.
- When an active membership resolves a tenant different from `users.organization_id`, dual-read logging records the multi-membership execution (`[DUAL-READ] Active membership differs from legacy users.organization_id`).

---

## 12. Active Organization Cookie Security

`nexos_active_org_id` configuration & security characteristics:

1. **Attributes**: `HttpOnly`, `Secure` (in production/HTTPS), `SameSite=Lax`, `Path=/`, `Max-Age=30 days`.
2. **Context-Only Principle**: The cookie is treated solely as a UI navigation hint. It does NOT establish authority.
3. **Server Validation**: The server validates the cookie against `organization_memberships`. An attacker crafting a cookie for Org X when they only belong to Org Y receives access ONLY to Org Y.
4. **Privilege Escalation**: Modifying or forging the cookie cannot grant permissions or roles in unauthorized organizations.

---

## 13. IDOR / BOLA Coverage

Exhaustive object-level authorization tests verify that knowing another organization's UUID does not permit unauthorized operations:

| Resource Type      | IDOR Attack Vector                      | Server Defense                                                    | Result                 |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------- | ---------------------- |
| **Project**        | Read Org B project by UUID              | `where: and(eq(projectId, id), eq(organizationId, callerOrg))`    | Returns `null` / 404   |
| **Project**        | Update Org B project by UUID            | `where: and(eq(projectId, id), eq(organizationId, callerOrg))`    | 0 rows affected        |
| **Task**           | Inject Org B project into new task      | Validates project ownership before insert                         | Operation rejected     |
| **Task**           | Assign task to user in another org      | Validates assignee membership in caller org                       | Operation rejected     |
| **Project Member** | Delete member using foreign memberId    | Joins with `projects` and checks `organizationId`                 | Operation rejected     |
| **Deliverable**    | Attach deliverable to Org B project     | Validates project ownership before insert                         | Operation rejected     |
| **File / Folder**  | Pass foreign `organizationId` in upload | Disregards payload; injects `user.organizationId`                 | Scoped to caller org   |
| **Invitation**     | Revoke invitation of another tenant     | `where: and(eq(invitationId, id), eq(organizationId, callerOrg))` | `INVITATION_NOT_FOUND` |
| **Membership**     | Modify role/status in another tenant    | `where: and(eq(userId, id), eq(organizationId, callerOrg))`       | 0 rows affected        |

---

## 14. Cross-Tenant Test Matrix

The following test matrix was executed against disposable local PostgreSQL (`nexos_p44_rehearsal`) and unit test suites:

| Test ID    | Scenario                                    | Expected          | Result   | Evidence                                               |
| ---------- | ------------------------------------------- | ----------------- | -------- | ------------------------------------------------------ |
| **P4-045** | Member of Org A reads Org B project         | Denied (Null/404) | **PASS** | `TenantRepository.projects.findById` returns `null`    |
| **P4-046** | Member of Org A mutates Org B project       | Denied (0 rows)   | **PASS** | `update` returns `null`; DB record unchanged           |
| **P4-047** | Forged active-org cookie for foreign org    | Rejected          | **PASS** | Cookie discarded; defaults to user's active membership |
| **P4-048** | Suspended membership activation attempt     | Denied            | **PASS** | Query for active context returns NULL / throws         |
| **P4-049** | Deleted membership activation attempt       | Denied            | **PASS** | Soft-deleted memberships filtered out                  |
| **P4-050** | Legacy users.org_id vs multi-membership     | Membership Wins   | **PASS** | Context derived from active membership record          |
| **P4-051** | Client organizationId override attempt      | Rejected          | **PASS** | `TenantRepository` throws `SecurityViolationError`     |
| **P4-052** | Client roleId escalation with foreign role  | Rejected          | **PASS** | Foreign role lookup in caller org returns NULL         |
| **P4-053** | Client userId targeting foreign user        | Rejected          | **PASS** | Scoped query returns 0 rows                            |
| **P4-054** | Cross-tenant membership mutation            | Rejected          | **PASS** | Membership update constrained by caller org            |
| **P4-055** | Cross-tenant invitation revocation          | Rejected          | **PASS** | `revokeInvitation` throws `INVITATION_NOT_FOUND`       |
| **P4-056** | Multi-member dashboard metrics isolation    | Strictly Scoped   | **PASS** | Org A context returns 2 projects; Org B returns 1      |
| **P4-057** | Cross-tenant deliverable search leakage     | Blocked           | **PASS** | Search for shared term returns only caller org items   |
| **P4-058** | Cross-tenant task aggregation leakage       | Blocked           | **PASS** | Counts strictly partitioned (Alpha=2, Beta=1)          |
| **P4-059** | Protected server action unauthenticated     | Denied            | **PASS** | Static audit confirms all actions guarded              |
| **P4-060** | Protected server action untrusted org param | Denied            | **PASS** | Static audit confirms 0 untrusted org params           |

---

## 15. AST & Static Enforcement

`scripts/audit-authorization.ts` runs on every CI run and commit to enforce two static gates:

1. **Authorization Guard Gate (`auditAuthorization`)**:
   - Walks all exported async server actions in `real-actions.ts`, `real-index.ts`, `real-queries.ts`, `action-core.ts`.
   - Confirms that every action reaches `requireCurrentUser()`, `requirePermission()`, `getCurrentUser()`, or is explicitly listed in `UNAUTHENTICATED_BY_DESIGN` (restricted strictly to sign-in surface).
2. **Tenant Isolation Gate (`auditTenantIsolation`)**:
   - Analyzes parameter signatures of all exported actions.
   - Detects any action accepting an `organizationId` parameter from client input without validating or overriding it with `user.organizationId` / `currentUser.organizationId`.
   - Result: **0 violations detected across entire codebase**.

---

## 16. Known Limitations

1. **Server-side Drizzle Table-Owner Access**:
   - Direct Drizzle queries execute as table-owner in Postgres and bypass RLS policies. Application-level guards remain the primary isolation boundary for internal backend queries.
2. **Supabase Client Portal Tokens**:
   - Client portal endpoints use token-based session resolution (`resolvePortalSession`) rather than authenticated internal user sessions. These operate through portal security middleware.
3. **Demo Mode Store**:
   - When running in `DEMO_MODE=true`, data is stored in memory (`demoStore`) rather than PostgreSQL. Demo mode implements exact structural mirror parity with database invariants.

---

## 17. Remaining Risks

| Severity   | Risk Description                                                            | Mitigation                                                                        | Pre-Production Action                                                     |
| ---------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **MEDIUM** | Future server actions might introduce direct queries without tenant scoping | Static AST audit gate (`auditTenantIsolation`) enforced in CI pipeline            | Maintain CI gate blocking merges on un-scoped queries                     |
| **LOW**    | Legacy `users.organization_id` column still exists                          | Dual-read architecture prioritizes `organization_memberships` in all active paths | Phase 5 will deprecate and drop legacy column once all read paths migrate |
| **LOW**    | Direct SQL migrations bypass Drizzle schema checks                          | Rehearsal scripts test full migration chain against clean PostgreSQL instances    | All migrations must pass local rehearsal before production deployment     |

---

## 18. Pre-Production Requirements

Before production deployment:

1. Run `npx tsx scripts/audit-authorization.ts` to verify 100% static authorization coverage.
2. Run `npm test` to verify all 847 regression tests pass.
3. Verify `DATABASE_URL` uses direct connection for migrations and pooled connection for application runtime.
4. Verify `nexos_active_org_id` cookie is marked `Secure` in production environments (`NEXT_PUBLIC_APP_URL` using HTTPS).
5. Ensure production Supabase service role key is stored securely in environment secrets and never committed.
