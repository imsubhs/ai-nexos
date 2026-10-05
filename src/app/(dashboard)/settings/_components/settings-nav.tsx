"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Users,
  Shield,
  Building2,
  CreditCard,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Profile", href: "/settings/profile", icon: User },
  { title: "Organization", href: "/settings/organization", icon: Building2 },
  { title: "Members", href: "/settings/members", icon: Users },
  { title: "Roles & Permissions", href: "/settings/roles", icon: Shield },
  { title: "Billing & Compute", href: "/settings/billing", icon: CreditCard },
  { title: "Security & Keys", href: "/settings/security", icon: KeyRound },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
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
              "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-surface-3 text-brand-primary border-brand-primary border-l-2"
                : "text-muted-foreground hover:bg-surface-3/50 hover:text-foreground",
            )}
          >
            <Icon className="text-brand-primary mr-3 h-4 w-4 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
