import { AppShell } from "@/components/layout/app-shell";

/**
 * Shell for the (dashboard) route group (/clients, /projects, ...).
 * Previously this group had no layout, so its pages rendered without the
 * sidebar/header and without the render-time auth guard.
 */
export default function DashboardGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
