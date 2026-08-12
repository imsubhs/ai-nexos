import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CorrectionStatusBadge } from "./correction-status-badge";
import { ReviewDecisionDialog } from "./review-decision-dialog";
import { formatDate, humanizeEnum } from "../../shared/format";
import type { CorrectionListItem } from "../types";

/**
 * The reviewer's queue. A server component; only the per-row dialog is a client
 * island, so the table itself ships no JavaScript.
 *
 * A reviewer's own request appears in the queue — hiding it would be misleading
 * about what is outstanding — but its Review action is withheld and the server
 * rejects self-review regardless of what is clicked.
 */
export function ReviewQueueTable({
  rows,
  viewerId,
}: Readonly<{ rows: CorrectionListItem[]; viewerId: string }>) {
  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <Table aria-label="Correction review queue">
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isOwn = row.userId === viewerId;
            const decidable =
              row.status === "PENDING" || row.status === "UNDER_REVIEW";
            return (
              <TableRow key={row.correctionId}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {row.correctionCode}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.employeeName}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{humanizeEnum(row.correctionType)}</TableCell>
                <TableCell>
                  <CorrectionStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(row.createdAt.slice(0, 10))}
                </TableCell>
                <TableCell className="text-right">
                  {isOwn ? (
                    <span className="text-muted-foreground text-sm">
                      Your own request
                    </span>
                  ) : decidable ? (
                    <ReviewDecisionDialog row={row} />
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Decided
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
