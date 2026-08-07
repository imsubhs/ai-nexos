/**
 * IP allow-list matching, with CIDR support.
 *
 * Share policies carry an `allowed_ips` list, and it was evaluated with
 * `allowedIps.includes(reqIp)` — exact string equality. Three ways that fails
 * in practice:
 *
 *   · An operator writes `203.0.113.0/24`, meaning the client's office
 *     network. It matches nothing, so the policy silently permits nobody and
 *     the share appears broken.
 *   · Or the operator writes single addresses to work around that, and the
 *     policy breaks whenever the client's ISP re-assigns one.
 *   · `::ffff:203.0.113.9` and `203.0.113.9` are the same host written two
 *     ways, and string equality says they are different.
 *
 * A restriction that fails closed for the legitimate user and is trivially
 * mis-specified does not get used, and an unused control is no control.
 */

import { isIP } from "node:net";

/** Normalises an address so equivalent spellings compare equal. */
function normalise(address: string): string {
  const trimmed = address
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  // IPv4-mapped IPv6: ::ffff:203.0.113.9 is the IPv4 host 203.0.113.9.
  if (trimmed.startsWith("::ffff:")) {
    const embedded = trimmed.slice("::ffff:".length);
    if (isIP(embedded) === 4) return embedded;
  }
  // Drop a zone index: fe80::1%eth0.
  return trimmed.split("%")[0];
}

/** Big-endian numeric form of an IPv4 address. */
function ipv4ToInt(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    // Reject "01" and "1e2": Number() accepts forms the address grammar does
    // not, and an allow-list that parses more than the network stack does is
    // an allow-list that can be tricked.
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

/** Expands an IPv6 address to its 16 bytes, or null if malformed. */
function ipv6ToBytes(address: string): Uint8Array | null {
  if (isIP(address) !== 6) return null;

  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":").filter(Boolean) : [];
  const tailGroups =
    tail !== undefined ? tail.split(":").filter(Boolean) : undefined;

  let groups: string[];
  if (tailGroups === undefined) {
    groups = headGroups;
  } else {
    const missing = 8 - headGroups.length - tailGroups.length;
    if (missing < 0) return null;
    groups = [...headGroups, ...Array(missing).fill("0"), ...tailGroups];
  }

  // A trailing IPv4 form (::ffff:1.2.3.4) occupies the final two groups.
  const last = groups[groups.length - 1];
  if (last && last.includes(".")) {
    const v4 = ipv4ToInt(last);
    if (v4 === null) return null;
    groups = [
      ...groups.slice(0, -1),
      (((v4 >>> 16) & 0xffff) >>> 0).toString(16),
      ((v4 & 0xffff) >>> 0).toString(16),
    ];
  }

  if (groups.length !== 8) return null;

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const group = Number.parseInt(groups[i] || "0", 16);
    if (Number.isNaN(group) || group < 0 || group > 0xffff) return null;
    bytes[i * 2] = (group >> 8) & 0xff;
    bytes[i * 2 + 1] = group & 0xff;
  }
  return bytes;
}

/** Whether the first `prefixLength` bits of two byte arrays agree. */
function sharePrefix(
  a: Uint8Array,
  b: Uint8Array,
  prefixLength: number,
): boolean {
  const wholeBytes = Math.floor(prefixLength / 8);
  for (let i = 0; i < wholeBytes; i++) {
    if (a[i] !== b[i]) return false;
  }
  const remainingBits = prefixLength % 8;
  if (remainingBits === 0) return true;
  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return (a[wholeBytes] & mask) === (b[wholeBytes] & mask);
}

/**
 * Whether `address` falls inside `rule`.
 *
 * `rule` is either a bare address or CIDR notation. A malformed rule matches
 * nothing rather than everything — a typo in a policy must never widen it.
 */
export function ipMatchesRule(address: string, rule: string): boolean {
  const ip = normalise(address);
  const candidate = normalise(rule);
  if (!ip || !candidate) return false;

  if (!candidate.includes("/")) {
    return isIP(ip) !== 0 && ip === candidate;
  }

  const [network, prefixText] = candidate.split("/");
  // The prefix must be written out in full. `Number("")` is 0, so a trailing
  // slash — "203.0.113.0/" — would otherwise parse as /0 and match the entire
  // internet: a one-character typo silently converting a restriction into
  // permission for everyone.
  if (!/^\d{1,3}$/.test(prefixText ?? "")) return false;
  const prefixLength = Number(prefixText);

  const ipVersion = isIP(ip);
  const networkVersion = isIP(network);
  // An IPv4 address is not inside an IPv6 range, and vice versa.
  if (ipVersion === 0 || ipVersion !== networkVersion) return false;

  if (ipVersion === 4) {
    if (prefixLength > 32) return false;
    const ipInt = ipv4ToInt(ip);
    const networkInt = ipv4ToInt(network);
    if (ipInt === null || networkInt === null) return false;
    if (prefixLength === 0) return true;
    // Shift by 32 is undefined in JS; the /32 case is plain equality.
    const mask = prefixLength === 32 ? -1 : ~((1 << (32 - prefixLength)) - 1);
    return (ipInt & mask) === (networkInt & mask);
  }

  if (prefixLength > 128) return false;
  const ipBytes = ipv6ToBytes(ip);
  const networkBytes = ipv6ToBytes(network);
  if (!ipBytes || !networkBytes) return false;
  return sharePrefix(ipBytes, networkBytes, prefixLength);
}

/**
 * Whether `address` matches any rule in the list.
 *
 * An empty or absent list means "no restriction configured" and is the
 * caller's decision to interpret; this function only answers about a non-empty
 * list.
 */
export function ipMatchesAnyRule(
  address: string,
  rules: readonly string[],
): boolean {
  return rules.some((rule) => ipMatchesRule(address, rule));
}
