"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createClient, updateClient } from "../actions";
import { insertClientSchema, updateClientSchema } from "../schemas";

type ClientFormProps = {
  initialData?: z.infer<typeof updateClientSchema> & { clientId?: string };
  onSuccess?: () => void;
};

export function ClientForm({ initialData, onSuccess }: ClientFormProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.input<typeof insertClientSchema>>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      companyName: initialData?.companyName || "",
      industry: initialData?.industry || "",
      website: initialData?.website || "",
      status: (initialData?.status as "active" | "prospect" | "archived") || "active",
      clientHealth: initialData?.clientHealth || null,
      country: initialData?.country || "",
      address: initialData?.address || "",
    },
  });

  async function onSubmit(data: z.input<typeof insertClientSchema>) {
    setIsPending(true);
    try {
      const validatedData = data as z.infer<typeof insertClientSchema>;
      if (initialData?.clientId) {
        await updateClient(initialData.clientId, validatedData);
        toast.success("Client updated successfully");
      } else {
        await createClient(validatedData);
        toast.success("Client created successfully");
      }
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name *</Label>
        <Input id="companyName" {...form.register("companyName")} />
        {form.formState.errors.companyName && (
          <p className="text-sm text-destructive">{form.formState.errors.companyName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" {...form.register("industry")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...form.register("website")} placeholder="https://" />
          {form.formState.errors.website && (
            <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" {...form.register("country")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" {...form.register("address")} />
        </div>
      </div>

      <div className="pt-4 flex justify-end space-x-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : initialData ? "Save Changes" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
