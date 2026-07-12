import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireCurrentUser } from "@/features/auth/current-user";

/**
 * Internal application shell (app.<domain>).
 * Authentication is enforced twice: at the edge (src/proxy.ts) and here at
 * render time — the proxy check alone is not a security boundary.
 */
export default async function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser();

  return (
    <SidebarProvider>
      <AppSidebar organizationName={user.organizationName} />
      <SidebarInset>
        <AppHeader
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            roleName: user.roleName,
          }}
        />
        <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
