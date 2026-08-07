import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Integration suite — runs against the REAL Supabase project in .env.local.
 *
 * Deliberately separate from vitest.config.ts so `npm test` stays hermetic and
 * offline. These specs talk to a live database and live object storage, so they
 * run in a node environment, serially (shared database state), and with a
 * timeout that tolerates network latency.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/integration/setup.ts"],
    include: ["tests/integration/**/*.integration.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Shared database state — never run these files concurrently.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
