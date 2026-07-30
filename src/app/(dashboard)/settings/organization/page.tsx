import { requireCurrentUser } from "@/features/auth/current-user";
import { getOrganization } from "@/features/organizations/actions";
import { OrganizationForm } from "./_components/organization-form";
import { hasPermission } from "@/features/permissions/engine";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Organization Profile | Settings",
};

export default async function OrganizationSettingsPage() {
  const user = await requireCurrentUser();

  // They must be able to at least read the organization
  if (!hasPermission(user.permissions, "organization", "read")) {
    redirect("/settings");
  }

  const organization = await getOrganization();
  const canUpdate = hasPermission(user.permissions, "organization", "update");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization Profile
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your organization&apos;s general settings and brand identity.
        </p>
      </div>

      <OrganizationForm organization={organization} canUpdate={canUpdate} />
    </div>
  );
}
