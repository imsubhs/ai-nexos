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
import {
  ClientContactTypeBadge,
  ClientStatusBadge,
} from "./client-badges";
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
      toast.error(err instanceof Error ? err.message : "Failed to archive contact");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-surface-2 border-border p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <SheetHeader className="p-0 space-y-1">
            <div className="flex items-center gap-2">
              <ClientContactTypeBadge type={contact.contactType} />
              {contact.status && <ClientStatusBadge status={contact.status} />}
            </div>
            <SheetTitle className="text-xl font-bold text-foreground-heading mt-2">
              {contact.name}
            </SheetTitle>
            {contact.designation && (
              <SheetDescription className="text-sm text-foreground-secondary">
                {contact.designation}
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="border-t border-border-subtle pt-4 space-y-4">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Contact Channels
              </div>

              {contact.email ? (
                <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-1 border border-border-subtle text-sm">
                  <div className="flex items-center gap-2 text-foreground truncate">
                    <Mail className="size-4 text-brand-primary shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="truncate hover:text-brand-primary hover:underline"
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
                <div className="text-xs text-foreground-muted italic">No email provided</div>
              )}

              {contact.phone && (
                <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-1 border border-border-subtle text-sm">
                  <div className="flex items-center gap-2 text-foreground truncate">
                    <Phone className="size-4 text-brand-primary shrink-0" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="truncate hover:text-brand-primary hover:underline"
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
                <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-1 border border-border-subtle text-sm">
                  <div className="flex items-center gap-2 text-foreground truncate">
                    <ExternalLink className="size-4 text-brand-primary shrink-0" />
                    <a
                      href={contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-brand-primary hover:underline text-xs"
                    >
                      {contact.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {contact.notes && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Notes & Details
                </div>
                <div className="p-3 rounded-md bg-surface-1 border border-border-subtle text-xs text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                  {contact.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border-subtle pt-4 flex items-center justify-between gap-3">
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
