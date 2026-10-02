import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PermissionMap } from "@/features/permissions";
import { cookies } from "next/headers";
import { SYSTEM_ROLES } from "@/features/permissions/constants";
import { isDemoMode } from "@/lib/env.server";
import { resolveTimeZone } from "@/features/workforce/shared/business-day";
import { DEMO_SESSION_COOKIE, isDemoSessionValue } from "./demo-session";
import { getDemoStore } from "@/lib/demo/store";

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
  /** Membership ID backing the active organization context (Phase 3). */
  membershipId?: string;
  organizationTimezone: string;
};

/**
 * Resolve the authenticated internal user with their org, role, and
 * permissions in one round trip.
 *
 * Implements Phase 3 Stage C Dual-Read:
 * 1. Checks `organization_memberships` for active membership (respecting `nexos_active_org_id` cookie).
 * 2. If membership found: resolves organization and role from the membership record.
 * 3. Compares resolved tenant with legacy `users.organization_id` for dual-read verification.
 * 4. If membership query returns empty (e.g. pre-migration): falls back seamlessly to legacy columns.
 *
 * Cached per request via React cache().
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const isDemo =
    isDemoMode() &&
    isDemoSessionValue(cookieStore.get(DEMO_SESSION_COOKIE)?.value);

  if (isDemo) {
    const activeOrgCookie = cookieStore.get("nexos_active_org_id")?.value;
    if (activeOrgCookie && activeOrgCookie !== DEMO_ADMIN_USER.organizationId) {
      const store = getDemoStore();
      const membership = (store.organizationMemberships ?? []).find(
        (m: { userId: string; organizationId: string; status: string }) =>
          m.userId === DEMO_ADMIN_USER.userId &&
          m.organizationId === activeOrgCookie &&
          m.status === "active",
      );
      if (membership) {
        const org = store.organizations.find(
          (o: { organizationId: string }) => o.organizationId === activeOrgCookie,
        );
        if (org) {
          return {
            ...DEMO_ADMIN_USER,
            organizationId: org.organizationId,
            organizationName: org.organizationName,
            organizationSlug: org.slug,
            organizationLogoUrl: org.logoUrl ?? null,
            organizationTimezone: resolveTimeZone(org.timezone ?? "UTC"),
            membershipId: membership.membershipId,
          };
        }
      }
    }
    return {
      ...DEMO_ADMIN_USER,
      membershipId: "00000000-0000-4000-8000-000000000900",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch user profile
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

  // 2. Dual-Read: Query organization_memberships
  const activeOrgCookie = cookieStore.get("nexos_active_org_id")?.value;
  let membershipQuery = supabase
    .from("organization_memberships")
    .select(
      `membership_id, organization_id, role_id, department_id, designation, is_default,
       roles ( role_key, role_name, permissions ),
       organizations ( organization_name, slug, logo_url, timezone )`,
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .is("deleted_at", null);

  if (activeOrgCookie) {
    membershipQuery = membershipQuery.eq("organization_id", activeOrgCookie);
  } else {
    membershipQuery = membershipQuery.order("is_default", { ascending: false });
  }

  const { data: memberships } = await membershipQuery;
  let activeMembership =
    Array.isArray(memberships) && memberships.length > 0
      ? memberships[0]
      : null;

  // If cookie pointed to an invalid, suspended, or unassociated org, fall back to default active membership
  if (!activeMembership && activeOrgCookie) {
    const { data: fallbackMemberships } = await supabase
      .from("organization_memberships")
      .select(
        `membership_id, organization_id, role_id, department_id, designation, is_default,
         roles ( role_key, role_name, permissions ),
         organizations ( organization_name, slug, logo_url, timezone )`,
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("is_default", { ascending: false });

    if (Array.isArray(fallbackMemberships) && fallbackMemberships.length > 0) {
      activeMembership = fallbackMemberships[0];
    }
  }

  if (activeMembership) {
    const role = Array.isArray(activeMembership.roles)
      ? activeMembership.roles[0]
      : activeMembership.roles;
    const org = Array.isArray(activeMembership.organizations)
      ? activeMembership.organizations[0]
      : activeMembership.organizations;

    if (role && org) {
      // Dual-Read verification: log notice if membership tenant differs from legacy column
      if (data.organization_id && data.organization_id !== activeMembership.organization_id) {
        console.info(
          `[DUAL-READ] Active membership (${activeMembership.organization_id}) differs from legacy users.organization_id (${data.organization_id}) for user ${user.id}`,
        );
      }

      return {
        userId: data.user_id,
        organizationId: activeMembership.organization_id,
        membershipId: activeMembership.membership_id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        avatarUrl: data.avatar_url,
        designation: activeMembership.designation ?? data.designation,
        roleId: activeMembership.role_id,
        roleKey: role.role_key,
        roleName: role.role_name,
        permissions: role.permissions as PermissionMap,
        departmentId: activeMembership.department_id ?? data.department_id,
        organizationName: org.organization_name,
        organizationSlug: org.slug,
        organizationLogoUrl: org.logo_url,
        organizationTimezone: resolveTimeZone(org.timezone),
      };
    }
  }

  // 3. Fallback to legacy users table columns (Stage C dual-read fallback)
  const legacyRole = Array.isArray(data.roles) ? data.roles[0] : data.roles;
  const legacyOrg = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations;
  if (!legacyRole || !legacyOrg) return null;

  return {
    userId: data.user_id,
    organizationId: data.organization_id,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
    avatarUrl: data.avatar_url,
    designation: data.designation,
    roleId: data.role_id,
    roleKey: legacyRole.role_key,
    roleName: legacyRole.role_name,
    permissions: legacyRole.permissions as PermissionMap,
    departmentId: data.department_id,
    organizationName: legacyOrg.organization_name,
    organizationSlug: legacyOrg.slug,
    organizationLogoUrl: legacyOrg.logo_url,
    organizationTimezone: resolveTimeZone(legacyOrg.timezone),
  };
});

/**
 * Guard for internal workspace pages.
 *
 * Enforces Phase 4.1 Onboarding & Tenant Security State Machine:
 * 1. Active member -> returns CurrentUser.
 * 2. Unauthenticated -> redirects to /login.
 * 3. Suspended member -> redirects to /unauthorized (tenant access denied).
 * 4. Authenticated unaffiliated user -> redirects to /onboarding.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();
  if (currentUser) return currentUser;

  const cookieStore = await cookies();
  const isDemo =
    isDemoMode() &&
    isDemoSessionValue(cookieStore.get(DEMO_SESSION_COOKIE)?.value);

  if (isDemo) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Query memberships to check if user has suspended or deleted access
  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("status, deleted_at")
    .eq("user_id", user.id);

  if (memberships && memberships.length > 0) {
    const hasActive = memberships.some(
      (m) => m.status === "active" && !m.deleted_at,
    );
    if (!hasActive) {
      redirect("/unauthorized");
    }
  }

  // Check if legacy user profile exists with non-active status or soft-deleted
  const { data: userProfile } = await supabase
    .from("users")
    .select("status, deleted_at")
    .eq("user_id", user.id)
    .single();

  if (userProfile && (userProfile.status !== "active" || userProfile.deleted_at)) {
    redirect("/unauthorized");
  }

  // Authenticated user with no active organization -> route to onboarding
  redirect("/onboarding");
}
