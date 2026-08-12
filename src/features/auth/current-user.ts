import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PermissionMap } from "@/features/permissions";
import { cookies } from "next/headers";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import { isDemoMode } from "@/lib/env.server";
import { resolveTimeZone } from "@/features/workforce/shared/business-day";
import { DEMO_SESSION_COOKIE, isDemoSessionValue } from "./demo-session";

export const DEMO_ADMIN_USER: CurrentUser = {
  userId: "00000000-0000-4000-8000-00000000f002",
  organizationId: "00000000-0000-4000-8000-00000000f001",
  email: "admin@demo.local",
  firstName: "Demo",
  lastName: "Administrator",
  avatarUrl: null,
  designation: "Principal Admin",
  roleId: "demo-role-owner",
  roleKey: "owner",
  roleName: "Owner",
  permissions: SYSTEM_ROLES.find((r) => r.roleKey === "owner")!.permissions,
  // Matches the seeded Leadership department (src/lib/demo/store.ts, WP-103).
  departmentId: "00000000-0000-4000-8000-000000000221",
  organizationName: "AI NEX OS Demo",
  organizationSlug: "demo-workspace",
  organizationLogoUrl: null,
  // The demo store's organization is UTC (src/lib/demo/store.ts), so the demo
  // attendance day stays the UTC day — unchanged by the policy-timezone fix.
  organizationTimezone: "UTC",
};

export type CurrentUser = {
  userId: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  designation: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  permissions: PermissionMap;
  departmentId: string | null;
  organizationName: string;
  organizationSlug: string;
  organizationLogoUrl: string | null;
  /**
   * The organization's IANA policy timezone (`organizations.timezone`). It
   * travels with the identity because it is what decides which attendance
   * business day a command or a query is about, and every one of those paths
   * already resolves CurrentUser — carrying it here is what keeps writes and
   * reads on one answer instead of each re-deriving a date. Always a zone the
   * platform accepts; see `resolveTimeZone`.
   */
  organizationTimezone: string;
};

/**
 * Resolve the authenticated internal user with their org, role, and
 * permissions in one round trip. Queries run under RLS with the user's JWT.
 * Cached per request via React cache().
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  // isDemoMode() is false in production regardless of DEMO_MODE, so a forged
  // demo cookie can never resolve to DEMO_ADMIN_USER's owner permissions there.
  const isDemo =
    isDemoMode() &&
    isDemoSessionValue(cookieStore.get(DEMO_SESSION_COOKIE)?.value);

  if (isDemo) {
    return DEMO_ADMIN_USER;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select(
      `user_id, organization_id, email, first_name, last_name, avatar_url,
       designation, department_id, role_id,
       roles ( role_key, role_name, permissions ),
       organizations ( organization_name, slug, logo_url, timezone )`,
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const role = Array.isArray(data.roles) ? data.roles[0] : data.roles;
  const org = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations;
  if (!role || !org) return null;

  return {
    userId: data.user_id,
    organizationId: data.organization_id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    avatarUrl: data.avatar_url,
    designation: data.designation,
    roleId: data.role_id,
    roleKey: role.role_key,
    roleName: role.role_name,
    permissions: role.permissions as PermissionMap,
    departmentId: data.department_id,
    organizationName: org.organization_name,
    organizationSlug: org.slug,
    organizationLogoUrl: org.logo_url,
    organizationTimezone: resolveTimeZone(org.timezone),
  };
});

/**
 * Guard for internal pages. Unauthenticated visitors never reach here (the
 * proxy redirects them to /login); an authenticated identity without an
 * active user profile goes to /unprovisioned — a public page — which avoids
 * the login → dashboard → login redirect loop.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/unprovisioned");
  return currentUser;
}
