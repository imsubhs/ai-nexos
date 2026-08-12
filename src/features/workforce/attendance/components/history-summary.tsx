import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMinutes } from "../../shared/format";
import type { AttendanceSummary } from "../types";

/**
 * Month summary cards (doc 14 §12.4).
 *
 * Every number is a count or a sum of engine-produced minutes. `attendancePercentage`
 * is the one ratio, and it is the specification's own — present days over the
 * working days in range — not a derived productivity score.
 */
export function HistorySummary({
  summary,
}: Readonly<{ summary: AttendanceSummary }>) {
  const cells = [
    { label: "Working days", value: String(summary.totalDays) },
    { label: "Present", value: String(summary.presentDays) },
    { label: "Absent", value: String(summary.absentDays) },
    { label: "Late", value: String(summary.lateDays) },
    { label: "Attendance", value: `${summary.attendancePercentage}%` },
    {
      label: "Session time",
      value: formatMinutes(summary.totalWorkingMinutes),
    },
    { label: "Avg day", value: `${summary.avgWorkingHours}h` },
    {
      label: "Overtime",
      value: formatMinutes(summary.totalOvertimeMinutes),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cells.map((cell) => (
        <Card key={cell.label}>
          <CardHeader>
            <CardDescription>{cell.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {cell.value}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
