"use client";

import { useState } from "react";
import { INotification } from "../types";
import { NotificationBadge } from "./NotificationBadge";
import { Check, X } from "lucide-react";

interface NotificationCenterProps {
  initialNotifications: INotification[];
  onMarkRead: (id: string) => Promise<void>;
}

export function NotificationCenter({ initialNotifications, onMarkRead }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkRead = async (id: string) => {
    await onMarkRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date(), status: "read" } : n))
    );
  };

  return (
    <div className="relative">
      <NotificationBadge count={unreadCount} onClick={() => setIsOpen(!isOpen)} />

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden z-50 border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start ${!notification.readAt ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {/* In a real app, this would be a formatted message based on the event payload */}
                      New event occurred (Priority: {notification.priority})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {!notification.readAt && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
