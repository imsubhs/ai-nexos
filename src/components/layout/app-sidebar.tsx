"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/config/navigation";
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

export function AppSidebar({
  organizationName,
  permittedHrefs,
}: Readonly<{ organizationName: string; permittedHrefs: string[] }>) {
  const pathname = usePathname();

  const navSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => permittedHrefs.includes(item.href)),
  })).filter((section) => section.items.length > 0);

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

      {/* Exposes the primary nav as a navigation landmark — SidebarContent is
          a plain <div>, so without this the app has no nav landmark at all. */}
      <SidebarContent role="navigation" aria-label="Main navigation">
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isComingSoon = item.status === "coming-soon";
                  const isActive =
                    !isComingSoon &&
                    (pathname === item.href ||
                      pathname.startsWith(`${item.href}/`));

                  return (
                    <SidebarMenuItem key={item.href}>
                      {isComingSoon ? (
                        // P2-02: `disabled` alone never reached the DOM — it is
                        // consumed by the Base UI useRender/mergeProps path — so
                        // these nine dimmed items stayed at tabIndex 0 and were
                        // announced as ordinary available buttons, giving a
                        // keyboard user nine dead stops before page content.
                        // aria-disabled + tabIndex -1 + a "coming soon" accessible
                        // name state the truth to assistive technology, and
                        // pointer-events-none drops the click that never did
                        // anything.
                        <SidebarMenuButton
                          tooltip={item.title}
                          disabled
                          aria-disabled
                          tabIndex={-1}
                          aria-label={`${item.title} — coming soon`}
                          className="pointer-events-none opacity-50"
                        >
                          <item.icon />
                          <span className="flex flex-1 items-center justify-between">
                            {item.title}
                            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] leading-none font-medium">
                              Soon
                            </span>
                          </span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          render={<Link href={item.href} />}
                          isActive={isActive}
                          // isActive only sets data-active (styling). The
                          // current page must also be exposed to assistive
                          // technology.
                          aria-current={isActive ? "page" : undefined}
                          tooltip={item.title}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
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
