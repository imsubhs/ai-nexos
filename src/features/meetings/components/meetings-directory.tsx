"use client";

/**
 * Meetings workspace directory. getMeetings() takes no filter/search
 * parameters (see src/features/meetings/real-queries.ts) — it is a plain
 * cursor-paginated global list. So unlike Deliverables/Files, search/status/
 * date filtering here run client-side over the fetched batch rather than
 * being pushed down to the dispatcher (which this sprint must not modify).
 * Pagination is likewise local to the filtered set.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { MEETING_STATUSES, humanizeToken } from "../constants";
import {
  CreateMeetingDialog,
  type MeetingProjectOption,
} from "./create-meeting-dialog";
import { MeetingDetailSheet, type MeetingRow } from "./meeting-detail-sheet";
import type { MeetingMemberOption } from "./meeting-attendees-panel";

const PAGE_SIZE = 25;

const DATE_OPTIONS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
] as const;

export function MeetingsDirectory({
  rows,
  projects,
  members,
}: Readonly<{
  rows: MeetingRow[];
  /** Targets for "New Meeting" — createMeeting requires a project. */
  projects: MeetingProjectOption[];
  /** Internal users the drawer can invite as attendees. */
  members: MeetingMemberOption[];
}>) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    return rows.filter((meeting) => {
      if (search && !meeting.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (status && meeting.status !== status) return false;
      if (dateFilter && now !== null) {
        if (
          dateFilter === "upcoming" &&
          (!meeting.startTime || new Date(meeting.startTime).getTime() < now)
        )
          return false;
        if (
          dateFilter === "past" &&
          (!meeting.startTime || new Date(meeting.startTime).getTime() >= now)
        )
          return false;
      }
      return true;
    });
  }, [rows, search, status, dateFilter, now]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: DataTableColumn<MeetingRow>[] = [
    {
      key: "title",
      header: "Meeting",
      cell: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.meetingType ? humanizeToken(row.meetingType) : "—"}
        </span>
      ),
    },
    {
      key: "startTime",
      header: "Starts",
      cell: (row) =>
        row.startTime ? new Date(row.startTime).toLocaleString() : "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search meetings by title…"
            className="pl-8"
            aria-label="Search meetings"
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
            <DropdownMenuItem
              onClick={() => {
                setStatus(null);
                setPage(1);
              }}
            >
              All statuses
            </DropdownMenuItem>
            {MEETING_STATUSES.map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => {
                  setStatus(option);
                  setPage(1);
                }}
              >
                {option.replaceAll("_", " ")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                {dateFilter
                  ? DATE_OPTIONS.find((o) => o.key === dateFilter)?.label
                  : "All dates"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => {
                setDateFilter(null);
                setPage(1);
              }}
            >
              All dates
            </DropdownMenuItem>
            {DATE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.key}
                onClick={() => {
                  setDateFilter(option.key);
                  setPage(1);
                }}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto">
          <CreateMeetingDialog projects={projects} />
        </div>
      </div>

      <DataTable
        columns={columns}
        ariaLabel="Meetings"
        rows={pageRows}
        rowKey={(row) => row.meetingId}
        total={filtered.length}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onRowClick={(row) => setSelectedId(row.meetingId)}
        emptyState={
          <EmptyState
            icon={Video}
            title="No meetings found"
            description="No meetings match the current search and filters."
          />
        }
      />

      <MeetingDetailSheet
        meetingId={selectedId}
        members={members}
        projects={projects}
        onClose={() => setSelectedId(null)}
        // The rows come from a server component, so a write in the drawer has
        // to re-run the page's fetch — not just re-render this list.
        onChanged={() => router.refresh()}
      />
    </div>
  );
}
