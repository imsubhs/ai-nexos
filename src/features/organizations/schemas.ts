import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/i, "Invalid hex color format");
// IANA timezone: either a single-segment zone (UTC, GMT) or Region/City
// (America/New_York, America/Argentina/Buenos_Aires). Sprint 12A widened this
// from the Region/City-only form — the seeded and default organization
// timezone is "UTC", which the old pattern rejected. Because the Organisation
// Profile form has no timezone input, that rejection had nowhere to render and
// silently blocked every save (the second half of P1-02).
const timezoneSchema = z
  .string()
  .regex(/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/, "Invalid IANA timezone format");
const currencySchema = z.string().regex(/^[A-Z]{3}$/, "Invalid ISO 4217 currency code");

export const updateOrganizationSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required").optional(),
  legalName: z.string().optional().nullable(),
  slug: z.string().min(2, "Slug is required").optional(),
  logoUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  website: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  industry: z.string().optional().nullable(),
  timezone: timezoneSchema.optional(),
  currency: currencySchema.optional(),
  country: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  contactEmail: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  contactPhone: z.string().optional().nullable(),
  // `.or(z.literal(""))` matches logoUrl/website/contactEmail above: an
  // emptied optional field must clear, not fail validation. Sprint 12A —
  // without it a user could set a brand colour but never remove one.
  brandPrimaryColor: hexColorSchema.optional().nullable().or(z.literal("")),
  brandSecondaryColor: hexColorSchema.optional().nullable().or(z.literal("")),
});

/** Optional text columns whose empty string means "cleared", i.e. NULL. */
const NULLABLE_WHEN_EMPTY = [
  "legalName",
  "logoUrl",
  "website",
  "industry",
  "country",
  "address",
  "contactEmail",
  "contactPhone",
  "brandPrimaryColor",
  "brandSecondaryColor",
] as const;

/**
 * Persist an emptied field as NULL rather than "". Both the mock and the real
 * updateOrganization spread the parsed input straight onto the row, so without
 * this an emptied colour would round-trip as "" and fail hex validation on the
 * next load — the P1-02 failure mode, one step removed.
 */
export function normalizeOrganizationInput(
  parsed: z.infer<typeof updateOrganizationSchema>,
): z.infer<typeof updateOrganizationSchema> {
  const normalized: Record<string, unknown> = { ...parsed };
  for (const key of NULLABLE_WHEN_EMPTY) {
    if (normalized[key] === "") normalized[key] = null;
  }
  return normalized as z.infer<typeof updateOrganizationSchema>;
}

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  roleId: z.string().uuid("Invalid role ID"),
});

export const userActionSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});
