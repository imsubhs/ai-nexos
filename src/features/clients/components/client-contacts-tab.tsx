"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClientContactTypeBadge, ClientStatusBadge } from "./client-badges";
import { ClientContactDrawer } from "./client-contact-drawer";
import { ClientContactDialog, ContactData } from "./client-contact-dialog";
import { NoContactsEmptyState } from "./client-empty-state";
import {
  Mail,
  Phone,
  ExternalLink,
  Plus,
  Edit2,
  Archive,
  User,
} from "lucide-react";
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
  const [selectedContact, setSelectedContact] = useState<ContactData | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactData | null>(
    null,
  );
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
      toast.error(
        err instanceof Error ? err.message : "Failed to archive contact",
      );
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
      <div className="text-foreground-muted flex items-center justify-between px-1 text-xs">
        <span>
          {contacts.length} registered{" "}
          {contacts.length === 1 ? "contact" : "contacts"}
        </span>
        <Button
          size="xs"
          variant="outline"
          onClick={() => setIsAddOpen(true)}
          className="gap-1"
        >
          <Plus className="size-3" />
          <span>Add Contact</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {contacts.map((contact) => (
          <div
            key={contact.contactId}
            className="group border-border-subtle bg-surface-2 hover:border-brand-primary/40 hover:bg-surface-3/80 relative flex flex-col justify-between rounded-lg border p-4 transition-all duration-150"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="bg-surface-1 border-border-subtle text-foreground-muted flex size-9 shrink-0 items-center justify-center rounded-lg border">
                    <User className="text-brand-primary size-4" />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenDrawer(contact)}
                      className="font-heading text-foreground group-hover:text-brand-primary-soft cursor-pointer text-left text-sm font-semibold transition-colors hover:underline"
                    >
                      {contact.name}
                    </button>
                    {contact.designation && (
                      <p className="text-foreground-muted mt-0.5 text-xs">
                        {contact.designation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <ClientContactTypeBadge type={contact.contactType} />
                  {contact.status && (
                    <ClientStatusBadge status={contact.status} />
                  )}
                </div>
              </div>

              {/* Channels */}
              <div className="text-foreground-secondary mt-3.5 space-y-1.5 text-xs">
                {contact.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="text-foreground-subtle size-3.5 shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="hover:text-brand-primary truncate hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center gap-2 truncate">
                    <Phone className="text-foreground-subtle size-3.5 shrink-0" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="hover:text-brand-primary truncate hover:underline"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}

                {contact.linkedin && (
                  <div className="flex items-center gap-2 truncate">
                    <ExternalLink className="text-foreground-subtle size-3.5 shrink-0" />
                    <a
                      href={contact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-primary truncate text-[11px] hover:underline"
                    >
                      {contact.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Actions footer */}
            <div className="border-border-subtle mt-4 flex items-center justify-between border-t pt-3">
              <button
                type="button"
                onClick={() => handleOpenDrawer(contact)}
                className="text-foreground-subtle hover:text-foreground cursor-pointer text-xs font-medium"
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
                  <Edit2 className="text-foreground-muted hover:text-foreground size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleArchive(contact)}
                  aria-label="Archive contact"
                >
                  <Archive className="text-foreground-muted hover:text-destructive size-3" />
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
