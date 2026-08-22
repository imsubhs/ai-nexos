/**
 * Fail-closed target guard for the integration suite.
 *
 * The integration specs create and delete real organizations, real Supabase
 * Auth users and real storage objects. Until Phase 2.5.1A.2 the only thing
 * deciding which project received those writes was `dotenv` loading
 * `.env.local` — the file that points at PRODUCTION. Nothing asserted the
 * target before the first write, so a single `npm run test:integration` on a
 * developer machine would have created and deleted production rows without a
 * word of warning.
 *
 * This module is the assertion that was missing. It is PURE: no file I/O, no
 * sockets, no ambient `process.env`. Everything arrives as an argument, which
 * is what lets the unit suite prove it refuses production without ever
 * contacting Supabase.
 *
 * The policy and the reference-derivation primitives now live under
 * `scripts/lib/` so the destructive CLI tooling — `db:migrate`, `db:seed`,
 * `storage:setup` — enforces exactly this policy rather than a second copy of
 * it. Those commands write to the same tables and administer the same bucket,
 * so "which projects may be written to?" has one answer. This module is the
 * integration suite's entry point into it, and its API is unchanged.
 */

import {
  EnvironmentGuardError,
  LOCAL_PROJECT_REF,
  parseRefList,
  projectRefFromDatabaseUrl,
  projectRefFromSupabaseUrl,
  tryProjectRef,
} from "../../scripts/lib/project-ref";
import {
  assertStagingTarget,
  REQUIRED_DATABASE_VARS,
  REQUIRED_INTEGRATION_VARS,
  type GuardOptions,
  type GuardVerdict,
} from "../../scripts/lib/staging-guard";

export {
  LOCAL_PROJECT_REF,
  parseRefList,
  projectRefFromDatabaseUrl,
  projectRefFromSupabaseUrl,
  tryProjectRef,
  REQUIRED_DATABASE_VARS,
  REQUIRED_INTEGRATION_VARS,
};
export type { GuardOptions, GuardVerdict };

/**
 * The refusal type. The same class as `EnvironmentGuardError` under the name
 * the integration suite has always used, so `instanceof` holds across both.
 */
export { EnvironmentGuardError as IntegrationGuardError };

/**
 * Asserts that the environment describes a project the integration suite may
 * write to. Throws on every refusal; there is no permissive branch.
 */
export function assertSafeIntegrationTarget(
  env: Readonly<Record<string, string | undefined>>,
  options: GuardOptions = {},
): GuardVerdict {
  return assertStagingTarget(env, {
    ...options,
    subject: options.subject ?? "the integration suite",
  });
}
