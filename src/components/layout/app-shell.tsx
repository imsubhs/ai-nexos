import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { NAV_SECTIONS } from "@/config/navigation";
import { isDemoMode } from "@/lib/env.server";

import { getUserMemberships } from "@/features/auth/membership-service";

/**
 * Authenticated application shell shared by every internal route group.
 * Authentication is enforced twice: at the edge (src/proxy.ts) and here at
 * render time — the proxy check alone is not a security boundary.
 */
export async function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser();

  const rawMemberships = await getUserMemberships(user.userId);
  const activeMemberships = rawMemberships
    .filter((m) => m.status === "active")
    .map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organizationName,
      organizationSlug: m.organizationSlug,
      codePrefix: m.organizationCodePrefix,
      roleName: m.roleName,
    }));

  const memberships =
    activeMemberships.length > 0
      ? activeMemberships
      : [
          {
            organizationId: user.organizationId,
            organizationName: user.organizationName,
            organizationSlug: user.organizationSlug,
            codePrefix: "NEX",
            roleName: user.roleName,
          },
        ];

  const permittedHrefs = NAV_SECTIONS.flatMap((section) =>
    section.items.flatMap((item) => {
      const allowedHrefs: string[] = [];
      const itemPermitted =
        !item.permission ||
        hasPermission(user.permissions, item.permission[0], item.permission[1]);

      const allowedChildren = (item.children ?? []).filter((child) => {
        if (!child.permission) return true;
        return hasPermission(
          user.permissions,
          child.permission[0],
          child.permission[1],
        );
      });

      if (itemPermitted || allowedChildren.length > 0) {
        allowedHrefs.push(item.href);
      }
      for (const child of allowedChildren) {
        allowedHrefs.push(child.href);
      }
      return allowedHrefs;
    }),
  );

  return (
    <SidebarProvider>
      <AppSidebar
        organizationName={user.organizationName}
        permittedHrefs={permittedHrefs}
        activeOrgId={user.organizationId}
        memberships={memberships}
      />
      <SidebarInset>
        <AppHeader
          isDemo={isDemoMode()}
          user={{
            // Sprint 12A: the notification bell reads per-user, per-org.
            userId: user.userId,
            organizationId: user.organizationId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            roleName: user.roleName,
          }}
        />
        {/* The page's single <main> landmark. `min-w-0` keeps wide content
            (data tables) scrolling inside its own container rather than
            widening the shell past the viewport. */}
        <main className="flex min-w-0 flex-1 flex-col gap-6 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
