"use client";

/**
 * Timeline workspace feed. Search/status/date filters run client-side over
 * loaded rows — getTimelines() takes only (cursorOffset, limit), no filter
 * params (see real-actions.ts) — but "Load more" is genuine server-driven
 * infinite pagination through that same cursor contract, calling the public
 * gateway directly for each additional page.
 *
 * "Entity Filters" (per the sprint brief) collapses to the status filter
 * here: getTimelines() returns only Timeline entities (one row per project),
 * not a heterogeneous activity feed, so there is no second entity type to
 * filter across. Bookmarks are not implemented — no bookmarks table/feature
 * exists anywhere in the frozen architecture, and adding one would be new
 * backend, out of scope for a presentation-only sprint.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, GanttChartSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { getTimelines } from "../actions";
import { TimelineDetailSheet, type TimelineRow } from "./timeline-detail-sheet";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  "planning",
  "in_progress",
  "blocked",
  "review",
  "approved",
  "completed",
  "cancelled",
  "archived",
] as const;

const DATE_OPTIONS = [
  { key: "active", label: "Active (in date range)" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
] as const;

export type ProjectLabel = { name: string; code: string | null };

/** A timeline's human label is its project's name — the row itself has none. */
function labelFor(
  timeline: TimelineRow,
  projectNames: Record<string, ProjectLabel>,
): { title: string; subtitle: string | null } {
  const project = projectNames[timeline.projectId];
  if (project) {
    return { title: project.name, subtitle: project.code };
  }
  // Fall back to the id's distinguishing tail, not its leading bytes — every
  // seeded/sequential UUID shares the same first 8 characters.
  return {
    title: `Timeline ${timeline.timelineId.slice(-8)}`,
    subtitle: null,
  };
}

export function TimelineFeed({
  initialRows,
  projectNames,
}: Readonly<{
  initialRows: TimelineRow[];
  projectNames: Record<string, ProjectLabel>;
}>) {
  const [rows, setRows] = useState(initialRows);
  const [hasMore, setHasMore] = useState(initialRows.length === PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<TimelineRow | null>(null);

  // `now` is read via an effect rather than Date.now() during render — the
  // latter is an impure call the React Compiler flags. Date filters simply
  // don't apply until after the first paint (now === null), which is
  // imperceptible in practice.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    function markNow() {
      setNow(Date.now());
    }
    markNow();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((timeline) => {
      if (search) {
        const needle = search.toLowerCase();
        const { title, subtitle } = labelFor(timeline, projectNames);
        const haystack = [title, subtitle, timeline.timelineId]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (status && timeline.status !== status) return false;
      if (dateFilter && now !== null) {
        if (dateFilter === "upcoming" && (!timeline.startDate || new Date(timeline.startDate).getTime() < now)) return false;
        if (dateFilter === "past" && (!timeline.endDate || new Date(timeline.endDate).getTime() >= now)) return false;
        if (dateFilter === "active") {
          const startOk = !timeline.startDate || new Date(timeline.startDate).getTime() <= now;
          const endOk = !timeline.endDate || new Date(timeline.endDate).getTime() >= now;
          if (!(startOk && endOk)) return false;
        }
      }
      return true;
    });
  }, [rows, search, status, dateFilter, now, projectNames]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = await getTimelines(rows.length, PAGE_SIZE);
      setRows((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by project…"
            className="pl-8"
            aria-label="Search timelines"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {status ? status.replaceAll("_", " ") : "All statuses"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setStatus(null)}>All statuses</DropdownMenuItem>
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem key={option} onClick={() => setStatus(option)}>
                {option.replaceAll("_", " ")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {dateFilter ? DATE_OPTIONS.find((o) => o.key === dateFilter)?.label : "All dates"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setDateFilter(null)}>All dates</DropdownMenuItem>
            {DATE_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.key} onClick={() => setDateFilter(option.key)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={GanttChartSquare}
          title="No timelines found"
          description="No project timelines match the current search and filters."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((timeline) => {
            const { title, subtitle } = labelFor(timeline, projectNames);
            return (
            <button
              key={timeline.timelineId}
              onClick={() => setSelected(timeline)}
              className="flex w-full items-center justify-between gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">
                  {subtitle ? `${subtitle} · ` : ""}
                  {timeline.startDate ? new Date(timeline.startDate).toLocaleDateString() : "No start date"}
                  {" – "}
                  {timeline.endDate ? new Date(timeline.endDate).toLocaleDateString() : "No end date"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-muted-foreground">{timeline.overallProgress ?? 0}%</span>
                <StatusBadge status={timeline.status} />
              </div>
            </button>
            );
          })}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      <TimelineDetailSheet
        timeline={selected}
        projectLabel={selected ? projectNames[selected.projectId] : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
