"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ClientForm } from "./client-form";

export function CreateClientModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5 shadow-xs">
            <Plus className="size-4" />
            <span>Add Client</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Register New Client Account</DialogTitle>
          <DialogDescription>
            Create an executive client profile. Set company information,
            communication channels, and brand guidelines.
          </DialogDescription>
        </DialogHeader>
        <ClientForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
