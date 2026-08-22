/**
 * Explicit environment selection for the destructive CLI tooling.
 *
 * `scripts/migrate.ts`, `scripts/seed.ts`, `scripts/storage-setup.ts`,
 * `scripts/check-env.ts` and `drizzle.config.ts` each used to open with:
 *
 *     loadEnv({ path: [".env.local", ".env"] })
 *
 * which made PRODUCTION the silent default for every one of them. `db:seed`
 * would create a production organization and a production Auth owner; the
 * migrator would apply DDL to the live database; `env:check --verify` would
 * open a real connection to it. In every case the operator's only signal that
 * they had hit production rather than staging was knowing, from memory, what
 * was in a file they could not see.
 *
 * This module replaces that with one rule: THE TARGET IS ALWAYS NAMED.
 *
 *     --environment=staging      →  .env.test.local   (must exist)
 *     --environment=production   →  .env.local, or the ambient process
 *                                   environment when no file exists
 *
 * and there is no third state. A destructive command invoked without a named
 * environment fails; it does not guess, and above all it never degrades from a
 * requested staging target to the production file. That specific fallback is
 * the one this whole module exists to make impossible: it is silent, it looks
 * like success, and by the time anyone reads the output the rows already exist.
 *
 * Nothing here prints a value. Summaries carry the environment name, a
 * truncated project reference and a bare hostname — never a password, a key, or
 * a connection string.
 */

import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { config as loadDotenv, parse as parseDotenv } from "dotenv";
import { readFileSync } from "node:fs";

import {
  EnvironmentGuardError,
  LOCAL_PROJECT_REF,
  databaseHostFromUrl,
  projectRefFromDatabaseUrl,
  projectRefFromSupabaseUrl,
  redactRef,
  tryProjectRef,
} from "./project-ref";
import { assertStagingTarget, type GuardVerdict } from "./staging-guard";

export type ToolEnvironment = "staging" | "production";

/**
 * An environment record the loader may write into. Deliberately not
 * `NodeJS.ProcessEnv`: that type declares `NODE_ENV` required and read-only, so
 * it cannot express the injected record the unit suite builds — and an
 * environment resolver that can only be exercised through the real
 * `process.env` is one that cannot be tested without side effects.
 */
export type MutableEnv = Record<string, string | undefined>;

export const TOOL_ENVIRONMENTS: readonly ToolEnvironment[] = [
  "staging",
  "production",
];

/** The file each environment is described by. */
export const ENVIRONMENT_FILES: Record<ToolEnvironment, string> = {
  staging: ".env.test.local",
  production: ".env.local",
};

export interface EnvironmentSelection {
  readonly environment: ToolEnvironment;
  /** How it was chosen, quoted back to the operator so the choice is visible. */
  readonly source: string;
}

export interface LoadedEnvironment extends EnvironmentSelection {
  /** The file that was loaded, or undefined when the ambient env was used. */
  readonly file?: string;
}

export interface ToolingTarget extends LoadedEnvironment {
  readonly projectRef: string;
  readonly databaseRef: string;
  readonly databaseVariable: string;
  readonly databaseHost: string;
}

function isToolEnvironment(value: string): value is ToolEnvironment {
  return (TOOL_ENVIRONMENTS as readonly string[]).includes(value);
}

function rejectUnknown(value: string, source: string): never {
  throw new EnvironmentGuardError(
    `Unknown environment "${value}" (from ${source}). Valid values are: ` +
      `${TOOL_ENVIRONMENTS.join(", ")}.`,
  );
}

/**
 * Reads the environment from the command line or the process environment.
 * Returns `undefined` when none was named — the caller decides whether that is
 * acceptable (it is not, for anything destructive).
 *
 * Precedence is argv over environment variable, because the flag is the thing
 * the operator typed on this invocation and an exported `TOOL_ENV` may be a
 * leftover from a previous one.
 */
