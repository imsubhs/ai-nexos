import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    // The integration suite talks to the real Supabase project and runs from
    // vitest.integration.config.ts — `npm test` stays hermetic and offline.
    exclude: [
      "e2e/**",
      "node_modules/**",
      "tests/integration/**",
      "**/*.integration.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/components/ui/**", "src/**/*.d.ts"],
    },
  },
});
