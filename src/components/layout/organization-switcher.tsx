"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { switchOrganizationAction } from "@/features/organizations/onboarding-actions";
import { APP_NAME } from "@/config/app";

export interface OrgMembershipOption {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  codePrefix?: string;
  roleName?: string;
}

export function OrganizationSwitcher({
  activeOrgId,
  activeOrgName,
  memberships = [],
}: {
  activeOrgId: string;
  activeOrgName: string;
  memberships: OrgMembershipOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSwitch = (targetOrgId: string) => {
    if (targetOrgId === activeOrgId || isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await switchOrganizationAction({ targetOrgId });
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error ?? "Failed to switch organization");
      }
    });
  };

  const hasMultiple = memberships.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="w-full justify-between" />}>
        <div className="flex items-center gap-2 overflow-hidden text-left">
          <div className="bg-primary text-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              activeOrgName.slice(0, 2).toUpperCase() || "NX"
            )}
          </div>
          <div className="grid flex-1 leading-tight">
            <span className="truncate font-semibold">{APP_NAME}</span>
            <span className="text-muted-foreground truncate text-xs">
              {activeOrgName}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="text-muted-foreground ml-auto size-4 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 rounded-xl p-1 shadow-lg"
        align="start"
        sideOffset={6}
      >
        <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-medium uppercase tracking-wider">
          Workspaces ({memberships.length || 1})
        </DropdownMenuLabel>

        {error && (
          <div className="bg-destructive/10 text-destructive mx-1 my-1 rounded px-2 py-1 text-xs">
            {error}
          </div>
        )}

        {memberships.map((m) => {
          const isActive = m.organizationId === activeOrgId;
          return (
            <DropdownMenuItem
              key={m.organizationId}
              onClick={() => handleSwitch(m.organizationId)}
              disabled={isPending || isActive}
              className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="text-muted-foreground size-4 shrink-0" />
                <div className="grid leading-tight">
                  <span className="truncate font-medium">{m.organizationName}</span>
                  {m.roleName && (
                    <span className="text-muted-foreground truncate text-xs">
                      {m.roleName}
                    </span>
                  )}
                </div>
              </div>
              {isActive && <Check className="text-primary size-4 shrink-0" />}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          render={<Link href="/onboarding" />}
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm"
        >
          <Plus className="text-muted-foreground size-4 shrink-0" />
          <span>Create or Join Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
