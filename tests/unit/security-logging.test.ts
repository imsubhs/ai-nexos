import { describe, expect, it } from "vitest";
import { redact } from "@/lib/security/logger";
import { ApiError, errorResponse } from "@/lib/security/errors";

describe("log redaction", () => {
  it("removes anything that looks like a credential", () => {
    const redacted = redact({
      token: "eyJhbGciOi.secret.value",
      password: "hunter2",
      apiKey: "sk-live-1234",
      authorization: "Bearer abc",
      sessionCookie: "sb-access-token=…",
      hmacSignature: "deadbeef",
      userId: "00000000-0000-4000-8000-000000000001",
    });

    expect(redacted).toMatchObject({
      token: "[redacted]",
      password: "[redacted]",
      apiKey: "[redacted]",
      authorization: "[redacted]",
      sessionCookie: "[redacted]",
      hmacSignature: "[redacted]",
      // Not a secret, and the field an operator actually needs.
      userId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("redacts nested credentials too", () => {
    const redacted = redact({
      request: { headers: { cookie: "sb-access-token=x" }, path: "/api/thing" },
    }) as { request: { headers: Record<string, unknown>; path: string } };

    expect(redacted.request.headers.cookie).toBe("[redacted]");
    expect(redacted.request.path).toBe("/api/thing");
  });

  it("survives a circular structure", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };
    cyclic.self = cyclic;
    expect(() => redact(cyclic)).not.toThrow();
    expect(JSON.stringify(redact(cyclic))).toContain("[circular]");
  });

  it("keeps an Error's message and stack for the operator", () => {
    const redacted = redact({ error: new Error("boom") }) as {
      error: { message: string; stack?: string };
    };
    expect(redacted.error.message).toBe("boom");
    expect(redacted.error.stack).toBeDefined();
  });
});

describe("errorResponse", () => {
  it("returns a deliberate ApiError message verbatim", async () => {
    const response = errorResponse(
      new ApiError("unauthorized", "Invalid or expired token."),
      "test",
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid or expired token.",
      code: "unauthorized",
    });
  });

  it("never returns the message of an unexpected error", async () => {
    // A Postgres or Drizzle message names tables and columns; returning it is a
    // free schema disclosure.
    const response = errorResponse(
      new Error('relation "share_sessions" does not exist'),
      "test",
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as {
      error: string;
      correlationId: string;
    };
    expect(body.error).toBe("An unexpected error occurred.");
    expect(body.error).not.toContain("share_sessions");
    expect(body.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("marks every error response uncacheable", () => {
    const response = errorResponse(new ApiError("forbidden", "No."), "test");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("carries an ApiError's extra headers, such as Retry-After", () => {
    const response = errorResponse(
      new ApiError("rate_limited", "Slow down.", {
        headers: { "Retry-After": "60" },
      }),
      "test",
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
