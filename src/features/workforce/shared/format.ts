/**
 * Presentation formatting shared by the workforce screens. Pure and
 * locale-independent: these run on the server during render and in the client
 * after a command, and a helper that read the browser locale would produce two
 * different strings for the same value and trip hydration.
 */
import { wallClockTimeIn } from "./business-day";

/**
 * Minutes → "7h 30m" / "45m" / "0m", and "—" only when there is no number.
 *
 * Zero and unknown are different facts and were rendered identically. A
 * completed session shorter than a minute — the engine rounds to whole minutes,
 * so a 17-second day is genuinely 0 — reported "—" across all six metric cards,
 * which reads as "we failed to calculate this" rather than "this day was that
 * short". The metric cards' own contract is that "showing 0m is the truth,
 * whereas inferring a value would not be"; this is that contract applied one
 * layer down, where the conflation actually was.
 */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "—";
  const total = Math.max(0, Math.trunc(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/**
 * ISO instant → "09:04" on the given clock, or "—".
 *
 * `timeZone` is the organization's policy zone: the screens quote the same
 * clock the attendance day is filed under. Rendering UTC while the row's date
 * came from the organization's zone put the two a day apart on the same card —
 * "Wed 12 Aug, clock in 19:16" for a session that started at 00:46 on the 13th.
 */
export function formatTime(iso: string | null, timeZone: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return wallClockTimeIn(date, timeZone);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "2026-08-12" → "Wed 12 Aug 2026". */
export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const weekday = WEEKDAYS[(date.getUTCDay() + 6) % 7];
  return `${weekday} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "2026-08" → "August 2026". */
export function formatMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const long = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${long[mon - 1] ?? month} ${year}`;
}

/** Enum-ish value → "Half Day". */
export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The day component of an ISO instant or date, for building form defaults. */
export function isoDay(value: string): string {
  return value.slice(0, 10);
}
