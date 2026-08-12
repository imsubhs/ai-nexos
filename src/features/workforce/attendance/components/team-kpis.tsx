import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMinutes } from "../../shared/format";
import type { TeamAttendanceKpis } from "../types";

/**
 * Day KPIs for the team page (contract T-1).
 *
 * `absent` is the only figure not counted from rows — it is active headcount
 * minus people with a record — so it is labelled with what it means rather than
 * left to look like a stored count.
 */
export function TeamKpis({ kpis }: Readonly<{ kpis: TeamAttendanceKpis }>) {
  const cells = [
    { label: "Present", value: String(kpis.present), hint: "Clocked in today" },
    {
      label: "Absent",
      value: String(kpis.absent),
      hint: "Active members with no record",
    },
    {
      label: "Late",
      value: String(kpis.late),
      hint: "Arrived after the threshold",
    },
    {
      label: "On break",
      value: String(kpis.onBreak),
      hint: "Paused right now",
    },
    {
      label: "Avg effective",
      value: formatMinutes(kpis.avgEffectiveMinutes),
      hint: "Across completed days",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cells.map((cell) => (
        <Card key={cell.label}>
          <CardHeader>
            <CardDescription>{cell.label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {cell.value}
            </CardTitle>
            <p className="text-muted-foreground text-xs">{cell.hint}</p>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
