import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getClientActivity, getClientById } from "@/features/clients/actions";
import { ClientHealthBadge, ClientStatusBadge } from "@/features/clients/components/client-badges";
import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) return { title: "Not Found" };
  return { title: `${client.companyName} | Clients | AIC Nex OS` };
}

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const [client, activities] = await Promise.all([
    getClientById(clientId),
    getClientActivity(clientId),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16 border-2 border-border shadow-sm">
            <AvatarImage src={client.logoUrl || undefined} alt={client.companyName} />
            <AvatarFallback className="bg-primary/5 text-primary text-xl font-semibold">
              {client.companyName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{client.companyName}</h2>
            <div className="flex items-center space-x-3 mt-1">
              <ClientStatusBadge status={client.status} />
              <ClientHealthBadge health={client.clientHealth} />
              {client.industry && <span className="text-sm text-muted-foreground">{client.industry}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details & Brand Assets */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.website && (
                <div className="flex items-center text-sm">
                  <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                  <a href={client.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {client.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              {(client.address || client.country) && (
                <div className="flex items-start text-sm">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" />
                  <span>{[client.address, client.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.brandColors && Array.isArray(client.brandColors) && client.brandColors.length > 0 ? (
                <div>
                  <div className="text-sm font-medium mb-2">Brand Colors</div>
                  <div className="flex space-x-2">
                    {client.brandColors.map((color: string, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No brand colors specified.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Column: Contacts */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {client.contacts && client.contacts.length > 0 ? (
                <div className="space-y-4">
                  {client.contacts.map((contact, index) => (
                    <div key={contact.contactId}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {contact.name}
                            <Badge variant="secondary" className="text-xs uppercase">{contact.contactType}</Badge>
                          </div>
                          {contact.designation && <div className="text-sm text-muted-foreground">{contact.designation}</div>}
                          
                          <div className="mt-2 space-y-1">
                            {contact.email && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Mail className="w-4 h-4 mr-2" />
                                <a href={`mailto:${contact.email}`} className="hover:text-foreground transition-colors">{contact.email}</a>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="w-4 h-4 mr-2" />
                                <a href={`tel:${contact.phone}`} className="hover:text-foreground transition-colors">{contact.phone}</a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                  <p>No contacts added yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {activities.map((activity) => (
                    <div key={activity.activityId} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 dark:border-slate-800 dark:bg-slate-700 dark:text-slate-200">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-slate-900 dark:text-slate-100 uppercase text-xs tracking-wider">{activity.action}</div>
                          <time className="font-caveat font-medium text-slate-500 text-xs">{new Date(activity.createdAt).toLocaleDateString()}</time>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {activity.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                  <p>No recent activity.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
