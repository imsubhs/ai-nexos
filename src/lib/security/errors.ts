/**
 * Error responses that say nothing an attacker can use.
 *
 * The route handlers this replaces returned `error.message` to the caller. That
 * message is whatever the failing layer produced — a Postgres error naming a
 * column, a Drizzle error naming a table, a Zod error naming an internal field.
 * Each one is a free schema disclosure, and in aggregate they map the database.
 *
 * The contract here is:
 *
 *   - An `ApiError` is a *deliberate* client-facing failure. Its message was
 *     written to be read by the caller, so it is returned verbatim.
 *   - Anything else is a bug or an infrastructure fault. The caller gets a
 *     generic message and a correlation id; the detail goes to the log under
 *     that same id, so an operator can join the two without the caller ever
 *     seeing the internals.
 */

import { NextResponse } from "next/server";
import { log } from "./logger";

/** Machine-readable failure codes. Stable — clients may switch on these. */
export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "unsupported_media_type"
  | "rate_limited"
  | "internal_error";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  rate_limited: 429,
  internal_error: 500,
};

/**
 * A failure whose message is safe to return.
 *
 * Constructing one is an assertion by the author that the text discloses
 * nothing about internals — "Invalid or expired token", never "no rows in
 * share_sessions for id …".
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Extra response headers, e.g. `Retry-After` on a throttle. */
  readonly headers: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { headers?: Record<string, string>; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.headers = options.headers ?? {};
  }
}

/**
 * A correlation id shared between the response and the log line.
 *
 * `crypto.randomUUID` is available in every runtime this app targets (Node 20+,
 * Edge, and the browser); no import is needed and none is added, because this
 * module is reachable from the Edge bundle.
 */
function correlationId(): string {
  return crypto.randomUUID();
}

/**
 * Turns any thrown value into a response.
 *
 * `context` names the call site (`"api.approvals.verify"`) and is what an
 * operator greps for. It is never sent to the caller.
 */
export function errorResponse(
  error: unknown,
  context: string,
  extraFields: Record<string, unknown> = {},
): NextResponse {
  const id = correlationId();

  if (error instanceof ApiError) {
    // Expected failures are logged at their own level: a 401 is routine, a 500
    // dressed as an ApiError is not.
    log.info("api.error", {
      context,
      correlationId: id,
      code: error.code,
      status: error.status,
      ...extraFields,
    });

    return NextResponse.json(
      { error: error.message, code: error.code, correlationId: id },
      {
        status: error.status,
        headers: { ...error.headers, "Cache-Control": "no-store" },
      },
    );
  }

  log.error("api.unhandled", {
    context,
    correlationId: id,
    error,
    ...extraFields,
  });

  return NextResponse.json(
    {
      error: "An unexpected error occurred.",
      code: "internal_error" satisfies ApiErrorCode,
      correlationId: id,
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * A success response that is never cached.
 *
 * Every authenticated payload in this application is tenant-specific. A shared
 * cache that keys only on URL would serve one organisation's data to another,
 * so `no-store` is the default and an endpoint that genuinely is public must
 * opt out explicitly.
 */
export function jsonResponse<T>(
  body: T,
  init: { status?: number; headers?: Record<string, string> } = {},
): NextResponse {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...init.headers },
  });
}
