import { afterEach, describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  generateCspNonce,
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

describe("static header set", () => {
  it("does not include the CSP, which is per-request", () => {
    // Emitting it here as well would send two policies; browsers enforce the
    // intersection, which is sound but makes the effective policy unclear.
    expect(headerValue(false, "Content-Security-Policy")).toBeUndefined();
  });

  it("refuses legacy cross-domain policy files", () => {
    expect(headerValue(false, "X-Permitted-Cross-Domain-Policies")).toBe(
      "none",
    );
  });
});

describe("content security policy", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it("locks down the dangerous directives", () => {
    const d = directives(buildContentSecurityPolicy({ isDev: false }));
    expect(d["default-src"]).toEqual(["'self'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
  });

  it("never allows eval in production", () => {
    // React Refresh needs 'unsafe-eval'; a production bundle does not.
    expect(buildContentSecurityPolicy({ isDev: false })).not.toContain(
      "'unsafe-eval'",
    );
    expect(buildContentSecurityPolicy({ isDev: true })).toContain(
      "'unsafe-eval'",
    );
  });

  describe("inline script handling", () => {
    it("requires a nonce and forbids inline script when one is supplied", () => {
      // The Phase 1 policy allowed 'unsafe-inline' here, which made every other
      // script directive decoration: any injection that reached the DOM ran.
      const d = directives(
        buildContentSecurityPolicy({ isDev: false, nonce: "abc123" }),
      );
      expect(d["script-src"]).toContain("'nonce-abc123'");
      expect(d["script-src"]).not.toContain("'unsafe-inline'");
    });

    it("falls back to 'unsafe-inline' only when no nonce is available", () => {
      // A document served without a nonce would otherwise render blank. The
      // proxy supplies one for everything it handles.
      const d = directives(buildContentSecurityPolicy({ isDev: false }));
      expect(d["script-src"]).toContain("'unsafe-inline'");
    });

    it("keeps 'unsafe-inline' for styles even with a nonce", () => {
      // React writes style attributes from props and Framer Motion writes
      // inline styles while animating; nonces do not apply to attributes.
      // Style injection cannot execute script under this policy.
      const d = directives(
        buildContentSecurityPolicy({ isDev: false, nonce: "abc123" }),
      );
      expect(d["style-src"]).toContain("'unsafe-inline'");
    });

    it("produces a different nonce on every call", () => {
      const nonces = new Set(
        Array.from({ length: 25 }, () => generateCspNonce()),
      );
      expect(nonces.size).toBe(25);
    });

    it("generates a nonce with at least 128 bits of entropy", () => {
      // A guessable nonce is no nonce: an attacker who can predict it can
      // satisfy the policy from injected markup.
      const nonce = generateCspNonce();
      expect(Buffer.from(nonce, "base64").length).toBeGreaterThanOrEqual(16);
    });
  });

  it("upgrades insecure requests in production only", () => {
    expect(buildContentSecurityPolicy({ isDev: false })).toContain(
      "upgrade-insecure-requests",
    );
    expect(buildContentSecurityPolicy({ isDev: true })).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("derives the Supabase origins from configuration, https and wss", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    const d = directives(buildContentSecurityPolicy({ isDev: false }));
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
    const d = directives(buildContentSecurityPolicy({ isDev: false }));
    expect(d["connect-src"]).toEqual(["'self'"]);
  });

  it("does not break on a malformed Supabase URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    expect(() => buildContentSecurityPolicy({ isDev: false })).not.toThrow();
  });
});
