import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { clients } from "@/db/schema";
import { Building2, Globe, MapPin } from "lucide-react";
import Link from "next/link";
import { ClientHealthBadge, ClientStatusBadge } from "./client-badges";

import { EmptyState } from "@/components/shared/empty-state";

type Client = typeof clients.$inferSelect;

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

export function ClientList({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No clients found"
        description="Get started by adding your first client to manage accounts, project assignments, and assets."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => (
        <Link
          href={`/clients/${client.clientId}`}
          key={client.clientId}
          className="group block"
        >
          <Card className="hover:border-brand-primary/50 h-full transition-all duration-200 group-hover:-translate-y-0.5 hover:shadow-xs">
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div className="flex items-center space-x-3">
                <Avatar className="border-border h-11 w-11 border">
                  <AvatarImage
                    src={client.logoUrl || undefined}
                    alt={client.companyName}
                  />
                  <AvatarFallback className="bg-surface-3 text-brand-primary font-semibold border border-border">
                    {getInitials(client.companyName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="line-clamp-1 text-lg">
                    {client.companyName}
                  </CardTitle>
                  <p className="text-muted-foreground line-clamp-1 text-sm">
                    {client.industry}
                  </p>
                </div>
              </div>
              <ClientStatusBadge status={client.status} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {client.website && (
                  <div className="text-muted-foreground flex items-center text-sm">
                    <Globe className="mr-2 h-4 w-4 opacity-70" />
                    <span className="hover:text-foreground line-clamp-1 transition-colors">
                      {client.website.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                )}
                {(client.country || client.address) && (
                  <div className="text-muted-foreground flex items-center text-sm">
                    <MapPin className="mr-2 h-4 w-4 opacity-70" />
                    <span className="line-clamp-1">
                      {[client.address, client.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {client.clientHealth && (
                  <div className="border-border/50 mt-3 flex justify-end border-t pt-3">
                    <ClientHealthBadge health={client.clientHealth} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
