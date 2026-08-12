/**
 * The attendance business day (policy 10.4) — one definition, used by writes
 * and reads alike.
 *
 * `attendance_records.date` is documented as a DayDate "resolved in policy
 * timezone at write time". It was resolved in the SERVER's timezone instead:
 * `new Date().toISOString().slice(0, 10)`. On a UTC host that is the UTC date,
 * so an organization in Asia/Kolkata clocking in at 00:46 IST was recorded
 * against the previous calendar day, could not start the new day's session
 * until 05:30 IST, and saw its own clock-in stamped 19:16 the day before.
 *
 * The source of truth is `organizations.timezone` — a `NOT NULL DEFAULT 'UTC'`
 * IANA name, already written by the seed and editable in Organisation settings.
 * Nothing here hardcodes a zone; a UTC organization gets exactly the previous
 * behaviour.
 *
 * Scope: this module decides *which calendar day* an instant belongs to and
 * *which instant* a wall-clock time on that day is. It defines no new business
 * rule. The attendance day remains midnight-to-midnight in the organization's
 * zone, which is what `autoLogoutTime` ("23:59", policy 10.1) already assumes —
 * there is no shift-spanning or grace-period definition in the product to
 * preserve, and this does not invent one.
 *
 * Pure and dependency-free: `Intl` does the zone arithmetic, so DST transitions
 * and historical offset changes come from the platform's IANA data rather than
 * from arithmetic maintained here.
 */

/** A wall-clock reading in some zone. `month` is 1-12, as written. */
export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  formatters.set(timeZone, created);
  return created;
}

const validated = new Map<string, string>();

/**
 * The zone to actually use for `value`, falling back to UTC.
 *
 * `organizations.timezone` is validated on write by a shape regex, which admits
 * well-formed names that no IANA database contains. A stored "Mars/Olympus"
 * must not take down every attendance surface in the organization, so an
 * unusable zone degrades to UTC — the same column default — rather than
 * throwing. Resolution is memoised because it runs on every render.
 */
export function resolveTimeZone(value: string | null | undefined): string {
  if (!value) return "UTC";
  const cached = validated.get(value);
  if (cached) return cached;
  let resolved = "UTC";
  try {
    formatterFor(value).format(0);
    resolved = value;
  } catch {
    resolved = "UTC";
  }
  validated.set(value, resolved);
  return resolved;
}

/** Read an instant as wall-clock parts in `timeZone`. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(resolveTimeZone(timeZone)).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // "24" is what hourCycle h23 should never produce, but some ICU builds
    // report midnight as 24 under h24 semantics; normalise rather than trust.
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/**
 * The attendance business day an instant falls on, as "YYYY-MM-DD".
 *
 * This is THE date written to `attendance_records.date` and THE date every read
 * compares against. Callers must never derive it a second way.
 */
export function businessDayIn(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** The current attendance business day in `timeZone`. */
export function currentBusinessDay(timeZone: string, now = new Date()): string {
  return businessDayIn(now, timeZone);
}

/** How far `timeZone` is ahead of UTC at `utcMs`, in milliseconds. */
function offsetMsAt(utcMs: number, timeZone: string): number {
  const p = zonedParts(new Date(utcMs), timeZone);
  const asIfUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  // formatToParts has second resolution; compare like for like.
  return asIfUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * The instant at which the clock in `timeZone` reads `hhmm` on `isoDate`.
 *
 * Two passes: the first converts using the offset in force at the naive
 * timestamp, the second re-reads the offset at that candidate instant. Without
 * the second pass a wall-clock time on the far side of a DST transition
 * resolves an hour out.
 *
 * A wall-clock time that a spring-forward skips entirely has no instant. It
 * resolves here to the reading one offset-step earlier — 02:30 on a day whose
 * clocks jump 02:00 → 03:00 lands on 01:30 local. That is deterministic and
 * stays on the requested date, which is what a shift boundary needs; no shift
 * in this product is defined inside a DST gap, so nothing rides on the choice
 * beyond it being stable.
 */
export function instantAtWallClock(
  isoDate: string,
  hhmm: string,
  timeZone: string,
): number {
  const zone = resolveTimeZone(timeZone);
  const [year, month, day] = isoDate.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = naive - offsetMsAt(naive, zone);
  return naive - offsetMsAt(firstPass, zone);
}

/** An instant as "HH:mm" on the clock in `timeZone`. */
export function wallClockTimeIn(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * A short label for the zone a surface is showing times in, e.g.
 * "IST" or "GMT+5:30" — whatever the platform's data offers for that date.
 * Used so a screen can say which clock it is quoting instead of asserting UTC.
 */
export function timeZoneLabel(timeZone: string, at = new Date()): string {
  const zone = resolveTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "short",
  }).formatToParts(at);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? zone;
}
