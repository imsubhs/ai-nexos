"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ClientContactTypeBadge,
  ClientStatusBadge,
} from "./client-badges";
import { ClientContactDrawer } from "./client-contact-drawer";
import { ClientContactDialog, ContactData } from "./client-contact-dialog";
import { NoContactsEmptyState } from "./client-empty-state";
import { Mail, Phone, ExternalLink, Plus, Edit2, Archive, User } from "lucide-react";
import { archiveContact } from "../actions";
import { toast } from "sonner";

interface ClientContactsTabProps {
  clientId: string;
  contacts: ContactData[];
  onRefresh?: () => void;
}

export function ClientContactsTab({
  clientId,
  contacts,
  onRefresh,
}: ClientContactsTabProps) {
  const [selectedContact, setSelectedContact] = useState<ContactData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactData | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleOpenDrawer = (contact: ContactData) => {
    setSelectedContact(contact);
    setIsDrawerOpen(true);
  };

  const handleEdit = (contact: ContactData) => {
    setEditingContact(contact);
    setIsEditOpen(true);
  };

  const handleArchive = async (contact: ContactData) => {
    if (!contact.contactId) return;
    if (!window.confirm(`Archive contact ${contact.name}?`)) return;

    try {
      await archiveContact(contact.contactId, clientId);
      toast.success("Contact archived");
      onRefresh?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive contact");
    }
  };

  if (!contacts || contacts.length === 0) {
    return (
      <>
        <NoContactsEmptyState onAddContact={() => setIsAddOpen(true)} />
        <ClientContactDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          clientId={clientId}
          onSuccess={onRefresh}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-foreground-muted px-1">
        <span>{contacts.length} registered {contacts.length === 1 ? "contact" : "contacts"}</span>
        <Button size="xs" variant="outline" onClick={() => setIsAddOpen(true)} className="gap-1">
          <Plus className="size-3" />
          <span>Add Contact</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contacts.map((contact) => (
          <div
            key={contact.contactId}
            className="group relative flex flex-col justify-between p-4 rounded-lg border border-border-subtle bg-surface-2 hover:border-brand-primary/40 hover:bg-surface-3/80 transition-all duration-150"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-surface-1 border border-border-subtle text-foreground-muted shrink-0">
                    <User className="size-4 text-brand-primary" />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDrawer(contact)}
                      className="font-heading text-sm font-semibold text-foreground group-hover:text-brand-primary-soft hover:underline transition-colors text-left cursor-pointer"
                    >
                      {contact.name}
                    </button>
                    {contact.designation && (
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {contact.designation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <ClientContactTypeBadge type={contact.contactType} />
                  {contact.status && <ClientStatusBadge status={contact.status} />}
                </div>
              </div>

              {/* Channels */}
              <div className="mt-3.5 space-y-1.5 text-xs text-foreground-secondary">
                {contact.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="size-3.5 text-foreground-subtle shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="truncate hover:text-brand-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center gap-2 truncate">
                    <Phone className="size-3.5 text-foreground-subtle shrink-0" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="truncate hover:text-brand-primary hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}

                {contact.linkedin && (
                  <div className="flex items-center gap-2 truncate">
                    <ExternalLink className="size-3.5 text-foreground-subtle shrink-0" />
                    <a
                      href={contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-brand-primary hover:underline text-[11px]"
                    >
                      {contact.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Actions footer */}
            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleOpenDrawer(contact)}
                className="text-xs text-foreground-subtle hover:text-foreground cursor-pointer font-medium"
              >
                View Details →
              </button>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleEdit(contact)}
                  aria-label="Edit contact"
                >
                  <Edit2 className="size-3 text-foreground-muted hover:text-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleArchive(contact)}
                  aria-label="Archive contact"
                >
                  <Archive className="size-3 text-foreground-muted hover:text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      <ClientContactDrawer
        contact={selectedContact}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onEdit={(contact) => {
          setIsDrawerOpen(false);
          handleEdit(contact);
        }}
        onArchived={onRefresh}
      />

      {/* Add Dialog */}
      <ClientContactDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        clientId={clientId}
        onSuccess={onRefresh}
      />

      {/* Edit Dialog */}
      <ClientContactDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        clientId={clientId}
        initialData={editingContact}
        onSuccess={onRefresh}
      />
    </div>
  );
}
