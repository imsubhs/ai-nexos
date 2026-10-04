import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  ClientHealthBadge,
  ClientStatusBadge,
  ClientCommunicationBadge,
} from "./client-badges";
import { BrandColorSwatches } from "./brand-color-swatches";
import { Globe, MapPin, FolderKanban, ArrowUpRight, User } from "lucide-react";
import type { clients } from "@/db/schema";

type ClientRow = typeof clients.$inferSelect & {
  activeProjectsCount?: number;
  primaryContact?: {
    name: string;
    email?: string | null;
  } | null;
};

interface ClientCardProps {
  client: ClientRow;
}

function getInitials(name: string) {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function ClientCard({ client }: ClientCardProps) {
  const displayWebsite = client.website
    ? client.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
    : null;

  const displayLocation = [client.address, client.country].filter(Boolean).join(", ");

  return (
    <Link href={`/clients/${client.clientId}`} className="group block focus-visible:outline-none">
      <Card className="h-full border border-border bg-surface-2 p-5 transition-all duration-200 hover:border-brand-primary/50 hover:bg-surface-3/70 hover:shadow-xs group-hover:-translate-y-0.5 relative flex flex-col justify-between">
        <div>
          {/* Header row: Monogram + Name + Statuses */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Avatar className="size-11 rounded-lg border border-border-subtle bg-surface-1 shadow-xs shrink-0">
                <AvatarImage
                  src={client.logoUrl || undefined}
                  alt={client.companyName}
                  className="object-contain p-1"
                />
                <AvatarFallback className="rounded-lg bg-surface-3 text-brand-primary font-mono font-semibold text-xs border border-border-subtle">
                  {getInitials(client.companyName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-heading text-base font-semibold text-foreground group-hover:text-brand-primary-soft transition-colors truncate">
                    {client.companyName}
                  </h3>
                  <ArrowUpRight className="size-3.5 text-foreground-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                {client.industry && (
                  <p className="text-xs text-foreground-muted truncate mt-0.5">
                    {client.industry}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <ClientStatusBadge status={client.status} />
              {client.clientHealth && (
                <ClientHealthBadge health={client.clientHealth} />
              )}
            </div>
          </div>

          {/* Middle metadata: website & location */}
          <div className="mt-4 space-y-2 text-xs text-foreground-muted">
            {displayWebsite && (
              <div className="flex items-center gap-2 truncate">
                <Globe className="size-3.5 text-foreground-subtle shrink-0" />
                <span className="truncate hover:text-foreground transition-colors font-mono">
                  {displayWebsite}
                </span>
              </div>
            )}

            {displayLocation && (
              <div className="flex items-center gap-2 truncate">
                <MapPin className="size-3.5 text-foreground-subtle shrink-0" />
                <span className="truncate">{displayLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer row: Brand swatches, project count, comms badge */}
        <div className="mt-5 pt-3.5 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BrandColorSwatches colors={client.brandColors} compact />
            {client.preferredCommunication && (
              <ClientCommunicationBadge channel={client.preferredCommunication} />
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-foreground-muted font-medium">
            {typeof client.activeProjectsCount === "number" && (
              <div className="flex items-center gap-1 text-foreground-secondary">
                <FolderKanban className="size-3.5 text-brand-primary" />
                <span>
                  {client.activeProjectsCount} {client.activeProjectsCount === 1 ? "project" : "projects"}
                </span>
              </div>
            )}

            {client.primaryContact && (
              <div className="flex items-center gap-1 text-foreground-secondary truncate max-w-[130px]">
                <User className="size-3 text-foreground-subtle" />
                <span className="truncate">{client.primaryContact.name}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
