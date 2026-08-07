# Threat model

**Status:** Sprint 2.2 (2026-08-07)
**Method:** asset-driven. What is worth stealing, who would want it, how they
would reach it, and what stands in the way.

Companion to `docs/SECURITY.md`, which describes the controls. This document
describes the attacks, and is deliberately honest about which ones are only
partly answered.

---

## 1. Assets

Ranked by what their loss would actually cost:

| #   | Asset                              | Why it matters                                                                                                                    |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Client deliverables and files**  | The agency's product. Pre-release creative work, under NDA. Disclosure to a competitor or the public is the business-ending case. |
| A2  | **Tenant boundary**                | One organisation reading another's anything. A single confirmed instance is a reportable breach and ends enterprise sales.        |
| A3  | **Approval decisions**             | Legally meaningful sign-off. A forged approval is fraud with the platform as the instrument.                                      |
| A4  | **Staff credentials and sessions** | Reach everything above.                                                                                                           |
| A5  | **Share links**                    | Bearer credentials handed to people outside the organisation, forwarded by email, and long-lived by design.                       |
| A6  | **Workforce records**              | Attendance and corrections — personal data with employment-law consequences.                                                      |
| A7  | **Infrastructure credentials**     | `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. Cloud metadata credentials likewise.                                           |

---

## 2. Adversaries

| Actor                           | Access they start with            | Motivation                                                                                                          |
| ------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **T1 Unauthenticated internet** | Public endpoints only             | Opportunistic; scanning for known framework CVEs and unguarded endpoints                                            |
| **T2 Share-link holder**        | One valid token                   | Curiosity, or reach beyond what was shared with them                                                                |
| **T3 Malicious tenant user**    | A real account in tenant A        | Reach tenant B. **The most dangerous actor in a multi-tenant system**, because they are past authentication already |
| **T4 Low-privilege staff**      | An account with a restricted role | Privilege escalation within their own tenant                                                                        |
| **T5 Former client**            | An expired or revoked link        | Continued access                                                                                                    |
| **T6 Network attacker**         | Position on the path              | Session theft, downgrade                                                                                            |

**T3 deserves emphasis.** Most of what Sprint 2.2 fixed was reachable by T3, and
almost none of it required any sophistication — the identifiers deciding which
tenant a write landed in were function parameters.

---

## 3. Attack paths

Each path: how it works, and what stops it now.

### AP-1 · Cross-tenant write via a parameter — **T3** — _was open, now closed_

Server Actions are HTTP endpoints. `createShareSessionAction`,
`createWorkflow`, `createAgentAction` and others accepted `organizationId` as an
argument and never authenticated the caller. The attacker changes one field in
the request body and writes into any tenant.

The share case was the sharpest: the action **returns the secure token**, so the
attacker publishes a share of the victim's deliverables and walks away holding a
working link to them — A1 and A2 in one call.

**Now:** the tenant is derived from the authenticated session; the parameters
were removed rather than validated. Enforced on every commit by
`tests/unit/authorization-coverage.test.ts`.

### AP-2 · Cross-tenant read via a content hash — **T3** — _was open, now closed_

`finalizeFileUpload` deduplicated on `sha256Hash` with no organisation filter.
Two consequences: a tenant's file record pointed at an object under another
tenant's storage prefix, and — more subtly — the response was an **existence
oracle**. Upload a suspected document, observe `deduplicatedStorage: true`, and
you have confirmed another organisation holds that exact file. No read access
required.

**Now:** deduplication is scoped to the uploader's organisation.

### AP-3 · Forged approval — **T2** — _was open, now closed_

`submitExternalApprovalAction` took `identityId` from the caller and never
verified a share token. Any caller could submit an approval attributed to any
external reviewer, on any share item. The nonce it consumed was never tied to
the session or identity claimed, so a nonce minted for one share authorised an
approval on another. A3, directly.

**Now:** the share token is verified first, the identity comes from the verified
payload, and the item must belong to the token's session.

### AP-4 · Password-protected share with no password — **T2/T5** — _was open, now closed_

`validateToken` contained the comment "In a real implementation, we would hash
and compare". Any non-empty string satisfied a password-protected share. The
protection an agency believed it had applied to a confidential deliverable
amounted to the presence of a form field.

Revocation was equally hollow: `share_expiration.isRevoked`, `expiresAt` and
`maxViews` were never read, so revoking a link did nothing (T5).

**Now:** scrypt verification against `share_passwords`, rate-limited per session;
lifecycle columns consulted on every validation.

### AP-5 · Credential stuffing — **T1** — _was open, now bounded_

No rate limiting existed anywhere. An attacker worked through a password list at
network speed against a known staff address (A4).

**Now:** per-IP and per-account budgets on a weighted sliding window.
**Residual:** an attacker can deliberately spend a victim's per-account budget
and lock them out for 15 minutes. Accepted — a short, self-clearing window is
preferable to leaving the account guessable, and the alternative (per-IP only)
does not survive a botnet. Revisit if it is abused in practice.

### AP-6 · XSS to session theft — **T1/T3** — _materially reduced_

The Phase 1 CSP allowed `'unsafe-inline'` in `script-src`, which made every
other script directive decoration: any injection reaching the DOM executes and
can exfiltrate to any origin the connect-src permits.

**Now:** nonce-only scripts, `object-src 'none'`, `base-uri 'self'`,
`form-action 'self'` (an injected `<form>` cannot post a password off-origin),
`frame-ancestors 'none'`.

**Residual:** `style-src` retains `'unsafe-inline'`. Style injection cannot
execute script under this policy; the exposure is defacement and limited
data-inference via selectors, not code execution. Auth cookies are `httpOnly`,
so script cannot read them directly regardless.

### AP-7 · SSRF to cloud credentials — **T3/T4** — _pre-empted_

Automation lets an operator configure a webhook URL fetched by the server, from
inside the deployment's network. `http://169.254.169.254/` returns instance
credentials (A7); `http://10.0.0.5:5432` reaches the database.

