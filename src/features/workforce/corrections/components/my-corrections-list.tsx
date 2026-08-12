"use client";

/**
 * My correction requests (doc 16 S-6): the list plus the cancel action.
 *
 * A client component only because cancelling is a command. Ownership is checked
 * server-side — `cancel` rejects a request that is not the caller's and one that
 * is no longer open — so the button's absence is a courtesy, not the rule.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  CorrectionStatusBadge,
  isOpenCorrection,
} from "./correction-status-badge";
import { cancelCorrection } from "../form-actions";
import { formatDate, humanizeEnum } from "../../shared/format";
import type { CorrectionListItem } from "../types";

export function MyCorrectionsList({
  rows,
}: Readonly<{ rows: CorrectionListItem[] }>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const cancel = (correctionId: string) => {
    setError(null);
    setBusyId(correctionId);
    startTransition(async () => {
      const result = await cancelCorrection(correctionId);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <div className="bg-card overflow-x-auto rounded-xl border">
        <Table aria-label="My correction requests">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Reviewed</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.correctionId}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  {row.correctionCode}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(row.date)}
                </TableCell>
                <TableCell>{humanizeEnum(row.correctionType)}</TableCell>
                <TableCell>
                  <CorrectionStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="max-w-72 truncate" title={row.reason}>
                  {row.reason}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.reviewedAt
                    ? formatDate(row.reviewedAt.slice(0, 10))
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {isOpenCorrection(row.status) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending && busyId === row.correctionId}
                      onClick={() => cancel(row.correctionId)}
                    >
                      {pending && busyId === row.correctionId
                        ? "Cancelling…"
                        : "Cancel"}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
