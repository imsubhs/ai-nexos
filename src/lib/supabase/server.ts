import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePublicEnv } from "@/lib/env";

/**
 * Server Component / Server Action / Route Handler client.
 * Anon key + user session cookie — every query runs under RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return typeof cookieStore?.getAll === "function"
            ? cookieStore.getAll()
            : [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore because the
            // proxy refreshes sessions before requests reach render.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — BYPASSES RLS. Defined in `./service` so that scripts
 * and integration tests can construct it without pulling in `next/headers`,
 * and re-exported here so existing server-side imports keep working.
 */
export { createServiceClient } from "./service";