**Now:** `assertSafeOutboundUrl` resolves the hostname and checks every returned
address, and re-validates each redirect hop.

**Residual — TOCTOU.** The name is resolved here and again by the HTTP stack. A
fast attacker-controlled DNS server can change the answer in between (DNS
rebinding). Closing it entirely requires pinning the connection to the resolved
address, which the platform `fetch` does not expose. **Mitigation:**
`EGRESS_ALLOWED_HOSTS`, which makes the window unexploitable against a host that
is not on the list. Set it in production.

No outbound fetch exists in the codebase yet, so this is a guard placed ahead of
the feature rather than behind an incident.

### AP-8 · Prototype pollution to RCE — **T3/T4** — _closed_

Two routes. JSON bodies were parsed without stripping `__proto__`, and any later
spread or merge could copy it onto a real prototype. And the automation
expression evaluator read properties with `obj[key]`, reaching the prototype
chain: `x.constructor.constructor` is the Function constructor. Rules are
authored by tenant users and evaluated server-side, so that read was one feature
away from arbitrary code execution.

**Now:** a stripping reviver at the parse boundary, and own-enumerable-only
reads with polluting names refused outright.

### AP-9 · Host-header redirect to session theft — **T1** — _closed_

`/auth/callback` built its redirect from `new URL(request.url).origin`, which
Next derives from the `Host` header. An attacker who can influence that header
gets the browser sent to their domain **after** the session cookie is set.
`safeInternalPath()` guarded the path and never saw the origin — the one part of
the URL it did not cover was the one an attacker controlled.

**Now:** redirects are built relative to the configured `APP_URL`.

### AP-10 · Rate-limit evasion by header spoofing — **T1** — _closed_

The common shortcut is to read the leftmost `X-Forwarded-For` entry. That value
is whatever the client sent, so `X-Forwarded-For: 1.2.3.4` buys a fresh budget
per request and AP-5's defence evaporates.

**Now:** read from the right, `TRUSTED_PROXY_HOPS` hops in.

### AP-11 · Demo mode reaching production — **T1** — _closed_

Demo mode is not a data-source toggle: `mock-actions.signInWithPassword` accepts
any credentials and `DEMO_ADMIN_USER` holds owner permissions on every module.
One code path reaching it in production hands an anonymous visitor an owner
session over the whole platform.

The boot gate refuses to start a process configured that way, but it skips the
Edge runtime and the build phase.

**Now:** `isDemoMode()` returns false under `NODE_ENV=production`
unconditionally. The boot gate remains as the loud signal.

### AP-12 · Reconnaissance via the health probe — **T1** — _reduced_

