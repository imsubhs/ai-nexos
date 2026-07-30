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
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto w-full">
      <aside className="w-full md:w-64 shrink-0">
        {/* Not a heading: each settings page supplies the page <h1>, and a
            heading here would precede it and break the heading outline. */}
        <p className="text-3xl font-bold tracking-tight mb-6">Settings</p>
        <SettingsNav />
      </aside>
      {/* <div>, not <main> — AppShell already provides the page's <main>. */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
