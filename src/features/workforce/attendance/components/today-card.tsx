import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AttendanceStatusBadge } from "./attendance-status-badge";
import { ClockControls } from "./clock-controls";
import { SessionTimer } from "./session-timer";
import { formatDate, formatTime } from "../../shared/format";
import type { TodayAttendanceView } from "../types";

const STATE_COPY: Record<string, { label: string; hint: string }> = {
  NOT_STARTED: {
    label: "Not started",
    hint: "You have not clocked in today.",
  },
  WORKING: { label: "Working", hint: "Your session is running." },
  ON_BREAK: { label: "On break", hint: "Session time is paused." },
  COMPLETED: { label: "Completed", hint: "You clocked out for the day." },
};

/**
 * The today card (doc 16 S-4): status stripe, elapsed timer, clock times, and
 * the lifecycle controls.
 *
 * The NOT_STARTED case is the empty state and is deliberately not an
 * EmptyState block — a day with no session yet is not an absence of data, it is
 * the start of one, and the primary action belongs on the same card.
 */
export function TodayCard({
  view,
  allowWfh,
}: Readonly<{ view: TodayAttendanceView; allowWfh: boolean }>) {
  const copy = STATE_COPY[view.state] ?? STATE_COPY.NOT_STARTED;
  const stripe =
    view.state === "WORKING"
      ? "bg-primary"
      : view.state === "ON_BREAK"
        ? "bg-amber-500"
        : view.state === "COMPLETED"
          ? "bg-muted-foreground"
          : "bg-border";

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 w-full ${stripe}`} aria-hidden="true" />
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardDescription>{formatDate(view.date)}</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Clock className="text-muted-foreground size-5" />
              {copy.label}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">{copy.hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view.status ? (
              <AttendanceStatusBadge status={view.status} />
            ) : null}
            {view.isLate ? <Badge variant="secondary">Late</Badge> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {view.isOngoing && view.clockInAt ? (
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Elapsed session
            </p>
            <SessionTimer
              clockInAt={view.clockInAt}
              breakMinutes={view.metrics.breakMinutes}
              openBreakStartedAt={view.openBreak?.startAt ?? null}
            />
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Clock in</dt>
            <dd className="tabular-nums">{formatTime(view.clockInAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Clock out</dt>
            <dd className="tabular-nums">{formatTime(view.clockOutAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Shift starts</dt>
            <dd className="tabular-nums">{view.policy.workStartTime}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Shift ends</dt>
            <dd className="tabular-nums">{view.policy.workEndTime}</dd>
          </div>
        </dl>

        <ClockControls state={view.state} allowWfh={allowWfh} />
      </CardContent>
    </Card>
  );
}
