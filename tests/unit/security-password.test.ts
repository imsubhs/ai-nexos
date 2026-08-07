import { describe, expect, it } from "vitest";
import {
  hashSharePassword,
  timingSafeCompare,
  verifySharePassword,
} from "@/lib/security/password";

describe("share password hashing", () => {
  it("verifies the correct password", async () => {
    const stored = await hashSharePassword("correct horse battery staple");
    await expect(
      verifySharePassword("correct horse battery staple", stored),
    ).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const stored = await hashSharePassword("correct horse battery staple");
    await expect(verifySharePassword("wrong", stored)).resolves.toBe(false);
  });

  it("never stores the password itself", async () => {
    const password = "s3cret-share-pass";
    const stored = await hashSharePassword(password);
    expect(stored.hash).not.toContain(password);
    expect(stored.salt).not.toContain(password);
  });

  it("salts each hash, so identical passwords do not collide", async () => {
    // Without a per-password salt, a leaked table shows which clients share a
    // password and lets one crack serve them all.
    const a = await hashSharePassword("same-password");
    const b = await hashSharePassword("same-password");
    expect(a.hash).not.toBe(b.hash);
    expect(a.salt).not.toBe(b.salt);
  });

  it("fits the share_passwords column widths", async () => {
    const stored = await hashSharePassword("x");
    expect(stored.hash.length).toBeLessThanOrEqual(255);
    expect(stored.salt.length).toBeLessThanOrEqual(255);
  });

  it("refuses to hash an empty password", async () => {
    await expect(hashSharePassword("")).rejects.toThrow();
  });

  it("returns false rather than throwing on a corrupt stored record", async () => {
    await expect(
      verifySharePassword("anything", {
        hash: "not-hex",
        salt: "also-not-hex",
      }),
    ).resolves.toBe(false);
    await expect(
      verifySharePassword("anything", { hash: "", salt: "" }),
    ).resolves.toBe(false);
  });

  it("refuses an empty candidate without doing work", async () => {
    const stored = await hashSharePassword("real");
    await expect(verifySharePassword("", stored)).resolves.toBe(false);
  });
});

describe("timingSafeCompare", () => {
  it("matches identical strings", () => {
    expect(timingSafeCompare("abc123", "abc123")).toBe(true);
  });

  it("rejects different strings of the same length", () => {
    expect(timingSafeCompare("abc123", "abc124")).toBe(false);
  });

  it("rejects strings of different lengths without throwing", () => {
    expect(timingSafeCompare("short", "considerably-longer")).toBe(false);
  });

  it("handles empty input", () => {
    expect(timingSafeCompare("", "")).toBe(true);
    expect(timingSafeCompare("", "x")).toBe(false);
  });
});
