import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { redirect } from "next/navigation";
import { SettingsNav } from "./_components/settings-nav";

export const metadata = {
  title: "Settings",
};

export default async function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireCurrentUser();

  // WP4.1: Permission guard
  if (!hasPermission(user.permissions, "settings", "read")) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 md:flex-row">
      <aside className="w-full shrink-0 md:w-64">
        {/* Not a heading: each settings page supplies the page <h1>, and a
            heading here would precede it and break the heading outline. */}
        <p className="mb-6 text-3xl font-bold tracking-tight">Settings</p>
        <SettingsNav />
      </aside>
      {/* <div>, not <main> — AppShell already provides the page's <main>. */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
