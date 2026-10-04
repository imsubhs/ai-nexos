"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClientHealthBadge,
  ClientStatusBadge,
  ClientCommunicationBadge,
} from "./client-badges";
import { ClientForm } from "./client-form";
import { ClientContactDialog } from "./client-contact-dialog";
import { SharePortalDialog } from "./share-portal-dialog";
import {
  Globe,
  MapPin,
  Plus,
  Share2,
  UserPlus,
  Settings,
  FolderKanban,
  Star,
} from "lucide-react";
import type { clients } from "@/db/schema";

type ClientRow = typeof clients.$inferSelect & {
  contacts?: Array<{
    contactId: string;
    clientId: string;
    name: string;
    contactType: "primary" | "billing" | "marketing" | "technical" | "legal";
    designation?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: "active" | "inactive" | "archived";
  }>;
};

interface ClientCommandHeaderProps {
  client: ClientRow;
  activeProjectsCount?: number;
  onRefresh?: () => void;
}

function getInitials(name: string) {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function ClientCommandHeader({
  client,
  activeProjectsCount,
  onRefresh,
}: ClientCommandHeaderProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isSharePortalOpen, setIsSharePortalOpen] = useState(false);

  const displayWebsite = client.website
    ? client.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
    : null;

  const displayLocation = [client.address, client.country].filter(Boolean).join(", ");

  const primaryContact = client.contacts?.find((c) => c.contactType === "primary") || client.contacts?.[0];

  return (
    <div className="space-y-4">
      {/* Main command card */}
      <div className="rounded-xl border border-border bg-surface-2 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity & Details */}
          <div className="flex items-start gap-4">
            <Avatar className="size-16 rounded-xl border border-border bg-surface-1 shadow-xs shrink-0">
              <AvatarImage
                src={client.logoUrl || undefined}
                alt={client.companyName}
                className="object-contain p-1.5"
              />
              <AvatarFallback className="rounded-xl bg-surface-3 text-brand-primary font-mono font-bold text-lg border border-border-subtle">
                {getInitials(client.companyName)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground-heading">
                  {client.companyName}
                </h1>
                <ClientStatusBadge status={client.status} />
                {client.clientHealth && (
                  <ClientHealthBadge health={client.clientHealth} />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-muted">
                {client.industry && (
                  <span className="text-foreground-secondary font-medium">
                    {client.industry}
                  </span>
                )}

                {displayWebsite && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <Globe className="size-3.5 text-foreground-subtle" />
                    <a
                      href={client.website!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-primary hover:underline"
                    >
                      {displayWebsite}
                    </a>
                  </div>
                )}

                {displayLocation && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-foreground-subtle" />
                    <span>{displayLocation}</span>
                  </div>
                )}

                {client.preferredCommunication && (
                  <ClientCommunicationBadge channel={client.preferredCommunication} />
                )}

                {activeProjectsCount !== undefined && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <FolderKanban className="size-3.5 text-foreground-subtle" />
                    <span>
                      {activeProjectsCount} active {activeProjectsCount === 1 ? "project" : "projects"}
                    </span>
                  </div>
                )}
              </div>

              {primaryContact && (
                <div className="pt-1 flex items-center gap-1.5 text-xs text-foreground-secondary">
                  <Star className="size-3 text-amber-400 fill-amber-400" />
                  <span className="text-foreground-muted">Primary Stakeholder:</span>
                  <span className="font-medium text-foreground">{primaryContact.name}</span>
                  {primaryContact.designation && (
                    <span className="text-foreground-subtle">({primaryContact.designation})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Ribbon */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-subtle">
            <Button
              size="sm"
              className="gap-1.5 shadow-xs"
              render={
                <Link href={`/projects?create=true&clientId=${client.clientId}`}>
                  <Plus className="size-3.5" />
                  <span>New Project</span>
                </Link>
              }
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddContactOpen(true)}
              className="gap-1.5"
            >
              <UserPlus className="size-3.5" />
              <span>Add Contact</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSharePortalOpen(true)}
              className="gap-1.5"
            >
              <Share2 className="size-3.5" />
              <span>Share Portal</span>
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsEditOpen(true)}
              aria-label="Edit client settings"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Edit Client Account</DialogTitle>
            <DialogDescription>
              Update corporate metadata, brand guidelines, and communication preferences.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            initialData={client as any}
            onSuccess={() => {
              setIsEditOpen(false);
              onRefresh?.();
            }}
          />
        </DialogContent>
      </Dialog>

      <ClientContactDialog
        open={isAddContactOpen}
        onOpenChange={setIsAddContactOpen}
        clientId={client.clientId}
        onSuccess={() => {
          setIsAddContactOpen(false);
          onRefresh?.();
        }}
      />

      <SharePortalDialog
        open={isSharePortalOpen}
        onOpenChange={setIsSharePortalOpen}
        client={{
          clientId: client.clientId,
          companyName: client.companyName,
        }}
      />
    </div>
  );
}
