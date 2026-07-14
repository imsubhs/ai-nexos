import { describe, expect, it } from "vitest";
import { loginSchema, magicLinkSchema } from "@/features/auth/schemas";

describe("loginSchema", () => {
  it("normalizes email (trim + lowercase)", () => {
    const result = loginSchema.parse({
      email: "  Owner@Example.COM ",
      password: "supersecret",
    });
    expect(result.email).toBe("owner@example.com");
  });

  it("rejects invalid emails and short passwords", () => {
    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "supersecret" })
        .success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "short" }).success,
    ).toBe(false);
  });
});

describe("magicLinkSchema", () => {
  it("accepts a valid email only", () => {
    expect(magicLinkSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(magicLinkSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
