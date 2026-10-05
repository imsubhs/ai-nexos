"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  FileText,
  FileImage,
  FileVideo,
  File as FileIcon,
  MessageSquare,
  Send,
  ShieldCheck,
  History,
  Lock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { PortalReviewDto } from "../real-actions";
import {
  submitPortalApproval,
  submitPortalChangeRequest,
  submitPortalComment,
  getPortalFileDownloadUrl,
} from "../actions";

interface PortalReviewWorkspaceProps {
  initialData: PortalReviewDto;
}

export function PortalReviewWorkspace({
  initialData,
}: PortalReviewWorkspaceProps) {
  const [data, setData] = useState<PortalReviewDto>(initialData);

  // Modals state
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false);

  // Form states for approval
  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Form states for change request
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [changeNotes, setChangeNotes] = useState("");
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);

  // Comment state
  const [commentAuthor, setCommentAuthor] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // File download state
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      setDownloadingFileId(fileId);
      const res = await getPortalFileDownloadUrl({
        token: data.token,
        fileId,
      });
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
        toast.success(`Download started for ${filename}`);
      } else {
        toast.error("Download URL could not be generated.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approverName.trim() || !approverEmail.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    if (!approvalConfirmed) {
      toast.error("Please confirm acceptance of this deliverable.");
      return;
    }

    try {
      setIsApproving(true);
      await submitPortalApproval({
        token: data.token,
        deliverableId: data.deliverable.deliverableId,
        revisionId: data.deliverable.currentRevision.revisionId,
        reviewerName: approverName.trim(),
        reviewerEmail: approverEmail.trim(),
        notes: approvalNotes.trim() || undefined,
      });

      toast.success("Deliverable successfully approved!");
      setIsApproveOpen(false);

      // Optimistically update status
      setData((prev) => ({
        ...prev,
        deliverable: {
          ...prev.deliverable,
          status: "approved",
          isLocked: true,
        },
        reviewStatus: {
          ...prev.reviewStatus,
          currentStatus: "approved",
          canApprove: false,
          canRequestChanges: false,
          approvedAt: new Date().toISOString(),
          approvedBy: approverName.trim(),
          notes: approvalNotes.trim() || null,
        },
        approvalHistory: [
          {
            approvalId: "new-" + Date.now(),
            status: "approved",
            approverName: approverName.trim(),
            approverEmail: approverEmail.trim(),
            notes: approvalNotes.trim() || null,
            createdAt: new Date().toISOString(),
          },
          ...prev.approvalHistory,
        ],
      }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit approval.",
      );
    } finally {
      setIsApproving(false);
    }
  };

  const handleChangeRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim() || !requesterEmail.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }
    if (!changeNotes.trim()) {
      toast.error("Please specify the requested changes.");
      return;
    }

    try {
      setIsRequestingChanges(true);
      const res = await submitPortalChangeRequest({
        token: data.token,
        deliverableId: data.deliverable.deliverableId,
        revisionId: data.deliverable.currentRevision.revisionId,
        reviewerName: requesterName.trim(),
        reviewerEmail: requesterEmail.trim(),
        notes: changeNotes.trim(),
      });

      toast.success("Revision request submitted!");
      setIsChangeRequestOpen(false);

      const nextVersion =
        res.nextVersionNumber ||
        data.deliverable.currentRevision.versionNumber + 1;

      // Optimistically update status
      setData((prev) => ({
        ...prev,
        deliverable: {
          ...prev.deliverable,
          status: "revision_requested",
          isLocked: false,
          currentRevision: {
            ...prev.deliverable.currentRevision,
            versionNumber: nextVersion,
            reason: changeNotes.trim(),
            status: "draft",
            createdAt: new Date().toISOString(),
          },
        },
        reviewStatus: {
          ...prev.reviewStatus,
          currentStatus: "changes_requested",
        },
        approvalHistory: [
          {
            approvalId: "new-" + Date.now(),
            status: "rejected",
            approverName: requesterName.trim(),
            approverEmail: requesterEmail.trim(),
            notes: changeNotes.trim(),
            createdAt: new Date().toISOString(),
          },
          ...prev.approvalHistory,
        ],
        comments: [
          {
            commentId: "c-" + Date.now(),
            authorName: requesterName.trim(),
            content: `[Changes Requested] ${changeNotes.trim()}`,
            createdAt: new Date().toISOString(),
          },
          ...prev.comments,
        ],
      }));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to submit revision request.",
      );
    } finally {
      setIsRequestingChanges(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      setIsSubmittingComment(true);
      const author = commentAuthor.trim() || "Client Reviewer";
      const res = await submitPortalComment({
        token: data.token,
        deliverableId: data.deliverable.deliverableId,
        reviewerName: author,
        content: commentContent.trim(),
      });

      toast.success("Feedback posted");
      setCommentContent("");

      setData((prev) => ({
        ...prev,
        comments: [
          {
            commentId: res.commentId || "c-" + Date.now(),
            authorName: author,
            content: commentContent.trim(),
            createdAt: new Date().toISOString(),
          },
          ...prev.comments,
        ],
      }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to post feedback.",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return <FileImage className="size-5 text-[#FFFFFF]" />;
      case "video":
        return <FileVideo className="size-5 text-[#D6D6D6]" />;
      case "document":
      default:
        return <FileText className="size-5 text-[#898A8C]" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#06151E] text-[#FFFFFF] selection:bg-[#FFFFFF]/30">
      <a href="#portal-review-main" className="skip-link">
        Skip to review content
      </a>
      {/* Top Client Header */}
      <header className="sticky top-0 z-30 border-b border-[#545A5B] bg-[#06151E]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#FFFFFF] font-bold text-[#06151E] shadow-sm">
              NX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-[#FFFFFF]">
                  AI NEX OS
                </span>
                <span className="text-xs text-[#898A8C]">•</span>
                <span className="text-xs font-medium text-[#D6D6D6]">
                  Client Review Portal
                </span>
              </div>
              <p className="text-xs text-[#898A8C]">
                {data.project.name}{" "}
                {data.project.code ? `(${data.project.code})` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-[#545A5B] bg-[#06151E] text-xs font-medium text-[#D6D6D6]"
            >
              <ShieldCheck className="mr-1 size-3.5 text-[#D6D6D6]" />
              {data.accessLevel === "approver"
                ? "Full Approval Access"
                : data.accessLevel === "full_access"
                  ? "Collaborative Access"
                  : data.accessLevel === "comment_only"
                    ? "Comment Access"
                    : "View Only"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Review Banner */}
      <div className="border-b border-[#545A5B] bg-[#06151E]/60 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            {data.reviewStatus.currentStatus === "approved" ? (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
            ) : data.reviewStatus.currentStatus === "changes_requested" ? (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <AlertCircle className="size-6" />
              </div>
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#545A5B]/30 text-[#D6D6D6]">
                <Clock className="size-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#FFFFFF]">
                  {data.deliverable.title}
                </h1>
                <Badge
                  className={
                    data.reviewStatus.currentStatus === "approved"
                      ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                      : data.reviewStatus.currentStatus === "changes_requested"
                        ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                        : "border-[#545A5B] bg-[#545A5B]/30 text-[#D6D6D6]"
                  }
                >
                  {data.reviewStatus.currentStatus === "approved"
                    ? "Approved"
                    : data.reviewStatus.currentStatus === "changes_requested"
                      ? "Changes Requested"
                      : "Pending Review"}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-[#545A5B] bg-[#06151E] text-xs text-[#D6D6D6]"
                >
                  <Layers className="mr-1 size-3 text-[#D6D6D6]" />
                  Revision {data.deliverable.currentRevision.versionNumber}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[#898A8C]">
                {data.reviewStatus.currentStatus === "approved"
                  ? `Approved on ${new Date(data.reviewStatus.approvedAt || "").toLocaleDateString()} by ${data.reviewStatus.approvedBy || "Client Reviewer"}`
                  : data.reviewStatus.currentStatus === "changes_requested"
                    ? "Feedback submitted to creative team. Next revision in progress."
                    : "Please review the assets below and submit your feedback or approval."}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {data.reviewStatus.canApprove && (
              <Button
                id="portal-approve-btn"
                onClick={() => setIsApproveOpen(true)}
                className="bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-500"
              >
                <CheckCircle2 className="mr-1.5 size-4" />
                Approve Deliverable
              </Button>
            )}
            {data.reviewStatus.canRequestChanges && (
              <Button
                id="portal-request-changes-btn"
                variant="outline"
                onClick={() => setIsChangeRequestOpen(true)}
                className="border-[#545A5B] bg-[#06151E] text-[#D6D6D6] hover:bg-[#545A5B] hover:text-white"
              >
                <AlertCircle className="mr-1.5 size-4 text-amber-400" />
                Request Changes
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Review Workspace */}
      <main
        id="portal-review-main"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 outline-none sm:px-6"
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Creative Assets & Revision Details */}
          <div className="space-y-6 lg:col-span-2">
            {/* Deliverable Overview Card */}
            <Card className="border-[#545A5B] bg-[#06151E] text-[#FFFFFF]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#FFFFFF]">
                  Deliverable Scope & Brief
                </CardTitle>
                <CardDescription className="text-xs text-[#898A8C]">
                  Type: {data.deliverable.type.toUpperCase()} • Revision{" "}
                  {data.deliverable.currentRevision.versionNumber}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[#D6D6D6]">
                  {data.deliverable.description ||
                    "No specific client brief provided."}
                </p>
                {data.deliverable.currentRevision.reason && (
                  <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold text-amber-300">
                      Revision {data.deliverable.currentRevision.versionNumber}{" "}
                      Focus:
                    </p>
                    <p className="mt-0.5 text-xs text-amber-200/90">
                      {data.deliverable.currentRevision.reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attached Creative Assets Card */}
            <Card className="border-[#545A5B] bg-[#06151E] text-[#FFFFFF]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-[#FFFFFF]">
                      Creative Assets ({data.deliverable.files.length})
                    </CardTitle>
                    <CardDescription className="text-xs text-[#898A8C]">
                      Assets linked to Revision{" "}
                      {data.deliverable.currentRevision.versionNumber} for
                      client evaluation
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.deliverable.files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#545A5B] p-8 text-center">
                    <FileIcon className="size-8 text-[#898A8C]" />
                    <p className="mt-2 text-sm font-medium text-[#898A8C]">
                      No files attached to this revision
                    </p>
                    <p className="text-xs text-[#898A8C]">
                      Assets will appear here once uploaded by the creative
                      team.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.deliverable.files.map((file) => (
                      <div
                        key={file.fileId}
                        className="group flex flex-col justify-between rounded-lg border border-[#545A5B] bg-[#06151E]/80 p-4 transition-colors hover:border-[#D6D6D6]/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#545A5B] bg-[#06151E]">
                            {getFileIcon(file.fileType)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-sm font-medium text-[#FFFFFF]"
                              title={file.title}
                            >
                              {file.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-[#545A5B] bg-[#06151E] px-1.5 py-0 text-[10px] text-[#D6D6D6] uppercase"
                              >
                                {file.fileType}
                              </Badge>
                              <span className="text-[11px] text-[#898A8C]">
                                {formatFileSize(file.totalSizeBytes)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end border-t border-[#545A5B]/60 pt-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleDownload(file.fileId, file.title)
                            }
                            disabled={downloadingFileId === file.fileId}
                            aria-label={`Download ${file.title} (${file.fileType}, ${formatFileSize(file.totalSizeBytes)})`}
                            className="h-8 gap-1.5 text-xs text-[#D6D6D6] hover:bg-[#545A5B]/30 hover:text-white"
                          >
                            <Download className="size-3.5" aria-hidden="true" />
                            {downloadingFileId === file.fileId
                              ? "Generating..."
                              : "Download"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval History & Audit Trail */}
            <Card className="border-[#545A5B] bg-[#06151E] text-[#FFFFFF]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#FFFFFF]">
                  <History className="size-4 text-[#D6D6D6]" />
                  Approval Chain & Audit Trail ({data.approvalHistory.length})
                </CardTitle>
                <CardDescription className="text-xs text-[#898A8C]">
                  Recorded client signatures and revision milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.approvalHistory.length === 0 ? (
                  <p className="text-xs text-[#898A8C]">
                    No approval actions recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.approvalHistory.map((item) => (
                      <div
                        key={item.approvalId}
                        className="flex flex-col gap-1 rounded-lg border border-[#545A5B] bg-[#06151E]/40 p-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {item.status === "approved" ? (
                              <Badge className="border-emerald-500/30 bg-emerald-500/20 text-[10px] text-emerald-300">
                                Approved
                              </Badge>
                            ) : (
                              <Badge className="border-amber-500/30 bg-amber-500/20 text-[10px] text-amber-300">
                                Changes Requested
                              </Badge>
                            )}
                            <span className="font-medium text-[#FFFFFF]">
                              {item.approverName || "Reviewer"}
                            </span>
                            {item.approverEmail && (
                              <span className="text-[#898A8C]">
                                &lt;{item.approverEmail}&gt;
                              </span>
                            )}
                          </div>
                          <span className="text-[#898A8C]">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="mt-1 text-xs text-[#D6D6D6]">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Approval Action Center & Comments */}
          <div className="space-y-6">
            {/* Primary Action Card */}
            <Card className="border-[#545A5B] bg-[#06151E] text-[#FFFFFF] shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#FFFFFF]">
                  Review Action Center
                </CardTitle>
                <CardDescription className="text-xs text-[#898A8C]">
                  Official client decision on Revision{" "}
                  {data.deliverable.currentRevision.versionNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.deliverable.isLocked ||
                data.reviewStatus.currentStatus === "approved" ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                    <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <Lock className="size-5" />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-emerald-300">
                      Deliverable Approved & Locked
                    </p>
                    <p className="mt-1 text-xs text-[#D6D6D6]">
                      This revision has been approved by{" "}
                      <span className="font-medium text-white">
                        {data.reviewStatus.approvedBy || "Client Reviewer"}
                      </span>
                      . Production assets are frozen.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.reviewStatus.canApprove && (
                      <Button
                        id="portal-approve-card-btn"
                        onClick={() => setIsApproveOpen(true)}
                        className="w-full bg-emerald-600 font-semibold text-white hover:bg-emerald-500"
                      >
                        <CheckCircle2 className="mr-2 size-4" />
                        Approve Revision{" "}
                        {data.deliverable.currentRevision.versionNumber}
                      </Button>
                    )}
                    {data.reviewStatus.canRequestChanges && (
                      <Button
                        id="portal-changes-card-btn"
                        variant="outline"
                        onClick={() => setIsChangeRequestOpen(true)}
                        className="w-full border-[#545A5B] bg-[#545A5B] text-[#D6D6D6] hover:bg-[#545A5B]/80 hover:text-white"
                      >
                        <AlertCircle className="mr-2 size-4 text-amber-400" />
                        Request Changes
                      </Button>
                    )}
                    <p className="text-center text-[11px] text-[#898A8C]">
                      Action will be timestamped and permanently attributed to
                      your contact profile.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments & Communication Feed */}
            <Card className="border-[#545A5B] bg-[#06151E] text-[#FFFFFF]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#FFFFFF]">
                  <MessageSquare className="size-4 text-[#D6D6D6]" />
                  Feedback & Comments ({data.comments.length})
                </CardTitle>
                <CardDescription className="text-xs text-[#898A8C]">
                  Direct exchange between client reviewer and production team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Comment composer */}
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="author-input"
                      className="text-xs text-[#D6D6D6]"
                    >
                      Your Name
                    </Label>
                    <Input
                      id="author-input"
                      placeholder="e.g. Jane Doe"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      className="h-8 border-[#545A5B] bg-[#06151E] text-xs text-[#FFFFFF]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="comment-input"
                      className="text-xs text-[#D6D6D6]"
                    >
                      Comment / Feedback
                    </Label>
                    <textarea
                      id="comment-input"
                      rows={3}
                      placeholder="Add a comment or question..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="w-full rounded-md border border-[#545A5B] bg-[#06151E] p-2.5 text-xs text-[#FFFFFF] placeholder-[#898A8C] focus:border-[#D6D6D6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6D6D6]"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingComment || !commentContent.trim()}
                    className="w-full bg-[#FFFFFF] text-xs font-semibold text-[#06151E] hover:bg-[#D6D6D6]"
                  >
                    <Send className="mr-1.5 size-3.5" aria-hidden="true" />
                    {isSubmittingComment ? "Posting..." : "Send Feedback"}
                  </Button>
                </form>

                <Separator className="bg-[#545A5B]" />

                {/* Comment list */}
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Feedback and comments list"
                  className="max-h-80 space-y-3 overflow-y-auto rounded pr-1 outline-none focus-visible:ring-1 focus-visible:ring-[#D6D6D6]/50"
                >
                  {data.comments.length === 0 ? (
                    <p className="text-center text-xs text-[#898A8C]">
                      No comments posted yet.
                    </p>
                  ) : (
                    data.comments.map((c) => (
                      <div
                        key={c.commentId}
                        className="rounded-lg border border-[#545A5B] bg-[#06151E]/60 p-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#FFFFFF]">
                            {c.authorName}
                          </span>
                          <span className="text-[11px] text-[#898A8C]">
                            {new Date(c.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[#D6D6D6]">
                          {c.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Approve Modal */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="border-[#545A5B] bg-[#06151E] text-[#FFFFFF] sm:max-w-md">
          <form onSubmit={handleApproveSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg text-emerald-400">
                <CheckCircle2 className="size-5" />
                Approve Deliverable
              </DialogTitle>
              <DialogDescription className="text-xs text-[#898A8C]">
                You are approving Revision{" "}
                {data.deliverable.currentRevision.versionNumber} of &quot;
                {data.deliverable.title}&quot;. Once confirmed, this deliverable
                will be locked for production.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="approve-name"
                  className="text-xs text-[#D6D6D6]"
                >
                  Full Name (Signature) *
                </Label>
                <Input
                  id="approve-name"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="border-[#545A5B] bg-[#06151E] text-xs text-[#FFFFFF]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="approve-email"
                  className="text-xs text-[#D6D6D6]"
                >
                  Email Address *
                </Label>
                <Input
                  id="approve-email"
                  type="email"
                  required
                  placeholder="s.connor@clientcorp.com"
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  className="border-[#545A5B] bg-[#06151E] text-xs text-[#FFFFFF]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="approve-notes"
                  className="text-xs text-[#D6D6D6]"
                >
                  Approval Notes (Optional)
                </Label>
                <textarea
                  id="approve-notes"
                  rows={2}
                  placeholder="e.g. Approved with gratitude for the quick turnaround!"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full rounded-md border border-[#545A5B] bg-[#06151E] p-2 text-xs text-[#FFFFFF] placeholder-[#898A8C] focus:border-[#D6D6D6] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="approve-confirm"
                  checked={approvalConfirmed}
                  onChange={(e) => setApprovalConfirmed(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-[#545A5B] bg-[#06151E] text-[#D6D6D6] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 focus-visible:ring-offset-[#06151E]"
                />
                <Label
                  htmlFor="approve-confirm"
                  className="cursor-pointer text-xs leading-snug text-[#D6D6D6]"
                >
                  I confirm that I have reviewed the creative assets for
                  Revision {data.deliverable.currentRevision.versionNumber} and
                  grant formal client approval.
                </Label>
              </div>
            </div>

            <DialogFooter className="mt-6 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsApproveOpen(false)}
                className="text-xs text-[#898A8C] hover:bg-[#545A5B] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isApproving || !approvalConfirmed}
                className="bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                {isApproving ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Changes Modal */}
      <Dialog open={isChangeRequestOpen} onOpenChange={setIsChangeRequestOpen}>
        <DialogContent className="border-[#545A5B] bg-[#06151E] text-[#FFFFFF] sm:max-w-md">
          <form onSubmit={handleChangeRequestSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg text-amber-400">
                <AlertCircle className="size-5" />
                Request Changes
              </DialogTitle>
              <DialogDescription className="text-xs text-[#898A8C]">
                Specify revision notes for the creative team. A new revision
                iteration will be initiated.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="request-name"
                  className="text-xs text-[#D6D6D6]"
                >
                  Your Name *
                </Label>
                <Input
                  id="request-name"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="border-[#545A5B] bg-[#06151E] text-xs text-[#FFFFFF]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="request-email"
                  className="text-xs text-[#D6D6D6]"
                >
                  Your Email *
                </Label>
                <Input
                  id="request-email"
                  type="email"
                  required
                  placeholder="s.connor@clientcorp.com"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="border-[#545A5B] bg-[#06151E] text-xs text-[#FFFFFF]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="request-notes"
                  className="text-xs text-[#D6D6D6]"
                >
                  Required Changes & Feedback *
                </Label>
                <textarea
                  id="request-notes"
                  required
                  rows={4}
                  placeholder="Please describe what needs to be changed in the next iteration..."
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  className="w-full rounded-md border border-[#545A5B] bg-[#06151E] p-2 text-xs text-[#FFFFFF] placeholder-[#898A8C] focus:border-[#D6D6D6] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsChangeRequestOpen(false)}
                className="text-xs text-[#898A8C] hover:bg-[#545A5B] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRequestingChanges || !changeNotes.trim()}
                className="bg-amber-600 text-xs font-semibold text-white hover:bg-amber-500"
              >
                {isRequestingChanges
                  ? "Submitting..."
                  : "Submit Revision Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
