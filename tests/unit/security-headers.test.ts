import { afterEach, describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "@/lib/security/headers";

/** Parses the CSP string into directive → sources. */
function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...values] = part.split(/\s+/);
        return [name, values];
      }),
  );
}

function headerValue(isDev: boolean, key: string): string | undefined {
  return buildSecurityHeaders(isDev).find((h) => h.key === key)?.value;
}

describe("security headers", () => {
  it("sets the clickjacking, sniffing and referrer defences in both modes", () => {
    for (const isDev of [true, false]) {
      expect(headerValue(isDev, "X-Frame-Options")).toBe("DENY");
      expect(headerValue(isDev, "X-Content-Type-Options")).toBe("nosniff");
      expect(headerValue(isDev, "Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(headerValue(isDev, "Cross-Origin-Opener-Policy")).toBe(
        "same-origin",
      );
    }
  });

  it("disables high-risk browser features by default", () => {
    const policy = headerValue(false, "Permissions-Policy") ?? "";
    for (const feature of ["camera", "microphone", "geolocation", "payment"]) {
      expect(policy).toContain(`${feature}=()`);
    }
  });

  describe("Strict-Transport-Security", () => {
    it("is sent in production with a two-year max-age", () => {
      const hsts = headerValue(false, "Strict-Transport-Security");
      expect(hsts).toBe("max-age=63072000; includeSubDomains");
    });

    it("is omitted in development, where localhost is plain http", () => {
      expect(headerValue(true, "Strict-Transport-Security")).toBeUndefined();
    });

    it("does not opt into the preload list implicitly", () => {
      // Preload is effectively irreversible; it must be a deliberate ops call.
      expect(headerValue(false, "Strict-Transport-Security")).not.toContain(
        "preload",
      );
    });
  });
});

describe("content security policy", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it("locks down the dangerous directives", () => {
    const d = directives(buildContentSecurityPolicy(false));
    expect(d["default-src"]).toEqual(["'self'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
  });

  it("never allows eval in production", () => {
    // React Refresh needs 'unsafe-eval'; a production bundle does not.
    expect(buildContentSecurityPolicy(false)).not.toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(true)).toContain("'unsafe-eval'");
  });

  it("allows inline script/style, as this phase has no nonce", () => {
    // Documents the known gap: Next's bootstrap and framer-motion are inline.
    // When proxy.ts starts issuing a nonce, this expectation should flip.
    const d = directives(buildContentSecurityPolicy(false));
    expect(d["script-src"]).toContain("'unsafe-inline'");
    expect(d["style-src"]).toContain("'unsafe-inline'");
  });

  it("upgrades insecure requests in production only", () => {
    expect(buildContentSecurityPolicy(false)).toContain(
      "upgrade-insecure-requests",
    );
    expect(buildContentSecurityPolicy(true)).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("derives the Supabase origins from configuration, https and wss", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    const d = directives(buildContentSecurityPolicy(false));
    expect(d["connect-src"]).toContain("https://abc123.supabase.co");
    // Realtime uses a websocket against the same host.
    expect(d["connect-src"]).toContain("wss://abc123.supabase.co");
    expect(d["img-src"]).toContain("https://abc123.supabase.co");
    // A websocket is not a subresource; wss belongs only in connect-src.
    expect(d["img-src"]).not.toContain("wss://abc123.supabase.co");
    expect(d["media-src"]).not.toContain("wss://abc123.supabase.co");
  });

  it("still produces a valid policy when Supabase is unconfigured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const d = directives(buildContentSecurityPolicy(false));
    expect(d["connect-src"]).toEqual(["'self'"]);
  });

  it("does not break on a malformed Supabase URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    expect(() => buildContentSecurityPolicy(false)).not.toThrow();
  });
});
