import Link from "next/link";
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
import { formatMinutes, formatTime } from "../../shared/format";
import type { AttendanceDirectoryRow } from "../types";

/**
 * Team attendance for one day (doc 16 S-10 reuse / S-11 merge — one page,
 * breadth decided by permission, not by a second route).
 *
 * Every row here belongs to the viewer's organization: the repository's own
 * `organizationId` predicate is applied before any filter reaches it, so there
 * is no query shape on this page that could reach another tenant's rows.
 */
export function TeamTable({
  rows,
  timeZone,
}: Readonly<{ rows: AttendanceDirectoryRow[]; timeZone: string }>) {
  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <Table aria-label="Team attendance">
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>In</TableHead>
            <TableHead>Out</TableHead>
            <TableHead>{WORK_VALIDATION_LABELS.session}</TableHead>
            <TableHead>{WORK_VALIDATION_LABELS.effective}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.attendanceId}>
              <TableCell className="whitespace-nowrap">
                <Link
                  href={`/workforce/employees/${row.userId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {row.employeeName}
                </Link>
                {row.isArchived ? (
                  <Badge variant="outline" className="ml-2">
                    Archived
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>{row.departmentName ?? "—"}</TableCell>
              <TableCell>
                <span className="flex flex-wrap items-center gap-2">
                  <AttendanceStatusBadge status={row.status} />
                  {row.isOnBreak ? (
                    <Badge variant="secondary">On break</Badge>
                  ) : null}
                  {row.isLate ? <Badge variant="secondary">Late</Badge> : null}
                </span>
              </TableCell>
              <TableCell className="tabular-nums">
                {formatTime(row.clockInAt, timeZone)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatTime(row.clockOutAt, timeZone)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMinutes(row.metrics.workingMinutes)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMinutes(row.metrics.effectiveMinutes)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
