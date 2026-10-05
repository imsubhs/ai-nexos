# AI NEX OS — Architecture Traceability Matrix

## Phase 1C: Requirements-to-Architecture Traceability Specification

---

## Document Control

| Attribute           | Detail                                                                                                                                                                             |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Path**   | `docs/architecture/AI-NEX-OS-ARCHITECTURE-TRACEABILITY.md`                                                                                                                         |
| **Version**         | 1.0.0 (Phase 1C Traceability Matrix)                                                                                                                                               |
| **Status**          | **APPROVED TECHNICAL DESIGN (DOCUMENTATION ONLY)**                                                                                                                                 |
| **Date**            | September 26, 2026                                                                                                                                                                 |
| **Architects**      | Principal Enterprise Architect, Systems Architect, Compliance Officer                                                                                                              |
| **Repository Root** | `ai-nexos` (`NEXOS Comb / AIC NEXOS / ai-nexos`)                                                                                                                                   |
| **Target Branch**   | `phase-2-production-readiness`                                                                                                                                                     |
| **Scope**           | End-to-end traceability mapping PRD requirements AR-001 through AR-030 to ADRs, Target Components, Database Entities, Security Boundaries, Test Requirements, and Migration Steps. |

---

## 1. Traceability Architecture & Coverage Overview

This traceability matrix proves that every architectural requirement defined in **PRD V2 §82 (AR-001 through AR-030)** and every acceptance criterion **(AC-ID-001 through AC-RAT-001)** has a direct, concrete design specification in the Phase 1C architecture.

No requirement is unaddressed; no architectural component exists without requirement justification.

---

## 2. Master Architecture Traceability Matrix (AR-001 through AR-030)

