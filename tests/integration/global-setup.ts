/**
 * Vitest global setup for the integration suite — the first thing that runs,
 * before any spec module is imported and therefore before any spec can open a
 * connection.
 *
 * Placement matters more than it looks. `tests/integration/timeline.integration
 * .test.ts` constructs its own `postgres()` client at MODULE SCOPE rather than
 * going through `helpers/database.ts`, so a guard living in the shared helper
 * would not cover it — importing that file would connect regardless. A global
 * setup runs before the module graph is loaded at all, which is the only
 * placement that covers every spec including the ones that bring their own
 * client.
 *
 * The same assertion is repeated per worker in `setup.ts`. That is deliberate
 * redundancy, not an oversight: `globalSetup` and `setupFiles` run in different
 * processes, and a guarantee this expensive to get wrong should not depend on
 * environment inheritance between them.
 *
 * Nothing here connects to anything. The guard is a string-and-URL assertion;
 * the first socket the suite opens is still the one a spec opens, after the
 * target has been vetted.
 */
import { deniedProjectRefsFromApplicationEnv, loadIntegrationEnv } from "./env";
import { assertSafeIntegrationTarget } from "./guard";

export default function setup(): void {
  // Fails closed when .env.test.local is absent. No fallback to .env.local.
  const envFile = loadIntegrationEnv();

  // Whatever the application is configured to use is, by construction, not a
  // valid integration target. Derived per machine so no production identifier
  // is ever committed to this repository.
  const deniedProjectRefs = deniedProjectRefsFromApplicationEnv();

  const verdict = assertSafeIntegrationTarget(process.env, {
    deniedProjectRefs,
  });

  // Names and references only — never a value from the environment file.
  console.log(
    [
      "",
      "  Integration target verified",
      `    env file        ${envFile}`,
      `    project         ${verdict.projectRef}`,
      `    database        ${verdict.databaseVariable} → ${verdict.databaseRef}`,
      `    allow-list      ${verdict.allowedRefs.join(", ")}`,
      `    deny-list       ${
        deniedProjectRefs.length
          ? deniedProjectRefs.join(", ")
          : "(no application env file found to derive from)"
      }`,
      "",
    ].join("\n"),
  );
}
