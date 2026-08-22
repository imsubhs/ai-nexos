"use client";

/**
 * Header notification bell.
 *
 * Sprint 12A wired the bell to `getNotificationsAction` and could only show
 * "normal priority · delivered", because the notifications read model is
 * event-derived and no read joined `notification_templates`. Sprint 12B closed
 * that (technical-debt item 11): `getNotificationFeedAction` composes
 * notification → event → in-app template, so each row now has a rendered title,
 * a body, and a destination.
 *
 * Also new here: mark unread (the inverse the domain always supported —
 * `readAt` is nullable and `delivered` is the pre-read status), mark all read,
 * an unread-only filter, and date grouping. Sorting is newest-first, applied in
 * the read so both adapters agree.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getNotificationFeedAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
} from "../actions";
import type { NotificationFeedItem } from "../templates";

/** Today / Yesterday / Earlier — enough grouping to scan, no more. */
function groupOf(
  value: Date | string,
  now: number,
): "Today" | "Yesterday" | "Earlier" {
  const created = new Date(value).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  if (created >= startOfToday) return "Today";
  if (created >= startOfToday - dayMs) return "Yesterday";
  return "Earlier";
}

const GROUP_ORDER = ["Today", "Yesterday", "Earlier"] as const;

const PRIORITY_VARIANT: Record<string, "default" | "outline"> = {
  critical: "default",
  high: "default",
};

/**
 * CRIT-2: this component used to receive `userId` and `organizationId` as
 * props and pass them to every notification action. Those props were the
 * vulnerability's delivery mechanism — the browser decided whose notifications
 * the server read. The actions now derive identity from the session, so the
 * component needs no identity and takes no props.
 */
export function NotificationBell() {
  const [rows, setRows] = useState<NotificationFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  // Read once after mount rather than during render — Date.now() in render is
  // impure and the React Compiler flags it.
  const [now, setNow] = useState<number | null>(null);

  const load = useCallback(async () => {
    const result = await getNotificationFeedAction();
    setRows(result ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // `now` is stamped inside a function rather than inline, matching the
    // MeetingsDirectory idiom: Date.now() during render is impure, and a bare
    // setState in an effect body is a cascading render.
    function markNow() {
      setNow(Date.now());
    }
    markNow();
    async function initialLoad() {
      try {
        const result = await getNotificationFeedAction();
        if (!cancelled) setRows(result ?? []);
      } catch {
        // A failing notifications read must never break the app shell.
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    initialLoad();
    return () => {
      cancelled = true;
    };
  }, []);

  const unread = rows.filter((row) => !row.readAt).length;
  const visible = unreadOnly ? rows.filter((row) => !row.readAt) : rows;

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items:
      now === null
        ? []
        : visible.filter((row) => groupOf(row.createdAt, now) === group),
  })).filter((bucket) => bucket.items.length > 0);

  const toggleRead = async (row: NotificationFeedItem) => {
    setPendingId(row.notificationId);
    try {
      if (row.readAt) {
        await markNotificationUnreadAction(row.notificationId);
        toast.success("Marked as unread");
      } else {
        await markNotificationReadAction(row.notificationId);
        toast.success("Marked as read");
      }
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the notification",
      );
    } finally {
      setPendingId(null);
    }
  };

  const markAll = async () => {
    setPendingId("all");
    try {
      await markAllNotificationsReadAction();
      await load();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not mark all as read",
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
            }
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="bg-destructive text-destructive-foreground absolute top-0.5 right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly((value) => !value)}
            >
              {unreadOnly ? "Show all" : `Unread (${unread})`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={unread === 0 || pendingId === "all"}
              onClick={markAll}
            >
              Mark all read
            </Button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-4 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : visible.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-sm">
              {unreadOnly ? "Nothing unread." : "No notifications."}
            </p>
          ) : (
            grouped.map((bucket) => (
              <div key={bucket.group}>
                <p className="text-muted-foreground bg-muted/50 px-3 py-1 text-[11px] font-medium tracking-wide uppercase">
                  {bucket.group}
                </p>
                {bucket.items.map((row) => (
                  <div
                    key={row.notificationId}
                    className={`flex items-start justify-between gap-2 border-b px-3 py-2 last:border-b-0 ${
                      row.readAt ? "" : "bg-accent/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {row.title}
                        </p>
                        {row.priority !== "normal" && (
                          <Badge
                            variant={
                              PRIORITY_VARIANT[row.priority] ?? "outline"
                            }
                            className="text-[10px] capitalize"
                          >
                            {row.priority}
                          </Badge>
                        )}
                      </div>
                      {row.description && (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {row.description}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {new Date(row.createdAt).toLocaleString()}
                      </p>
                      {row.actionUrl && (
                        <Link
                          href={row.actionUrl}
                          className="text-xs underline underline-offset-2"
                        >
                          Open
                        </Link>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={
                        row.readAt
                          ? `Mark "${row.title}" as unread`
                          : `Mark "${row.title}" as read`
                      }
                      disabled={pendingId === row.notificationId}
                      onClick={() => toggleRead(row)}
                    >
                      {row.readAt ? (
                        <Undo2 className="size-4" />
                      ) : (
                        <Check className="size-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {rows.some((row) => row.isFallbackTitle) && (
          <p className="text-muted-foreground border-t px-3 py-2 text-xs">
            Some entries have no in-app template for their event type, so they
            show the event they came from instead of a written headline.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
