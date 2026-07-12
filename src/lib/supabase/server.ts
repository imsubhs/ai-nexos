import { createServerClient } from "@supabase/ssr";
import { createClient as createBareClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server Component / Server Action / Route Handler client.
 * Anon key + user session cookie — every query runs under RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
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
 * Service-role client — BYPASSES RLS. Server-only, and exclusively for:
 *  - background workers,
 *  - the share-link portal service layer (M4), which does its own
 *    token → permission validation before every query,
 *  - administrative seeding.
 * Never import from client components.
 */
export function createServiceClient() {
  return createBareClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
