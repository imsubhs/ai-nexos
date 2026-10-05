import { createClient as createBareClient } from "@supabase/supabase-js";
import { requirePublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

/**
 * Service-role client — BYPASSES RLS. Server-only, and exclusively for:
 *  - background workers,
 *  - the share-link portal service layer (M4), which does its own
 *    token → permission validation before every query,
 *  - object storage administration (signed upload/download URLs),
 *  - administrative seeding.
 * Never import from client components.
 *
 * This lives apart from `./server` because that module imports `next/headers`
 * at load time, which only resolves inside a request scope. Storage
 * provisioning scripts and integration tests need the service client without
 * that dependency, so the definition sits here and `./server` re-exports it —
 * one definition, two entry points.
 */
export function createServiceClient() {
  const serviceRoleKey = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. The service-role client bypasses RLS and has no anon-key fallback by design; copy the key from Supabase › Project Settings › API into .env.local (server-side only — never prefix it with the public prefix).",
    );
  }

  return createBareClient(
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