`/api/health` is unauthenticated by necessity and enumerated every configured
and fallback-using variable by name. `redis: not-configured` tells a scanner
that rate limits are per-instance and therefore multiplied by the fleet size;
`storage: not-configured` says uploads are not real. That is a map for planning
the attacks above.

**Now:** withheld in production; retained in development where it is used.

### AP-13 · Framework CVE — **T1** — _closed for now_

`next@16.2.10` carried a **proxy bypass in App Router with Turbopack**. The
proxy is where auth gating, portal routing and the CSP live; an advisory that
routes around it makes all three optional. Also SSRF in Server Actions and DoS.

**Now:** `16.3.0`, and `npm run audit:deps` is a CI gate at `--audit-level=high`
so the next one fails the pipeline.

---

## 4. Residual risk

Ordered by severity. These are open.

| #   | Risk                                             | Severity  | Why it is still open                                                                                                                    |
| --- | ------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **RLS has never been evaluated by a database**   | **High**  | The platform's central isolation claim. Policies are written; no migration has been applied to real Postgres. Sprint 13.                |
| R2  | **No integration tests against Postgres**        | **High**  | Every isolation fix in this sprint is a `WHERE` clause that has been reviewed and type-checked, never executed against real rows.       |
| R3  | **No penetration test**                          | Medium    | Checklist 7.14. Everything here is self-assessed.                                                                                       |
| R4  | **Five of six roles never exercised**            | Medium    | Only `owner` has run. A missing grant in another role is invisible.                                                                     |
| R5  | **Rate limits per-instance without Redis**       | Medium    | Effective limit is N × configured. Warned at boot; set `REDIS_URL`.                                                                     |
| R6  | **SSRF DNS-rebinding window**                    | Medium    | Inherent to `fetch` without connection pinning. Mitigate with `EGRESS_ALLOWED_HOSTS`.                                                   |
| R7  | **`style-src 'unsafe-inline'`**                  | Low       | Structural — React and Framer Motion write style attributes. No script execution.                                                       |
| R8  | **Account-lockout DoS via per-account limit**    | Low       | Deliberate trade (AP-5).                                                                                                                |
| R9  | **Storage and virus scanning are mocks**         | Low _now_ | Fail closed in production, so they cannot ship silently. Becomes High the moment either guard is removed without a real implementation. |
| R10 | **Four moderate dev-only dependency advisories** | Low       | `drizzle-kit` → esbuild dev server, never run here. The offered fix is a major downgrade that predates our migration format.            |

---

## 5. Trust boundaries

```
                       ┌──────────────────────────────────────┐
  T1 internet ────────▶│ proxy.ts                             │
                       │ · domain routing                     │
                       │ · session refresh (getUser)          │
                       │ · auth gate → /login                 │
                       │ · per-request CSP + nonce            │
                       └───────┬──────────────────┬───────────┘
                               │                  │
                  app.<domain> │                  │ portal.<domain>
                               ▼                  ▼
                   ┌───────────────────┐  ┌──────────────────────┐
                   │ requireCurrentUser│  │ share token verify   │
                   │ requirePermission │  │ → portal session     │
                   └─────────┬─────────┘  └──────────┬───────────┘
                             │                       │
                             ▼                       ▼
                   ┌──────────────────────────────────────────┐
                   │ organizationId derived, never parameter  │
                   │ every WHERE scoped by tenant             │
                   └───────────────────┬──────────────────────┘
                                       ▼
                   ┌──────────────────────────────────────────┐
                   │ Drizzle (bypasses RLS)  ·  Supabase (RLS)│
                   └──────────────────────────────────────────┘
```

The boundary that matters most is the second box down. Because Drizzle bypasses
RLS, `requirePermission` plus tenant-scoped `WHERE` clauses is not defence in
depth on those paths — it is the only defence. R1 is what would turn it back
into two layers.

---

## 6. Review triggers

Revisit this document when any of these happen:

- RLS is applied to a real database (closes R1, changes the diagram)
- The automation webhook action is implemented (activates AP-7 in practice)
- A real storage provider or virus scanner lands (R9)
- A new unauthenticated endpoint is added
- Any new `"use server"` module — the authorization audit will flag it, but the
  _shape_ of the new surface belongs here
- A high-severity dependency advisory (AP-13)
