"use client";

import { useState } from "react";
import { UpdateNotificationPreferencesInput } from "../schemas";
import { NotificationDigestFrequency } from "../types";

interface PreferencesFormProps {
  initialData?: UpdateNotificationPreferencesInput;
  onSubmit: (data: UpdateNotificationPreferencesInput) => Promise<void>;
}

export function PreferencesForm({
  initialData,
  onSubmit,
}: PreferencesFormProps) {
  const [formData, setFormData] = useState<UpdateNotificationPreferencesInput>(
    initialData || {
      level: "user",
      eventTypePreferences: {},
      timezone: "UTC",
      digestFrequency: "instant",
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="block text-sm font-medium">Digest Frequency</label>
        <select
          value={formData.digestFrequency}
          onChange={(e) =>
            setFormData({
              ...formData,
              digestFrequency: e.target.value as NotificationDigestFrequency,
            })
          }
          className="mt-1 block w-full rounded-md border-gray-300 text-black shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="instant">Instant</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Quiet Hours Start</label>
        <input
          type="time"
          value={formData.quietHoursStart || ""}
          onChange={(e) =>
            setFormData({ ...formData, quietHoursStart: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 text-black shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Quiet Hours End</label>
        <input
          type="time"
          value={formData.quietHoursEnd || ""}
          onChange={(e) =>
            setFormData({ ...formData, quietHoursEnd: e.target.value })
          }
          className="mt-1 block w-full rounded-md border-gray-300 text-black shadow-sm"
        />
      </div>

      <button
        type="submit"
        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
      >
        Save Preferences
      </button>
    </form>
  );
}
