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
import { useState } from "react";
import { toast } from "sonner";
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
  const [isPending, setIsPending] = useState<string | null>(null);

  async function handleRemove(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    setIsPending(memberId);
    try {
      await removeProjectMember(memberId);
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setIsPending(null);
    }
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-sm">
        No members added to this project yet.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
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
                <div className="text-xs text-muted-foreground font-normal">{member.user?.email}</div>
              </TableCell>
              <TableCell className="capitalize">{member.role}</TableCell>
              <TableCell>
                <Badge variant={member.status === "active" ? "default" : "secondary"}>
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemove(member.memberId)}
                  disabled={isPending === member.memberId}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
