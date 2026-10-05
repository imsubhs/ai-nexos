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

  const displayLocation = [client.address, client.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/clients/${client.clientId}`}
      className="group block focus-visible:outline-none"
    >
      <Card className="border-border bg-surface-2 hover:border-brand-primary/50 hover:bg-surface-3/70 relative flex h-full flex-col justify-between border p-5 transition-all duration-200 group-hover:-translate-y-0.5 hover:shadow-xs">
        <div>
          {/* Header row: Monogram + Name + Statuses */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar className="border-border-subtle bg-surface-1 size-11 shrink-0 rounded-lg border shadow-xs">
                <AvatarImage
                  src={client.logoUrl || undefined}
                  alt={client.companyName}
                  className="object-contain p-1"
                />
                <AvatarFallback className="bg-surface-3 text-brand-primary border-border-subtle rounded-lg border font-mono text-xs font-semibold">
                  {getInitials(client.companyName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-heading text-foreground group-hover:text-brand-primary-soft truncate text-base font-semibold transition-colors">
                    {client.companyName}
                  </h3>
                  <ArrowUpRight className="text-foreground-subtle size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {client.industry && (
                  <p className="text-foreground-muted mt-0.5 truncate text-xs">
                    {client.industry}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <ClientStatusBadge status={client.status} />
              {client.clientHealth && (
                <ClientHealthBadge health={client.clientHealth} />
              )}
            </div>
          </div>

          {/* Middle metadata: website & location */}
          <div className="text-foreground-muted mt-4 space-y-2 text-xs">
            {displayWebsite && (
              <div className="flex items-center gap-2 truncate">
                <Globe className="text-foreground-subtle size-3.5 shrink-0" />
                <span className="hover:text-foreground truncate font-mono transition-colors">
                  {displayWebsite}
                </span>
              </div>
            )}

            {displayLocation && (
              <div className="flex items-center gap-2 truncate">
                <MapPin className="text-foreground-subtle size-3.5 shrink-0" />
                <span className="truncate">{displayLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer row: Brand swatches, project count, comms badge */}
        <div className="border-border-subtle mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-3.5">
          <div className="flex items-center gap-2">
            <BrandColorSwatches colors={client.brandColors} compact />
            {client.preferredCommunication && (
              <ClientCommunicationBadge
                channel={client.preferredCommunication}
              />
            )}
          </div>

          <div className="text-foreground-muted flex items-center gap-3 text-xs font-medium">
            {typeof client.activeProjectsCount === "number" && (
              <div className="text-foreground-secondary flex items-center gap-1">
                <FolderKanban className="text-brand-primary size-3.5" />
                <span>
                  {client.activeProjectsCount}{" "}
                  {client.activeProjectsCount === 1 ? "project" : "projects"}
                </span>
              </div>
            )}

            {client.primaryContact && (
              <div className="text-foreground-secondary flex max-w-[130px] items-center gap-1 truncate">
                <User className="text-foreground-subtle size-3" />
                <span className="truncate">{client.primaryContact.name}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
