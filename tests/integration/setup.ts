/**
 * Per-worker setup for the integration suite.
 *
 * This file previously loaded `[".env.local", ".env"]` — the application's own
 * environment, pointing at PRODUCTION — which made a single
 * `npm run test:integration` enough to create and delete production rows. It
 * now loads the integration suite's dedicated file and re-asserts the target
 * guard.
 *
 * The assertion is repeated here even though `global-setup.ts` already ran.
 * `globalSetup` executes in the Vitest main process and specs execute in worker
 * processes; rather than trust that `process.env` crossed that boundary intact,
 * the check — which is pure, offline and costs microseconds — simply runs again
 * in the process that is about to import the specs. Two independent chances to
 * refuse, and no spec module is imported until both have passed.
 */
import { deniedProjectRefsFromApplicationEnv, loadIntegrationEnv } from "./env";
import { assertSafeIntegrationTarget } from "./guard";

loadIntegrationEnv();

assertSafeIntegrationTarget(process.env, {
  deniedProjectRefs: deniedProjectRefsFromApplicationEnv(),
});
