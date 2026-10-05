import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  DEFAULT_MAX_BODY_BYTES,
  assertSameOrigin,
  getClientIp,
  parseJsonSafely,
  readJsonBody,
} from "@/lib/security/request";
import { ApiError } from "@/lib/security/errors";

const originalHops = process.env.TRUSTED_PROXY_HOPS;

afterEach(() => {
  if (originalHops === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = originalHops;
});

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

function jsonRequest(
  body: unknown,
  init: { origin?: string; host?: string; contentType?: string } = {},
): Request {
  return new Request("https://app.example.com/api/thing", {
    method: "POST",
    headers: {
      "content-type": init.contentType ?? "application/json",
      host: init.host ?? "app.example.com",
      ...(init.origin ? { origin: init.origin } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("getClientIp", () => {
  it("ignores a client-supplied entry ahead of the trusted proxy", () => {
    // One trusted hop: our edge appended the rightmost entry, and everything
    // to its left is whatever the caller chose to send.
    process.env.TRUSTED_PROXY_HOPS = "1";
    const ip = getClientIp(
      headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }),
    );
    expect(ip).toBe("203.0.113.9");
  });

  it("honours a deeper proxy chain when configured", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    const ip = getClientIp(
      headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9, 198.51.100.7" }),
    );
    expect(ip).toBe("203.0.113.9");
  });

  it("falls back to the rightmost entry when the chain is shorter than configured", () => {
    process.env.TRUSTED_PROXY_HOPS = "5";
    const ip = getClientIp(headers({ "x-forwarded-for": "203.0.113.9" }));
    expect(ip).toBe("203.0.113.9");
  });

  it("normalises IPv6-mapped addresses and strips ports", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    expect(
      getClientIp(headers({ "x-forwarded-for": "::ffff:203.0.113.9" })),
    ).toBe("203.0.113.9");
    expect(getClientIp(headers({ "x-real-ip": "203.0.113.9:44321" }))).toBe(
      "203.0.113.9",
    );
  });

  it("reports a single unknown bucket when no address is available", () => {
    expect(getClientIp(headers({}))).toBe("unknown");
  });

  describe("S6.6 required test cases (Case A through Case F)", () => {
    it("Case A: hops=1, single entry is parsed as client", () => {
      process.env.TRUSTED_PROXY_HOPS = "1";
      expect(getClientIp(headers({ "x-forwarded-for": "attacker" }))).toBe(
        "attacker",
      );
    });

    it("Case B: hops=1, ignores attacker entry ahead of proxy", () => {
      process.env.TRUSTED_PROXY_HOPS = "1";
      expect(
        getClientIp(headers({ "x-forwarded-for": "attacker, 198.51.100.1" })),
      ).toBe("198.51.100.1");
    });

    it("Case C: hops=2, extracts real client ahead of two proxies", () => {
      process.env.TRUSTED_PROXY_HOPS = "2";
      expect(
        getClientIp(
          headers({
            "x-forwarded-for": "attacker, 203.0.113.50, 198.51.100.1",
          }),
        ),
      ).toBe("203.0.113.50");
    });

    it("Case D: malformed empty/comma-only header falls back to unknown", () => {
      process.env.TRUSTED_PROXY_HOPS = "1";
      expect(getClientIp(headers({ "x-forwarded-for": ",,," }))).toBe(
        "unknown",
      );
    });

    it("Case E: no forwarding header yields unknown", () => {
      process.env.TRUSTED_PROXY_HOPS = "1";
      expect(getClientIp(headers({}))).toBe("unknown");
    });

    it("Case F: x-real-ip fallback when X-Forwarded-For is absent", () => {
      process.env.TRUSTED_PROXY_HOPS = "1";
      expect(getClientIp(headers({ "x-real-ip": "198.51.100.5" }))).toBe(
        "198.51.100.5",
      );
    });
  });
});

describe("assertSameOrigin", () => {
  it("allows a same-origin mutating request", () => {
    expect(() =>
      assertSameOrigin(jsonRequest({}, { origin: "https://app.example.com" })),
    ).not.toThrow();
  });

  it("rejects a cross-site mutating request", () => {
    expect(() =>
      assertSameOrigin(jsonRequest({}, { origin: "https://evil.example.net" })),
    ).toThrow(ApiError);
  });

  it("rejects a mutating request with no Origin or Referer at all", () => {
    // "Absent means trusted" is exactly how this check gets bypassed by a
    // non-browser client replaying a stolen cookie.
    expect(() => assertSameOrigin(jsonRequest({}))).toThrow(ApiError);
  });

  it("does not constrain safe methods", () => {
    const get = new Request("https://app.example.com/api/thing", {
      method: "GET",
      headers: { origin: "https://evil.example.net" },
    });
    expect(() => assertSameOrigin(get)).not.toThrow();
  });
});

describe("parseJsonSafely", () => {
  it("drops __proto__ instead of letting it reach a prototype", () => {
    const parsed = parseJsonSafely(
      '{"__proto__":{"polluted":true},"ok":1}',
    ) as Record<string, unknown>;

    expect(parsed.ok).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(parsed, "__proto__")).toBe(
      false,
    );
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("drops constructor and prototype keys too", () => {
    const parsed = parseJsonSafely(
      '{"constructor":{"x":1},"prototype":{"y":2},"kept":3}',
    ) as Record<string, unknown>;

    expect(Object.keys(parsed)).toEqual(["kept"]);
  });

  it("strips polluting keys at any depth", () => {
    const parsed = parseJsonSafely(
      '{"a":{"b":{"__proto__":{"bad":1},"good":2}}}',
    ) as { a: { b: Record<string, unknown> } };

    expect(Object.keys(parsed.a.b)).toEqual(["good"]);
  });
});

describe("readJsonBody", () => {
  const schema = z.object({ name: z.string() });

  it("returns the validated body", async () => {
    const body = await readJsonBody(jsonRequest({ name: "ok" }), schema);
    expect(body).toEqual({ name: "ok" });
  });

  it("refuses a non-JSON content type", async () => {
    await expect(
      readJsonBody(
        jsonRequest("name=ok", { contentType: "text/plain" }),
        schema,
      ),
    ).rejects.toMatchObject({ code: "unsupported_media_type" });
  });

  it("refuses a body larger than the cap, by declared length", async () => {
    const request = new Request("https://app.example.com/api/thing", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(DEFAULT_MAX_BODY_BYTES + 1),
      },
      body: JSON.stringify({ name: "x" }),
    });

    await expect(readJsonBody(request, schema)).rejects.toMatchObject({
      code: "payload_too_large",
    });
  });

  it("refuses an oversized body even when Content-Length lies", async () => {
    // The declared length is the caller's claim; the bytes are the truth.
    const oversized = JSON.stringify({
      name: "x".repeat(DEFAULT_MAX_BODY_BYTES),
    });
    const request = new Request("https://app.example.com/api/thing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: oversized,
    });

    await expect(
      readJsonBody(request, schema, { maxBytes: 1024 }),
    ).rejects.toMatchObject({ code: "payload_too_large" });
  });

  it("reports invalid JSON as a 400 rather than throwing a parse error", async () => {
    await expect(
      readJsonBody(jsonRequest("{not json"), schema),
    ).rejects.toMatchObject({ code: "bad_request" });
  });

  it("reports schema violations without leaking the schema", async () => {
    await expect(
      readJsonBody(jsonRequest({ name: 42 }), schema),
    ).rejects.toMatchObject({ code: "bad_request" });
  });
});
