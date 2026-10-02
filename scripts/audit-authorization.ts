/**
 * Static authorization audit.
 *
 * Readiness checklist 3.7 reads: "`requirePermission` on every real action —
 * pattern followed; **never audited exhaustively.** The service-layer
 * connection bypasses RLS, so a single omission is unprotected."
 *
 * That is the gap this closes. Reviewing 160-odd exported actions by eye is
 * exactly the task a person does correctly once and then never repeats, so it
 * is mechanised here and asserted by `tests/unit/authorization-coverage.test.ts`
 * — a new unguarded action fails CI rather than waiting for the next audit.
 *
 * What it does: for every exported async function in a `real-actions.ts`,
 * `real-index.ts`, `real-queries.ts` or `action-core.ts` module, walk the
 * identifiers in its body and follow them into functions defined in the same
 * file or in files it imports, to a bounded depth, looking for an
 * authorization guard.
 *
 * What it cannot do: prove that the guard which *is* reached checks the right
 * permission for the right resource. It answers "is this action reachable
 * without any identity check at all", which is the failure that matters most
 * and the one that is invisible in review. Correct-permission-for-the-resource
 * remains a human judgement, recorded in docs/SECURITY.md.
 *
 * Run directly with `npx tsx scripts/audit-authorization.ts` for a report.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { readdirSync } from "node:fs";

/** Identifiers that establish or enforce the caller's identity. */
const GUARDS = [
  "requireCurrentUser",
  "requirePermission",
  "getCurrentUser",
  "hasPermission",
  // The portal's own boundary: an external caller proven by share token
  // rather than by session.
  "validateToken",
  "resolvePortalSession",
  "ShareSecurityMiddleware",
];

/** How far to follow the call graph before giving up. */
const MAX_DEPTH = 4;

const SRC = resolve(process.cwd(), "src");

export type AuditFinding = {
  readonly file: string;
  readonly action: string;
};

type FunctionIndex = Map<string, string>;

