"use client";

import React, { useState } from "react";
import { submitExternalApprovalAction } from "../../actions";

interface FeedbackSidebarProps {
  sessionId: string;
  itemId: string;
  identityId: string;
  canApprove: boolean;
}

/**
 * 1. Feedback Sidebar
 * Architecture Decision #5: Approval requires explicit confirmation. Never submit immediately.
 */
export function FeedbackSidebar({ sessionId, itemId, identityId, canApprove }: FeedbackSidebarProps) {
  const [approvalState, setApprovalState] = useState<"idle" | "confirming" | "submitting" | "success">("idle");
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  const handleInitiateApproval = (type: "approved" | "rejected") => {
    setDecision(type);
    setApprovalState("confirming");
  };

  const handleConfirmApproval = async () => {
    if (!decision) return;
    
    setApprovalState("submitting");
    
    try {
      await submitExternalApprovalAction({
        sessionId,
        itemId,
        identityId,
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
    <div className="w-80 h-full bg-white border-l border-slate-200 flex flex-col p-4">
      <h3 className="font-semibold text-lg mb-4">Feedback & Comments</h3>
      
      {/* Comments List Placeholder */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Placeholder for threaded comments component */}
        <div className="text-sm text-slate-500 italic">No comments yet.</div>
      </div>

      {/* Approval Section */}
      {canApprove && (
        <div className="mt-auto pt-4 border-t border-slate-200">
          {approvalState === "idle" && (
            <div className="flex space-x-2">
              <button 
                onClick={() => handleInitiateApproval("rejected")}
                className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
              <button 
                onClick={() => handleInitiateApproval("approved")}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            </div>
          )}

          {approvalState === "confirming" && (
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <p className="text-sm font-medium mb-3">
                Are you sure you want to {decision === "approved" ? "Approve" : "Reject"} this deliverable? 
                This action is final and will notify the internal team.
              </p>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setApprovalState("idle")}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmApproval}
                  className={`flex-1 px-3 py-1.5 text-white rounded-md text-sm ${decision === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                >
                  Confirm {decision === "approved" ? "Approval" : "Rejection"}
                </button>
              </div>
            </div>
          )}

          {approvalState === "submitting" && (
            <div className="text-center py-4 text-slate-500 text-sm">
              Submitting decision...
            </div>
          )}

          {approvalState === "success" && (
            <div className={`text-center py-3 rounded-md text-sm font-medium ${decision === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {decision === "approved" ? "Successfully Approved" : "Successfully Rejected"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
