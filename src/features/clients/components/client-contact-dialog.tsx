"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { insertContactSchema } from "../schemas";
import { createContact, updateContact } from "../actions";

export interface ContactData {
  contactId?: string;
  clientId: string;
  name: string;
  contactType: "primary" | "billing" | "marketing" | "technical" | "legal";
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin?: string | null;
  notes?: string | null;
  status?: "active" | "inactive" | "archived";
}

interface ClientContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  initialData?: ContactData | null;
  onSuccess?: () => void;
}

export function ClientContactDialog({
  open,
  onOpenChange,
  clientId,
  initialData,
  onSuccess,
}: ClientContactDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const isEditing = Boolean(initialData?.contactId);

  const form = useForm<z.input<typeof insertContactSchema>>({
    resolver: zodResolver(insertContactSchema),
    values: {
      clientId,
      name: initialData?.name || "",
      contactType: initialData?.contactType || "primary",
      designation: initialData?.designation || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      linkedin: initialData?.linkedin || "",
      notes: initialData?.notes || "",
      status: initialData?.status || "active",
    },
  });

  const onSubmit = async (values: z.input<typeof insertContactSchema>) => {
    setIsPending(true);
    try {
      const parsed = insertContactSchema.parse(values);

      if (isEditing && initialData?.contactId) {
        await updateContact(initialData.contactId, clientId, {
          name: parsed.name,
          contactType: parsed.contactType,
          designation: parsed.designation,
          email: parsed.email,
          phone: parsed.phone,
          linkedin: parsed.linkedin,
          notes: parsed.notes,
          status: parsed.status,
        });
        toast.success("Contact updated successfully");
      } else {
        await createContact(parsed);
        toast.success("Contact added successfully");
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save contact",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Stakeholder Contact" : "Add Stakeholder Contact"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update stakeholder information, communication channels, and role."
              : "Register a key client stakeholder for collaboration and reviews."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="contact-name"
              className="text-foreground-secondary text-xs font-medium"
            >
              Full Name *
            </Label>
            <Input
              id="contact-name"
              placeholder="e.g. Sarah Jenkins"
              {...form.register("name")}
              className="bg-surface-2 border-border"
            />
            {form.formState.errors.name && (
              <p className="text-destructive text-xs">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="contact-type"
                className="text-foreground-secondary text-xs font-medium"
              >
                Contact Type
              </Label>
              <select
                id="contact-type"
                {...form.register("contactType")}
                className="border-border bg-surface-2 text-foreground focus:ring-brand-primary h-8 w-full cursor-pointer rounded-md border px-2.5 text-sm focus:ring-2 focus:outline-none"
              >
                <option value="primary">Primary Contact</option>
                <option value="billing">Billing / Finance</option>
                <option value="technical">Technical Lead</option>
                <option value="marketing">Marketing Director</option>
                <option value="legal">Legal Counsel</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="contact-designation"
                className="text-foreground-secondary text-xs font-medium"
              >
                Designation / Title
              </Label>
              <Input
                id="contact-designation"
                placeholder="e.g. VP Marketing"
                {...form.register("designation")}
                className="bg-surface-2 border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="contact-email"
                className="text-foreground-secondary text-xs font-medium"
              >
                Email Address
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="sarah@company.com"
                {...form.register("email")}
                className="bg-surface-2 border-border"
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="contact-phone"
                className="text-foreground-secondary text-xs font-medium"
              >
                Phone Number
              </Label>
              <Input
                id="contact-phone"
                placeholder="+1 (555) 000-0000"
                {...form.register("phone")}
                className="bg-surface-2 border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="contact-linkedin"
                className="text-foreground-secondary text-xs font-medium"
              >
                LinkedIn URL
              </Label>
              <Input
                id="contact-linkedin"
                placeholder="https://linkedin.com/in/..."
                {...form.register("linkedin")}
                className="bg-surface-2 border-border"
              />
              {form.formState.errors.linkedin && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.linkedin.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="contact-status"
                className="text-foreground-secondary text-xs font-medium"
              >
                Status
              </Label>
              <select
                id="contact-status"
                {...form.register("status")}
                className="border-border bg-surface-2 text-foreground focus:ring-brand-primary h-8 w-full cursor-pointer rounded-md border px-2.5 text-sm focus:ring-2 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="contact-notes"
              className="text-foreground-secondary text-xs font-medium"
            >
              Notes & Preferences
            </Label>
            <textarea
              id="contact-notes"
              rows={3}
              placeholder="Communication preferences, timezone, availability notes..."
              {...form.register("notes")}
              className="border-border bg-surface-2 text-foreground placeholder:text-foreground-muted focus:ring-brand-primary w-full rounded-md border p-2.5 text-sm focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="border-border-subtle flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
