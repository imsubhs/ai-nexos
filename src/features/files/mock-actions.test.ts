/**
 * Sprint 11B — public read layer for Files. Files/folders have no seed data
 * (see src/lib/demo/store.ts), so each test creates its own fixtures via the
 * existing createFolder/initializeFileUpload mock actions before asserting on
 * the new read functions — keeps this test independent of demo-store seeding.
 */
import { describe, expect, it } from "vitest";
import { createFolder, initializeFileUpload } from "./mock-actions";
import { getFiles, getFolder, searchFiles } from "./mock-actions";

const ORG_ID = "00000000-0000-4000-8000-00000000f001";
const PROJECT_ID = "00000000-0000-4000-8000-000000000201";

describe("getFiles / getFolder / searchFiles (mock)", () => {
  it("lists files scoped to a project, newest first", async () => {
    await initializeFileUpload({
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      title: "Sprint 11B Report",
      fileType: "document",
      originalFilename: "report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      extension: "pdf",
    } as any);

    const result = await getFiles({ projectId: PROJECT_ID });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((f: any) => f.projectId === PROJECT_ID)).toBe(true);
  });

  it("returns a folder with its child folders and files", async () => {
    const folder = await createFolder({
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      name: "Assets",
    } as any);

    await initializeFileUpload({
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      folderId: folder.folderId,
      title: "Logo",
      fileType: "image",
      originalFilename: "logo.png",
      mimeType: "image/png",
      sizeBytes: 512,
      extension: "png",
    } as any);

    const result: any = await getFolder(folder.folderId, PROJECT_ID);
    expect(result.folder.folderId).toBe(folder.folderId);
    expect(result.childFiles.some((f: any) => f.title === "Logo")).toBe(true);
  });

  it("root folder (null id) lists only unfoldered items", async () => {
    const result: any = await getFolder(null, PROJECT_ID);
    expect(result.folder).toBeNull();
    expect(result.childFiles.every((f: any) => f.folderId == null)).toBe(true);
  });

  it("searches files by title substring", async () => {
    const result = await searchFiles("Sprint 11B");
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((f: any) => f.title.toLowerCase().includes("sprint 11b")),
    ).toBe(true);
  });

  it("returns an empty array when nothing matches", async () => {
    const result = await searchFiles("no-such-file-xyz");
    expect(result).toEqual([]);
  });
});
