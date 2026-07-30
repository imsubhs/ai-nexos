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
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Global navigation (SDS §16). Items for M2+ modules are present but routed
 * to their future paths — they render as the platform grows, keeping the
 * information architecture stable from day one.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, status: "live" },
      { title: "Projects", href: "/projects", icon: FolderKanban, status: "live", permission: ["projects", "read"] },
      { title: "Clients", href: "/clients", icon: Building2, status: "live", permission: ["clients", "read"] },
      { title: "Tasks", href: "/tasks", icon: CheckSquare, status: "live", permission: ["tasks", "read"] },
      { title: "Timeline", href: "/timeline", icon: GanttChartSquare, status: "live", permission: ["timeline", "read"] },
      { title: "Calendar", href: "/calendar", icon: CalendarDays, status: "coming-soon" },
    ],
  },
  {
    label: "Production",
    items: [
      { title: "Deliverables", href: "/deliverables", icon: FileText, status: "live", permission: ["deliverables", "read"] },
      { title: "Files", href: "/files", icon: Files, status: "live", permission: ["files", "read"] },
      { title: "Meetings", href: "/meetings", icon: Video, status: "live", permission: ["meetings", "read"] },
    ],
  },
  {
    // Workforce section (merge doc 13 §2) — Employees ships live in WP-105;
    // remaining items flip live as their WPs land (doc 17 Slices B–D).
    label: "Workforce",
    items: [
      { title: "My Attendance", href: "/workforce/attendance", icon: Clock, status: "coming-soon", permission: ["attendance", "clock"] },
      { title: "History", href: "/workforce/history", icon: CalendarDays, status: "coming-soon", permission: ["attendance", "read"] },
      { title: "Corrections", href: "/workforce/corrections", icon: FilePenLine, status: "coming-soon", permission: ["corrections", "create"] },
      { title: "Review Queue", href: "/workforce/corrections/review", icon: ClipboardCheck, status: "coming-soon", permission: ["corrections", "review"] },
      { title: "Team Attendance", href: "/workforce/team", icon: Users, status: "coming-soon", permission: ["attendance", "view_team"] },
      { title: "Employees", href: "/workforce/employees", icon: ContactRound, status: "live", permission: ["users", "read"] },
      { title: "Reports", href: "/workforce/reports", icon: BarChart3, status: "coming-soon", permission: ["reports", "read"] },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "AI Workspace", href: "/ai", icon: Bot, status: "coming-soon", permission: ["ai", "read"] },
      { title: "Analytics", href: "/analytics", icon: BarChart3, status: "coming-soon", permission: ["analytics", "read"] },
    ],
  },
  {
    label: "Organization",
    items: [
      // "Team → /team" removed (doc 13 §2 note 3): superseded by
      // Workforce ▸ Employees (directory) + Settings ▸ Members (administration).
      { title: "Settings", href: "/settings", icon: Settings, status: "live", permission: ["settings", "read"] },
    ],
  },
];