| Requirement ID | Requirement Name                  | Architecture Decision | Target Component                     | Database Entity                   | Security Boundary             | Test Requirement                  | Migration Step | Acceptance Criteria |
| :------------- | :-------------------------------- | :-------------------- | :----------------------------------- | :-------------------------------- | :---------------------------- | :-------------------------------- | :------------- | :------------------ |
| **AR-001**     | Identity Independence             | ADR-001               | `src/features/auth/`                 | `public.users`                    | Global App Perimeter          | `current-user.test.ts`            | Stage 1, 2, 8  | AC-ID-001           |
| **AR-002**     | Organization Independence         | ADR-002, ADR-006      | `src/features/organizations/`        | `public.organizations`            | Sovereign Tenant Root         | `org-sovereignty.test.ts`         | Stage 1        | AC-ORG-001          |
| **AR-003**     | Membership Independence           | ADR-002               | `src/features/memberships/`          | `organization_memberships`        | M:N Association Boundary      | `membership-crud.test.ts`         | Stage 1, 2, 6  | AC-MEM-001          |
| **AR-004**     | Role Isolation                    | ADR-002               | `src/features/roles/`                | `roles` & `memberships.role_id`   | Role Assignment Perimeter     | `role-containment.test.ts`        | Stage 2, 4, 7  | AC-ROL-001          |
| **AR-005**     | Permission Isolation              | ADR-004, ADR-005      | `src/features/permissions/engine.ts` | `roles.permissions` (JSONB)       | Action Gating Perimeter       | `permissions.test.ts`             | Stage 6        | AC-PRM-001          |
| **AR-006**     | Tenant Isolation                  | ADR-004, ADR-005      | `createTenantRepository`             | All Operational Tables            | Four-Layer Defense-in-Depth   | `TEST-ISO-001`, AST Gate          | Continuous     | AC-TEN-001          |
| **AR-007**     | Multi-Membership Support          | ADR-001, ADR-002      | `src/features/auth/current-user.ts`  | `organization_memberships`        | User Membership Scope         | `multi-membership.test.ts`        | Stage 6        | AC-MEM-002          |
| **AR-008**     | Organization Switching            | ADR-003               | TopNav `OrgSwitcher` & Server Action | Cookie `nexos_active_org_id`      | Context Resolution Perimeter  | `TEST-ISO-005`, Playwright        | Stage 6        | AC-SWT-001          |
| **AR-009**     | Invitation Lifecycle              | ADR-007               | `src/features/invitations/`          | `organization_invitations`        | Cryptographic Token Hash      | `TEST-ISO-008`, Playwright        | Stage 1, 5     | AC-INV-001          |
| **AR-010**     | Onboarding Lifecycle              | ADR-008               | `src/app/(auth)/onboarding/`         | Tri-State Router                  | Zero-Privilege Safe State     | `onboarding-flow.test.ts`         | Stage 5        | AC-ONB-001          |
| **AR-011**     | Workspace / Workforce Unification | ADR-001, ADR-002      | `src/features/workforce/`            | `users` & `memberships`           | Single Identity Audit Trail   | `workforce-identity.test.ts`      | Stage 2, 4     | AC-ID-002           |
| **AR-012**     | Client Access Isolation           | ADR-010               | `src/proxy.ts` (Domain Split)        | `external_identities`             | Zero-Login External Edge      | `proxy-domain-split.test.ts`      | Continuous     | AC-CLI-001          |
| **AR-013**     | Secure Share Links                | ADR-010               | `src/features/shares/`               | `deliverable_share_links`         | HMAC Nonce & Password Gate    | `TEST-ISO-006`, Token Tests       | Continuous     | AC-SHR-001          |
| **AR-014**     | Organization Branding Isolation   | ADR-006               | `src/components/theming/`            | `organizations.brand_*_color`     | Dynamic CSS Var Injection     | `theming-xss.test.ts`             | Stage 1        | AC-BRD-001          |
| **AR-015**     | Data Ownership                    | ADR-002               | `src/features/export/`               | All Tables with `organization_id` | Sovereign Tenant Partition    | `tenant-export.test.ts`           | Continuous     | AC-OWN-001          |
| **AR-016**     | Auditability                      | ADR-004               | `src/features/audit/`                | `public.activity_logs`            | Append-Only Immutable Log     | `audit-immutable.test.ts`         | Continuous     | AC-AUD-001          |
| **AR-017**     | Configuration Isolation           | ADR-006               | `src/features/settings/`             | `organization_settings`           | Database Configuration Root   | `org-settings.test.ts`            | Stage 1        | AC-CFG-001          |
| **AR-018**     | Storage Isolation                 | ADR-004               | Supabase Storage Integration         | `/{organization_id}/*` Path       | Storage RLS Prefix Policies   | `storage-prefix.test.ts`          | Continuous     | AC-STR-001          |
| **AR-019**     | Notification Isolation            | ADR-004               | `src/features/notifications/`        | `public.notifications`            | Scoped Recipient Boundary     | `notification-isolation.test.ts`  | Continuous     | AC-NTF-001          |
| **AR-020**     | Search Isolation                  | ADR-004               | Command Palette (`Cmd+K`)            | Scoped Search Indexers            | Tenant Query Filtering        | `search-boundary.test.ts`         | Stage 6        | AC-SCH-001          |
| **AR-021**     | Analytics Isolation               | ADR-004               | `src/features/analytics/`            | Aggregation Views                 | Tenant Predicate Injection    | `analytics-boundary.test.ts`      | Continuous     | AC-ANL-001          |
| **AR-022**     | AI Context Isolation              | ADR-011               | `src/lib/ai/context-builder.ts`      | `ai_contexts`, `ai_conversations` | Semantic Vector Org Filter    | `TEST-ISO-007`                    | Continuous     | AC-AIC-001          |
| **AR-023**     | AI Cost Isolation                 | ADR-012               | `AICostGovernance` Engine            | `ai_cost_tracking`                | Token Quota Throttling Gate   | `ai-cost-cap.test.ts`             | Continuous     | AC-CST-001          |
| **AR-024**     | API Tenant Enforcement            | ADR-004               | `"use server"` Actions & Routes      | `requireTenantContext()`          | AST Surface Gate              | `tenant-identity-surface.test.ts` | Continuous     | AC-API-001          |
| **AR-025**     | Server-Side Authorization         | ADR-005               | `requirePermission()` Guards         | Server Action Entry Perimeter     | Fail-Closed Server Gate       | `authorization-guard.test.ts`     | Continuous     | AC-AUT-001          |
| **AR-026**     | Database-Level Protection         | ADR-005               | PostgreSQL Schema `app`              | Tables with RLS Active            | `app.is_org_member` Definer   | `pgtap-rls.test.ts`               | Stage 1        | AC-RLS-001          |
| **AR-027**     | Production / Staging Segregation  | ADR-014               | `scripts/lib/environment.ts`         | Environment Configuration         | Fail-Closed Config Guards     | `env-validation.test.ts`          | Continuous     | AC-ENV-001          |
| **AR-028**     | Observability                     | ADR-004               | Centralized Structured Logger        | Sanitized JSON Telemetry          | Zero-Credential Log Redaction | `log-redaction.test.ts`           | Continuous     | AC-OBS-001          |
| **AR-029**     | Rate Limiting                     | ADR-007               | `src/lib/rate-limit/`                | In-Memory / Redis Counters        | Network & Auth Boundary       | `auth-rate-limit.test.ts`         | Continuous     | AC-RAT-001          |
| **AR-030**     | Secure Onboarding                 | ADR-008               | `createOrganizationAndOwner()`       | Atomic Onboarding Transaction     | System Role Seeding Integrity | `atomic-onboarding.test.ts`       | Stage 5        | AC-ONB-002          |

