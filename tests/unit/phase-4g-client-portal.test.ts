import { describe, expect, it, beforeEach } from "vitest";
import { getDemoStore, resetDemoStore, DEMO_ORG_ID } from "@/lib/demo/store";
import {
  getPortalReviewData,
  submitPortalApproval,
  submitPortalChangeRequest,
  submitPortalComment,
  getPortalFileDownloadUrl,
} from "@/features/deliverables/mock-actions";

describe("Phase 4G: Client Portal & Approval Chains", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  const setupTestShare = (options?: {
    accessLevel?: "approver" | "full_access" | "comment_only" | "view_only";
    isExpired?: boolean;
    isArchived?: boolean;
  }) => {
    const store = getDemoStore();

    // Project
    const projectId = "proj-portal-test";
    store.projects.push({
      projectId,
      organizationId: DEMO_ORG_ID,
      clientId: "client-test",
      name: "Alpha Global Rebrand",
      code: "AGR-2026",
      status: "active" as any,
      priority: "high" as any,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user-1",
      updatedBy: "user-1",
      deletedAt: null,
      deletedBy: null,
      description: "Comprehensive brand identity overhaul",
      color: "#0EA5E9",
      tags: [],
    });

    // Deliverable
    const deliverableId = "deliv-portal-test";
    const rev1Id = "rev-portal-1";
    store.deliverables.push({
      deliverableId,
      organizationId: DEMO_ORG_ID,
      projectId,
      clientId: "client-test",
      taskId: null,
      title: "Hero Brand Guidelines",
      description: "Primary visual guidelines, typography, and logo system",
      type: "brand_identity" as any,
      status: "in_review" as any,
      currentRevisionId: rev1Id,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user-1",
      updatedBy: "user-1",
      deletedAt: null,
      deletedBy: null,
      isArchived: false,
      isLocked: false,
      version: 1,
      aiMetadata: null,
    });

    // Revision 1
    store.deliverableRevisions.push({
      revisionId: rev1Id,
      organizationId: DEMO_ORG_ID,
      projectId,
      deliverableId,
      versionNumber: 1,
      requestedBy: "user-1",
      reason: "Initial client delivery",
      status: "in_review" as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user-1",
      updatedBy: "user-1",
      deletedAt: null,
      deletedBy: null,
      isArchived: false,
      version: 1,
      clientRequesterName: null,
      comparisonMetadata: null,
    });

    // File
    const fileId = "file-portal-test";
    store.files.push({
      fileId,
      organizationId: DEMO_ORG_ID,
      projectId,
      folderId: null,
      title: "brand-identity-v1.pdf",
      fileType: "document" as any,
      status: "ready" as any,
      totalSizeBytes: 5242880, // 5MB
      currentVersionId: "ver-1",
      isArchived: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user-1",
      updatedBy: "user-1",
      tags: ["guidelines"],
      description: "Official PDF deliverable",
    });

    // Link file to deliverable revision 1
    store.deliverableFiles = store.deliverableFiles || [];
    store.deliverableFiles.push({
      mappingId: "df-1",
      organizationId: DEMO_ORG_ID,
      projectId,
      deliverableId,
      revisionId: rev1Id,
      fileId,
      orderIndex: 0,
      createdAt: new Date(),
    });

    // Share link
    const token = "portal-token-valid-abc123xyz";
    const expiresAt = options?.isExpired
      ? new Date(Date.now() - 3600000) // 1 hr ago
      : new Date(Date.now() + 86400000); // 24 hrs from now

    store.deliverableShareLinks = store.deliverableShareLinks || [];
    store.deliverableShareLinks.push({
      shareId: "share-test-1",
      organizationId: DEMO_ORG_ID,
      projectId,
      deliverableId,
      revisionId: rev1Id,
      token,
      accessLevel: options?.accessLevel ?? "approver",
      isWatermarkEnabled: false,
      sentViaEmail: true,
      emailRecipient: "client@alphacorp.com",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user-1",
      updatedBy: "user-1",
      deletedAt: null,
      deletedBy: null,
      isArchived: options?.isArchived ?? false,
      version: 1,
      expiresAt,
    });

    // Add 1 client comment and 1 internal comment
    store.deliverableReviewComments = store.deliverableReviewComments || [];
    store.deliverableReviewComments.push({
      commentId: "comm-client-1",
      organizationId: DEMO_ORG_ID,
      projectId,
      clientAuthorName: "Sarah Client",
      content: { text: "Looks great, please verify logo contrast on dark surfaces." },
      isInternalOnly: false,
      createdAt: new Date(),
    });
    store.deliverableReviewComments.push({
      commentId: "comm-internal-1",
      organizationId: DEMO_ORG_ID,
      projectId,
      clientAuthorName: "Internal Lead",
      content: { text: "INTERNAL NOTE: Designer salary allocation $4,500." },
      isInternalOnly: true,
      createdAt: new Date(),
    });

    return { projectId, deliverableId, rev1Id, fileId, token };
  };

  describe("Portal Token Resolution & Projection", () => {
    it("resolves a valid portal token to a safe client-facing DTO", async () => {
      const { token, deliverableId, projectId, fileId } = setupTestShare();

      const result = await getPortalReviewData(token);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();

      const dto = result.data!;
      expect(dto.deliverable.deliverableId).toBe(deliverableId);
      expect(dto.deliverable.title).toBe("Hero Brand Guidelines");
      expect(dto.project.projectId).toBe(projectId);
      expect(dto.project.name).toBe("Alpha Global Rebrand");
      expect(dto.deliverable.currentRevision.versionNumber).toBe(1);
      expect(dto.deliverable.files.length).toBe(1);
      expect(dto.deliverable.files[0].fileId).toBe(fileId);
      expect(dto.reviewStatus.canApprove).toBe(true);
      expect(dto.reviewStatus.canRequestChanges).toBe(true);
    });

    it("strictly isolates internal comments and internal fields from external client projection", async () => {
      const { token } = setupTestShare();

      const result = await getPortalReviewData(token);
      expect(result.valid).toBe(true);
      const dto = result.data!;

      // Verify only client comments are exposed
      expect(dto.comments.length).toBe(1);
      expect(dto.comments[0].content).toContain("logo contrast on dark surfaces");

      // Verify internal comment is completely excluded
      const leakedInternal = dto.comments.some((c) =>
        c.content.includes("Designer salary allocation"),
      );
      expect(leakedInternal).toBe(false);

      // Verify sensitive internal fields are NOT on the DTO
      expect((dto as any).organizationId).toBeUndefined();
      expect((dto as any).internalNotes).toBeUndefined();
      expect((dto as any).salaries).toBeUndefined();
    });

    it("rejects an empty, invalid, or malformed token", async () => {
      expect((await getPortalReviewData("")).valid).toBe(false);
      expect((await getPortalReviewData("   ")).valid).toBe(false);
      expect((await getPortalReviewData("non-existent-token")).valid).toBe(false);
    });

    it("rejects an expired portal token", async () => {
      const { token } = setupTestShare({ isExpired: true });
      const result = await getPortalReviewData(token);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });

    it("rejects an archived/revoked portal token", async () => {
      const { token } = setupTestShare({ isArchived: true });
      const result = await getPortalReviewData(token);
      expect(result.valid).toBe(false);
    });
  });

  describe("External Client Approval Workflow", () => {
    it("successfully approves a valid deliverable revision and locks deliverable", async () => {
      const { token, deliverableId, rev1Id } = setupTestShare();

      const approvalResult = await submitPortalApproval({
        token,
        deliverableId,
        revisionId: rev1Id,
        reviewerName: "Elena Vance",
        reviewerEmail: "elena@alphacorp.com",
        notes: "Approved for global roll-out.",
      });

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.approvalId).toBeDefined();

      const store = getDemoStore();
      const deliverable = store.deliverables.find((d) => d.deliverableId === deliverableId);
      expect(deliverable?.status).toBe("approved");
      expect(deliverable?.isLocked).toBe(true);

      const approvalRecord = store.deliverableApprovals.find(
        (a) => a.approvalId === approvalResult.approvalId,
      );
      expect(approvalRecord?.status).toBe("approved");
      expect(approvalRecord?.clientApproverSignature).toBe("Elena Vance");
      expect(approvalRecord?.clientApproverEmail).toBe("elena@alphacorp.com");
    });

    it("rejects duplicate approval on an already approved/locked deliverable", async () => {
      const { token, deliverableId, rev1Id } = setupTestShare();

      await submitPortalApproval({
        token,
        deliverableId,
        revisionId: rev1Id,
        reviewerName: "Elena Vance",
        reviewerEmail: "elena@alphacorp.com",
      });

      // Second approval attempt should throw
      await expect(
        submitPortalApproval({
          token,
          deliverableId,
          revisionId: rev1Id,
          reviewerName: "Gordon Freeman",
          reviewerEmail: "gordon@alphacorp.com",
        }),
      ).rejects.toThrow("already been approved");
    });

    it("protects against stale revision approval when deliverable has a newer revision", async () => {
      const { token, deliverableId, rev1Id } = setupTestShare();
      const store = getDemoStore();

      // Team publishes revision 2 internally
      const rev2Id = "rev-portal-2";
      store.deliverableRevisions.push({
        revisionId: rev2Id,
        organizationId: DEMO_ORG_ID,
        projectId: "proj-portal-test",
        deliverableId,
        versionNumber: 2,
        requestedBy: "user-1",
        reason: "Updated color balance",
        status: "draft" as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        updatedBy: "user-1",
        deletedAt: null,
        deletedBy: null,
        isArchived: false,
        version: 1,
        clientRequesterName: null,
        comparisonMetadata: null,
      });

      const deliv = store.deliverables.find((d) => d.deliverableId === deliverableId);
      deliv!.currentRevisionId = rev2Id;

      // Client attempts to approve Revision 1
      await expect(
        submitPortalApproval({
          token,
          deliverableId,
          revisionId: rev1Id,
          reviewerName: "Elena Vance",
          reviewerEmail: "elena@alphacorp.com",
        }),
      ).rejects.toThrow("updated with a newer revision");
    });

    it("rejects approval if share link has view_only or comment_only access level", async () => {
      const { token, deliverableId, rev1Id } = setupTestShare({
        accessLevel: "view_only",
      });

      await expect(
        submitPortalApproval({
          token,
          deliverableId,
          revisionId: rev1Id,
          reviewerName: "Elena Vance",
          reviewerEmail: "elena@alphacorp.com",
        }),
      ).rejects.toThrow("do not have approval permissions");
    });
  });

  describe("External Client Change Request Workflow", () => {
    it("initiates next revision, unlocks deliverable, and carries forward attached files", async () => {
      const { token, deliverableId, rev1Id, fileId } = setupTestShare();

      const changeResult = await submitPortalChangeRequest({
        token,
        deliverableId,
        revisionId: rev1Id,
        reviewerName: "Sarah Connor",
        reviewerEmail: "sarah@alphacorp.com",
        notes: "Please increase header typography size and contrast.",
      });

      expect(changeResult.success).toBe(true);
      expect(changeResult.nextVersionNumber).toBe(2);

      const store = getDemoStore();
      const deliverable = store.deliverables.find((d) => d.deliverableId === deliverableId);
      expect(deliverable?.status).toBe("revision_requested");
      expect(deliverable?.isLocked).toBe(false);

      // Verify Revision 2 was created
      const rev2 = store.deliverableRevisions.find(
        (r) => r.deliverableId === deliverableId && r.versionNumber === 2,
      );
      expect(rev2).toBeDefined();
      expect(rev2?.clientRequesterName).toBe("Sarah Connor");
      expect(rev2?.reason).toContain("increase header typography");
      expect(deliverable?.currentRevisionId).toBe(rev2?.revisionId);

      // Verify file was carried forward to Revision 2
      const carriedFiles = store.deliverableFiles.filter(
        (df) => df.revisionId === rev2?.revisionId && df.fileId === fileId,
      );
      expect(carriedFiles.length).toBe(1);

      // Verify approval record was created with 'rejected' status
      const lastApproval = store.deliverableApprovals[store.deliverableApprovals.length - 1];
      expect(lastApproval.status).toBe("rejected");
      expect(lastApproval.notes).toContain("increase header typography");
    });

    it("rejects empty change request notes", async () => {
      const { token, deliverableId, rev1Id } = setupTestShare();

      await expect(
        submitPortalChangeRequest({
          token,
          deliverableId,
          revisionId: rev1Id,
          reviewerName: "Sarah Connor",
          reviewerEmail: "sarah@alphacorp.com",
          notes: "   ",
        }),
      ).rejects.toThrow("Please provide notes");
    });

    it("rejects change request from an outdated revision (stale protection)", async () => {
      const { token, deliverableId, rev1Id } = setupTestShare();
      const store = getDemoStore();

      // Advance deliverable to revision 2
      const rev2Id = "rev-portal-2";
      store.deliverableRevisions.push({
        revisionId: rev2Id,
        organizationId: DEMO_ORG_ID,
        projectId: "proj-portal-test",
        deliverableId,
        versionNumber: 2,
        requestedBy: "user-1",
        reason: "Internal polish",
        status: "draft" as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        updatedBy: "user-1",
        deletedAt: null,
        deletedBy: null,
        isArchived: false,
        version: 1,
        clientRequesterName: null,
        comparisonMetadata: null,
      });

      const deliv = store.deliverables.find((d) => d.deliverableId === deliverableId);
      deliv!.currentRevisionId = rev2Id;

      await expect(
        submitPortalChangeRequest({
          token,
          deliverableId,
          revisionId: rev1Id,
          reviewerName: "Sarah Connor",
          reviewerEmail: "sarah@alphacorp.com",
          notes: "Outdated review feedback",
        }),
      ).rejects.toThrow("updated with a newer revision");
    });
  });

  describe("Portal Comments & Client Feedback", () => {
    it("allows client reviewer to post public comments", async () => {
      const { token, deliverableId } = setupTestShare();

      const result = await submitPortalComment({
        token,
        deliverableId,
        reviewerName: "Marcus Wright",
        content: "Question about font licensing for social media.",
      });

      expect(result.success).toBe(true);

      const store = getDemoStore();
      const lastComment = store.deliverableReviewComments.find(
        (c) => c.commentId === result.commentId,
      );
      expect(lastComment?.clientAuthorName).toBe("Marcus Wright");
      expect(lastComment?.isInternalOnly).toBe(false);
      expect((lastComment?.content as any).text).toContain("font licensing");
    });

    it("rejects empty comments", async () => {
      const { token, deliverableId } = setupTestShare();

      await expect(
        submitPortalComment({
          token,
          deliverableId,
          reviewerName: "Marcus Wright",
          content: "   ",
        }),
      ).rejects.toThrow("cannot be empty");
    });
  });

  describe("Secure File Download Authorization", () => {
    it("allows authorized download of file attached to the shared deliverable", async () => {
      const { token, fileId } = setupTestShare();

      const res = await getPortalFileDownloadUrl({
        token,
        fileId,
      });

      expect(res.downloadUrl).toBeDefined();
      expect(res.downloadUrl).toContain(fileId);
      expect(res.filename).toBe("brand-identity-v1.pdf");
    });

    it("rejects download of an unattached / unauthorized file", async () => {
      const { token } = setupTestShare();
      const store = getDemoStore();

      // Another file exists in the org, but is NOT linked to this deliverable
      const secretFileId = "file-secret-financials";
      store.files.push({
        fileId: secretFileId,
        organizationId: DEMO_ORG_ID,
        projectId: "proj-portal-test",
        folderId: null,
        title: "q4-financial-breakdown.xlsx",
        fileType: "document" as any,
        status: "ready" as any,
        totalSizeBytes: 10240,
        currentVersionId: "ver-secret",
        isArchived: false,
        deletedAt: null,
        deletedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        updatedBy: "user-1",
        tags: ["finance"],
      });

      await expect(
        getPortalFileDownloadUrl({
          token,
          fileId: secretFileId,
        }),
      ).rejects.toThrow("File not found in this shared deliverable");
    });

    it("rejects download when using an invalid token", async () => {
      const { fileId } = setupTestShare();

      await expect(
        getPortalFileDownloadUrl({
          token: "invalid-token",
          fileId,
        }),
      ).rejects.toThrow("Invalid or expired review link");
    });
  });
});
