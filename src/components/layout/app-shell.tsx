import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { NAV_SECTIONS } from "@/config/navigation";
import { isDemoMode } from "@/lib/env.server";

/**
 * Authenticated application shell shared by every internal route group.
 * Authentication is enforced twice: at the edge (src/proxy.ts) and here at
 * render time — the proxy check alone is not a security boundary.
 */
export async function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser();

  const permittedHrefs = NAV_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => {
        if (!item.permission) return true;
        return hasPermission(
          user.permissions,
          item.permission[0],
          item.permission[1],
        );
      })
      .map((item) => item.href),
  );

  return (
    <SidebarProvider>
      <AppSidebar
        organizationName={user.organizationName}
        permittedHrefs={permittedHrefs}
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
