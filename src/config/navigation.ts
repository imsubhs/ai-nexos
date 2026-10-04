import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Clock,
  ContactRound,
  FilePenLine,
  FileText,
  Files,
  FolderKanban,
  GanttChartSquare,
  LayoutDashboard,
  Settings,
  Users,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Module, Action } from "@/features/permissions/constants";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  status: "live" | "coming-soon";
  permission?: [Module, Action];
  children?: NavItem[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Global navigation (SDS §16 · Phase 4B).
 *
 * Distinct top-level areas:
 * - Workspace: Core creative execution (Dashboard, Projects, Clients, Tasks, Timeline, Calendar)
 * - Production: Asset and collaboration resources (Deliverables, Files, Meetings)
 * - Workforce: Consolidated personal time tracking ("My Time") and team operations ("Team & People")
 * - Intelligence: Assistive capabilities (AI Workspace, Analytics)
 * - Organization: Administrative governance (Settings)
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        status: "live",
      },
      {
        title: "Projects",
        href: "/projects",
        icon: FolderKanban,
        status: "live",
        permission: ["projects", "read"],
      },
      {
        title: "Clients",
        href: "/clients",
        icon: Building2,
        status: "live",
        permission: ["clients", "read"],
      },
      {
        title: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        status: "live",
        permission: ["tasks", "read"],
      },
      {
        title: "Timeline",
        href: "/timeline",
        icon: GanttChartSquare,
        status: "live",
        permission: ["timeline", "read"],
      },
      {
        // A read-only lens over Meetings / Timelines / Tasks — it owns no
        // records, so it carries no permission of its own. The page composes
        // the viewer's module read permissions server-side instead
        // (src/features/calendar/action-core.ts).
        title: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        status: "live",
      },
    ],
  },
  {
    label: "Production",
    items: [
      {
        title: "Deliverables",
        href: "/deliverables",
        icon: FileText,
        status: "live",
        permission: ["deliverables", "read"],
      },
      {
        title: "Files",
        href: "/files",
        icon: Files,
        status: "live",
        permission: ["files", "read"],
      },
      {
        title: "Meetings",
        href: "/meetings",
        icon: Video,
        status: "live",
        permission: ["meetings", "read"],
      },
    ],
  },
  {
    // Workforce section (Phase 4B consolidation).
    // Consolidated from 7 top-level slots down to 2 primary operational surfaces:
    // 1. "My Time" — Individual contributor punch clock, history, and correction requests.
    // 2. "Team & People" — Managerial attendance dashboard, employee directory, review queue, and reports.
    // All 7 existing routes and permissions are preserved via contextual sub-navigation.
    label: "Workforce",
    items: [
      {
        title: "My Time",
        href: "/workforce/attendance",
        icon: Clock,
        status: "live",
        permission: ["attendance", "clock"],
        children: [
          {
            title: "Punch Clock",
            href: "/workforce/attendance",
            icon: Clock,
            status: "live",
            permission: ["attendance", "clock"],
          },
          {
            title: "History",
            href: "/workforce/history",
            icon: CalendarDays,
            status: "live",
            permission: ["attendance", "read"],
          },
          {
            title: "Corrections",
            href: "/workforce/corrections",
            icon: FilePenLine,
            status: "live",
            permission: ["corrections", "create"],
          },
        ],
      },
      {
        title: "Team & People",
        href: "/workforce/team",
        icon: Users,
        status: "live",
        permission: ["attendance", "view_team"],
        children: [
          {
            title: "Team Attendance",
            href: "/workforce/team",
            icon: Users,
            status: "live",
            permission: ["attendance", "view_team"],
          },
          {
            title: "Employees",
            href: "/workforce/employees",
            icon: ContactRound,
            status: "live",
            permission: ["users", "read"],
          },
          {
            title: "Review Queue",
            href: "/workforce/corrections/review",
            icon: ClipboardCheck,
            status: "live",
            permission: ["corrections", "review"],
          },
          {
            title: "Reports",
            href: "/workforce/reports",
            icon: BarChart3,
            status: "coming-soon",
            permission: ["reports", "read"],
          },
        ],
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        title: "AI Workspace",
        href: "/ai",
        icon: Bot,
        status: "coming-soon",
        permission: ["ai", "read"],
      },
      {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        status: "coming-soon",
        permission: ["analytics", "read"],
      },
    ],
  },
  {
    label: "Organization",
    items: [
      // "Team → /team" removed (doc 13 §2 note 3): superseded by
      // Workforce ▸ Employees (directory) + Settings ▸ Members (administration).
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        status: "live",
        permission: ["settings", "read"],
      },
    ],
  },
];
