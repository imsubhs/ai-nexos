import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getClientActivity, getClientById } from "@/features/clients/actions";
import {
  ClientHealthBadge,
  ClientStatusBadge,
} from "@/features/clients/components/client-badges";
import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = await getClientById(clientId);
  if (!client) return { title: "Not Found" };
  return { title: `${client.companyName} | Clients` };
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const [client, activities] = await Promise.all([
    getClientById(clientId),
    getClientActivity(clientId),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-8 pt-6">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/clients" />}>
              Clients
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[200px] truncate sm:max-w-[400px]">
              {client.companyName}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center space-x-4">
          <Avatar className="border-border h-16 w-16 border-2 shadow-sm">
            <AvatarImage
              src={client.logoUrl || undefined}
              alt={client.companyName}
            />
            <AvatarFallback className="bg-primary/5 text-primary text-xl font-semibold">
              {client.companyName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {client.companyName}
            </h1>
            <div className="mt-1 flex items-center space-x-3">
              <ClientStatusBadge status={client.status} />
              <ClientHealthBadge health={client.clientHealth} />
              {client.industry && (
                <span className="text-muted-foreground text-sm">
                  {client.industry}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Details & Brand Assets */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.website && (
                <div className="flex items-center text-sm">
                  <Globe className="text-muted-foreground mr-2 h-4 w-4" />
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {client.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
              {(client.address || client.country) && (
                <div className="flex items-start text-sm">
                  <MapPin className="text-muted-foreground mt-0.5 mr-2 h-4 w-4" />
                  <span>
                    {[client.address, client.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.brandColors &&
              Array.isArray(client.brandColors) &&
              client.brandColors.length > 0 ? (
                <div>
                  <div className="mb-2 text-sm font-medium">Brand Colors</div>
                  <div className="flex space-x-2">
                    {client.brandColors.map((color: string, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full border shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No brand colors specified.
                </div>
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
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            {contact.name}
                            <Badge
                              variant="secondary"
                              className="text-xs uppercase"
                            >
                              {contact.contactType}
                            </Badge>
                          </div>
                          {contact.designation && (
                            <div className="text-muted-foreground text-sm">
                              {contact.designation}
                            </div>
                          )}

                          <div className="mt-2 space-y-1">
                            {contact.email && (
                              <div className="text-muted-foreground flex items-center text-sm">
                                <Mail className="mr-2 h-4 w-4" />
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="hover:text-foreground transition-colors"
                                >
                                  {contact.email}
                                </a>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="text-muted-foreground flex items-center text-sm">
                                <Phone className="mr-2 h-4 w-4" />
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="hover:text-foreground transition-colors"
                                >
                                  {contact.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
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
                <div className="before:via-border relative space-y-4 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:to-transparent md:before:mx-auto md:before:translate-x-0">
                  {activities.map((activity) => (
                    <div
                      key={activity.activityId}
                      className="group is-active relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white bg-slate-100 text-slate-500 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 dark:border-slate-800 dark:bg-slate-700 dark:text-slate-200">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] rounded border border-slate-200 bg-white p-4 shadow-sm md:w-[calc(50%-2.5rem)] dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-1 flex items-center justify-between space-x-2">
                          <div className="text-xs font-bold tracking-wider text-slate-900 uppercase dark:text-slate-100">
                            {activity.action}
                          </div>
                          <time className="font-caveat text-xs font-medium text-slate-500">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </time>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">
                          {activity.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
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
