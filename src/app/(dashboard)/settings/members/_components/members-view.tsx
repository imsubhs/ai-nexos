"use client";

import { useState } from "react";
import { Users, Mail } from "lucide-react";
import { MembersTable, type Member } from "./members-table";
import { PendingInvitationsTable } from "./pending-invitations-table";
import { InviteMemberDialog } from "./invite-member-dialog";
import type { PendingInvitation, RoleRow } from "@/features/organizations/actions";

interface MembersViewProps {
  members: Member[];
  pendingInvitations: PendingInvitation[];
  roles: RoleRow[];
  currentUserId: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canUpdateRoles: boolean;
  systemRoles: Array<{
    roleKey: string;
    roleName: string;
    description: string;
  }>;
}

export function MembersView({
  members,
  pendingInvitations,
  roles,
  currentUserId,
  canCreate,
  canUpdate,
  canDelete,
  canUpdateRoles,
  systemRoles,
}: MembersViewProps) {
  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Members & Access
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage organization members, workspace roles, and pending onboarding invitations.
          </p>
        </div>

        <InviteMemberDialog roles={roles} canInvite={canCreate} />
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "members"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Active Members
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {members.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invitations")}
          className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "invitations"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-4 w-4" />
          Pending Invitations
          {pendingInvitations.length > 0 && (
            <span className="rounded-full bg-primary/20 text-primary px-2 py-0.5 text-xs font-mono">
              {pendingInvitations.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "members" ? (
        <MembersTable
          members={members}
          currentUserId={currentUserId}
          canUpdate={canUpdate}
          canUpdateRoles={canUpdateRoles}
          systemRoles={systemRoles}
        />
      ) : (
        <PendingInvitationsTable
          invitations={pendingInvitations}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
