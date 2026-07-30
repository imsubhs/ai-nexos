"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateOrganization } from "@/features/organizations/actions";
import { updateOrganizationSchema } from "@/features/organizations/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";

type OrganizationFormValues = z.infer<typeof updateOrganizationSchema>;

/** Fields with an input (and therefore an inline <FieldError />) below. */
const RENDERED_FIELDS = new Set([
  "organizationName",
  "legalName",
  "slug",
  "contactEmail",
  "contactPhone",
  "website",
  "country",
  "address",
  "logoUrl",
  "brandPrimaryColor",
  "brandSecondaryColor",
]);

interface OrganizationFormProps {
  organization: {
    organizationName: string;
    legalName?: string | null;
    slug: string;
    logoUrl?: string | null;
    website?: string | null;
    industry?: string | null;
    timezone?: string | null;
    currency?: string | null;
    country?: string | null;
    address?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    brandPrimaryColor?: string | null;
    brandSecondaryColor?: string | null;
  } | null;
  canUpdate: boolean;
}

export function OrganizationForm({ organization, canUpdate }: OrganizationFormProps) {
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      organizationName: organization?.organizationName ?? "",
      legalName: organization?.legalName ?? "",
      slug: organization?.slug ?? "",
      logoUrl: organization?.logoUrl ?? "",
      website: organization?.website ?? "",
      industry: organization?.industry ?? "",
      timezone: organization?.timezone ?? "",
      currency: organization?.currency ?? "",
      country: organization?.country ?? "",
      address: organization?.address ?? "",
      contactEmail: organization?.contactEmail ?? "",
      contactPhone: organization?.contactPhone ?? "",
      brandPrimaryColor: organization?.brandPrimaryColor ?? "",
      brandSecondaryColor: organization?.brandSecondaryColor ?? "",
    },
  });

  const onSubmit = (data: OrganizationFormValues) => {
    if (!canUpdate) {
      toast.error("You do not have permission to update organization settings.");
      return;
    }

    startTransition(async () => {
      try {
        await updateOrganization(data);
        toast.success("Organization updated successfully");
        // Re-baseline the form against what was saved (so "Save changes"
        // disables again) and re-read the server component so the value the
        // user sees is the persisted one, not the one they typed.
        reset(data);
        router.refresh();
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to update organization");
        }
      }
    });
  };

  // Every field the schema validates that this form does not render (timezone,
  // currency) would otherwise reject the submit with nowhere to show why — the
  // silent-save failure half of P1-02. Anything unrendered surfaces here.
  const unrenderedErrors = Object.entries(errors)
    .filter(([field]) => !RENDERED_FIELDS.has(field))
    .map(([field, error]) => `${field}: ${(error as { message?: string })?.message ?? "Invalid"}`);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {unrenderedErrors.length > 0 && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm"
        >
          <p className="font-medium">This organization could not be saved</p>
          <ul className="mt-1 list-inside list-disc">
            {unrenderedErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Update your organization&apos;s general information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="vertical">
              <FieldLabel htmlFor="org-organizationName">Organization Name</FieldLabel>
              <FieldContent>
                <Input
                  {...register("organizationName")}
                  id="org-organizationName"
                  disabled={!canUpdate || isPending}
                  placeholder="Acme Corp"
                />
              </FieldContent>
              <FieldError errors={[errors.organizationName]} />
            </Field>

            <Field orientation="vertical">
              <FieldLabel htmlFor="org-legalName">Legal Name</FieldLabel>
              <FieldContent>
                <Input
                  {...register("legalName")}
                  id="org-legalName"
                  disabled={!canUpdate || isPending}
                  placeholder="Acme Corporation Inc."
                />
              </FieldContent>
              <FieldError errors={[errors.legalName]} />
            </Field>

            <Field orientation="vertical">
              <FieldLabel htmlFor="org-slug">Slug</FieldLabel>
              <FieldContent>
                <Input
                  {...register("slug")}
                  id="org-slug"
                  disabled={!canUpdate || isPending}
                  placeholder="acme-corp"
                />
              </FieldContent>
              <FieldDescription>
                Used in your organization&apos;s URL. Must be unique.
              </FieldDescription>
              <FieldError errors={[errors.slug]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & Location</CardTitle>
          <CardDescription>
            How customers and partners can reach you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field orientation="vertical">
                <FieldLabel htmlFor="org-contactEmail">Contact Email</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("contactEmail")}
                    id="org-contactEmail"
                    disabled={!canUpdate || isPending}
                    type="email"
                    placeholder="hello@acme.com"
                  />
                </FieldContent>
                <FieldError errors={[errors.contactEmail]} />
              </Field>

              <Field orientation="vertical">
                <FieldLabel htmlFor="org-contactPhone">Contact Phone</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("contactPhone")}
                    id="org-contactPhone"
                    disabled={!canUpdate || isPending}
                    placeholder="+1 (555) 000-0000"
                  />
                </FieldContent>
                <FieldError errors={[errors.contactPhone]} />
              </Field>

              <Field orientation="vertical">
                <FieldLabel htmlFor="org-website">Website</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("website")}
                    id="org-website"
                    disabled={!canUpdate || isPending}
                    placeholder="https://acme.com"
                  />
                </FieldContent>
                <FieldError errors={[errors.website]} />
              </Field>

              <Field orientation="vertical">
                <FieldLabel htmlFor="org-country">Country</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("country")}
                    id="org-country"
                    disabled={!canUpdate || isPending}
                    placeholder="United States"
                  />
                </FieldContent>
                <FieldError errors={[errors.country]} />
              </Field>
            </div>
            
            <Field orientation="vertical">
              <FieldLabel htmlFor="org-address">Address</FieldLabel>
              <FieldContent>
                <Input
                  {...register("address")}
                  id="org-address"
                  disabled={!canUpdate || isPending}
                  placeholder="123 Innovation Drive, Tech City"
                />
              </FieldContent>
              <FieldError errors={[errors.address]} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand & Identity</CardTitle>
          <CardDescription>
            Customize how your organization appears in the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="vertical">
              <FieldLabel htmlFor="org-logoUrl">Logo URL</FieldLabel>
              <FieldContent>
                <Input
                  {...register("logoUrl")}
                  id="org-logoUrl"
                  disabled={!canUpdate || isPending}
                  placeholder="https://example.com/logo.png"
                />
              </FieldContent>
              <FieldError errors={[errors.logoUrl]} />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field orientation="vertical">
                <FieldLabel htmlFor="org-brandPrimaryColor">Primary Color (Hex)</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("brandPrimaryColor")}
                    id="org-brandPrimaryColor"
                    disabled={!canUpdate || isPending}
                    placeholder="#000000"
                  />
                </FieldContent>
                <FieldError errors={[errors.brandPrimaryColor]} />
              </Field>

              <Field orientation="vertical">
                <FieldLabel htmlFor="org-brandSecondaryColor">Secondary Color (Hex)</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("brandSecondaryColor")}
                    id="org-brandSecondaryColor"
                    disabled={!canUpdate || isPending}
                    placeholder="#ffffff"
                  />
                </FieldContent>
                <FieldError errors={[errors.brandSecondaryColor]} />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
        {canUpdate && (
          <CardFooter className="flex justify-end pt-6">
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}
