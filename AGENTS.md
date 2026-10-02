<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Environment configuration

Full reference: `docs/ENVIRONMENT.md`. Rules, not suggestions:

1. **Never read `process.env` directly for application configuration.** Use
   `src/lib/env.ts` (public) or `src/lib/env.server.ts` (server). Adding a
   variable means adding it to the schema, to `ENV_MANIFEST`, and to
   `.env.example` — a raw read bypasses validation and classification.
   The narrow exceptions, each commented at the site: `NODE_ENV` branches,
   `src/lib/security/headers.ts` (imported by `next.config.ts` and tested by
   mutating the variable), and `scripts/`.
2. **Never import `env.server.ts` from a `"use client"` file.** The two modules
   are split so server secrets and their names stay out of browser bundles.
3. **Public values must stay literal.** `process.env.NEXT_PUBLIC_X` is
   substituted by Next at build time; a dynamic lookup yields `undefined` in the
   browser. Do not rewrite `rawPublicEnv` as a loop.
4. **`DEMO_MODE` has exactly one reader:** `isDemoMode()`. Do not compare the
   raw string.
5. **A required variable must fail loudly, an optional one must never crash an
   import.** New required values belong in the schema or `assertProductionConfig()`;
   new optional ones need a documented fallback.
