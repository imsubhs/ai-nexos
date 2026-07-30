import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { redirect } from "next/navigation";
import { getRoles } from "@/features/organizations/actions";
import { RolesReference } from "./_components/roles-reference";

export const metadata = {
  title: "Roles & Permissions | Settings",
};

export default async function RolesPage() {
  const user = await requireCurrentUser();

  if (!hasPermission(user.permissions, "roles", "read")) {
    redirect("/settings");
  }

  const roles = await getRoles();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Roles &amp; Permissions
        </h1>
        <p className="text-muted-foreground text-sm">
          Reference of the roles available in your organization and what each
          can access. System roles are managed by the platform and cannot be
          edited.
        </p>
      </div>

      <RolesReference roles={roles} />
    </div>
  );
}
