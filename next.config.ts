import path from "node:path";
import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // TD-11: several lockfiles exist above this directory, and Next was
  // inferring the workspace root from the outermost one. Pin it to this
  // package so module resolution and tracing stay inside the app.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },

  // Phase 1 hardening: security headers on every response, both domains.
  // The policy itself lives in src/lib/security/headers.ts so it can be tested.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
