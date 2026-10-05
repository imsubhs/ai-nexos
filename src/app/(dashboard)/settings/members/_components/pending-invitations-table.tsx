"use client";

import { useState, useTransition } from "react";
import { Mail, Trash2, Calendar, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { revokeInvitationAction } from "@/features/organizations/onboarding-actions";
import type { PendingInvitation } from "@/features/organizations/actions";

interface PendingInvitationsTableProps {
  invitations: PendingInvitation[];
  canDelete: boolean;
}

export function PendingInvitationsTable({
  invitations,
  canDelete,
}: PendingInvitationsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [activeRevokeId, setActiveRevokeId] = useState<string | null>(null);

  const handleRevoke = (invitationId: string, email: string) => {
    if (
      !confirm(`Are you sure you want to revoke the invitation for ${email}?`)
    ) {
      return;
    }

    setActiveRevokeId(invitationId);
    startTransition(async () => {
      const res = await revokeInvitationAction({ invitationId });
      setActiveRevokeId(null);
      if (!res.success) {
        toast.error(res.error ?? "Failed to revoke invitation");
        return;
      }
      toast.success(`Invitation for ${email} revoked.`);
    });
  };

  if (invitations.length === 0) {
    return (
      <div className="border-border flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Mail className="text-muted-foreground/60 mb-2 h-8 w-8" />
        <h4 className="text-foreground text-sm font-medium">
          No Pending Invitations
        </h4>
        <p className="text-muted-foreground mt-1 max-w-sm text-xs">
          All sent invitations have been accepted or expired. Use the Invite
          Member button to invite new colleagues.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-surface-2 overflow-hidden rounded-lg border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="border-border/80 bg-surface-1/50 border-b hover:bg-transparent">
            <TableHead className="w-[300px]">Invitee Email</TableHead>
            <TableHead>Assigned Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((inv) => (
            <TableRow
              key={inv.invitationId}
              className="border-border/50 hover:bg-surface-3/30 border-b transition-colors"
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className="bg-surface-3 text-muted-foreground border-border flex h-7 w-7 items-center justify-center rounded-full border">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="text-foreground text-sm">{inv.email}</div>
                    {inv.invitedByName && (
                      <div className="text-muted-foreground text-[11px]">
                        Invited by {inv.invitedByName}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Shield className="text-primary h-3.5 w-3.5" />
                  <Badge
                    variant="outline"
                    className="border-border bg-surface-1 text-secondary font-mono text-[11px]"
                  >
                    {inv.roleName}
                  </Badge>
                </div>
              </TableCell>

              <TableCell className="text-muted-foreground text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(inv.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </TableCell>

              <TableCell className="text-muted-foreground text-xs">
                {new Date(inv.expiresAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>

              <TableCell className="text-right">
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(inv.invitationId, inv.email)}
                    disabled={isPending && activeRevokeId === inv.invitationId}
                    className="h-8 gap-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    {isPending && activeRevokeId === inv.invitationId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Revoke
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
