import { createServerClient } from "@supabase/ssr";
import { createClient as createBareClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requirePublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

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
  const serviceRoleKey = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. The service-role client bypasses RLS and has no anon-key fallback by design; copy the key from Supabase \u203a Project Settings \u203a API into .env.local (server-side only \u2014 never prefix it with NEXT_PUBLIC_).",
    );
  }

  return createBareClient(
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
