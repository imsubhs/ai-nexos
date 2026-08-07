/**
 * Structured, redacting logger.
 *
 * Every security decision this platform makes — a refused token, a throttled
 * login, a blocked egress — has to be reconstructable after the fact, and none
 * of those records may contain the secret that was being checked. `console.*`
 * with a template string satisfies neither: the output is unparseable by a log
 * pipeline, and whatever object was interpolated is serialised in full.
 *
 * Two rules hold here:
 *
 *   1. One JSON object per line. Fields are stable, so a query can group by
 *      `event` and filter by `outcome` without parsing prose.
 *   2. Redaction happens on the way out, not at the call site. A caller that
 *      has to remember to strip a token will eventually forget; instead every
 *      value is walked and anything whose key looks like a credential is
 *      replaced. Being over-eager here is the correct failure direction.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Structured fields attached to a log line. */
export type LogFields = Record<string, unknown>;

/**
 * Keys whose values never appear in a log line, matched case-insensitively
 * anywhere in the key. Deliberately broad: `sha256Hash` is not a secret but
 * redacting it costs nothing, while missing `refresh_token` is a disclosure.
 */
const SECRET_KEY_PATTERN =
  /(pass(word|phrase)?|secret|token|jwt|api[-_]?key|auth|cookie|session|credential|signature|hmac|salt|nonce|bearer|private)/i;

const REDACTED = "[redacted]";

/** Depth cap: a cyclic or pathologically nested object must not hang a log call. */
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 512;

function redactValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
      : value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") {
    return `[${typeof value}]`;
  }

  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      // Stacks carry absolute paths; useful in a server log, never in a response.
      stack: value.stack,
    };
  }

  if (depth >= MAX_DEPTH) return "[depth-limit]";

  if (typeof value === "object") {
    if (seen.has(value as object)) return "[circular]";
    seen.add(value as object);

    if (Array.isArray(value)) {
      const items = value
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => redactValue(item, depth + 1, seen));
      if (value.length > MAX_ARRAY_ITEMS) {
        items.push(`[+${value.length - MAX_ARRAY_ITEMS} more]`);
      }
      return items;
    }

    const out: Record<string, unknown> = {};
    // Own enumerable keys only — an inherited property is not this object's data.
    for (const [key, nested] of Object.entries(value as object)) {
      out[key] = SECRET_KEY_PATTERN.test(key)
        ? REDACTED
        : redactValue(nested, depth + 1, seen);
    }
    return out;
  }

  return String(value);
}

/** Applies redaction to a set of log fields. Exported for the logger's tests. */
export function redact(fields: LogFields): LogFields {
  return redactValue(fields, 0, new WeakSet()) as LogFields;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function minimumLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (configured && configured in LEVEL_ORDER) return configured as LogLevel;
  // Tests are noisy enough; production keeps info so security events are kept.
  return process.env.NODE_ENV === "test" ? "error" : "info";
}

/** The console method matching a level, resolved per call so tests can spy. */
function sink(level: LogLevel): (line: string) => void {
  switch (level) {
    case "error":
      return console.error;
    case "warn":
      return console.warn;
    case "debug":
      return console.debug;
    default:
      return console.info;
  }
}

function emit(level: LogLevel, event: string, fields: LogFields): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minimumLevel()]) return;

  const line = {
    level,
    event,
    time: new Date().toISOString(),
    ...redact(fields),
  };

  // A logger that throws takes down the request it was describing.
  try {
    sink(level)(JSON.stringify(line));
  } catch {
    sink(level)(
      JSON.stringify({
        level,
        event,
        time: line.time,
        note: "unserialisable fields",
      }),
    );
  }
}

export const log = {
  debug: (event: string, fields: LogFields = {}) =>
    emit("debug", event, fields),
  info: (event: string, fields: LogFields = {}) => emit("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => emit("warn", event, fields),
  error: (event: string, fields: LogFields = {}) =>
    emit("error", event, fields),
};

/**
 * Records a security-relevant decision.
 *
 * Separate from `log.info` on purpose: these lines are the audit trail an
 * incident review reads, and giving them a fixed shape (`event`, `outcome`,
 * `subject`) means they can be alerted on without matching free text.
 */
export function logSecurityEvent(
  event: string,
  outcome: "allowed" | "denied" | "throttled" | "error",
  fields: LogFields = {},
): void {
  emit(outcome === "allowed" ? "info" : "warn", `security.${event}`, {
    outcome,
    ...fields,
  });
}
