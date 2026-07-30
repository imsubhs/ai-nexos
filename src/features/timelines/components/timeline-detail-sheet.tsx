"use client";

/**
 * Timeline detail drawer. getTimelines() already embeds each timeline's
 * ordered phases (mirroring getProjectTimeline's shape), so this reads the
 * row already in hand — no per-item fetch needed or available.
 */
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import type { getTimelines } from "../actions";

export type TimelineRow = Awaited<ReturnType<typeof getTimelines>>[number];

function DetailRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export function TimelineDetailSheet({
  timeline,
  projectLabel,
  onClose,
}: Readonly<{
  timeline: TimelineRow | null;
  /** Resolved project name/code — the timeline row itself has no name. */
  projectLabel?: { name: string; code: string | null };
  onClose: () => void;
}>) {
  return (
    <Sheet open={timeline !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        {timeline ? (
          <>
            <SheetHeader>
              <SheetTitle>{projectLabel?.name ?? "Project timeline"}</SheetTitle>
              <SheetDescription>
                {projectLabel?.code ?? `Timeline ${timeline.timelineId.slice(-8)}`}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-1 px-4">
              <DetailRow label="Status" value={<StatusBadge status={timeline.status} />} />
              <DetailRow label="Progress" value={`${timeline.overallProgress ?? 0}%`} />
              <DetailRow
                label="Start"
                value={timeline.startDate ? new Date(timeline.startDate).toLocaleDateString() : null}
              />
              <DetailRow
                label="End"
                value={timeline.endDate ? new Date(timeline.endDate).toLocaleDateString() : null}
              />

              <Separator className="my-2" />
              <p className="text-sm font-medium">Phases ({(timeline.phases as any[])?.length ?? 0})</p>
              <div className="space-y-2">
                {((timeline.phases ?? []) as any[]).map((phase: any) => (
                  <div
                    key={phase.phaseId}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="capitalize">{phase.name.replaceAll("_", " ")}</span>
                    <StatusBadge status={phase.status} />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
