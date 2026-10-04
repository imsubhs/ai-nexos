"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient, updateClient } from "../actions";
import { insertClientSchema, updateClientSchema } from "../schemas";
import { Plus, X } from "lucide-react";

type ClientFormProps = {
  initialData?: z.infer<typeof updateClientSchema> & { clientId?: string };
  onSuccess?: (clientId?: string) => void;
};

export function ClientForm({ initialData, onSuccess }: ClientFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [colorInput, setColorInput] = useState("");
  const [brandColors, setBrandColors] = useState<string[]>(
    Array.isArray(initialData?.brandColors) ? (initialData.brandColors as string[]) : [],
  );

  const form = useForm<z.input<typeof insertClientSchema>>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      companyName: initialData?.companyName || "",
      industry: initialData?.industry || "",
      website: initialData?.website || "",
      status: (initialData?.status as "active" | "prospect" | "archived") || "active",
      clientHealth: (initialData?.clientHealth as "good" | "at_risk" | "critical") || "good",
      preferredCommunication:
        (initialData?.preferredCommunication as "email" | "slack" | "whatsapp" | "phone") || "email",
      country: initialData?.country || "",
      address: initialData?.address || "",
      notes: initialData?.notes || "",
      logoUrl: initialData?.logoUrl || "",
      brandAssetsUrl: initialData?.brandAssetsUrl || "",
      googleDriveFolderUrl: initialData?.googleDriveFolderUrl || "",
    },
  });

  const handleAddColor = () => {
    const trimmed = colorInput.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!/^#[0-9a-fA-F]{6}$/i.test(formatted)) {
      toast.error("Please enter a valid 6-character hex color (e.g. #06151E)");
      return;
    }
    if (brandColors.includes(formatted)) {
      toast.error("Color already added");
      return;
    }
    setBrandColors([...brandColors, formatted]);
    setColorInput("");
  };

  const handleRemoveColor = (hex: string) => {
    setBrandColors(brandColors.filter((c) => c !== hex));
  };

  async function onSubmit(data: z.input<typeof insertClientSchema>) {
    setIsPending(true);
    try {
      const payload = {
        ...data,
        brandColors: brandColors.length > 0 ? brandColors : null,
      } as z.infer<typeof insertClientSchema>;

      if (initialData?.clientId) {
        await updateClient(initialData.clientId, payload);
        toast.success("Client updated successfully");
        onSuccess?.(initialData.clientId);
      } else {
        const created = await createClient(payload);
        toast.success("Client created successfully");
        onSuccess?.(created?.clientId);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
      {/* 1. Core Company Details */}
      <div className="space-y-1.5">
        <Label htmlFor="companyName" className="text-xs text-foreground-secondary font-medium">
          Company Name *
        </Label>
        <Input
          id="companyName"
          placeholder="e.g. Acme Studios, Globex Creative"
          {...form.register("companyName")}
          className="bg-surface-2 border-border"
        />
        {form.formState.errors.companyName && (
          <p className="text-destructive text-xs">
            {form.formState.errors.companyName.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="industry" className="text-xs text-foreground-secondary font-medium">
            Industry
          </Label>
          <Input
            id="industry"
            placeholder="e.g. Media & Entertainment, SaaS"
            {...form.register("industry")}
            className="bg-surface-2 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website" className="text-xs text-foreground-secondary font-medium">
            Website URL
          </Label>
          <Input
            id="website"
            placeholder="https://example.com"
            {...form.register("website")}
            className="bg-surface-2 border-border"
          />
          {form.formState.errors.website && (
            <p className="text-destructive text-xs">
              {form.formState.errors.website.message}
            </p>
          )}
        </div>
      </div>

      {/* 2. Relationship & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="status" className="text-xs text-foreground-secondary font-medium">
            Status
          </Label>
          <select
            id="status"
            {...form.register("status")}
            className="w-full h-8 px-2.5 rounded-md border border-border bg-surface-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
          >
            <option value="active">Active</option>
            <option value="prospect">Prospect / Lead</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="clientHealth" className="text-xs text-foreground-secondary font-medium">
            Client Health
          </Label>
          <select
            id="clientHealth"
            {...form.register("clientHealth")}
            className="w-full h-8 px-2.5 rounded-md border border-border bg-surface-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
          >
            <option value="good">Good (Healthy)</option>
            <option value="at_risk">At Risk (Review)</option>
            <option value="critical">Critical (Intervention)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="preferredCommunication" className="text-xs text-foreground-secondary font-medium">
            Communication
          </Label>
          <select
            id="preferredCommunication"
            {...form.register("preferredCommunication")}
            className="w-full h-8 px-2.5 rounded-md border border-border bg-surface-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
          >
            <option value="email">Email</option>
            <option value="slack">Slack</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
          </select>
        </div>
      </div>

      {/* 3. Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="country" className="text-xs text-foreground-secondary font-medium">
            Country / Region
          </Label>
          <Input
            id="country"
            placeholder="e.g. United States, United Kingdom"
            {...form.register("country")}
            className="bg-surface-2 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-xs text-foreground-secondary font-medium">
            HQ Address
          </Label>
          <Input
            id="address"
            placeholder="e.g. 500 Broadway, New York, NY"
            {...form.register("address")}
            className="bg-surface-2 border-border"
          />
        </div>
      </div>

      {/* 4. Brand & Repositories */}
      <div className="space-y-3 pt-2 border-t border-border-subtle">
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
          Brand Guidelines & Assets
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-foreground-secondary font-medium">
            Brand Hex Colors
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="#06151E"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddColor();
                  }
                }}
                className="bg-surface-2 border-border font-mono text-xs"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddColor}
              className="gap-1"
            >
              <Plus className="size-3.5" />
              <span>Add</span>
            </Button>
          </div>

          {brandColors.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              {brandColors.map((color) => (
                <div
                  key={color}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2 border border-border-subtle text-xs font-mono"
                >
                  <span
                    className="size-3 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span>{color}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(color)}
                    className="hover:text-destructive cursor-pointer ml-1"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="googleDriveFolderUrl" className="text-xs text-foreground-secondary font-medium">
              Google Drive Folder URL
            </Label>
            <Input
              id="googleDriveFolderUrl"
              placeholder="https://drive.google.com/..."
              {...form.register("googleDriveFolderUrl")}
              className="bg-surface-2 border-border"
            />
            {form.formState.errors.googleDriveFolderUrl && (
              <p className="text-destructive text-xs">
                {form.formState.errors.googleDriveFolderUrl.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brandAssetsUrl" className="text-xs text-foreground-secondary font-medium">
              Brand Assets / DAM URL
            </Label>
            <Input
              id="brandAssetsUrl"
              placeholder="https://assets.example.com"
              {...form.register("brandAssetsUrl")}
              className="bg-surface-2 border-border"
            />
            {form.formState.errors.brandAssetsUrl && (
              <p className="text-destructive text-xs">
                {form.formState.errors.brandAssetsUrl.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="logoUrl" className="text-xs text-foreground-secondary font-medium">
            Company Logo URL
          </Label>
          <Input
            id="logoUrl"
            placeholder="https://example.com/logo.png"
            {...form.register("logoUrl")}
            className="bg-surface-2 border-border"
          />
          {form.formState.errors.logoUrl && (
            <p className="text-destructive text-xs">
              {form.formState.errors.logoUrl.message}
            </p>
          )}
        </div>
      </div>

      {/* 5. Notes */}
      <div className="space-y-1.5 pt-2 border-t border-border-subtle">
        <Label htmlFor="notes" className="text-xs text-foreground-secondary font-medium">
          Executive Notes
        </Label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Client background, key relationships, high-level preferences..."
          {...form.register("notes")}
          className="w-full rounded-md border border-border bg-surface-2 p-2.5 text-foreground text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
        >
          {isPending
            ? "Saving..."
            : initialData?.clientId
              ? "Save Changes"
              : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
