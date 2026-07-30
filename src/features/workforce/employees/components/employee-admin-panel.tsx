"use client";

/**
 * Employee admin actions (Sprint 2 / WP-105D): edit drawer trigger,
 * activate/deactivate, archive/restore with confirm Dialog. Rendered only
 * when the server component verified `users.update`/`archive`/`restore`.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Pencil, UserCheck, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DepartmentEntry } from "@/features/organizations/departments/types";
import {
  archiveEmployeeAction,
  restoreEmployeeAction,
  setEmployeeStatusAction,
} from "@/features/users/admin/actions";
import type { EmployeeAdminResult } from "@/features/users/admin/schemas";
import type { EmployeeDirectoryEntry } from "../types";
import { EmployeeFormDialog, type ManagerOption } from "./employee-form-dialog";

type Confirm = "archive" | "restore" | "deactivate" | "activate" | null;

const CONFIRM_COPY: Record<Exclude<Confirm, null>, { title: string; body: string; cta: string }> = {
  archive: {
    title: "Archive employee?",
    body: "Archived employees leave the directory and lose workforce access. Their history is preserved and they can be restored later.",
    cta: "Archive",
  },
  restore: {
    title: "Restore employee?",
    body: "The employee returns to the directory as active, keeping their prior details.",
    cta: "Restore",
  },
  deactivate: {
    title: "Deactivate employee?",
    body: "Inactive employees stay in the directory but are excluded from active headcounts.",
    cta: "Deactivate",
  },
  activate: {
    title: "Activate employee?",
    body: "The employee returns to active status.",
    cta: "Activate",
  },
};

export function EmployeeAdminPanel({
  employee,
  departments,
  managerOptions,
  canUpdate,
  canArchive,
  canRestore,
}: Readonly<{
  employee: EmployeeDirectoryEntry;
  departments: DepartmentEntry[];
  managerOptions: ManagerOption[];
  canUpdate: boolean;
  canArchive: boolean;
  canRestore: boolean;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);

  const archived = employee.entityStatus === "archived";

  const perform = (action: () => Promise<EmployeeAdminResult>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirm(null);
      router.refresh();
    });
  };

  const confirmAction = () => {
    if (confirm === "archive") {
      perform(() => archiveEmployeeAction({ userId: employee.userId }));
    } else if (confirm === "restore") {
      perform(() => restoreEmployeeAction({ userId: employee.userId }));
    } else if (confirm === "deactivate" || confirm === "activate") {
      perform(() =>
        setEmployeeStatusAction({
          userId: employee.userId,
          status: confirm === "activate" ? "active" : "inactive",
        }),
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canUpdate && !archived ? (
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
      ) : null}

      {canUpdate && !archived ? (
        employee.entityStatus === "active" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirm("deactivate")}
          >
            <UserMinus className="h-4 w-4" aria-hidden="true" />
            Deactivate
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirm("activate")}
          >
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Activate
          </Button>
        )
      ) : null}

      {canArchive && !archived ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirm("archive")}
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          Archive
        </Button>
      ) : null}

      {canRestore && archived ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirm("restore")}
        >
          <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
          Restore
        </Button>
      ) : null}

      <EmployeeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={employee}
        departments={departments}
        managerOptions={managerOptions}
      />

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {confirm ? (
            <>
              <DialogHeader>
                <DialogTitle>{CONFIRM_COPY[confirm].title}</DialogTitle>
                <DialogDescription>
                  {CONFIRM_COPY[confirm].body}
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirm(null)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  variant={confirm === "archive" ? "destructive" : "default"}
                  onClick={confirmAction}
                  disabled={pending}
                >
                  {pending ? "Working…" : CONFIRM_COPY[confirm].cta}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
