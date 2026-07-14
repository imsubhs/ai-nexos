"use client";

import { Bell, LogOut, Moon, Search, Sun, User } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { signOut } from "@/features/auth/actions";

type HeaderUser = {
  firstName: string;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  roleName: string;
};

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

      {/* Global search (SDS §26) — command palette lands with universal search. */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          placeholder="Search projects, clients, tasks…"
          className="h-9 pl-8"
          aria-label="Global search"
        />
      </div>

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

        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>

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
            <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
