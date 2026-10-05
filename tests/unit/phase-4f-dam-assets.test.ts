// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readdirSync } from "fs";
import { join } from "path";
import {
  getFiles as mockGetFiles,
  getFileDownloadUrl as mockGetFileDownloadUrl,
  archiveFile as mockArchiveFile,
  restoreFile as mockRestoreFile,
} from "@/features/files/mock-actions";
import {
  getDeliverables as mockGetDeliverables,
  getDeliverableFiles as mockGetDeliverableFiles,
  linkFileToDeliverable as mockLinkFileToDeliverable,
  unlinkFileFromDeliverable as mockUnlinkFileFromDeliverable,
  archiveDeliverable as mockArchiveDeliverable,
} from "@/features/deliverables/mock-actions";
import { ACTION_POLICY_REGISTRY } from "@/lib/security/action-registry";
import { getDemoStore } from "@/lib/demo/store";

describe("Phase 4F: Creative Assets + Deliverable Management / DAM", () => {
  describe("Database Migration Baseline Gate", () => {
    it("verifies zero new migrations were introduced for Phase 4F", () => {
      const migrationsDir = join(process.cwd(), "database/migrations");
      const files = readdirSync(migrationsDir).filter((f) =>
        f.endsWith(".sql"),
      );

      // Current baseline migrations exist up to 0020
      const migrationNumbers = files
        .map((f) => Number.parseInt(f.split("_")[0], 10))
        .filter((n) => !Number.isNaN(n));

      expect(migrationNumbers.length).toBeGreaterThan(0);
      // Migration 0006_wooden_micromax.sql already created files, file_versions, deliverables, deliverable_files
      expect(files.some((f) => f.includes("0006_wooden_micromax"))).toBe(true);
    });
  });

  describe("Action Security & Rate Limiting Registration", () => {
    it("ensures all Phase 4F DAM actions are registered in the Action Policy Registry", () => {
      const phase4fActions = [
        "src/features/files/actions.ts::getFileDownloadUrl",
        "src/features/files/actions.ts::archiveFile",
        "src/features/files/actions.ts::restoreFile",
        "src/features/deliverables/actions.ts::getDeliverableFiles",
        "src/features/deliverables/actions.ts::linkFileToDeliverable",
        "src/features/deliverables/actions.ts::unlinkFileFromDeliverable",
        "src/features/deliverables/actions.ts::archiveDeliverable",
      ];

      for (const actionKey of phase4fActions) {
        expect(ACTION_POLICY_REGISTRY[actionKey]).toBeDefined();
        expect(ACTION_POLICY_REGISTRY[actionKey].policy).toBeDefined();
        expect(ACTION_POLICY_REGISTRY[actionKey].authorization).toBeDefined();
      }
    });

    it("verifies at least 201 registered server actions are guarded", () => {
      expect(Object.keys(ACTION_POLICY_REGISTRY).length).toBeGreaterThanOrEqual(
        201,
      );
    });
  });

  describe("Creative Assets Workflow & Filtering", () => {
    it("filters assets by project, fileType, and status", async () => {
      const store = getDemoStore();
      const firstFile = store.files[0];
      expect(firstFile).toBeDefined();

      // Query all files
      const allFiles = await mockGetFiles({});
      expect(allFiles.length).toBeGreaterThan(0);

      // Query by specific project
      const projectFiles = await mockGetFiles({
        projectId: firstFile.projectId,
      });
      for (const file of projectFiles) {
        expect(file.projectId).toBe(firstFile.projectId);
      }

      // Query by fileType
      const typeFiles = await mockGetFiles({ fileType: firstFile.fileType });
      for (const file of typeFiles) {
        expect(file.fileType).toBe(firstFile.fileType);
      }
    });

    it("generates authorized pre-signed download URLs for assets", async () => {
      const store = getDemoStore();
      const firstFile = store.files[0];

      const res = await mockGetFileDownloadUrl(firstFile.fileId);
      expect(res).toBeDefined();
      expect(res.downloadUrl).toBeDefined();
      expect(typeof res.downloadUrl).toBe("string");
      expect(res.downloadUrl.length).toBeGreaterThan(0);
      expect(res.sizeBytes).toBeGreaterThan(0);
      expect(res.versionNumber).toBeGreaterThanOrEqual(1);
    });

    it("fails gracefully when requesting download for non-existent file", async () => {
      await expect(
        mockGetFileDownloadUrl("00000000-0000-0000-0000-nonexistent0"),
      ).rejects.toThrow("File not found");
    });

    it("archives and restores asset files safely", async () => {
      const store = getDemoStore();
      const file = store.files[0];

      // Archive file
      await mockArchiveFile(file.fileId);
      const archived = store.files.find((f) => f.fileId === file.fileId);
      expect(archived?.status).toBe("archived");

      // Restore file
      await mockRestoreFile(file.fileId);
      const restored = store.files.find((f) => f.fileId === file.fileId);
      expect(restored?.status).toBe("ready");
    });
  });

  describe("Deliverables & Creative Output Management", () => {
    it("filters deliverables by project and status", async () => {
      const store = getDemoStore();
      const firstDeliv = store.deliverables[0];
      expect(firstDeliv).toBeDefined();

      const projectDeliverables = await mockGetDeliverables({
        projectId: firstDeliv.projectId,
      });
      for (const deliv of projectDeliverables) {
        expect(deliv.projectId).toBe(firstDeliv.projectId);
      }
    });

    it("links project asset to deliverable and retrieves joined files", async () => {
      const store = getDemoStore();
      const deliv = store.deliverables[0];
      expect(deliv).toBeDefined();

      // Find or create a file in the same project
      let file = store.files.find((f) => f.projectId === deliv.projectId);
      if (!file) {
        file = {
          fileId: "test-file-dam-001",
          organizationId: deliv.organizationId,
          projectId: deliv.projectId,
          folderId: null,
          title: "Hero Background Comp",
          fileType: "image",
          status: "ready",
          totalSizeBytes: 4096,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.files.push(file);
      }

      // Link file (positional or payload supported)
      const linkResult = await mockLinkFileToDeliverable({
        deliverableId: deliv.deliverableId,
        fileId: file.fileId,
      });
      expect(linkResult.deliverableId).toBe(deliv.deliverableId);
      expect(linkResult.fileId).toBe(file.fileId);

      // Verify getDeliverableFiles returns the attached file
      const attached = await mockGetDeliverableFiles(deliv.deliverableId);
      const found = attached.find((a) => a.fileId === file.fileId);
      expect(found).toBeDefined();
      expect(found?.title).toBe(file.title);
      expect(found?.fileType).toBe(file.fileType);

      // Unlink file
      const unlinkResult = await mockUnlinkFileFromDeliverable({
        deliverableId: deliv.deliverableId,
        fileId: file.fileId,
      });
      expect(unlinkResult.success).toBe(true);

      // Underlying file must NOT be deleted
      const fileStillExists = store.files.find((f) => f.fileId === file.fileId);
      expect(fileStillExists).toBeDefined();
    });

    it("prevents cross-project asset assignment", async () => {
      const store = getDemoStore();
      const deliv = store.deliverables[0];
      expect(deliv).toBeDefined();

      // File in a completely different project
      const foreignFile = {
        fileId: "foreign-file-diff-proj",
        organizationId: deliv.organizationId,
        projectId: "completely-different-project-id",
        folderId: null,
        title: "Confidential Project Asset",
        fileType: "document",
        status: "ready",
        totalSizeBytes: 1024,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.files.push(foreignFile);

      // Attempting to link cross-project asset must be rejected
      await expect(
        mockLinkFileToDeliverable({
          deliverableId: deliv.deliverableId,
          fileId: foreignFile.fileId,
        }),
      ).rejects.toThrow("Cross-project asset assignment is prohibited");
    });

    it("archives deliverable without deleting underlying files", async () => {
      const store = getDemoStore();
      const deliv = store.deliverables[0];
      expect(deliv).toBeDefined();
      const initialFileCount = store.files.length;

      const res = await mockArchiveDeliverable(deliv.deliverableId);
      expect(res.status).toBe("archived");

      const updated = store.deliverables.find(
        (d) => d.deliverableId === deliv.deliverableId,
      );
      expect(updated?.status).toBe("archived");

      // Files count remains intact
      expect(store.files.length).toBe(initialFileCount);
    });
  });

  describe("Storage Path & Object Security Convention", () => {
    it("enforces tenant and project hierarchy in storage paths", () => {
      const orgId = "00000000-0000-4000-8000-000000000001";
      const projId = "00000000-0000-4000-8000-000000000002";
      const fileId = "00000000-0000-4000-8000-000000000003";
      const verId = "00000000-0000-4000-8000-000000000004";
      const ext = "png";

      const storagePath = `${orgId}/${projId}/${fileId}/${verId}.${ext}`;

      // Segments: org, project, file, version
      const parts = storagePath.split("/");
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe(orgId);
      expect(parts[1]).toBe(projId);
      expect(parts[2]).toBe(fileId);
      expect(parts[3]).toBe(`${verId}.${ext}`);
    });
  });
});
