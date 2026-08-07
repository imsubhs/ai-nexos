"use client";

import React, { useState } from "react";
import { createShareSessionAction } from "../../actions";

interface ShareSessionBuilderProps {
  // organizationId is deliberately absent: the action derives the tenant from
  // the authenticated user. A client-supplied one was how a share could be
  // published inside someone else's organisation.
  projectId: string;
  availableDeliverables: { id: string; name: string }[];
}

export function ShareSessionBuilder({
  projectId,
  availableDeliverables,
}: ShareSessionBuilderProps) {
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>(
    [],
  );
  const [shareType, setShareType] = useState<
    "deliverable_review" | "approval_request"
  >("deliverable_review");

  const handleCreateSession = async () => {
    try {
      const session = await createShareSessionAction({
        projectId,
        title: "New Review Session",
        shareType,
        deliverableIds: selectedDeliverables,
        // Notice: Architecture Decision #1 dictates this takes a snapshot of deliverables as they are now.
      });

      alert(`Session Created! Secure Token: ${session.secureToken}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">
        Create Share Session (Immutable Snapshot)
      </h2>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">Share Type</label>
        <select
          value={shareType}
          onChange={(e) =>
            setShareType(
              e.target.value as "deliverable_review" | "approval_request",
            )
          }
          className="w-full rounded-md border p-2"
        >
          <option value="deliverable_review">Deliverable Review</option>
          <option value="approval_request">Approval Request</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium">
          Select Deliverables
        </label>
        <div className="space-y-2">
          {availableDeliverables?.map((d: { id: string; name: string }) => (
            <label key={d.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedDeliverables.includes(d.id)}
                onChange={(e) => {
                  if (e.target.checked)
                    setSelectedDeliverables([...selectedDeliverables, d.id]);
                  else
                    setSelectedDeliverables(
                      selectedDeliverables.filter((id) => id !== d.id),
                    );
                }}
              />
              <span>{d.name}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreateSession}
        disabled={selectedDeliverables.length === 0}
        className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        Generate Secure Session
      </button>
    </div>
  );
}
