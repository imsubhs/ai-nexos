import { Badge } from "@/components/ui/badge";
import type { CorrectionStatus } from "../../shared/enums";
import { humanizeEnum } from "../../shared/format";

const POSITIVE = new Set<CorrectionStatus>(["APPROVED"]);
const NEGATIVE = new Set<CorrectionStatus>(["REJECTED", "CANCELLED"]);

export function CorrectionStatusBadge({
  status,
}: Readonly<{ status: CorrectionStatus }>) {
  const variant = POSITIVE.has(status)
    ? "default"
    : NEGATIVE.has(status)
      ? "destructive"
      : "secondary";
  return <Badge variant={variant}>{humanizeEnum(status)}</Badge>;
}

/** The two non-terminal states — the only ones an owner may still cancel. */
export function isOpenCorrection(status: CorrectionStatus): boolean {
  return status === "PENDING" || status === "UNDER_REVIEW";
}
