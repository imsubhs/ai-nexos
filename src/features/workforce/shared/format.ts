/**
 * Presentation formatting shared by the workforce screens. Pure and
 * locale-independent: these run on the server during render and in the client
 * after a command, and a helper that read the browser locale would produce two
 * different strings for the same value and trip hydration.
 */

/** Minutes → "7h 30m" / "45m" / "—" for nothing. */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** ISO instant → "09:04" in UTC, or "—". */
export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(11, 16);
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
