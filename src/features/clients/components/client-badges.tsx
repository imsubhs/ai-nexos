import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  Hash,
  Star,
  CreditCard,
  Code2,
  Scale,
  Sparkles,
  User,
} from "lucide-react";

export type ClientStatusType =
  "active" | "prospect" | "lead" | "inactive" | "archived" | string;

export function ClientStatusBadge({
  status,
  className,
}: {
  status: ClientStatusType;
  className?: string;
}) {
  const normalized = (status || "").toLowerCase();

  const styles: Record<string, string> = {
    active:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15",
    prospect:
      "bg-sky-500/10 text-sky-400 border-sky-500/25 hover:bg-sky-500/15",
    lead: "bg-sky-500/10 text-sky-400 border-sky-500/25 hover:bg-sky-500/15",
    inactive:
      "bg-slate-500/10 text-slate-400 border-slate-500/25 hover:bg-slate-500/15",
    archived:
      "bg-surface-3 text-foreground-muted border-border-subtle hover:bg-surface-4",
  };

  const labels: Record<string, string> = {
    active: "Active",
    prospect: "Prospect",
    lead: "Lead",
    inactive: "Inactive",
    archived: "Archived",
  };

  const badgeStyle = styles[normalized] || styles.active;
  const label = labels[normalized] || status;

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-[4px] border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        badgeStyle,
        className,
      )}
    >
      <span
        className={cn(
          "mr-1.5 inline-block size-1.5 shrink-0 rounded-full",
          normalized === "active" &&
            "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]",
          (normalized === "prospect" || normalized === "lead") &&
            "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]",
          normalized === "inactive" && "bg-slate-400",
          normalized === "archived" && "bg-zinc-500",
        )}
      />
      {label}
    </Badge>
  );
}

export type ClientHealthType =
  | "good"
  | "excellent"
  | "at_risk"
  | "fair"
  | "critical"
  | "poor"
  | string
  | null
  | undefined;

export function ClientHealthBadge({
  health,
  className,
}: {
  health: ClientHealthType;
  className?: string;
}) {
  if (!health) return null;

  const normalized = health.toLowerCase();

  const isGood = normalized === "good" || normalized === "excellent";
  const isAtRisk = normalized === "at_risk" || normalized === "fair";
  const isCritical = normalized === "critical" || normalized === "poor";

  let style = "bg-surface-3 text-foreground-secondary border-border-subtle";
  let dotColor = "bg-foreground-muted";
  let label = health;

  if (isGood) {
    style = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
    dotColor = "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]";
    label = normalized === "excellent" ? "Excellent" : "Good";
  } else if (isAtRisk) {
    style = "bg-amber-500/10 text-amber-400 border-amber-500/25";
    dotColor = "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]";
    label = normalized === "fair" ? "Fair" : "At Risk";
  } else if (isCritical) {
    style = "bg-rose-500/10 text-rose-400 border-rose-500/25";
    dotColor = "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]";
    label = normalized === "poor" ? "Poor" : "Critical";
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        style,
        className,
      )}
    >
      <span
        className={cn(
          "mr-1.5 inline-block size-1.5 shrink-0 rounded-full",
          dotColor,
        )}
      />
      {label}
    </Badge>
  );
}

export function ClientCommunicationBadge({
  channel,
  className,
}: {
  channel: string | null | undefined;
  className?: string;
}) {
  if (!channel) return null;

  const normalized = channel.toLowerCase();

  const icons: Record<string, typeof Mail> = {
    slack: Hash,
    email: Mail,
    whatsapp: MessageSquare,
    phone: Phone,
    portal: ShieldCheck,
  };

  const IconComponent = icons[normalized] || Mail;

  const labels: Record<string, string> = {
    slack: "Slack",
    email: "Email",
    whatsapp: "WhatsApp",
    phone: "Phone",
    portal: "Portal",
  };

  return (
    <span
      className={cn(
        "text-foreground-muted bg-surface-1 border-border-subtle inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs",
        className,
      )}
    >
      <IconComponent className="text-brand-primary size-3" />
      <span>{labels[normalized] || channel}</span>
    </span>
  );
}

export function ClientContactTypeBadge({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const normalized = (type || "").toLowerCase();

  const configs: Record<
    string,
    { label: string; icon: typeof User; style: string }
  > = {
    primary: {
      label: "Primary",
      icon: Star,
      style: "bg-brand-primary/10 text-brand-primary border-brand-primary/30",
    },
    billing: {
      label: "Billing",
      icon: CreditCard,
      style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    },
    technical: {
      label: "Technical",
      icon: Code2,
      style: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    },
    marketing: {
      label: "Marketing",
      icon: Sparkles,
      style: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    },
    legal: {
      label: "Legal",
      icon: Scale,
      style: "bg-slate-500/10 text-slate-300 border-slate-500/25",
    },
    creative: {
      label: "Creative",
      icon: Sparkles,
      style: "bg-sky-500/10 text-sky-400 border-sky-500/25",
    },
    other: {
      label: "Other",
      icon: User,
      style: "bg-surface-3 text-foreground-muted border-border-subtle",
    },
  };

  const config = configs[normalized] || configs.other;
  const IconComponent = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium",
        config.style,
        className,
      )}
    >
      <IconComponent className="size-3" />
      <span>{config.label}</span>
    </Badge>
  );
}