---

## 3. Acceptance Criteria Coverage Mapping

All 30 acceptance criteria from PRD V2 §83 are fully verified across the architecture:

- **AC-ID-001 (No Duplicate Users)**: Verified via `users.email` unique constraint and `organization_memberships` join table.
- **AC-ID-002 (Unified Identity)**: Verified by shared `users.user_id` across Workspace and Workforce modules.
- **AC-ORG-001 (Zero-Membership Redirection)**: Verified by `requireTenantContext()` routing unassigned users to `/onboarding`.
- **AC-MEM-001 (Cross-Org Mutation Independence)**: Verified by `createTenantRepository` isolating mutations to active `organization_id`.
- **AC-MEM-002 (Switcher Visibility)**: Verified by `listUserMemberships(auth.uid())` populating header dropdown.
- **AC-ROL-001 (Multi-Org Role Independence)**: Verified by reading role strictly from `organization_memberships.role_id`.
- **AC-PRM-001 (Unauthorized Mutation Rejection)**: Verified by `requirePermission()` throwing 403 Forbidden.
- **AC-TEN-001 (Cross-Tenant Entity Masking)**: Verified by returning 404 Not Found for cross-tenant ID queries.
- **AC-SWT-001 (Instant Context Switching)**: Verified by cookie `nexos_active_org_id` and client cache purge.
- **AC-INV-001 (Tokenized Invitation Lifecycle)**: Verified by `organization_invitations` HMAC hashing and single-use redemption.
- **AC-ONB-001 (Tri-State Onboarding Options)**: Verified by `/onboarding` displaying create vs join options.
- **AC-ONB-002 (Atomic Role Seeding)**: Verified by `createOrganizationAndOwner` transaction seeding 7 system roles.
- **AC-CLI-001 (Zero-Login Review Portals)**: Verified by `portal.<domain>` token authentication without user accounts.
- **AC-SHR-001 (Revocation & Expiration)**: Verified by share token nonce status and temporal validation.
- **AC-BRD-001 (White-Label Dynamic Theming)**: Verified by injecting `brand_primary_color` into CSS variables.
- **AC-OWN-001 (Tenant Data Ownership)**: Verified by export services filtering strictly by `organization_id`.
- **AC-AUD-001 (Immutable Activity Ledger)**: Verified by PostgreSQL append-only RLS on `activity_logs`.
- **AC-CFG-001 (Database-Backed Tenant Settings)**: Verified by `organization_settings` table isolation.
- **AC-STR-001 (Object Storage Path Isolation)**: Verified by `/{organization_id}/*` prefix RLS policy.
- **AC-NTF-001 (Scoped Notification Delivery)**: Verified by `organization_id` foreign keys on `notifications`.
- **AC-SCH-001 (Search Result Scoping)**: Verified by Command Palette query scoping.
- **AC-ANL-001 (Isolated Analytical Metrics)**: Verified by dashboard metrics aggregators scoping by tenant.
- **AC-AIC-001 (AI Context Isolation)**: Verified by `ContextBuilder` organization verification.
- **AC-CST-001 (AI Token Budget Governance)**: Verified by `AICostGovernance` quota enforcement.
- **AC-API-001 (AST Surface Gate)**: Verified by `tenant-identity-surface.test.ts` blocking identity parameters.
- **AC-AUT-001 (Server-Side Session Validation)**: Verified by `requireCurrentUser()` rejecting unauthenticated callers.
- **AC-RLS-001 (Data API Defense-in-Depth)**: Verified by Supabase Client queries evaluating `app.is_org_member()`.
- **AC-ENV-001 (Fail-Closed Environment Guards)**: Verified by `getServerEnv()` startup assertions.
- **AC-OBS-001 (Sanitized Structured Telemetry)**: Verified by logger redacting secrets and tokens.
- **AC-RAT-001 (Authentication Brute-Force Throttling)**: Verified by rate-limiting middleware returning HTTP 429.