export function selectEnvironment(
  argv: readonly string[] = process.argv.slice(2),
  env: Readonly<Record<string, string | undefined>> = process.env,
): EnvironmentSelection | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    const inline = /^--(?:environment|env)=(.*)$/.exec(arg);
    if (inline) {
      const value = inline[1].trim().toLowerCase();
      if (!isToolEnvironment(value)) rejectUnknown(value, arg);
      return { environment: value, source: arg };
    }

    if (arg === "--environment" || arg === "--env") {
      const value = (argv[i + 1] ?? "").trim().toLowerCase();
      if (!isToolEnvironment(value)) rejectUnknown(value || "(missing)", arg);
      return { environment: value, source: `${arg} ${value}` };
    }

    // Backward compatibility. `env:check -- --production --verify` is the
    // Vercel Build Command (docs/SPRINT-2.4.md §19) and predates this module.
    // It is already an explicit statement of intent, so it is honoured as one
    // rather than broken — which is what keeps production deploys working
    // without editing a Vercel project setting from here.
    if (arg === "--production") {
      return { environment: "production", source: "--production" };
    }
  }

  const fromEnv = env.TOOL_ENV?.trim().toLowerCase();
  if (fromEnv) {
    if (!isToolEnvironment(fromEnv)) rejectUnknown(fromEnv, "TOOL_ENV");
    return { environment: fromEnv, source: "TOOL_ENV" };
  }

  return undefined;
}

/**
 * As `selectEnvironment`, but refuses to continue when nothing was named.
 * Every destructive command uses this: an unnamed target is a failure, never a
 * default.
 */
export function requireEnvironment(
  command: string,
  argv: readonly string[] = process.argv.slice(2),
  env: Readonly<Record<string, string | undefined>> = process.env,
): EnvironmentSelection {
  const selection = selectEnvironment(argv, env);
  if (selection) return selection;

  throw new EnvironmentGuardError(
    `${command} requires an explicit environment. It will not pick one for ` +
      `you, because the only sensible default would be production and this ` +
      `command writes.\n\n` +
      `  npm run ${command} -- --environment=staging       ` +
      `→ ${ENVIRONMENT_FILES.staging}\n` +
      `  npm run ${command} -- --environment=production    ` +
      `→ ${ENVIRONMENT_FILES.production}\n\n` +
      `TOOL_ENV=staging|production is equivalent, for callers that cannot pass ` +
      `arguments (drizzle-kit, CI).`,
  );
}

/** The file a selection resolves to, honouring an explicit APP_ENV_FILE. */
export function resolveEnvironmentFile(
  environment: ToolEnvironment,
  env: Readonly<Record<string, string | undefined>> = process.env,
  cwd: string = process.cwd(),
): { path: string; explicit: boolean } {
  const override = env.APP_ENV_FILE?.trim();
  const relative = override || ENVIRONMENT_FILES[environment];
  return {
    path: isAbsolute(relative) ? relative : join(cwd, relative),
    explicit: Boolean(override),
  };
}

/**
 * Loads the named environment into `process.env`.
 *
 * Staging: the file must exist. There is no fallback of any kind — least of all
 * to `.env.local`, which is the failure this module was written to prevent.
 *
 * Production: the file is loaded when present. When it is absent the ambient
 * process environment is used instead, because that is how the production build
 * actually runs — Vercel injects the real values as environment variables and
 * no `.env.local` exists in the build container. That is a fallback in
 * mechanism only, never in target: production was named explicitly to get here.
 */
export function loadToolingEnv(
  selection: EnvironmentSelection,
  env: MutableEnv = process.env,
  cwd: string = process.cwd(),
): LoadedEnvironment {
  const { environment } = selection;
  const { path, explicit } = resolveEnvironmentFile(environment, env, cwd);

  if (!existsSync(path)) {
    if (environment === "staging") {
      throw new EnvironmentGuardError(
        `The staging environment file is missing, and there is no fallback.\n\n` +
          `  Expected: ${path}\n\n` +
          `This file must describe the STAGING Supabase project. \`.env.local\` ` +
          `is deliberately NOT consulted: it points at the project the ` +
          `application serves, and staging tooling creates and deletes real ` +
          `organizations, real Auth users and real storage objects.\n\n` +
          `See .env.example § "Integration testing" for the variables it needs.`,
      );
    }

    if (explicit) {
      throw new EnvironmentGuardError(
        `APP_ENV_FILE names a file that does not exist: ${path}`,
      );
    }

    // Production, no file: the deployment case. The values are already in the
    // process environment; loading nothing is correct.
    return { ...selection };
  }

  // `processEnv` targets the record the caller passed rather than the ambient
  // one, so the resolver stays injectable and the unit suite can exercise it
  // without mutating the test runner's own environment.
  const result = loadDotenv({
    path,
    quiet: true,
    processEnv: env as Record<string, string>,
  });
  if (result.error) {
    throw new EnvironmentGuardError(
      `Could not read ${path}: ${result.error.message}`,
    );
  }

  // Staging operations must run as tests. The flag is the explicit marker; this
  // makes the process agree with it, so a stray NODE_ENV cannot leave a staging
  // run describing itself as production. NODE_ENV never *selects* the
  // environment — it only ever follows the selection.
  if (environment === "staging") {
    env.NODE_ENV = "test";
  }

  return { ...selection, file: path };
}

