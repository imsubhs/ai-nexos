# Security architecture

**Status:** current as of Sprint 2.2 (2026-08-07)
**Scope:** how AI NEX OS authenticates, authorises, isolates tenants and
constrains its own attack surface — and, equally, what is still unproven.

This document describes the controls that exist in code today. Where a control
is partial or unverified it says so; a security document that overstates its
coverage is worse than none, because it stops people looking.

---

## 1. The shape of the system

Two domains, one application:

| Domain            | Audience                      | Authentication                    |
| ----------------- | ----------------------------- | --------------------------------- |
| `app.<domain>`    | Internal staff                | Supabase Auth session cookie      |
| `portal.<domain>` | External clients, no accounts | Share-link token → portal session |

`src/proxy.ts` routes between them, refuses `/portal/*` on the internal domain
and the internal path shape on the portal domain, refreshes the Supabase
session, gates unauthenticated internal traffic to `/login`, and emits the
per-request Content-Security-Policy.

Everything below hangs off that split: the internal side authenticates a _user_,
the portal side authenticates a _token_, and neither trusts the caller to say
which tenant they belong to.

---

## 2. Authentication

### Internal users

Supabase Auth — password, magic link, and Google OAuth (PKCE). Accounts are
never auto-provisioned: `shouldCreateUser: false`, so an unknown address simply
fails to sign in. `getCurrentUser()` resolves the user, their organisation,
role and permission map in one RLS-scoped query, memoised per request.

The proxy calls `supabase.auth.getUser()`, which revalidates the JWT against
Supabase on every request. It must not be replaced with `getSession()`, which
trusts the cookie contents without checking them.

### Brute-force control

Sign-in spends two budgets per attempt (`src/lib/security/rate-limit.ts`):

| Policy              | Limit | Window |
| ------------------- | ----- | ------ |
| `login:ip`          | 10    | 5 min  |
| `login:account`     | 5     | 15 min |
| `magiclink:account` | 3     | 15 min |
| `magiclink:ip`      | 10    | 15 min |
| `authcallback:ip`   | 30    | 5 min  |

The per-account budget is the one that matters against a distributed attack: a
per-IP limit alone gives a botnet a fresh allowance per source address. Every
throttle message is byte-identical to the ordinary failure text, so none of them
confirms that an account exists.

The limiter is a **weighted sliding window**, not a fixed one. A fixed window
lets an attacker spend twice the budget across a boundary in a fraction of a
second, which on a login endpoint is the entire attack.

### External clients

A share link carries a signed token (`SHARE_JWT_SECRET`, HS256). Presenting it
to `POST /api/v1/portal/auth/session` exchanges it for a portal session:

- the token's signature, expiry, session status, revocation, view cap and
  password are all checked first;
- the organisation and client are read from the share's own project row;
- an opaque 256-bit session token goes back in an `httpOnly` cookie, and only
  its SHA-256 is stored in `client_portal_sessions`.

The session token is opaque rather than a JWT so revocation is a single UPDATE
that takes effect on the next request.

---

## 3. Authorization

Two layers, and they are not interchangeable.

**Row-Level Security** protects queries made through the user's own Supabase
session. **`requirePermission()`** protects everything that goes through the
Drizzle connection — which bypasses RLS entirely. Most write paths in this
codebase use Drizzle, so `requirePermission` is the load-bearing control, not
the backstop.

The permission vocabulary is 22 modules × 15 actions, mirrored between
`src/features/permissions/engine.ts` and the Postgres function
`app.has_permission`. Changing one requires a migration updating the other.

### Enforced coverage

Checklist item 3.7 previously read "pattern followed; **never audited
exhaustively**". It is now audited on every commit:

```
npm run audit:authz          # report
npm test                     # enforced by tests/unit/authorization-coverage.test.ts
```

`scripts/audit-authorization.ts` walks the call graph of every exported action
in `real-actions` / `real-index` / `real-queries` / `action-core`, following
imported helpers, and fails if any is reachable without an identity check. Four
sign-in actions are exempt, each with a written reason, and the test asserts the
exemption list stays short and stays confined to `features/auth/`.

