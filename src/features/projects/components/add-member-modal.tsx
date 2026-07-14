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

export function AddMemberModal({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("member");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error("Please enter a User ID");
      return;
    }

    setIsPending(true);
    try {
      await addProjectMember(projectId, userId, role);
      toast.success("Member added successfully");
      setOpen(false);
      setUserId("");
      setRole("member");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm">
          <UserPlusIcon className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Project Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input 
              id="userId" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)} 
              placeholder="UUID of the user" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select 
              id="role" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="editor">Editor</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
