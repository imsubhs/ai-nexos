"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  CheckSquare,
  FileText,
  Files,
  FolderKanban,
  GanttChartSquare,
  LayoutDashboard,
  Settings,
  Users,
  Video,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/config/app";

/**
 * Global navigation (SDS §16). Items for M2+ modules are present but routed
 * to their future paths — they render as the platform grows, keeping the
 * information architecture stable from day one.
 */
const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Projects", href: "/projects", icon: FolderKanban },
      { title: "Clients", href: "/clients", icon: Building2 },
      { title: "Tasks", href: "/tasks", icon: CheckSquare },
      { title: "Timeline", href: "/timeline", icon: GanttChartSquare },
      { title: "Calendar", href: "/calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Production",
    items: [
      { title: "Deliverables", href: "/deliverables", icon: FileText },
      { title: "Files", href: "/files", icon: Files },
      { title: "Meetings", href: "/meetings", icon: Video },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "AI Workspace", href: "/ai", icon: Bot },
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Organization",
    items: [
      { title: "Team", href: "/team", icon: Users },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
] as const;

export function AppSidebar({
  organizationName,
}: Readonly<{ organizationName: string }>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-xs font-bold">
                NX
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{APP_NAME}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {organizationName}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`)
                      }
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
