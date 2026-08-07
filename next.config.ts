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

  // `X-Powered-By: Next.js` names the framework and, by implication, its
  // version range to anyone scanning. It buys nothing.
  poweredByHeader: false,

  // Static security headers on every response, both domains. The policy lives
  // in src/lib/security/headers.ts so it can be tested.
  //
  // Content-Security-Policy is deliberately NOT here: it carries a per-request
  // nonce and is emitted by src/proxy.ts. Setting it in both places would send
  // two CSP headers, which browsers enforce as an intersection — sound, but a
  // shape that makes the effective policy hard to reason about and easy to
  // weaken by editing only one of them.
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
