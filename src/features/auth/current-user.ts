import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PermissionMap } from "@/features/permissions";
import { cookies } from "next/headers";

export const DEMO_ADMIN_USER: CurrentUser = {
  userId: "demo-admin-001",
  organizationId: "demo-org-001",
  email: "admin@demo.local",
  firstName: "Demo",
  lastName: "Administrator",
  avatarUrl: null,
  designation: "Principal Admin",
  roleId: "demo-role-admin",
  roleKey: "admin",
  roleName: "Administrator",
  permissions: {
    projects: ["create", "read", "update", "delete"],
    tasks: ["create", "read", "update", "delete"],
    clients: ["create", "read", "update", "delete"],
    files: ["create", "read", "update", "delete"],
    deliverables: ["create", "read", "update", "delete"],
    approvals: ["create", "read", "update", "delete"],
    meetings: ["create", "read", "update", "delete"],
    notifications: ["create", "read", "update", "delete"],
    analytics: ["create", "read", "update", "delete"],
    ai_workspace: ["create", "read", "update", "delete"],
    automation: ["create", "read", "update", "delete"],
    knowledge_graph: ["create", "read", "update", "delete"],
    ai_agents: ["create", "read", "update", "delete"],
    events: ["create", "read", "update", "delete"],
    revisions: ["create", "read", "update", "delete"],
    shares: ["create", "read", "update", "delete"],
    timelines: ["create", "read", "update", "delete"],
  } as unknown as PermissionMap,
  departmentId: "demo-dept-001",
  organizationName: "AI NEX OS Demo",
  organizationSlug: "demo-workspace",
  organizationLogoUrl: null,
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
};

/**
 * Resolve the authenticated internal user with their org, role, and
 * permissions in one round trip. Queries run under RLS with the user's JWT.
 * Cached per request via React cache().
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const isDemo = process.env.DEMO_MODE === "true" && cookieStore.get("demo_session")?.value === "true";

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
       organizations ( organization_name, slug, logo_url )`,
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
