import { Badge } from "@/components/ui/badge";
import type { AttendanceStatus } from "../../shared/enums";
import { humanizeEnum } from "../../shared/format";

/**
 * Attendance status → badge. Kept separate from the generic shared StatusBadge
 * because the workforce vocabulary is upper-case (`HALF_DAY`) and its polarity
 * is different: LATE is not a failure state, ABSENT is, and neither word
 * appears in the generic component's positive/negative sets.
 */
const POSITIVE = new Set<AttendanceStatus>(["PRESENT", "WFH"]);
const NEGATIVE = new Set<AttendanceStatus>(["ABSENT"]);

export function AttendanceStatusBadge({
  status,
}: Readonly<{ status: AttendanceStatus }>) {
  const variant = POSITIVE.has(status)
    ? "default"
    : NEGATIVE.has(status)
      ? "destructive"
      : "secondary";
  return <Badge variant={variant}>{humanizeEnum(status)}</Badge>;
}
