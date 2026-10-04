import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { redirect } from "next/navigation";
import {
  getOrganizationMembers,
  getPendingInvitations,
  getRoles,
} from "@/features/organizations/actions";
import { MembersView } from "./_components/members-view";
import { SYSTEM_ROLES } from "@/features/permissions/constants";

export const metadata = {
  title: "Members & Access | Settings",
};

export default async function MembersPage() {
  const user = await requireCurrentUser();

  // They must be able to at least read users
  if (!hasPermission(user.permissions, "users", "read")) {
    redirect("/settings");
  }

  const [members, pendingInvitations, roles] = await Promise.all([
    getOrganizationMembers(),
    getPendingInvitations(),
    getRoles(),
  ]);

  const canCreate = hasPermission(user.permissions, "users", "create");
  const canUpdate = hasPermission(user.permissions, "users", "update");
  const canDelete = hasPermission(user.permissions, "users", "delete");
  const canUpdateRoles = hasPermission(user.permissions, "roles", "update");

  return (
    <MembersView
      members={members}
      pendingInvitations={pendingInvitations}
      roles={roles}
      currentUserId={user.userId}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
      canUpdateRoles={canUpdateRoles}
      systemRoles={SYSTEM_ROLES}
    />
  );
}
