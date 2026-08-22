/**
 * The staging-target policy, shared by the integration suite and by every
 * destructive CLI command that can be pointed at staging.
 *
 * `tests/integration/guard.ts` proved this policy first, for
 * `npm run test:integration`. It applies verbatim to `db:migrate`,
 * `db:seed` and `storage:setup` when they target staging: those commands write
 * to the same tables, create the same Auth users and administer the same
 * bucket, so "which projects may be written to, and how sure are we?" has one
 * answer, not two. A second copy would eventually drift, and the drift would
 * surface as one tool permitting what the other refuses.
 *
 * Pure by construction: no file I/O, no sockets, no ambient `process.env`.
 * Everything arrives as an argument, which is what lets both callers be proved
 * offline. Secrets never appear in a message.
 */

import {
  EnvironmentGuardError,
  parseRefList,
  projectRefFromDatabaseUrl,
  projectRefFromSupabaseUrl,
} from "./project-ref";

/**
 * Variables no staging operation can run without. Presence only is checked — a
 * value is never read into a message, and never validated by using it, because
 * "validate by connecting" is precisely the action this guard exists to gate.
 */
export const REQUIRED_INTEGRATION_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/**
 * One of these must be present. `DIRECT_DATABASE_URL` is the session-mode
 * connection migrations and the specs prefer; `DATABASE_URL` is the transaction
 * pooler they fall back to.
 */
export const REQUIRED_DATABASE_VARS = [
  "DIRECT_DATABASE_URL",
  "DATABASE_URL",
] as const;

export interface GuardVerdict {
  /** The project the Supabase REST/Auth/Storage calls will reach. */
  readonly projectRef: string;
  /** The project the PostgreSQL connection will reach. */
  readonly databaseRef: string;
  /** Which connection variable was selected, for the printed summary. */
  readonly databaseVariable: (typeof REQUIRED_DATABASE_VARS)[number];
  /** The allow-list that admitted it, echoed so the summary is self-evident. */
  readonly allowedRefs: readonly string[];
}

export interface GuardOptions {
  /**
   * References that are refused no matter what the allow-list says. Callers
   * derive these from the developer's own `.env.local`, so the project the
   * application points at is automatically disqualified as a staging target
   * without any production identifier ever being written into this repository.
   */
  readonly deniedProjectRefs?: readonly string[];
  /**
   * What is being guarded, for the error text — "the integration suite",
   * "db:migrate", and so on. Wording only; it changes no decision.
   */
  readonly subject?: string;
}

/**
 * Asserts that the environment describes a project it is safe to write to.
 * Returns the verdict on success and throws on every refusal — there is no
 * permissive branch and no variable that switches the guard off.
 */
export function assertStagingTarget(
  env: Readonly<Record<string, string | undefined>>,
  options: GuardOptions = {},
): GuardVerdict {
  const subject = options.subject ?? "the integration suite";

  // 1. Must be running as a test. This is what stops staging tooling being
  //    driven by a process configured as the production application.
  if (env.NODE_ENV !== "test") {
    throw new EnvironmentGuardError(
      `NODE_ENV must be "test" to run ${subject} against staging — got ` +
        `${env.NODE_ENV ? `"${env.NODE_ENV}"` : "an unset value"}. Staging ` +
        `operations write real rows and must never run under a development or ` +
        `production configuration.`,
    );
  }

  // 2. Presence only. Nothing here is read, printed or used to connect.
  const missing = REQUIRED_INTEGRATION_VARS.filter(
    (name) => !env[name] || !env[name]!.trim(),
  );
  if (missing.length) {
    throw new EnvironmentGuardError(
      `Missing required integration variable(s): ${missing.join(", ")}. ` +
        `Set them in the staging environment file — never by copying ` +
        `production values.`,
    );
  }

  const databaseVariable = REQUIRED_DATABASE_VARS.find(
    (name) => env[name] && env[name]!.trim(),
  );
  if (!databaseVariable) {
    throw new EnvironmentGuardError(
      `Neither ${REQUIRED_DATABASE_VARS.join(" nor ")} is set. ${subject} ` +
        `needs a staging PostgreSQL connection; DIRECT_DATABASE_URL ` +
        `(session mode, port 5432) is preferred.`,
    );
  }

  // 3. Name the target. Either derivation failing is itself a refusal.
  const projectRef = projectRefFromSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const databaseRef = projectRefFromDatabaseUrl(
    env[databaseVariable],
    databaseVariable,
  );

  // 4. The deny-list wins over everything, including a mistaken allow-list
  //    entry. This is the layer that knows what the application points at.
  const denied = new Set([
    ...(options.deniedProjectRefs ?? []).map((ref) => ref.toLowerCase()),
    ...parseRefList(env.INTEGRATION_DENIED_PROJECT_REFS),
  ]);
  for (const [ref, source] of [
    [projectRef, "NEXT_PUBLIC_SUPABASE_URL"],
    [databaseRef, databaseVariable],
  ] as const) {
    if (denied.has(ref)) {
      throw new EnvironmentGuardError(
        `REFUSING TO RUN: ${source} points at project "${ref}", which is on ` +
          `the integration deny-list. This is the project the application ` +
          `itself is configured to use (.env.local) or an explicitly denied ` +
          `reference — it is never a valid staging target, because ${subject} ` +
          `creates and deletes real organizations, real Auth users and real ` +
          `storage objects.`,
      );
    }
  }

  // 5. The allow-list is authoritative. An empty list permits nothing.
  const allowedRefs = parseRefList(env.INTEGRATION_ALLOWED_PROJECT_REFS);
  if (allowedRefs.length === 0) {
    throw new EnvironmentGuardError(
      `INTEGRATION_ALLOWED_PROJECT_REFS is not set. ${subject} runs only ` +
        `against a project named explicitly in that allow-list, so that a ` +
        `misconfigured environment fails instead of writing to whatever ` +
        `project it happened to find. Set it to your staging project ` +
        `reference in the staging environment file.`,
    );
  }

  if (!allowedRefs.includes(projectRef)) {
    throw new EnvironmentGuardError(
      `REFUSING TO RUN: NEXT_PUBLIC_SUPABASE_URL points at project ` +
        `"${projectRef}", which is not in INTEGRATION_ALLOWED_PROJECT_REFS ` +
        `(allowed: ${allowedRefs.join(", ")}). Add it deliberately, or point ` +
        `the staging environment at your staging project.`,
    );
  }

  // 6. The API project and the database project must be the same project.
  //    A mismatch means writes and reads would land in different places, and
  //    one of them was not the one the operator vetted.
  if (databaseRef !== projectRef) {
    throw new EnvironmentGuardError(
      `REFUSING TO RUN: ${databaseVariable} points at project "${databaseRef}" ` +
        `but NEXT_PUBLIC_SUPABASE_URL points at "${projectRef}". The database ` +
        `and the API must belong to the same project — a mismatch means ` +
        `${subject} would write rows to one project and Auth users to another.`,
    );
  }

  return { projectRef, databaseRef, databaseVariable, allowedRefs };
}
