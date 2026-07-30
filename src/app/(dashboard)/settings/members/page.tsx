import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { redirect } from "next/navigation";
import { getOrganizationMembers } from "@/features/organizations/actions";
import { MembersTable } from "./_components/members-table";
import { SYSTEM_ROLES } from "@/features/permissions/constants";

export const metadata = {
  title: "Members | Settings",
};

export default async function MembersPage() {
  const user = await requireCurrentUser();

  // They must be able to at least read users
  if (!hasPermission(user.permissions, "users", "read")) {
    redirect("/settings");
  }

  const members = await getOrganizationMembers();
  const canUpdate = hasPermission(user.permissions, "users", "update");
  const canUpdateRoles = hasPermission(user.permissions, "roles", "update");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Organization Members
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage members, their roles, and access within the organization.
        </p>
      </div>

      <MembersTable
        members={members}
        currentUserId={user.userId}
        canUpdate={canUpdate}
        canUpdateRoles={canUpdateRoles}
        systemRoles={SYSTEM_ROLES}
      />
    </div>
  );
}
