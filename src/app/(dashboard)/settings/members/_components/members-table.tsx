"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Shield, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  updateUserRole,
  deactivateUser,
  reactivateUser,
} from "@/features/organizations/actions";

// Manually specify Member type to avoid Drizzle 'never' inferences on relations
export type Member = {
  userId: string;
  organizationId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string; // "active" | "inactive" | "invited" etc.
  roleId: string;
  lastActiveAt?: Date | string | null;
  role: {
    roleId: string;
    roleName: string;
    roleKey: string;
  } | null;
};

type SystemRole = {
  roleKey: string;
  roleName: string;
  description: string;
};

interface MembersTableProps {
  members: Member[];
  currentUserId: string;
  canUpdate: boolean;
  canUpdateRoles: boolean;
  systemRoles: SystemRole[];
}

export function MembersTable({
  members,
  currentUserId,
  canUpdate,
  canUpdateRoles,
  systemRoles,
}: MembersTableProps) {
  const [isPending, setIsPending] = useState<string | null>(null);

  const activeOwnersCount = members.filter(
    (m) => m.role?.roleKey === "owner" && m.status === "active",
  ).length;

  async function handleRoleChange(
    userId: string,
    newRoleId: string,
    isCurrentlyOwner: boolean,
  ) {
    if (
      isCurrentlyOwner &&
      activeOwnersCount <= 1 &&
      newRoleId !== "demo-role-owner"
    ) {
      toast.error("Cannot change the role of the last active owner.");
      return;
    }

    setIsPending(userId);
    try {
      await updateUserRole({ userId, roleId: newRoleId });
      toast.success("User role updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role",
      );
    } finally {
      setIsPending(null);
    }
  }

  async function handleStatusChange(
    userId: string,
    currentStatus: string,
    isOwner: boolean,
  ) {
    if (userId === currentUserId) {
      toast.error("You cannot deactivate yourself.");
      return;
    }

    if (isOwner && currentStatus === "active" && activeOwnersCount <= 1) {
      toast.error("Cannot deactivate the last active owner.");
      return;
    }

    setIsPending(userId);
    try {
      if (currentStatus === "active") {
        await deactivateUser({ userId });
        toast.success("User deactivated successfully");
      } else {
        await reactivateUser({ userId });
        toast.success("User reactivated successfully");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status",
      );
    } finally {
      setIsPending(null);
    }
  }

  if (members.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border py-12 text-center">
        No members found in this organization.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-xs">
      <Table aria-label="Organization members">
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isOwner = member.role?.roleKey === "owner";
            const fullName =
              `${member.firstName || ""} ${member.lastName || ""}`.trim();
            const initials =
              `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`.trim() ||
              member.email[0].toUpperCase();

            return (
              <TableRow key={member.userId}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage
                        src={member.avatarUrl ?? ""}
                        alt={fullName}
                      />
                      <AvatarFallback className="bg-surface-3 text-brand-primary font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground-heading">
                        {fullName || member.email}{" "}
                        {isSelf && (
                          <span className="text-muted-foreground font-normal text-xs">
                            (You)
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {member.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Shield className="text-brand-primary h-4 w-4" />
                    <span className="text-sm font-medium">{member.role?.roleName ?? "No Role"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={member.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">
                  {member.lastActiveAt
                    ? new Date(member.lastActiveAt).toLocaleDateString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  {(canUpdate || canUpdateRoles) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="hover:bg-accent hover:text-accent-foreground flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-50"
                        disabled={isPending === member.userId}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px]">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {canUpdateRoles && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              Change Role
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-[200px]">
                              <DropdownMenuRadioGroup
                                value={member.roleId}
                                onValueChange={(val) =>
                                  handleRoleChange(member.userId, val, isOwner)
                                }
                              >
                                {systemRoles.map((r) => (
                                  <DropdownMenuRadioItem
                                    key={r.roleKey}
                                    value={`demo-role-${r.roleKey}`}
                                  >
                                    <div className="flex flex-col">
                                      <span>{r.roleName}</span>
                                      <span className="text-muted-foreground text-xs">
                                        {r.description}
                                      </span>
                                    </div>
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {canUpdate && (
                          <>
                            {canUpdateRoles && <DropdownMenuSeparator />}
                            {member.status === "active" ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={() =>
                                  handleStatusChange(
                                    member.userId,
                                    member.status,
                                    isOwner,
                                  )
                                }
                                disabled={
                                  isSelf || (isOwner && activeOwnersCount <= 1)
                                }
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() =>
                                  handleStatusChange(
                                    member.userId,
                                    member.status,
                                    isOwner,
                                  )
                                }
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Reactivate User
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
