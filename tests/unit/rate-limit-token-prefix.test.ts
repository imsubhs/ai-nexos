import { describe, expect, it } from "vitest";
import {
  tokenPrefixBucket,
  RATE_LIMITS,
  consumeRateLimit,
  resetRateLimitState,
} from "@/lib/security/rate-limit";
import { hashInvitationToken } from "@/features/organizations/invitation-service";

describe("Token Prefix Bucket & Entropy Preservation", () => {
  it("extracts exactly the first 8 hex characters as a coarse bucket", () => {
    const rawToken = "a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef";
    const hash = hashInvitationToken(rawToken);

    expect(hash.length).toBe(64); // Full 256-bit SHA-256 digest
    const bucket = tokenPrefixBucket(hash);

    expect(bucket.length).toBe(8);
    expect(bucket).toBe(hash.slice(0, 8));
  });

  it("handles prefix collisions: two distinct tokens with identical 8-hex prefix share rate limit bucket but resolve separately", async () => {
    resetRateLimitState();

    // Fabricate two distinct 64-hex SHA-256 hashes that share the same 8-hex prefix "deadbeef"
    const prefix = "deadbeef";
    const tokenHashA = prefix + "00000000000000000000000000000000000000000000000000000000";
    const tokenHashB = prefix + "11111111111111111111111111111111111111111111111111111111";

    expect(tokenHashA).not.toBe(tokenHashB);
    expect(tokenHashA.length).toBe(64);
    expect(tokenHashB.length).toBe(64);

    // Both map to the exact same coarse rate-limit bucket
    const bucketA = tokenPrefixBucket(tokenHashA);
    const bucketB = tokenPrefixBucket(tokenHashB);
    expect(bucketA).toBe("deadbeef");
    expect(bucketB).toBe("deadbeef");

    const clientIp = "198.51.100.42";
    const bucketKey = `${clientIp}:${bucketA}`;

    // In degraded/test mode without Redis, degradedLimit = 10 applies
    for (let i = 0; i < 10; i++) {
      const res = await consumeRateLimit(RATE_LIMITS.invitationPreview, bucketKey);
      expect(res.allowed).toBe(true);
    }

    // 11th request using the colliding token B from the same IP must be throttled by the shared prefix bucket!
    const bucketKeyB = `${clientIp}:${bucketB}`;
    const throttled = await consumeRateLimit(RATE_LIMITS.invitationPreview, bucketKeyB);

    expect(throttled.allowed).toBe(false);
    expect(throttled.remaining).toBe(0);
    expect(throttled.retryAfterSeconds).toBeGreaterThan(0);
  });
});
