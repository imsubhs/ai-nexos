import { describe, expect, it } from "vitest";
import {
  updateOrganizationSchema,
  updateUserRoleSchema,
} from "@/features/organizations/schemas";
import { checkOwnerProtectionMock } from "@/features/organizations/mock-actions";

describe("Organizations Validation", () => {
  describe("updateOrganizationSchema", () => {
    it("accepts valid hex colors", () => {
      const result = updateOrganizationSchema.safeParse({
        brandPrimaryColor: "#ff00FF",
      });
      expect(result.success).toBe(true);
    });
    it("rejects invalid hex colors", () => {
      const result = updateOrganizationSchema.safeParse({
        brandPrimaryColor: "ff00FF",
      });
      expect(result.success).toBe(false);
    });
    it("accepts valid IANA timezone", () => {
      const result = updateOrganizationSchema.safeParse({
        timezone: "America/New_York",
      });
      expect(result.success).toBe(true);
    });
    it("rejects invalid IANA timezone", () => {
      const result = updateOrganizationSchema.safeParse({
        timezone: "America New York",
      });
      expect(result.success).toBe(false);
    });
    it("accepts valid ISO 4217 currency", () => {
      const result = updateOrganizationSchema.safeParse({ currency: "USD" });
      expect(result.success).toBe(true);
    });
    it("rejects invalid currency", () => {
      const result = updateOrganizationSchema.safeParse({ currency: "usd" }); // needs uppercase
      expect(result.success).toBe(false);
    });
    it("accepts valid urls", () => {
      const result = updateOrganizationSchema.safeParse({
        website: "https://example.com",
      });
      expect(result.success).toBe(true);
    });
    it("rejects invalid urls", () => {
      const result = updateOrganizationSchema.safeParse({
        website: "example.com",
      });
      expect(result.success).toBe(false);
    });
    it("accepts valid emails", () => {
      const result = updateOrganizationSchema.safeParse({
        contactEmail: "test@test.com",
      });
      expect(result.success).toBe(true);
    });
    it("rejects invalid emails", () => {
      const result = updateOrganizationSchema.safeParse({
        contactEmail: "test@test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("UUID Validation", () => {
    it("accepts valid UUIDs", () => {
      const result = updateUserRoleSchema.safeParse({
        userId: "123e4567-e89b-12d3-a456-426614174000",
        roleId: "123e4567-e89b-12d3-a456-426614174001",
      });
      expect(result.success).toBe(true);
    });
    it("rejects invalid UUIDs", () => {
      const result = updateUserRoleSchema.safeParse({
        userId: "not-a-uuid",
        roleId: "123e4567-e89b-12d3-a456-426614174001",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Owner Protection", () => {
  it("prevents removing the last active owner", async () => {
    const mockStore = {
      users: [
        {
          userId: "1",
          organizationId: "orgA",
          roleId: "demo-role-owner",
          status: "active",
        },
        {
          userId: "2",
          organizationId: "orgA",
          roleId: "demo-role-admin",
          status: "active",
        },
      ],
    };

    // checkOwnerProtectionMock is async — must use rejects to catch a rejected Promise.
    await expect(
      checkOwnerProtectionMock(mockStore, "orgA", "1", true),
    ).rejects.toThrow("Cannot modify the last active owner");
  });

  it("allows removing an owner role if another active owner exists", async () => {
    const mockStore = {
      users: [
        {
          userId: "1",
          organizationId: "orgA",
          roleId: "demo-role-owner",
          status: "active",
        },
        {
          userId: "2",
          organizationId: "orgA",
          roleId: "demo-role-owner",
          status: "active",
        },
      ],
    };

    // Should resolve without throwing.
    await expect(
      checkOwnerProtectionMock(mockStore, "orgA", "1", true),
    ).resolves.toBeUndefined();
  });

  it("allows modifying a non-owner", async () => {
    const mockStore = {
      users: [
        {
          userId: "1",
          organizationId: "orgA",
          roleId: "demo-role-owner",
          status: "active",
        },
        {
          userId: "2",
          organizationId: "orgA",
          roleId: "demo-role-admin",
          status: "active",
        },
      ],
    };

    await expect(
      checkOwnerProtectionMock(mockStore, "orgA", "2", true),
    ).resolves.toBeUndefined();
  });
});