/**
 * Project references that must never be a staging target, derived from the
 * application's own environment file.
 *
 * Parsed in memory and discarded; nothing is copied into `process.env` and
 * nothing but the derived reference leaves this function. This is what lets the
 * production project be refused without its identifier ever being committed.
 */
export function deniedProjectRefsFromApplicationEnv(
  cwd: string = process.cwd(),
  files: readonly string[] = [ENVIRONMENT_FILES.production, ".env"],
): string[] {
  const refs = new Set<string>();

  for (const name of files) {
    const file = join(cwd, name);
    if (!existsSync(file)) continue;

    let parsed: Record<string, string>;
    try {
      parsed = parseDotenv(readFileSync(file, "utf8"));
    } catch {
      continue;
    }

    const candidates = [
      tryProjectRef(() =>
        projectRefFromSupabaseUrl(parsed.NEXT_PUBLIC_SUPABASE_URL),
      ),
      tryProjectRef(() =>
        projectRefFromDatabaseUrl(
          parsed.DIRECT_DATABASE_URL,
          "DIRECT_DATABASE_URL",
        ),
      ),
      tryProjectRef(() =>
        projectRefFromDatabaseUrl(parsed.DATABASE_URL, "DATABASE_URL"),
      ),
    ];

    for (const ref of candidates) {
      // A loopback stack is disposable; denying it would make the local inner
      // loop unusable without protecting anything. It can still be denied
      // explicitly through INTEGRATION_DENIED_PROJECT_REFS.
      if (ref && ref !== LOCAL_PROJECT_REF) refs.add(ref);
    }
  }

  return [...refs];
}

/**
 * The full safe-start sequence for a destructive command: name the environment,
 * load it, and — for staging — assert the target is one that may be written to.
 *
 * Production is not allow-listed. Naming it is the control, and it is a
 * legitimate operation: the schema has to be migrated at some point. What must
 * never happen is reaching it without saying so, and by this point the operator
 * has said so twice — once to choose the environment, and for `db:seed` once
 * more to confirm it.
 */
export function prepareToolingTarget(
  command: string,
  argv: readonly string[] = process.argv.slice(2),
  env: MutableEnv = process.env,
  cwd: string = process.cwd(),
): ToolingTarget {
  const selection = requireEnvironment(command, argv, env);
  const loaded = loadToolingEnv(selection, env, cwd);

  let verdict: GuardVerdict | undefined;
  if (selection.environment === "staging") {
    verdict = assertStagingTarget(env, {
      deniedProjectRefs: deniedProjectRefsFromApplicationEnv(cwd),
      subject: command,
    });
  }

  const databaseVariable =
    verdict?.databaseVariable ??
    (env.DIRECT_DATABASE_URL ? "DIRECT_DATABASE_URL" : "DATABASE_URL");
  const databaseUrl = env[databaseVariable];

  return {
    ...loaded,
    projectRef:
      verdict?.projectRef ??
      tryProjectRef(() =>
        projectRefFromSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL),
      ) ??
      "(undetermined)",
    databaseRef:
      verdict?.databaseRef ??
      (databaseUrl
        ? (tryProjectRef(() =>
            projectRefFromDatabaseUrl(databaseUrl, databaseVariable),
          ) ?? "(undetermined)")
        : "(unset)"),
    databaseVariable,
    databaseHost: databaseUrl ? databaseHostFromUrl(databaseUrl) : "(unset)",
  };
}

/**
 * The banner every tooling command prints before it does anything. Safe
 * metadata only: the environment, a truncated project reference and a bare
 * hostname. No password, no key, no connection string.
 */
export function describeTarget(target: ToolingTarget): string {
  const lines = [
    `  Environment       ${target.environment}  (selected by ${target.source})`,
    `  Config source     ${target.file ?? "process environment (no file)"}`,
    `  Supabase project  ${redactRef(target.projectRef)}`,
    `  Database          ${target.databaseHost}  (${target.databaseVariable})`,
  ];
  if (target.databaseRef !== target.projectRef) {
    lines.push(`  Database project  ${redactRef(target.databaseRef)}`);
  }
  return lines.join("\n");
}
