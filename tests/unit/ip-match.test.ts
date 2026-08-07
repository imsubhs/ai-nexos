import { describe, expect, it } from "vitest";
import { ipMatchesAnyRule, ipMatchesRule } from "@/lib/security/ip-match";

describe("ipMatchesRule — exact addresses", () => {
  it("matches an identical address", () => {
    expect(ipMatchesRule("203.0.113.9", "203.0.113.9")).toBe(true);
  });

  it("does not match a different address", () => {
    expect(ipMatchesRule("203.0.113.10", "203.0.113.9")).toBe(false);
  });

  it("treats an IPv4-mapped IPv6 address as the same host", () => {
    // Two spellings of one host; string equality called them different, which
    // denied a legitimate visitor depending on which edge handled them.
    expect(ipMatchesRule("::ffff:203.0.113.9", "203.0.113.9")).toBe(true);
  });

  it("ignores an IPv6 zone index", () => {
    expect(ipMatchesRule("fe80::1%eth0", "fe80::1")).toBe(true);
  });
});

describe("ipMatchesRule — CIDR", () => {
  it("matches an address inside an IPv4 range", () => {
    // The natural way to express "the client's office network", and previously
    // it matched nothing at all.
    expect(ipMatchesRule("203.0.113.9", "203.0.113.0/24")).toBe(true);
    expect(ipMatchesRule("203.0.113.255", "203.0.113.0/24")).toBe(true);
  });

  it("does not match an address outside the range", () => {
    expect(ipMatchesRule("203.0.114.1", "203.0.113.0/24")).toBe(false);
  });

  it("handles a /32 as a single host", () => {
    expect(ipMatchesRule("203.0.113.9", "203.0.113.9/32")).toBe(true);
    expect(ipMatchesRule("203.0.113.10", "203.0.113.9/32")).toBe(false);
  });

  it("handles /0 as everything, since that is what it means", () => {
    expect(ipMatchesRule("8.8.8.8", "0.0.0.0/0")).toBe(true);
  });

  it("handles non-byte-aligned prefixes", () => {
    expect(ipMatchesRule("10.0.1.5", "10.0.0.0/23")).toBe(true);
    expect(ipMatchesRule("10.0.2.5", "10.0.0.0/23")).toBe(false);
  });

  it("matches inside an IPv6 range", () => {
    expect(ipMatchesRule("2001:db8::1", "2001:db8::/32")).toBe(true);
    expect(ipMatchesRule("2001:db9::1", "2001:db8::/32")).toBe(false);
  });

  it("does not match an IPv4 address against an IPv6 range, or vice versa", () => {
    expect(ipMatchesRule("203.0.113.9", "2001:db8::/32")).toBe(false);
    expect(ipMatchesRule("2001:db8::1", "203.0.113.0/24")).toBe(false);
  });
});

describe("ipMatchesRule — malformed input fails closed", () => {
  it.each([
    ["203.0.113.9", "not-an-address"],
    ["203.0.113.9", "203.0.113.0/"],
    ["203.0.113.9", "203.0.113.0/33"],
    ["203.0.113.9", "203.0.113.0/-1"],
    ["203.0.113.9", ""],
    ["not-an-address", "203.0.113.0/24"],
    ["", "203.0.113.0/24"],
  ])("refuses address %s against rule %s", (address, rule) => {
    // A typo in a policy must never widen it.
    expect(ipMatchesRule(address, rule)).toBe(false);
  });

  it("rejects octet spellings the network stack would not accept", () => {
    // Number("01") is 1 and Number("1e2") is 100; an allow-list that parses
    // more forms than the stack does is an allow-list that can be tricked.
    expect(ipMatchesRule("203.0.113.9", "203.0.113.09")).toBe(false);
    expect(ipMatchesRule("203.0.113.100", "203.0.113.1e2")).toBe(false);
    expect(ipMatchesRule("203.0.113.9", "203.0.113.300/24")).toBe(false);
  });
});

describe("ipMatchesAnyRule", () => {
  it("matches when any rule in the list matches", () => {
    const rules = ["198.51.100.7", "203.0.113.0/24"];
    expect(ipMatchesAnyRule("203.0.113.9", rules)).toBe(true);
    expect(ipMatchesAnyRule("198.51.100.7", rules)).toBe(true);
    expect(ipMatchesAnyRule("192.0.2.1", rules)).toBe(false);
  });

  it("matches nothing against an empty list", () => {
    expect(ipMatchesAnyRule("203.0.113.9", [])).toBe(false);
  });
});
