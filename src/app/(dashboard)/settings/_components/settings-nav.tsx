"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Users, Shield, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Profile", href: "/settings/profile", icon: User },
  { title: "Organization", href: "/settings/organization", icon: Building2 },
  { title: "Members", href: "/settings/members", icon: Users },
  { title: "Roles & Permissions", href: "/settings/roles", icon: Shield },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    // Wraps on narrow viewports — as a single non-wrapping row these four
    // items overflowed the mobile viewport horizontally.
    <nav
      aria-label="Settings sections"
      className="flex flex-wrap gap-2 md:flex-col md:flex-nowrap md:gap-1"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="w-4 h-4 mr-3 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
