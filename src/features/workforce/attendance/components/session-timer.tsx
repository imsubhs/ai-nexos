"use client";

/**
 * Elapsed session time for an open day, ticking once a second.
 *
 * This is a DISPLAY clock, not a metric. It shows wall-clock elapsed time since
 * clock-in minus completed break time — deliberately not "Effective Work Time",
 * which only the work-validation engine may produce and only at clock-out. Naming
 * it "Elapsed" is the difference between a live indicator and a fabricated
 * metric (policy 10.9).
 *
 * Rendering starts from `null` and fills in after mount: the server and the
 * browser are a second or two apart, so computing an initial value on both sides
 * would hydrate mismatched text.
 */
import { useEffect, useState } from "react";

function elapsedLabel(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function SessionTimer({
  clockInAt,
  breakMinutes,
  openBreakStartedAt,
}: Readonly<{
  clockInAt: string;
  /** Completed break minutes already recorded for the day. */
  breakMinutes: number;
  /** Start of the currently open break, if the day is paused. */
  openBreakStartedAt: string | null;
}>) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const start = Date.parse(clockInAt);
    if (Number.isNaN(start)) return;
    const openBreakStart = openBreakStartedAt
      ? Date.parse(openBreakStartedAt)
      : null;

    const tick = () => {
      const now = Date.now();
      // The open break is subtracted as it runs, so the number stops advancing
      // while the person is away rather than counting break time as session time.
      const openBreakMs =
        openBreakStart !== null ? Math.max(0, now - openBreakStart) : 0;
      setLabel(elapsedLabel(now - start - breakMinutes * 60_000 - openBreakMs));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [clockInAt, breakMinutes, openBreakStartedAt]);

  return (
    <span
      className="text-3xl font-semibold tabular-nums"
      // A number that changes every second would otherwise be announced every
      // second by a screen reader.
      aria-live="off"
    >
      {label ?? "—"}
    </span>
  );
}
