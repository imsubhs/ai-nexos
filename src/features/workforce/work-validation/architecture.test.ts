// ============================================================
// WORK VALIDATION — ARCHITECTURE / DEPENDENCY TESTS (Sprint 4A)
// ------------------------------------------------------------
// The engine is a PURE DOMAIN SERVICE. These tests fail the build if
// any engine source file imports infrastructure or framework code.
// They read the actual `import` statements — not a hand-maintained
// allowlist — so the boundary cannot silently rot.
// ============================================================

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Every engine source file (excludes test files themselves). */
function engineSourceFiles(): string[] {
  return readdirSync(HERE)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join(HERE, name));
}

/** Extract the module specifiers of every static/dynamic import in a file. */
function importSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /import\s+[^;'"]*?from\s+["']([^"']+)["']/g, // import … from "x"
    /import\s+["']([^"']+)["']/g, // side-effect import "x"
    /import\s*\(\s*["']([^"']+)["']\s*\)/g, // dynamic import("x")
    /require\s*\(\s*["']([^"']+)["']\s*\)/g, // require("x")
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) specs.push(match[1]);
  }
  return specs;
}

/** Forbidden import — a matcher plus the layer it represents. */
const FORBIDDEN: Array<{ layer: string; test: (spec: string) => boolean }> = [
  {
    layer: "React",
    test: (s) =>
      s === "react" ||
      s === "react-dom" ||
      s.startsWith("react/") ||
      s.startsWith("react-dom/"),
  },
  { layer: "Next.js", test: (s) => s === "next" || s.startsWith("next/") },
  {
    layer: "DemoStore",
    test: (s) => s.includes("lib/demo") || /demo[-/]?store/i.test(s),
  },
  { layer: "Repository", test: (s) => /repository/i.test(s) },
  {
    layer: "Server Actions",
    test: (s) =>
      /(^|\/)(actions|action-core|real-actions|mock-actions)$/i.test(s),
  },
  {
    layer: "Drizzle",
    test: (s) =>
      s === "drizzle-orm" ||
      s.startsWith("drizzle-orm/") ||
      s.includes("db/schema") ||
      s.includes("/db/"),
  },
  {
    layer: "Supabase",
    test: (s) => s.includes("supabase") || s.startsWith("@supabase/"),
  },
  {
    layer: "Attendance UI",
    test: (s) =>
      s.includes("/components/") ||
      s.endsWith(".tsx") ||
      s.includes("app/(dashboard)"),
  },
  {
    layer: "Zustand store",
    test: (s) => s === "zustand" || s.includes("/stores/"),
  },
];

describe("work-validation is a pure domain service", () => {
  const files = engineSourceFiles();

  it("has engine source files to check", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((f) => [f.split("/").slice(-1)[0], f] as const))(
    "%s imports no infrastructure or framework code",
    (_name, path) => {
      const specs = importSpecifiers(readFileSync(path, "utf8"));
      for (const spec of specs) {
        for (const rule of FORBIDDEN) {
          expect(
            rule.test(spec),
            `${_name} illegally imports ${rule.layer} via "${spec}"`,
          ).toBe(false);
        }
      }
    },
  );

  it("imports nothing from outside the engine except sibling modules and node builtins", () => {
    for (const path of files) {
      const specs = importSpecifiers(readFileSync(path, "utf8"));
      for (const spec of specs) {
        const isRelativeSibling = spec.startsWith("./");
        const isNodeBuiltin = spec.startsWith("node:");
        expect(
          isRelativeSibling || isNodeBuiltin,
          `${path.split("/").slice(-1)[0]} imports "${spec}" — the engine may only import its own siblings`,
        ).toBe(true);
      }
    }
  });
});
