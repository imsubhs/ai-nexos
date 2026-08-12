import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AttendanceStatusBadge } from "./attendance-status-badge";
import { WORK_VALIDATION_LABELS } from "../../shared/types";
import { formatDate, formatMinutes, formatTime } from "../../shared/format";
import type { AttendanceHistoryRow } from "../types";

/**
 * History table (doc 16 S-5). A server component — the rows for one month are a
 * bounded set, so there is nothing to paginate on the client and no state to
 * hold: the month in the URL is the whole view state.
 *
 * Derived ABSENT days are rendered muted and carry no times, because there is no
 * record behind them to open.
 */
export function HistoryTable({
  rows,
}: Readonly<{ rows: AttendanceHistoryRow[] }>) {
  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <Table aria-label="My attendance history">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>In</TableHead>
            <TableHead>Out</TableHead>
            <TableHead>{WORK_VALIDATION_LABELS.session}</TableHead>
            <TableHead>{WORK_VALIDATION_LABELS.break}</TableHead>
            <TableHead>{WORK_VALIDATION_LABELS.effective}</TableHead>
            <TableHead>Overtime</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.date}
              className={row.isDerived ? "text-muted-foreground" : undefined}
            >
              <TableCell className="whitespace-nowrap">
                <span className="flex items-center gap-2">
                  {formatDate(row.date)}
                  {row.wasCorrected ? (
                    <Badge
                      variant="outline"
                      title="Amended by an approved correction"
                    >
                      Corrected
                    </Badge>
                  ) : null}
                </span>
              </TableCell>
              <TableCell>
                <AttendanceStatusBadge status={row.status} />
                {row.isLate ? (
                  <Badge variant="secondary" className="ml-2">
                    Late
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatTime(row.clockInAt)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatTime(row.clockOutAt)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMinutes(row.metrics.workingMinutes)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMinutes(row.metrics.breakMinutes)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMinutes(row.metrics.effectiveMinutes)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMinutes(row.metrics.overtimeMinutes)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
