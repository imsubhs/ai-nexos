# AI NEX OS — Known Limitations & Deferred Items
## Transparent Documentation of Architectural Scoping and Post-V1 Enhancements

**Product**: AI NEX OS — *The Operating System for Creative Execution*  
**Date**: October 4, 2026  
**Auditor**: Production Release Manager & Principal SaaS Architect  
**Status**: `NON-BLOCKING FOR V1.0 PRODUCTION CERTIFICATION`

---

## 1. Overview

In accordance with strict production audit principles, this document records known limitations, architectural deferrals, and operational boundaries of AI NEX OS at V1.0 (`commit 3162f16`). None of the items listed below compromise tenant isolation, data integrity, authorization security, or core platform workflows.

---

## 2. Deferred Post-V1 Features

### 2.1 Transactional Email Dispatch (Deferred)
- **Current Architecture**: The system generates cryptographically secure capability share links (`/portal/s/[token]`) and real-time in-app operational activity notifications. Deliverable reviews, invitations, and sign-offs are communicated via direct link sharing, internal team feeds, and clipboard copy actions.
- **Deferred Capability**: Automated outgoing SMTP/API email delivery via third-party providers (e.g., Resend, Postmark, AWS SES, SendGrid).
- **V1.0 Operational Impact**: Non-blocking. Agencies and creative studios operating in pilot environments routinely share portal review links directly via Slack, Microsoft Teams, or existing client email threads.
- **Target Horizon**: Post-V1 Phase 5.1 (Notification Services & Webhook Dispatch).

### 2.2 Custom White-Label CNAME / Custom Domains (Deferred)
- **Current Architecture**: The client review portal is hosted under the canonical domain route (`https://ai-nexos.antideploy.com/portal/s/[token]`).
- **Deferred Capability**: Dynamic TLS certificate provisioning and CNAME domain mapping allowing agencies to host review portals on their own domain (e.g., `https://review.creativeagency.com/s/[token]`).
- **V1.0 Operational Impact**: Non-blocking. The portal interface is fully styled with the agency's branding, logo, and project context; white-labeled CNAME is an enterprise add-on feature.
- **Target Horizon**: Post-V1 Enterprise Tier Expansion.

### 2.3 Automated In-App Stripe Billing & Subscription Metering (Deferred)
- **Current Architecture**: Organizations, seats, and storage quotas are managed directly by organization owners and administrators.
- **Deferred Capability**: Self-serve credit card checkout, automatic recurring subscription upgrades, Stripe Customer Portal integration, and automated per-seat usage billing.
- **V1.0 Operational Impact**: Non-blocking for controlled pilot customers, enterprise agreements, and internal agency rollouts.
- **Target Horizon**: Post-V1 Commercial Launch Sprint.

---

## 3. Maintenance & Tooling Observations

### 3.1 Transitive devDependency Vulnerabilities (`npm audit`)
- **Finding**: Running `npm audit` flags 23 vulnerabilities (10 moderate, 13 high; 0 critical) in devDependencies:
  - `fast-glob`, `micromatch`, `braces` (used by build scripts and AST tools)
  - `ts-morph` (used by internal authorization code auditing scripts)
  - `esbuild` (nested inside `drizzle-kit@0.30.5` CLI)
  - `undici` (nested inside `@supabase/ssr` / dev CLI)
- **Runtime Impact Analysis**:
  - **Zero Production Client/Server Impact**: These packages are build-time tools, code generators, or test utilities. They are not bundled into client-side JavaScript or executed in production request paths.
  - **Upgrade Risk**: Running `npm audit fix --force` attempts to downgrade or break `drizzle-kit` and `@supabase/ssr`, which would jeopardize database migration compatibility.
- **Mitigation Plan**: Monitor upstream releases for `drizzle-kit` and update during scheduled dependency maintenance cycles.

### 3.2 ESLint Code Warnings
- **Finding**: Running `npm run lint` yields 0 errors and 171 warnings.
- **Composition**:
  - Unused function parameters in test mocks (`_req`, `_ctx`).
  - Unused imports in internal test fixtures and smoke test scripts.
- **Impact**: Zero effect on production bundle execution or type safety (`npm run typecheck` produces 0 errors).

---

## 4. Operational Boundaries

| Boundary | V1.0 Baseline Limit | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Max Concurrent Upload Size** | 500 MB per file | Direct Supabase Storage multipart API limit |
| **Portal Token Lifetime** | 30 days default (configurable) | Database token expiration timestamp |
| **Signed URL Lifetime** | 900 seconds (15 minutes) | Supabase Storage SDK signed URL generator |
| **Rate Limit Window** | 60 seconds burst / sustained tiers | Redis / in-memory sliding window rate limiter |
| **Supported File Formats** | Images (PNG, JPG, WebP), Video (MP4, MOV), Audio (WAV, MP3), Documents (PDF) | Storage MIME-type validation filter |

---

## 5. Certification Acceptance

The items documented herein are accepted as intended scope boundaries for the V1.0 release. None constitute critical blockers or safety concerns.
