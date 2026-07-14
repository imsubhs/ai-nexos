"use client";

import React, { useState } from "react";
import { createShareSessionAction } from "../../actions";

interface ShareSessionBuilderProps {
  organizationId: string;
  projectId: string;
  availableDeliverables: { id: string; name: string }[];
}

export function ShareSessionBuilder({ organizationId, projectId, availableDeliverables }: ShareSessionBuilderProps) {
  const [selectedDeliverables, setSelectedDeliverables] = useState<string[]>([]);
  const [shareType, setShareType] = useState<"deliverable_review" | "approval_request">("deliverable_review");

  const handleCreateSession = async () => {
    try {
      const session = await createShareSessionAction({
        organizationId,
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
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">Create Share Session (Immutable Snapshot)</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Share Type</label>
        <select 
          value={shareType} 
          onChange={(e) => setShareType(e.target.value as "deliverable_review" | "approval_request")}
          className="w-full border rounded-md p-2"
        >
          <option value="deliverable_review">Deliverable Review</option>
          <option value="approval_request">Approval Request</option>
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Deliverables</label>
        <div className="space-y-2">
          {availableDeliverables?.map((d: { id: string; name: string }) => (
            <label key={d.id} className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={selectedDeliverables.includes(d.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedDeliverables([...selectedDeliverables, d.id]);
                  else setSelectedDeliverables(selectedDeliverables.filter(id => id !== d.id));
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
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        Generate Secure Session
      </button>
    </div>
  );
}
