"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ClientContactTypeBadge, ClientStatusBadge } from "./client-badges";
import { Mail, Phone, ExternalLink, Archive, Edit2 } from "lucide-react";
import { archiveContact } from "../actions";
import { toast } from "sonner";
import type { ContactData } from "./client-contact-dialog";

interface ClientContactDrawerProps {
  contact: ContactData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: ContactData) => void;
  onArchived?: () => void;
}

export function ClientContactDrawer({
  contact,
  open,
  onOpenChange,
  onEdit,
  onArchived,
}: ClientContactDrawerProps) {
  const [isArchiving, setIsArchiving] = useState(false);

  if (!contact) return null;

  const handleArchive = async () => {
    if (!contact.contactId) return;
    if (!window.confirm(`Archive contact ${contact.name}?`)) return;

    setIsArchiving(true);
    try {
      await archiveContact(contact.contactId, contact.clientId);
      toast.success("Contact archived");
      onOpenChange(false);
      onArchived?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to archive contact",
      );
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-surface-2 border-border flex w-full flex-col justify-between p-6 sm:max-w-md"
      >
        <div className="space-y-6">
          <SheetHeader className="space-y-1 p-0">
            <div className="flex items-center gap-2">
              <ClientContactTypeBadge type={contact.contactType} />
              {contact.status && <ClientStatusBadge status={contact.status} />}
            </div>
            <SheetTitle className="text-foreground-heading mt-2 text-xl font-bold">
              {contact.name}
            </SheetTitle>
            {contact.designation && (
              <SheetDescription className="text-foreground-secondary text-sm">
                {contact.designation}
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="border-border-subtle space-y-4 border-t pt-4">
            <div className="space-y-3">
              <div className="text-foreground-muted text-xs font-semibold tracking-wider uppercase">
                Contact Channels
              </div>

              {contact.email ? (
                <div className="bg-surface-1 border-border-subtle flex items-center justify-between rounded-md border p-2.5 text-sm">
                  <div className="text-foreground flex items-center gap-2 truncate">
                    <Mail className="text-brand-primary size-4 shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="hover:text-brand-primary truncate hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      navigator.clipboard.writeText(contact.email!);
                      toast.success("Email copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              ) : (
                <div className="text-foreground-muted text-xs italic">
                  No email provided
                </div>
              )}

              {contact.phone && (
                <div className="bg-surface-1 border-border-subtle flex items-center justify-between rounded-md border p-2.5 text-sm">
                  <div className="text-foreground flex items-center gap-2 truncate">
                    <Phone className="text-brand-primary size-4 shrink-0" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="hover:text-brand-primary truncate hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      navigator.clipboard.writeText(contact.phone!);
                      toast.success("Phone copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              )}

              {contact.linkedin && (
                <div className="bg-surface-1 border-border-subtle flex items-center justify-between rounded-md border p-2.5 text-sm">
                  <div className="text-foreground flex items-center gap-2 truncate">
                    <ExternalLink className="text-brand-primary size-4 shrink-0" />
                    <a
                      href={contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-primary truncate text-xs hover:underline"
                    >
                      {contact.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {contact.notes && (
              <div className="space-y-2 pt-2">
                <div className="text-foreground-muted text-xs font-semibold tracking-wider uppercase">
                  Notes & Details
                </div>
                <div className="bg-surface-1 border-border-subtle text-foreground-secondary rounded-md border p-3 text-xs leading-relaxed whitespace-pre-wrap">
                  {contact.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-border-subtle flex items-center justify-between gap-3 border-t pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleArchive}
            disabled={isArchiving}
            className="gap-1.5"
          >
            <Archive className="size-3.5" />
            <span>Archive</span>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onEdit(contact);
              }}
              className="gap-1.5"
            >
              <Edit2 className="size-3.5" />
              <span>Edit Contact</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
