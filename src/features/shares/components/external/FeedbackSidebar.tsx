"use client";

import React, { useState } from "react";
import { submitExternalApprovalAction } from "../../actions";

interface FeedbackSidebarProps {
  /**
   * The external client's credential. The server derives the session and the
   * submitting identity from it — both were previously props, which meant the
   * browser chose whose approval this was and which share it landed on.
   */
  shareToken: string;
  itemId: string;
  canApprove: boolean;
}

/**
 * 1. Feedback Sidebar
 * Architecture Decision #5: Approval requires explicit confirmation. Never submit immediately.
 */
export function FeedbackSidebar({
  shareToken,
  itemId,
  canApprove,
}: FeedbackSidebarProps) {
  const [approvalState, setApprovalState] = useState<
    "idle" | "confirming" | "submitting" | "success"
  >("idle");
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(
    null,
  );

  const handleInitiateApproval = (type: "approved" | "rejected") => {
    setDecision(type);
    setApprovalState("confirming");
  };

  const handleConfirmApproval = async () => {
    if (!decision) return;

    setApprovalState("submitting");

    try {
      await submitExternalApprovalAction({
        shareToken,
        itemId,
        decision,
        explicitConfirmationToken: "simulated_secure_nonce_" + Date.now(), // E.g., generated during confirmation challenge
      });

      setApprovalState("success");
    } catch (error) {
      console.error(error);
      setApprovalState("idle"); // Revert on failure
    }
  };

  return (
    <div className="flex h-full w-80 flex-col border-l border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold">Feedback & Comments</h3>

      {/* Comments List Placeholder */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Placeholder for threaded comments component */}
        <div className="text-sm text-slate-500 italic">No comments yet.</div>
      </div>

      {/* Approval Section */}
      {canApprove && (
        <div className="mt-auto border-t border-slate-200 pt-4">
          {approvalState === "idle" && (
            <div className="flex space-x-2">
              <button
                onClick={() => handleInitiateApproval("rejected")}
                className="flex-1 rounded-md bg-red-50 px-4 py-2 text-red-600 transition-colors hover:bg-red-100"
              >
                Reject
              </button>
              <button
                onClick={() => handleInitiateApproval("approved")}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          )}

          {approvalState === "confirming" && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-3 text-sm font-medium">
                Are you sure you want to{" "}
                {decision === "approved" ? "Approve" : "Reject"} this
                deliverable? This action is final and will notify the internal
                team.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setApprovalState("idle")}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApproval}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm text-white ${decision === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                >
                  Confirm {decision === "approved" ? "Approval" : "Rejection"}
                </button>
              </div>
            </div>
          )}

          {approvalState === "submitting" && (
            <div className="py-4 text-center text-sm text-slate-500">
              Submitting decision...
            </div>
          )}

          {approvalState === "success" && (
            <div
              className={`rounded-md py-3 text-center text-sm font-medium ${decision === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {decision === "approved"
                ? "Successfully Approved"
                : "Successfully Rejected"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
