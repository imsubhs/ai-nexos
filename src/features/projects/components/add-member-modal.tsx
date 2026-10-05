"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { addProjectMember } from "../actions";

export function AddMemberModal({
  projectId,
  availableUsers = [],
}: {
  projectId: string;
  availableUsers?: { userId: string; name?: string | null; email: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [userId, setUserId] = useState(availableUsers[0]?.userId || "");
  const [role, setRole] = useState("member");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error("Please select or enter a user");
      return;
    }

    setIsPending(true);
    try {
      await addProjectMember(projectId, userId, role);
      toast.success("Member added successfully");
      setOpen(false);
      setUserId(availableUsers[0]?.userId || "");
      setRole("member");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add member",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <UserPlusIcon className="h-3.5 w-3.5" />
            <span>Add Member</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Project Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="userId">Team Member</Label>
            {availableUsers.length > 0 ? (
              <select
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="border-input bg-surface-1 text-foreground flex h-9 w-full rounded-md border px-3 py-1.5 text-sm"
              >
                {availableUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User UUID"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Project Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border-input bg-surface-1 text-foreground flex h-9 w-full rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
