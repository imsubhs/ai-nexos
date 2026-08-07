import { afterEach, describe, expect, it } from "vitest";
import {
  EgressBlockedError,
  assertSafeOutboundUrl,
  isPrivateAddress,
} from "@/lib/security/egress";

const originalAllowlist = process.env.EGRESS_ALLOWED_HOSTS;

afterEach(() => {
  if (originalAllowlist === undefined) delete process.env.EGRESS_ALLOWED_HOSTS;
  else process.env.EGRESS_ALLOWED_HOSTS = originalAllowlist;
});

describe("isPrivateAddress", () => {
  it("recognises the cloud metadata endpoint", () => {
    // The single most valuable SSRF target: it returns instance credentials.
    expect(isPrivateAddress("169.254.169.254")).toBe(true);
  });

  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "127.0.0.1",
    "100.64.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
  ])("treats %s as non-public", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "203.0.113.9",
    "172.32.0.1",
    "192.169.0.1",
    "100.128.0.1",
  ])("treats %s as public", (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });

  it("judges IPv4-mapped IPv6 by the embedded address", () => {
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
  });

  it.each([
    "::1",
    "::",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "ff02::1",
    "64:ff9b::1",
  ])("treats IPv6 %s as non-public", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it("treats a non-address string as non-public", () => {
    // Callers must resolve first; an unresolved name is never assumed safe.
    expect(isPrivateAddress("example.com")).toBe(true);
  });
});

describe("assertSafeOutboundUrl", () => {
  it("permits a public https URL", async () => {
    const url = await assertSafeOutboundUrl("https://8.8.8.8/hook");
    expect(url.host).toBe("8.8.8.8");
  });

  it("blocks the metadata service", async () => {
    await expect(
      assertSafeOutboundUrl("http://169.254.169.254/latest/meta-data/"),
    ).rejects.toBeInstanceOf(EgressBlockedError);
  });

  it("blocks loopback by name and by address", async () => {
    await expect(
      assertSafeOutboundUrl("http://localhost:3000/"),
    ).rejects.toThrow(EgressBlockedError);
    await expect(
      assertSafeOutboundUrl("http://127.0.0.1:5432/"),
    ).rejects.toThrow(EgressBlockedError);
  });

  it("blocks private ranges reachable from inside the deployment", async () => {
    await expect(
      assertSafeOutboundUrl("http://10.0.0.5:5432/"),
    ).rejects.toThrow(EgressBlockedError);
  });

  it("blocks non-http schemes", async () => {
    await expect(assertSafeOutboundUrl("file:///etc/passwd")).rejects.toThrow(
      EgressBlockedError,
    );
    await expect(assertSafeOutboundUrl("gopher://8.8.8.8/")).rejects.toThrow(
      EgressBlockedError,
    );
  });

  it("blocks credentials embedded in the URL", async () => {
    await expect(
      assertSafeOutboundUrl("https://user:pass@8.8.8.8/hook"),
    ).rejects.toThrow(EgressBlockedError);
  });

  it("blocks plain http when insecure requests are not permitted", async () => {
    await expect(
      assertSafeOutboundUrl("http://8.8.8.8/hook", {
        allowInsecureHttp: false,
      }),
    ).rejects.toThrow(EgressBlockedError);
  });

  it("blocks internal naming suffixes", async () => {
    await expect(
      assertSafeOutboundUrl("https://db.internal/health"),
    ).rejects.toThrow(EgressBlockedError);
  });

  it("enforces the allow-list when one is configured", async () => {
    process.env.EGRESS_ALLOWED_HOSTS = "8.8.8.8";
    await expect(
      assertSafeOutboundUrl("https://8.8.8.8/hook"),
    ).resolves.toBeInstanceOf(URL);
    await expect(assertSafeOutboundUrl("https://1.1.1.1/hook")).rejects.toThrow(
      EgressBlockedError,
    );
  });

  it("still applies the private-range check to allow-listed hosts", async () => {
    process.env.EGRESS_ALLOWED_HOSTS = "127.0.0.1";
    await expect(assertSafeOutboundUrl("http://127.0.0.1/")).rejects.toThrow(
      EgressBlockedError,
    );
  });
});
