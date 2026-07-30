import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TD-11: several lockfiles exist above this directory, and Next was
  // inferring the workspace root from the outermost one. Pin it to this
  // package so module resolution and tracing stay inside the app.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
