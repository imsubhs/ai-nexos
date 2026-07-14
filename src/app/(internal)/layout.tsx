import { AppShell } from "@/components/layout/app-shell";

/**
 * Internal application shell (app.<domain>).
 * The shared shell enforces authentication at render time; see
 * src/components/layout/app-shell.tsx.
 */
export default function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
