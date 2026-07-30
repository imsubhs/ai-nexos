"use client";

/**
 * Schedule a meeting. The field set lives in MeetingForm, which Sprint 12B
 * shares with the drawer's edit mode so create and edit cannot drift apart.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MeetingForm, type MeetingProjectOption } from "./meeting-form";

export type { MeetingProjectOption };

export function CreateMeetingDialog({
  projects,
}: Readonly<{ projects: MeetingProjectOption[] }>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // createMeeting requires a project. A disabled control that says why beats a
  // form that can only fail.
  if (projects.length === 0) {
    return (
      <Button disabled title="Create a project before scheduling meetings">
        <PlusIcon className="mr-2 h-4 w-4" />
        New Meeting
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>New Meeting</DialogTitle>
        </DialogHeader>

        <MeetingForm
          projects={projects}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