/** Extracts `name → body` for every function-like declaration in a source file. */
function indexFunctions(source: string): FunctionIndex {
  const index: FunctionIndex = new Map();

  const patterns = [
    // function foo(...) / export [async] function foo(...)
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[(<]/g,
    // const foo = async (...) => / const foo = function
    /(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\(|function)/g,
    // Object-literal and class methods: `foo: async (...) =>` and `async foo(`
    /(\w+)\s*:\s*async\s*\(/g,
    /(?:^|\s)(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::[^{]+)?\{/gm,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      if (!name || index.has(name)) continue;
      index.set(name, extractBody(source, match.index ?? 0));
    }
  }

  return index;
}

/**
 * Text from a declaration to the end of its brace-balanced body.
 *
 * The opening brace is located *after* the parameter list, not by taking the
 * first `{` in the text. A default value — `input: ListEmployeesInput = {}` —
 * is a brace pair inside the parameters, and treating it as the body start
 * meant extraction ended two characters later. Every action written with a
 * defaulted object parameter then appeared to have an empty body and was
 * reported as unguarded, which is the opposite of the error this tool may
 * make: it must not cry wolf, or its output stops being read.
 */
function extractBody(source: string, start: number): string {
  // Walk the parameter list to its matching close paren.
  const paramsOpen = source.indexOf("(", start);
  if (paramsOpen === -1) return "";

  let parenDepth = 0;
  let paramsClose = -1;
  for (let i = paramsOpen; i < source.length; i++) {
    if (source[i] === "(") parenDepth++;
    else if (source[i] === ")") {
      parenDepth--;
      if (parenDepth === 0) {
        paramsClose = i;
        break;
      }
    }
  }
  if (paramsClose === -1) return "";

  const open = source.indexOf("{", paramsClose);
  if (open === -1) return "";

  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return source.slice(start);
}

/** Local paths this file imports from, resolved to files on disk. */
function importedFiles(source: string, fromFile: string): string[] {
  const files: string[] = [];

  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    const specifier = match[1];
    let base: string;

    if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
    else if (specifier.startsWith("."))
      base = resolve(dirname(fromFile), specifier);
    else continue; // node_modules — not ours to analyse

    for (const candidate of [
      `${base}.ts`,
      `${base}.tsx`,
      join(base, "index.ts"),
    ]) {
      if (existsSync(candidate)) {
        files.push(candidate);
        break;
      }
    }
  }

  return files;
}

const sourceCache = new Map<string, string>();
function read(file: string): string {
  let cached = sourceCache.get(file);
  if (cached === undefined) {
    cached = readFileSync(file, "utf8");
    sourceCache.set(file, cached);
  }
  return cached;
}

const indexCache = new Map<string, FunctionIndex>();
function functionsIn(file: string): FunctionIndex {
  let cached = indexCache.get(file);
  if (!cached) {
    cached = indexFunctions(read(file));
    indexCache.set(file, cached);
  }
  return cached;
}

/** Whether `body` reaches a guard, following calls up to MAX_DEPTH. */
function reachesGuard(
  body: string,
  file: string,
  depth: number,
  seen: Set<string>,
): boolean {
  if (GUARDS.some((guard) => body.includes(guard))) return true;
  if (depth >= MAX_DEPTH) return false;

  // Every identifier that looks like it is being called.
  const called = new Set(
    [...body.matchAll(/\b([a-zA-Z_]\w*)\s*\(/g)].map((m) => m[1]),
  );
  if (called.size === 0) return false;

  const scopes = [file, ...importedFiles(read(file), file)];

  for (const scope of scopes) {
    const functions = functionsIn(scope);
    for (const name of called) {
      const key = `${scope}#${name}`;
      if (seen.has(key)) continue;
      const nested = functions.get(name);
      if (!nested) continue;
      seen.add(key);
      if (reachesGuard(nested, scope, depth + 1, seen)) return true;
    }
  }

  return false;
}

/**
 * Actions that are deliberately reachable without an authenticated session,
 * each with the reason. Anything not listed here must reach a guard.
 */
export const UNAUTHENTICATED_BY_DESIGN: Record<string, string> = {
  // Establishing a session cannot require one.
  "features/auth/real-actions.ts::signInWithPassword":
    "Establishes the session. Rate-limited per IP and per account.",
  "features/auth/real-actions.ts::signInWithMagicLink":
    "Establishes the session. Rate-limited per IP and per account.",
  "features/auth/real-actions.ts::signInWithGoogle":
    "Redirects to the OAuth provider; the callback establishes the session.",
  "features/auth/real-actions.ts::signOut":
    "Clearing a session must succeed even when the session is already invalid.",
};

/** Every action-bearing module under src/, found by walking the tree. */
function collectActionModules(dir: string): string[] {
  const targets = new Set([
    "real-actions.ts",
    "real-index.ts",
    "real-queries.ts",
    "action-core.ts",
  ]);
  const found: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectActionModules(full));
    else if (targets.has(entry.name)) found.push(full);
  }

  return found;
}

export function auditAuthorization(): AuditFinding[] {
  const files = collectActionModules(SRC);

  const findings: AuditFinding[] = [];

  for (const file of files.sort()) {
    const source = read(file);
    const relative = file.slice(resolve(process.cwd(), "src").length + 1);

    for (const match of source.matchAll(
      /export\s+async\s+function\s+(\w+)\s*[(<]/g,
    )) {
      const action = match[1];
      const key = `${relative}::${action}`;
      if (key in UNAUTHENTICATED_BY_DESIGN) continue;

      const body = extractBody(source, match.index ?? 0);
      if (!reachesGuard(body, file, 0, new Set())) {
        findings.push({ file: relative, action });
      }
    }
  }

  return findings;
}

export function auditTenantIsolation(): AuditFinding[] {
  const files = collectActionModules(SRC);
  const findings: AuditFinding[] = [];

  for (const file of files.sort()) {
    const source = read(file);
    const relative = file.slice(resolve(process.cwd(), "src").length + 1);

    for (const match of source.matchAll(
      /export\s+async\s+function\s+(\w+)\s*[(<]/g,
    )) {
      const action = match[1];
      const key = `${relative}::${action}`;
      if (key in UNAUTHENTICATED_BY_DESIGN) continue;

      const body = extractBody(source, match.index ?? 0);

      // Check if action parameter declaration trusts client organizationId
      const paramsMatch = source.slice(match.index ?? 0).match(/\(([^)]*)\)/);
      const params = paramsMatch ? paramsMatch[1] : "";
      if (
        params.includes("organizationId") &&
        !body.includes("user.organizationId") &&
        !body.includes("currentUser.organizationId") &&
        !body.includes("resolved.organizationId") &&
        !body.includes("context.organizationId")
      ) {
        findings.push({
          file: relative,
          action: `${action} (untrusted client organizationId parameter)`,
        });
      }
    }
  }

  return findings;
}

// Report when run directly.
if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  const findings = auditAuthorization();
  const tenantFindings = auditTenantIsolation();

  if (findings.length === 0 && tenantFindings.length === 0) {
    console.log(
      "\n✓ Every exported server action reaches an authorization guard.",
    );
    console.log(
      "✓ Static tenant isolation gate verified: No untrusted client organizationId parameters.\n",
    );
    process.exit(0);
  }

  if (findings.length > 0) {
    console.error(
      `\n✖ ${findings.length} action(s) reach no authorization guard:\n`,
    );
    for (const finding of findings) {
      console.error(`  ${finding.file}  ::  ${finding.action}`);
    }
  }

  if (tenantFindings.length > 0) {
    console.error(
      `\n✖ ${tenantFindings.length} action(s) violate tenant isolation boundaries:\n`,
    );
    for (const finding of tenantFindings) {
      console.error(`  ${finding.file}  ::  ${finding.action}`);
    }
  }

  console.error("");
  process.exit(1);
}
