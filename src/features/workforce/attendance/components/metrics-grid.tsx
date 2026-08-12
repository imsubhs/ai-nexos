import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WORK_VALIDATION_LABELS } from "../../shared/types";
import { formatMinutes } from "../../shared/format";
import type { AttendanceMetrics } from "../types";

/**
 * The Work Validation metric row. Labels come from `WORK_VALIDATION_LABELS` —
 * merge doc 14 §1.2 mandates that vocabulary on every surface, so the words are
 * imported rather than retyped here.
 *
 * Values are rendered exactly as the engine produced them. Nothing on this
 * screen derives a percentage or a ratio from them (policy 10.9): idle and focus
 * stay at zero until the activity tracker lands, and showing "0m" is the truth,
 * whereas inferring focus from session time would not be.
 */
export function MetricsGrid({
  metrics,
  isOngoing,
}: Readonly<{ metrics: AttendanceMetrics; isOngoing: boolean }>) {
  const cells = [
    { label: WORK_VALIDATION_LABELS.session, value: metrics.workingMinutes },
    { label: WORK_VALIDATION_LABELS.break, value: metrics.breakMinutes },
    {
      label: WORK_VALIDATION_LABELS.effective,
      value: metrics.effectiveMinutes,
    },
    { label: WORK_VALIDATION_LABELS.idle, value: metrics.idleMinutes },
    { label: WORK_VALIDATION_LABELS.focus, value: metrics.focusMinutes },
    { label: "Overtime", value: metrics.overtimeMinutes },
  ];

  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cells.map((cell) => (
          <Card key={cell.label}>
            <CardHeader>
              <CardDescription>{cell.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatMinutes(cell.value)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      {isOngoing ? (
        <p className="text-muted-foreground text-xs">
          Minutes are computed by the work-validation engine at clock-out. While
          a session is open these show the last finalised values.
        </p>
      ) : null}
    </div>
  );
}
