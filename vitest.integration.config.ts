import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Integration suite — runs against the STAGING Supabase project described by
 * `.env.test.local`. It never reads `.env.local`; see tests/integration/env.ts.
 *
 * Deliberately separate from vitest.config.ts so `npm test` stays hermetic and
 * offline. These specs talk to a live database and live object storage, so they
 * run in a node environment, serially (shared database state), and with a
 * timeout that tolerates network latency.
 *
 * `globalSetup` is the fail-closed target guard. It runs before the spec module
 * graph is loaded, which is the only placement that also covers
 * `timeline.integration.test.ts` — that spec builds its own postgres client at
 * module scope, so a guard living in the shared helper would be bypassed by the
 * mere act of importing it. `setupFiles` re-asserts the same guard inside each
 * worker process.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    include: ["tests/integration/**/*.integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Shared database state — never run these files concurrently.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
