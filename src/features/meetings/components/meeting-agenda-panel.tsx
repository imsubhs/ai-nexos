"use client";

/**
 * Agenda editing (Sprint 12B · Phase 1).
 *
 * `meeting_agenda` carries title, description, orderIndex, an optional time
 * allocation, a speaker and a completion flag. Add, tick off, and remove are
 * wired; reordering is exposed as move-up / move-down over the existing
 * `orderIndex` column rather than as drag-and-drop, which would need an
 * ordering concept the table does not have (fractional ranks).
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { addAgendaItem, removeAgendaItem, updateAgendaItem } from "../actions";

export type AgendaRow = {
  agendaItemId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  timeAllottedMins: number | null;
  isCompleted: boolean;
};

export function MeetingAgendaPanel({
  meetingId,
  items,
  onChanged,
}: Readonly<{
  meetingId: string;
  items: AgendaRow[];
  onChanged: () => Promise<void>;
}>) {
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<AgendaRow | null>(null);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const ordered = items.slice().sort((a, b) => a.orderIndex - b.orderIndex);

  const mutate = async (
    agendaItemId: string,
    changes: Parameters<typeof updateAgendaItem>[0],
    message: string,
  ) => {
    setPendingId(agendaItemId);
    try {
      await updateAgendaItem(changes);
      await onChanged();
      toast.success(message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update the agenda",
      );
    } finally {
      setPendingId(null);
    }
  };

  // Swapping two orderIndex values is two writes; the second is only issued if
  // the first succeeded, so a failure mid-swap leaves a duplicate index rather
  // than a hole — and the list still renders in a stable order either way.
  const swap = async (index: number, direction: -1 | 1) => {
    const current = ordered[index];
    const neighbour = ordered[index + direction];
    if (!current || !neighbour) return;
    setPendingId(current.agendaItemId);
    try {
      await updateAgendaItem({
        agendaItemId: current.agendaItemId,
        orderIndex: neighbour.orderIndex,
      });
      await updateAgendaItem({
        agendaItemId: neighbour.agendaItemId,
        orderIndex: current.orderIndex,
      });
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not reorder the agenda",
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Agenda ({ordered.length})</p>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          Add item
        </Button>
      </div>

      {ordered.length === 0 ? (
        <p className="text-muted-foreground text-xs">No agenda items yet.</p>
      ) : (
        <ol className="space-y-2">
          {ordered.map((item, index) => (
            <li
              key={item.agendaItemId}
              className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
            >
              <label className="flex min-w-0 items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={item.isCompleted}
                  disabled={pendingId === item.agendaItemId}
                  onChange={(event) =>
                    mutate(
                      item.agendaItemId,
                      {
                        agendaItemId: item.agendaItemId,
                        isCompleted: event.target.checked,
                      },
                      event.target.checked
                        ? "Agenda item completed"
                        : "Agenda item reopened",
                    )
                  }
                />
                <span className="min-w-0">
                  <span
                    className={`block truncate text-sm ${item.isCompleted ? "text-muted-foreground line-through" : ""}`}
                  >
                    {item.title}
                  </span>
                  {item.timeAllottedMins ? (
                    <span className="text-muted-foreground text-xs">
                      {item.timeAllottedMins} min
                    </span>
                  ) : null}
                </span>
              </label>

              <div className="flex shrink-0 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move "${item.title}" earlier`}
                  disabled={index === 0 || pendingId !== null}
                  onClick={() => swap(index, -1)}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move "${item.title}" later`}
                  disabled={index === ordered.length - 1 || pendingId !== null}
                  onClick={() => swap(index, 1)}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove "${item.title}" from the agenda`}
                  onClick={() => setRemoving(item)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add an agenda item"
        description="Appended to the end of the agenda."
        confirmLabel="Add item"
        pendingLabel="Adding…"
        onConfirm={async () => {
          if (!title.trim()) throw new Error("A title is required.");
          const allotted = Number.parseInt(minutes, 10);
          await addAgendaItem({
            meetingId,
            title: title.trim(),
            timeAllottedMins:
              Number.isFinite(allotted) && allotted > 0 ? allotted : undefined,
          });
          setTitle("");
          setMinutes("");
          await onChanged();
          toast.success("Agenda item added");
        }}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="agenda-title">Title *</Label>
            <Input
              id="agenda-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agenda-minutes">Time allotted (minutes)</Label>
            <Input
              id="agenda-minutes"
              type="number"
              min={1}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this agenda item?"
        description={removing ? `"${removing.title}" will be deleted.` : ""}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        variant="destructive"
        onConfirm={async () => {
          await removeAgendaItem(removing!.agendaItemId);
          setRemoving(null);
          await onChanged();
          toast.success("Agenda item removed");
        }}
      />
    </div>
  );
}
