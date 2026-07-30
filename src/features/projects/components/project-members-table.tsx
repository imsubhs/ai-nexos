"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { removeProjectMember } from "../actions";

type Member = {
  memberId: string;
  role: string;
  status: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};

export function ProjectMembersTable({ members }: { members: Member[] }) {
  const router = useRouter();
  // Sprint 12A · Phase 6: removal used a native window.confirm() — the one
  // place in the product that did — and never refreshed the table, so the
  // removed row stayed on screen. It now uses the shared ConfirmDialog and
  // re-reads the page on success.
  const [pendingMember, setPendingMember] = useState<Member | null>(null);

  const memberName = (member: Member) =>
    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") ||
    member.user?.email ||
    "this member";

  if (members.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-sm">
        No members added to this project yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table aria-label="Project members">
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.memberId}>
              <TableCell className="font-medium">
                {member.user?.firstName} {member.user?.lastName}
                <div className="text-muted-foreground text-xs font-normal">
                  {member.user?.email}
                </div>
              </TableCell>
              <TableCell className="capitalize">{member.role}</TableCell>
              <TableCell>
                <Badge
                  variant={member.status === "active" ? "default" : "secondary"}
                >
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {/* P2-03: an icon-only DESTRUCTIVE control with no accessible
                    name — a screen-reader user was offered an unlabelled button
                    that deletes a team member. */}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${memberName(member)} from this project`}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setPendingMember(member)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={pendingMember !== null}
        onOpenChange={(open) => !open && setPendingMember(null)}
        title="Remove project member"
        description={
          pendingMember
            ? `${memberName(pendingMember)} will lose access to this project.`
            : ""
        }
        confirmLabel="Remove member"
        pendingLabel="Removing…"
        variant="destructive"
        onConfirm={async () => {
          await removeProjectMember(pendingMember!.memberId);
          toast.success("Member removed");
          router.refresh();
        }}
      />
    </div>
  );
}
