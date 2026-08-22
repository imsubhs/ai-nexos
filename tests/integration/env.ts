/**
 * Environment resolution for the integration suite.
 *
 * The suite used to call `dotenv` with `[".env.local", ".env"]` — the same
 * files the application uses, and therefore the production project. That is the
 * defect this module removes: the integration suite has an environment file of
 * its own and NO fallback to the application's.
 *
 *   .env.test.local  →  staging Supabase  →  integration tests
 *   .env.local       →  production        →  never reached from here
 *
 * A missing `.env.test.local` is a hard failure. It is tempting to fall back to
 * `.env.local` "just to get the suite running", which is precisely how a test
 * run reaches production: the fallback is silent, and by the time anyone reads
 * the output the rows already exist.
 *
 * The staging file, the deny-list derivation and the guard are all shared with
 * the destructive CLI tooling (`scripts/lib/environment.ts`), so the suite and
 * `db:migrate --environment=staging` agree by construction about which project
 * may be written to.
 */
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { config as loadDotenv } from "dotenv";

import { IntegrationGuardError } from "./guard";
import {
  ENVIRONMENT_FILES,
  deniedProjectRefsFromApplicationEnv,
} from "../../scripts/lib/environment";

/** The integration suite's own environment file. Gitignored by `.env*`. */
export const DEFAULT_INTEGRATION_ENV_FILE = ENVIRONMENT_FILES.staging;

export { deniedProjectRefsFromApplicationEnv };

/**
 * Where the integration environment comes from.
 *
 * `INTEGRATION_ENV_FILE` (or the tooling-wide `APP_ENV_FILE`) overrides the
 * path — useful for CI, which can write its staging secrets to a file of its
 * choosing. It is a path override only: the file must still exist, and the
 * application's own env files are still never consulted. There is no variable
 * that turns the requirement off.
 */
export function resolveIntegrationEnvFile(
  env: Readonly<Record<string, string | undefined>> = process.env,
  cwd: string = process.cwd(),
): string {
  const configured =
    env.INTEGRATION_ENV_FILE?.trim() || env.APP_ENV_FILE?.trim();
  const relative = configured || DEFAULT_INTEGRATION_ENV_FILE;
  return isAbsolute(relative) ? relative : join(cwd, relative);
}

/**
 * Loads the integration environment into `process.env`, or fails closed.
 *
 * Returns the resolved path so the caller can report which file was used —
 * names only; no value from it is ever printed.
 */
export function loadIntegrationEnv(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): string {
  const file = resolveIntegrationEnvFile(env, cwd);

  if (!existsSync(file)) {
    throw new IntegrationGuardError(
      `The integration suite requires a dedicated environment file and will ` +
        `not fall back to the application's.\n\n` +
        `  Missing: ${file}\n\n` +
        `This file must describe the STAGING Supabase project — never ` +
        `production. ".env.local" is deliberately NOT consulted here: the ` +
        `integration specs create and delete real organizations, real Supabase ` +
        `Auth users and real storage objects, and .env.local points at the ` +
        `project the application serves.\n\n` +
        `Create ${DEFAULT_INTEGRATION_ENV_FILE} with the staging values (see ` +
        `.env.example § "Integration testing") and set ` +
        `INTEGRATION_ALLOWED_PROJECT_REFS to your staging project reference.`,
    );
  }

  const result = loadDotenv({ path: file, quiet: true });
  if (result.error) {
    throw new IntegrationGuardError(
      `Could not read ${file}: ${result.error.message}`,
    );
  }

  return file;
}