What the audit **cannot** tell you: whether the guard that is reached checks the
_right_ permission for the _right_ resource. That remains human judgement.

### The tenant is never a parameter

The rule throughout: `organizationId` comes from the authenticated user, or for
external callers from the verified share token. Actions that used to accept it
as an argument had the argument **removed**, not validated — a parameter that
must always equal a derived value is a trap waiting for the one call site that
forgets to check it.

Every write is additionally scoped by `organizationId` in its `WHERE` clause, so
an id from another tenant matches nothing rather than matching a row.

---

## 4. Transport and browser controls

Static headers (`src/lib/security/headers.ts`, applied in `next.config.ts`):

| Header                              | Value                                      |
| ----------------------------------- | ------------------------------------------ |
| `Strict-Transport-Security`         | `max-age=63072000; includeSubDomains`      |
| `X-Frame-Options`                   | `DENY`                                     |
| `X-Content-Type-Options`            | `nosniff`                                  |
| `Referrer-Policy`                   | `strict-origin-when-cross-origin`          |
| `Cross-Origin-Opener-Policy`        | `same-origin`                              |
| `Cross-Origin-Resource-Policy`      | `same-origin`                              |
| `X-Permitted-Cross-Domain-Policies` | `none`                                     |
| `Permissions-Policy`                | camera, mic, geolocation, payment, USB off |

HSTS omits `preload` deliberately: it is effectively irreversible and must be an
explicit operational decision, not a side effect of a header helper.

`X-Powered-By` is disabled.

### Content-Security-Policy

Emitted **per request by the proxy**, not by `next.config.ts`, because it
carries a nonce. Setting it in both places would send two policies; browsers
enforce the intersection, which is sound but leaves an effective policy nobody
can read off a single file.

```
script-src 'self' 'nonce-<128 bits, fresh per response>'
```

No `'unsafe-inline'` for scripts. The proxy deletes any inbound `x-nonce` before
setting its own — a nonce the caller supplied is not a nonce.

`style-src` keeps `'unsafe-inline'`. React writes `style` attributes from props
and Framer Motion writes inline styles while animating; nonces do not apply to
attributes. Style injection cannot execute script under this policy, so the
residual risk is defacement, not code execution.

**Cost:** reading a per-request header in the root layout opts every route into
dynamic rendering. Nine trivial shells lost prerendering. For an authenticated
multi-tenant dashboard whose proxy already calls `getUser()` on every request,
that was very nearly true already.

### CSRF

Server Actions get Next's built-in Origin check. Route handlers do **not** — a
`POST` from any page on the internet reaches them with the user's cookies
attached. `assertSameOrigin()` covers those. A request with neither `Origin` nor
`Referer` is refused rather than allowed; "absent means trusted" is how this
check gets bypassed.

---

## 5. Input handling

`readJsonBody()` (`src/lib/security/request.ts`) is the single entry point for
request bodies:

- content type must be JSON;
- `Content-Length` rejects early, but the **authoritative** cap is on bytes
  actually read — a chunked request can declare nothing and stream until the
  process dies;
- `JSON.parse` runs with a reviver that strips `__proto__`, `constructor` and
  `prototype` at any depth, so no downstream spread or merge can pollute a
  prototype;
- a Zod schema validates the result, and the 400 names the offending field
  paths without describing the schema.

**Client IP** resolution reads `X-Forwarded-For` from the _right_, not the left.
The leftmost entry is whatever the caller sent; trusting it hands out a fresh
rate-limit budget per request. `TRUSTED_PROXY_HOPS` (default 1) says how many
hops are ours.

**Expression evaluation.** Automation rules are authored by tenant users and
evaluated server-side. `RestrictedExpressionEngine` refuses function calls and
reads only own enumerable properties — `x.constructor.constructor` is the
Function constructor, and a read that reaches it is one feature away from
arbitrary code execution.

---

## 6. Outbound requests (SSRF)

`src/lib/security/egress.ts` guards every server-side fetch:

- https only outside development, no credentials in the URL;
- the hostname is **resolved** and every returned address checked against
  private, loopback, link-local, carrier-NAT and multicast ranges — including
  `169.254.169.254`, the cloud metadata endpoint;
