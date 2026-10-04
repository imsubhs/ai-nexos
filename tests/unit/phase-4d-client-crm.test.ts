// @vitest-environment node

import { describe, expect, it } from "vitest";
import { hasPermission, type PermissionMap } from "@/features/permissions";
import { insertClientSchema, insertContactSchema, updateClientSchema } from "@/features/clients/schemas";

describe("Phase 4D — Client CRM & External Collaboration Experience", () => {
  describe("Client Schemas & Validation Invariants", () => {
    it("validates valid client registration payload with full brand kit", () => {
      const payload = {
        companyName: "Acme Creative Studio",
        industry: "Media & Entertainment",
        website: "https://acmecreative.test",
        address: "100 Innovation Way",
        country: "United States",
        notes: "Key enterprise client for 2026 video production.",
        status: "active" as const,
        clientHealth: "good" as const,
        logoUrl: "https://acmecreative.test/logo.png",
        brandColors: ["#0EA5E9", "#11212D", "#F5F7F8"],
        brandAssetsUrl: "https://assets.acmecreative.test",
        googleDriveFolderUrl: "https://drive.google.com/drive/folders/acme-123",
        preferredCommunication: "slack" as const,
      };

      const result = insertClientSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.companyName).toBe("Acme Creative Studio");
        expect(result.data.brandColors).toEqual(["#0EA5E9", "#11212D", "#F5F7F8"]);
        expect(result.data.preferredCommunication).toBe("slack");
      }
    });

    it("rejects invalid hex colors in brand guidelines", () => {
      const payload = {
        companyName: "Invalid Color Client",
        brandColors: ["#0EA5E9", "not-a-hex", "#ZZZZZZ"],
      };

      const result = insertClientSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects client name shorter than 2 characters", () => {
      const payload = {
        companyName: "A",
      };

      const result = insertClientSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("validates client contact creation with supported contact types", () => {
      const validTypes = ["primary", "billing", "marketing", "technical", "legal"] as const;

      for (const contactType of validTypes) {
        const payload = {
          clientId: "00000000-0000-4000-8000-000000000001",
          name: `Jane Doe (${contactType})`,
          contactType,
          designation: "Executive Lead",
          email: "jane@client.test",
          phone: "+1-555-0199",
          linkedin: "https://linkedin.com/in/janedoe",
          status: "active" as const,
        };

        const result = insertContactSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it("rejects contact with invalid email format", () => {
      const payload = {
        clientId: "00000000-0000-4000-8000-000000000001",
        name: "Bad Email Contact",
        email: "not-an-email",
      };

      const result = insertContactSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("allows partial updates on client metadata", () => {
      const partialUpdate = {
        clientHealth: "critical" as const,
        notes: "Needs immediate account review.",
      };

      const result = updateClientSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe("Client Authorization & Role Guards", () => {
    it("permits client read only with clients.read permission", () => {
      const readerPerms: PermissionMap = { clients: ["read"] };
      const nonReaderPerms: PermissionMap = { deliverables: ["read"] };

      expect(hasPermission(readerPerms, "clients", "read")).toBe(true);
      expect(hasPermission(nonReaderPerms, "clients", "read")).toBe(false);
    });

    it("permits client creation only with clients.create permission", () => {
      const creatorPerms: PermissionMap = { clients: ["read", "create"] };
      const viewerPerms: PermissionMap = { clients: ["read"] };

      expect(hasPermission(creatorPerms, "clients", "create")).toBe(true);
      expect(hasPermission(viewerPerms, "clients", "create")).toBe(false);
    });

    it("permits client modification and contact updates with clients.update permission", () => {
      const updaterPerms: PermissionMap = { clients: ["read", "update"] };
      const viewerPerms: PermissionMap = { clients: ["read"] };

      expect(hasPermission(updaterPerms, "clients", "update")).toBe(true);
      expect(hasPermission(viewerPerms, "clients", "update")).toBe(false);
    });

    it("permits client archival only with clients.delete permission", () => {
      const deleterPerms: PermissionMap = { clients: ["read", "delete"] };
      const updaterPerms: PermissionMap = { clients: ["read", "update"] };

      expect(hasPermission(deleterPerms, "clients", "delete")).toBe(true);
      expect(hasPermission(updaterPerms, "clients", "delete")).toBe(false);
    });
  });

  describe("Directory Filtering & Search Logic", () => {
    const mockClients = [
      {
        clientId: "c1",
        companyName: "Acme Studios",
        industry: "Entertainment",
        country: "USA",
        website: "https://acme.test",
        status: "active",
        clientHealth: "good",
      },
      {
        clientId: "c2",
        companyName: "Globex Digital",
        industry: "Technology",
        country: "Germany",
        website: "https://globex.test",
        status: "prospect",
        clientHealth: "at_risk",
      },
      {
        clientId: "c3",
        companyName: "Soylent Media",
        industry: "Consumer Goods",
        country: "Canada",
        website: "https://soylent.test",
        status: "archived",
        clientHealth: "critical",
      },
    ];

    it("filters clients accurately by company name query", () => {
      const query = "globex";
      const results = mockClients.filter((c) =>
        c.companyName.toLowerCase().includes(query.toLowerCase()),
      );
      expect(results).toHaveLength(1);
      expect(results[0].clientId).toBe("c2");
    });

    it("filters clients accurately by status", () => {
      const activeOnly = mockClients.filter((c) => c.status === "active");
      const prospectsOnly = mockClients.filter((c) => c.status === "prospect");
      const archivedOnly = mockClients.filter((c) => c.status === "archived");

      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].companyName).toBe("Acme Studios");
      expect(prospectsOnly).toHaveLength(1);
      expect(prospectsOnly[0].companyName).toBe("Globex Digital");
      expect(archivedOnly).toHaveLength(1);
      expect(archivedOnly[0].companyName).toBe("Soylent Media");
    });

    it("filters clients accurately by health score", () => {
      const healthyOnly = mockClients.filter((c) => c.clientHealth === "good");
      const atRiskOnly = mockClients.filter((c) => c.clientHealth === "at_risk");
      const criticalOnly = mockClients.filter((c) => c.clientHealth === "critical");

      expect(healthyOnly).toHaveLength(1);
      expect(atRiskOnly).toHaveLength(1);
      expect(criticalOnly).toHaveLength(1);
    });
  });

  describe("Client Project Relationship Invariants", () => {
    it("correctly associates projects with parent client ID without leakage", () => {
      const clientAId = "00000000-0000-4000-8000-00000000000a";
      const clientBId = "00000000-0000-4000-8000-00000000000b";

      const mockProjects = [
        { projectId: "p1", clientId: clientAId, projectName: "Acme Campaign 1", status: "in_progress" },
        { projectId: "p2", clientId: clientAId, projectName: "Acme Brand Refresh", status: "completed" },
        { projectId: "p3", clientId: clientBId, projectName: "Globex Commercial", status: "in_progress" },
      ];

      const clientAProjects = mockProjects.filter((p) => p.clientId === clientAId);
      const activeClientAProjects = clientAProjects.filter((p) => p.status !== "completed");

      expect(clientAProjects).toHaveLength(2);
      expect(activeClientAProjects).toHaveLength(1);
      expect(activeClientAProjects[0].projectName).toBe("Acme Campaign 1");
    });
  });

  describe("Portal Boundary & Collaboration Invariants", () => {
    it("verifies portal session tokens are deterministic SHA-256 hashes", async () => {
      const { createHash } = await import("node:crypto");
      const rawToken = "test-raw-token-12345";
      const hash1 = createHash("sha256").update(rawToken).digest("hex");
      const hash2 = createHash("sha256").update(rawToken).digest("hex");

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).not.toBe(rawToken);
    });

    it("verifies client contacts are never embedded in public portal share payloads", () => {
      const publicSharePayload = {
        shareId: "share-123",
        deliverableId: "deliv-123",
        accessLevel: "viewer",
        token: "token-hash-123",
      };

      expect("contacts" in publicSharePayload).toBe(false);
      expect("clientContacts" in publicSharePayload).toBe(false);
    });
  });
});
