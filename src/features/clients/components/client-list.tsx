import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { clients } from "@/db/schema";
import { Building2, Globe, MapPin } from "lucide-react";
import Link from "next/link";
import { ClientHealthBadge, ClientStatusBadge } from "./client-badges";

type Client = typeof clients.$inferSelect;

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

export function ClientList({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-dashed">
        <Building2 className="w-12 h-12 mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold tracking-tight">No clients found</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          Get started by adding your first client to manage their projects, contacts, and assets.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {clients.map((client) => (
        <Link href={`/clients/${client.clientId}`} key={client.clientId} className="block group">
          <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30 group-hover:-translate-y-1">
            <CardHeader className="flex flex-row items-start justify-between pb-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={client.logoUrl || undefined} alt={client.companyName} />
                  <AvatarFallback className="bg-primary/5 font-semibold text-primary">
                    {getInitials(client.companyName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg line-clamp-1">{client.companyName}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-1">{client.industry}</p>
                </div>
              </div>
              <ClientStatusBadge status={client.status} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {client.website && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Globe className="w-4 h-4 mr-2 opacity-70" />
                    <span className="line-clamp-1 hover:text-foreground transition-colors">
                      {client.website.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                )}
                {(client.country || client.address) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2 opacity-70" />
                    <span className="line-clamp-1">
                      {[client.address, client.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                
                {client.clientHealth && (
                  <div className="pt-3 flex justify-end border-t mt-3 border-border/50">
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
