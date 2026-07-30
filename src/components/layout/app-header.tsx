"use client";

import { LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { signOut } from "@/features/auth/actions";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { GlobalSearch } from "@/features/search/components/global-search";

type HeaderUser = {
  userId: string;
  organizationId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  roleName: string;
};

/** Links the account-menu item to the sign-out form rendered outside the menu. */
const SIGN_OUT_FORM_ID = "app-sign-out";

export function AppHeader({ user, isDemo = false }: Readonly<{ user: HeaderUser, isDemo?: boolean }>) {
  const { setTheme, resolvedTheme } = useTheme();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="bg-background/80 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-sm">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />

      {isDemo && (
        <div className="bg-primary/20 text-primary flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          Demo Mode
        </div>
      )}

      {/* P2-04: this was a decorative input. It now searches for real across
          the five search-capable public reads — see features/search/actions.ts. */}
      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>

        {/* P2-05: the bell had an aria-label and no handler, no panel and no
            unread count. It now reads and writes through the notifications
            public gateway. */}
        <NotificationBell
          userId={user.userId}
          organizationId={user.organizationId}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" className="h-9 gap-2 px-1.5" />}
          >
            <Avatar className="size-7">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={fullName} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="grid gap-0.5">
                <span className="truncate text-sm font-medium">{fullName}</span>
                <span className="text-muted-foreground truncate text-xs font-normal">
                  {user.email}
                </span>
                <span className="text-muted-foreground text-xs font-normal">
                  {user.roleName}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<a href="/settings/profile" />}>
              <User />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* P1-01: `onSelect={() => signOut()}` discarded the promise, so
                Next never applied the action's Set-Cookie or its redirect and
                sign-out silently did nothing. The item is now a submit button
                for the form below — the form is rendered outside the menu so
                it survives the menu unmounting on click, and the flow works
                without JavaScript (TD-14). */}
            <DropdownMenuItem
              variant="destructive"
              nativeButton
              render={
                <button type="submit" form={SIGN_OUT_FORM_ID} className="w-full" />
              }
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <form id={SIGN_OUT_FORM_ID} action={signOut} className="hidden" />
    </header>
  );
}
