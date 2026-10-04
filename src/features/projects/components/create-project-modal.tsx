"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { ProjectForm } from "./project-form";

export function CreateProjectModal({
  defaultOpen = false,
  initialClientId,
  clientOptions = [],
}: {
  defaultOpen?: boolean;
  initialClientId?: string;
  clientOptions?: { clientId: string; companyName: string }[];
} = {}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <ProjectForm
          initialClientId={initialClientId}
          clientOptions={clientOptions}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

