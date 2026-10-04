"use client";

import { useState, useTransition } from "react";
import { UserPlus, Copy, Check, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { inviteMemberAction } from "@/features/organizations/onboarding-actions";

interface InviteMemberDialogProps {
  roles: Array<{
    roleId: string;
    roleName: string;
    roleKey: string;
    description: string | null;
  }>;
  canInvite: boolean;
}

export function InviteMemberDialog({
  roles,
  canInvite,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(
    roles.find((r) => r.roleKey === "member")?.roleId ?? roles[0]?.roleId ?? "",
  );
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!canInvite) return null;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !roleId) {
      toast.error("Please provide a valid email and select a role");
      return;
    }

    startTransition(async () => {
      const res = await inviteMemberAction({
        email: email.trim(),
        roleId,
      });

      if (!res.success || !res.data) {
        toast.error(res.error ?? "Failed to issue invitation");
        return;
      }

      toast.success("Invitation generated successfully!");
      const inviteUrl = `${window.location.origin}/invite/${res.data.rawToken}`;
      setCreatedInviteUrl(inviteUrl);
    });
  };

  const copyToClipboard = () => {
    if (!createdInviteUrl) return;
    navigator.clipboard.writeText(createdInviteUrl);
    setCopied(true);
    toast.success("Invitation link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setEmail("");
    setCreatedInviteUrl(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (val ? setOpen(true) : handleClose())}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Organization Member</DialogTitle>
          <DialogDescription>
            Generate a secure, cryptographically hashed single-use invitation for your agency workspace.
          </DialogDescription>
        </DialogHeader>

        {createdInviteUrl ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-primary">
                <Check className="h-4 w-4" />
                Invitation Created for {email}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Share this secure link directly with the invitee. They will join with the assigned role upon acceptance.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-1 p-2">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                readOnly
                value={createdInviteUrl}
                className="w-full bg-transparent font-mono text-xs text-foreground focus:outline-hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="shrink-0 gap-1.5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <DialogFooter className="mt-2">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="flex flex-col gap-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <Input
                id="invite-email"
                type="email"
                required
                placeholder="colleague@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="invite-role" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Workspace Role
              </label>
              <select
                id="invite-role"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-border bg-surface-1 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {r.roleName} ({r.roleKey})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Determines operational permissions and access boundaries across projects and settings.
              </p>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Generate Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
