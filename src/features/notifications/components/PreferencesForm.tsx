"use client";

import { useState } from "react";
import { UpdateNotificationPreferencesInput } from "../schemas";
import { NotificationDigestFrequency } from "../types";

interface PreferencesFormProps {
  initialData?: UpdateNotificationPreferencesInput;
  onSubmit: (data: UpdateNotificationPreferencesInput) => Promise<void>;
}

export function PreferencesForm({ initialData, onSubmit }: PreferencesFormProps) {
  const [formData, setFormData] = useState<UpdateNotificationPreferencesInput>(
    initialData || {
      level: "user",
      eventTypePreferences: {},
      timezone: "UTC",
      digestFrequency: "instant",
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium">Digest Frequency</label>
        <select
          value={formData.digestFrequency}
          onChange={(e) => setFormData({ ...formData, digestFrequency: e.target.value as NotificationDigestFrequency })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-black"
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
          onChange={(e) => setFormData({ ...formData, quietHoursStart: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Quiet Hours End</label>
        <input
          type="time"
          value={formData.quietHoursEnd || ""}
          onChange={(e) => setFormData({ ...formData, quietHoursEnd: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black"
        />
      </div>

      <button
        type="submit"
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Save Preferences
      </button>
    </form>
  );
}
