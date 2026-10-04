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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/config/app";

import {
  OrganizationSwitcher,
  type OrgMembershipOption,
} from "./organization-switcher";

export function AppSidebar({
  organizationName,
  permittedHrefs,
  activeOrgId,
  memberships = [],
}: Readonly<{
  organizationName: string;
  permittedHrefs: string[];
  activeOrgId?: string;
  memberships?: OrgMembershipOption[];
}>) {
  const pathname = usePathname();

  const navSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => permittedHrefs.includes(item.href))
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) =>
          permittedHrefs.includes(child.href),
        ),
      })),
  })).filter((section) => section.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {activeOrgId ? (
              <OrganizationSwitcher
                activeOrgId={activeOrgId}
                activeOrgName={organizationName}
                memberships={memberships}
              />
            ) : (
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
            )}
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
                  const hasPermittedChildren = (item.children?.length ?? 0) > 0;
                  const isChildActive = Boolean(
                    item.children?.some(
                      (child) =>
                        pathname === child.href ||
                        pathname.startsWith(`${child.href}/`),
                    ),
                  );
                  const isItemActive =
                    !isComingSoon &&
                    (pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(`${item.href}/`)) ||
                      isChildActive);

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
                          isActive={isItemActive && !isChildActive}
                          // isActive only sets data-active (styling). The
                          // current page must also be exposed to assistive
                          // technology.
                          aria-current={
                            pathname === item.href ? "page" : undefined
                          }
                          tooltip={item.title}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      )}

                      {/* Render hierarchical sub-navigation for grouped items (Phase 4B Workforce consolidation) */}
                      {hasPermittedChildren && isItemActive && (
                        <SidebarMenuSub>
                          {item.children!.map((child) => {
                            const isChildComingSoon =
                              child.status === "coming-soon";
                            const isThisChildActive =
                              !isChildComingSoon &&
                              (pathname === child.href ||
                                pathname.startsWith(`${child.href}/`));

                            return (
                              <SidebarMenuSubItem key={child.href}>
                                {isChildComingSoon ? (
                                  <SidebarMenuSubButton
                                    aria-disabled
                                    tabIndex={-1}
                                    aria-label={`${child.title} — coming soon`}
                                    className="pointer-events-none opacity-50"
                                  >
                                    <span>{child.title}</span>
                                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] leading-none font-medium">
                                      Soon
                                    </span>
                                  </SidebarMenuSubButton>
                                ) : (
                                  <SidebarMenuSubButton
                                    render={<Link href={child.href} />}
                                    isActive={isThisChildActive}
                                    aria-current={
                                      isThisChildActive ? "page" : undefined
                                    }
                                  >
                                    <span>{child.title}</span>
                                  </SidebarMenuSubButton>
                                )}
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
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