- IPv4-mapped IPv6, NAT64 and 6to4 forms are decoded rather than treated as
  global;
- redirects are followed manually and **each hop is re-validated** — a permitted
  public URL that 302s to the metadata service is the standard bypass;
- `EGRESS_ALLOWED_HOSTS` narrows this to an explicit list.

No outbound fetch exists in the codebase yet; the automation webhook action is
declared in the registry and not implemented. The guard is in place and tested
so that the action is built against it rather than after it.

---

## 7. Secrets, errors and logs

**Secrets.** `src/lib/env.server.ts` validates configuration at boot and reports
every problem at once. Signing secrets have no constant fallback — production
fails to start without them; development generates a random per-process key, so
a well-known constant can never sign a real token.

**Errors.** `errorResponse()` returns a deliberate `ApiError` message verbatim
and replaces anything else with a generic message plus a correlation id. A
Postgres or Drizzle message names tables and columns; returning it is a free
schema disclosure.

**Logs.** `src/lib/security/logger.ts` emits one JSON object per line with
redaction applied on the way _out_, so a call site cannot leak a token by
forgetting to strip it. `logSecurityEvent()` gives security decisions a fixed
`event` / `outcome` shape that can be alerted on without matching free text.

**Caching.** Authenticated responses carry `no-store`. A shared cache keyed on
URL alone would otherwise serve one organisation's rendered page to another.

---

## 8. Fail-closed guards

Two subsystems are still development mocks. Both now refuse to operate in
production rather than pretending to work, matching the stance
`InMemoryQueueProvider` already took:

| Component                 | Was                                 | Now                          |
| ------------------------- | ----------------------------------- | ---------------------------- |
| `MockVirusScanner`        | `isClean: true`, always, everywhere | Throws in production (TD-09) |
| `SupabaseStorageProvider` | Fabricated `mock.supabase.co` URLs  | Throws in production (TD-02) |

A scanner that stamps every file clean makes the upload path _look_ defended
while serving hostile content back to other users. A "signed" URL no backend
enforces is an unauthenticated one.

---

## 9. What is still unproven

Stated plainly, because these are the gaps an attacker would look for first:

1. **RLS has never been evaluated by a database.** The policies are written and
   the SQL permission function exists, but no migration has been applied to a
   real Postgres instance. This is the platform's central isolation claim and it
   is currently unverified. (Checklist 7.6 — Sprint 13.)
2. **No integration tests against Postgres.** Every tenant-isolation fix in this
   sprint is enforced by a `WHERE` clause that has been type-checked and
   reviewed, not executed against real rows.
3. **Only the `owner` role has ever been exercised.** Five of six system roles
   have never run.
4. **No penetration test.** (Checklist 7.14.)
5. **Rate limits are per-instance without Redis.** Behind N instances the
   effective limit is N × the configured value. The boot diagnostics warn about
   this in production.
6. **Portal password verification is untested against real rows** — the scrypt
   comparison is unit-tested, the `share_passwords` lookup is not.

---

## 10. Operational checklist before production traffic

- [ ] `REDIS_URL` set — otherwise rate limits are per-instance
- [ ] `TRUSTED_PROXY_HOPS` matches the actual edge topology
- [ ] `EGRESS_ALLOWED_HOSTS` set before enabling automation webhooks
- [ ] `JWT_SECRET` and `SHARE_JWT_SECRET` generated with `openssl rand -base64 48`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set, and never prefixed `NEXT_PUBLIC_`
- [ ] `DEMO_MODE` unset or `false` (the app refuses to start otherwise)
- [ ] RLS policies applied and verified against a real database
- [ ] A real virus scanner replaces `MockVirusScanner`
- [ ] A real storage provider replaces the `SupabaseStorageProvider` mock

Run `npm run env:check --production` to verify the configuration half of this
list without starting the app.

---

## Related documents

- `docs/THREAT-MODEL.md` — adversaries, attack paths, and residual risk
- `docs/SECURITY-DEPENDENCY-BACKLOG.md` — dependency advisories and decisions
- `docs/PRODUCTION_READINESS_CHECKLIST.md` — full release gate
- `docs/ENVIRONMENT.md` — every configuration variable
