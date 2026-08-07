# Security dependency backlog

> **Status: item 1 resolved in Sprint 2.2 (2026-08-07).** `next` and
> `eslint-config-next` are now pinned to `16.3.0`, which clears all three
> high-severity advisories plus the transitive `postcss` and `sharp` ones. Item
> 2 (`drizzle-kit` → esbuild, moderate, dev-only) is accepted and unchanged —
> the reasoning is below and still holds.
>
> `npm run audit:deps` runs in CI at `--audit-level=high`, so a new
> high-severity advisory now fails the pipeline rather than waiting for someone
> to remember to look. The section below is kept as the record of what was
> found and why each call was made.

Findings from `npm audit` during Phase 1 repository hardening. **No dependency
was upgraded in that phase** — upgrades were deliberately deferred to a separate
PR so the header/env changes could be reviewed and merged on their own.

Snapshot taken 2026-08-07 against `next@16.2.10`, `drizzle-kit@0.31.10`.
Re-run `npm audit` before acting; advisory lists change.

---

## 1. `next` — 9 advisories, high severity (runtime, ships to production) — **RESOLVED**

Installed: **16.2.10**. Every advisory below is fixed in **16.3.0**, a
patch-level move inside the same major line.

| Advisory                                                                  | Relevance to this app                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Middleware / Proxy bypass in App Router using Turbopack and single locale | **Highest concern.** `src/proxy.ts` is what routes the portal domain and gates unauthenticated internal traffic to `/login`. A bypass weakens that gate. The real boundary is still RLS + `requireCurrentUser()` at render time, which is why this is serious but not an open door. |
| Unauthenticated disclosure of internal Server Function endpoints          | The app is server-action heavy across `src/features/**`.                                                                                                                                                                                                                            |
| SSRF in rewrites via attacker-controlled destination hostname             | `proxy.ts` rewrites portal traffic into `/portal/*`. Destinations are internal paths, not attacker-supplied hostnames — likely not exploitable here, but the rewrite path is in use.                                                                                                |
| SSRF in Server Actions on custom servers                                  | Not deployed on a custom server today.                                                                                                                                                                                                                                              |
| Cache confusion of response bodies for requests with bodies (×2)          | Applies to the response cache generally.                                                                                                                                                                                                                                            |
| DoS in App Router using Server Actions                                    | Availability only.                                                                                                                                                                                                                                                                  |
| Unbounded Server Action payload in Edge runtime                           | Availability only.                                                                                                                                                                                                                                                                  |
| DoS in the Image Optimization API using SVGs                              | `next.config.ts` sets no `images.remotePatterns`, so only local images are optimizable. Low exposure.                                                                                                                                                                               |

**Transitive, pulled in by `next` and fixed by the same bump:**

- `postcss <=8.5.22` (high) — 4 advisories: XSS via unescaped `</style>` in
  stringify output, plus three arbitrary-`.map`-file-read / path-traversal
  issues via attacker-controlled `sourceMappingURL`. Build-time surface.
- `sharp <0.35.0` (high) — inherited libvips CVEs (CVE-2026-33327, -33328,
  -35590, -35591). Reached only through image optimization.

### Recommended action

Bump `next` and `eslint-config-next` to `16.3.0` together — they are
version-locked. `npm audit fix --force` reports this as "outside the stated
dependency range" only because `package.json` pins `16.2.10` exactly; the change
is 16.2 → 16.3, not a major upgrade.

Verify after bumping: `npm run typecheck && npm run lint && npm test &&
npm run build`, then exercise both domains — an internal route (auth gate) and
a portal share link — since the proxy advisory touches exactly that code path.

**Done, Sprint 2.2.** Bumped to `16.3.0` (both packages, pinned exactly). All
five gates green afterwards, and the proxy path was re-exercised against a
production build: nonce-only CSP still emitted, all inline scripts nonced, the
portal-domain rewrite still routes, and an unauthenticated `/api/*` request
still receives 401 rather than a redirect.

---

## 2. `drizzle-kit` — moderate, **dev-only** — accepted

Chain: `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` →
`esbuild <=0.24.2`.

The advisory: esbuild's dev server lets any website send requests to it and read
the responses. It affects a developer's machine while the esbuild dev server is
running, not a deployed environment. `drizzle-kit` is a `devDependency` used for
`db:generate` / `db:migrate` / `db:studio` and is never bundled.

`@esbuild-kit/*` is deprecated and merged into `tsx`; the fix depends on
`drizzle-kit` moving off it. No clean upgrade is available at the pinned version.

### Recommended action

Accept for now and re-check on the next `drizzle-kit` minor. Do not run
`drizzle-kit studio` on an untrusted network in the meantime.

**Confirmed in Sprint 2.2.** `npm audit` offers `drizzle-kit@0.18.1` as the
fix, which is a major downgrade: it predates the migration format the ten
journaled migrations in this repository are written in. Trading a working,
verifiable migration history for a dev-server advisory this project never
exposes is the wrong side of that trade. These four moderate findings are the
reason `audit:deps` runs at `--audit-level=high` rather than failing on
everything — a gate that is always red is a gate nobody reads.

---

## Sequencing — completed

1. ~~Merge Phase 1 hardening (headers, env validation, secret-fallback removal).~~ Done.
2. ~~Bump `next` + `eslint-config-next` → 16.3.0, free of behavioural changes.~~
   Done in Sprint 2.2 as its own commit, so a regression bisects cleanly.
3. ~~Re-run `npm audit`.~~ Done: only the dev-only `drizzle-kit`/esbuild chain
   remains, exactly as predicted.

## Ongoing

`npm run audit:deps` is a CI gate. When it fails, the decision is one of:

- **Upgrade** if a non-major fix exists — that was item 1, and it took one
  commit.
- **Accept with a written reason** if the fix costs more than the exposure, as
  with item 2. Record it in this file. An accepted finding with no reasoning is
  indistinguishable from one nobody looked at.
- **Never** silence the gate by lowering `--audit-level`.
