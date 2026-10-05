import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/i, "Invalid hex color format");
// IANA timezone: either a single-segment zone (UTC, GMT) or Region/City
// (America/New_York, America/Argentina/Buenos_Aires). Sprint 12A widened this
// from the Region/City-only form — the seeded and default organization
// timezone is "UTC", which the old pattern rejected. Because the Organisation
// Profile form has no timezone input, that rejection had nowhere to render and
// silently blocked every save (the second half of P1-02).
const timezoneSchema = z
  .string()
  .regex(/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/, "Invalid IANA timezone format");
const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Invalid ISO 4217 currency code");

export const RESERVED_CODE_PREFIXES = new Set([
  "SYS",
  "ADMIN",
  "NEXOS",
  "API",
  "ROOT",
  "TEST",
  "DEMO",
]);

export const codePrefixSchema = z
  .string()
  .trim()
  .transform((val) => val.toUpperCase())
  .refine(
    (val) => /^[A-Z0-9]{2,8}$/.test(val),
    "Code prefix must be 2-8 uppercase alphanumeric characters",
  )
  .refine(
    (val) => !RESERVED_CODE_PREFIXES.has(val),
    "This code prefix is reserved by the system",
  );

export function validateCodePrefix(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = (raw || "").trim().toUpperCase();
  if (normalized.length < 2 || normalized.length > 8) {
    return {
      valid: false,
      normalized,
      error: "Code prefix must be between 2 and 8 characters",
    };
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Code prefix must contain only alphanumeric characters",
    };
  }
  if (RESERVED_CODE_PREFIXES.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: `Code prefix "${normalized}" is reserved by the system`,
    };
  }
  return { valid: true, normalized };
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.slice(0, 50) || "workspace";
}

export function deriveCodePrefixFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let prefix = "";
  if (words.length >= 2) {
    prefix = words
      .slice(0, 3)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  } else if (words.length === 1 && words[0].length >= 3) {
    prefix = words[0].slice(0, 3).toUpperCase();
  }
  const validated = validateCodePrefix(prefix);
  if (validated.valid) return validated.normalized;
  return "NEX";
}

export const updateOrganizationSchema = z.object({
  organizationName: z
    .string()
    .min(2, "Organization name is required")
    .optional(),
  legalName: z.string().optional().nullable(),
  slug: z.string().min(2, "Slug is required").optional(),
  logoUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  website: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  industry: z.string().optional().nullable(),
  timezone: timezoneSchema.optional(),
  currency: currencySchema.optional(),
  country: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  contactEmail: z
    .string()
    .email("Invalid email")
    .optional()
    .nullable()
    .or(z.literal("")),
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

export const createOrganizationSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be at most 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase alphanumeric characters and hyphens",
    )
    .optional(),
  codePrefix: z.string().trim().optional(),
});

export const acceptInvitationSchema = z.object({
  rawToken: z
    .string()
    .trim()
    .min(10, "Invitation token is required")
    .max(256, "Invalid token length"),
});

export const previewInvitationSchema = z.object({
  rawToken: z
    .string()
    .trim()
    .min(10, "Invitation token is required")
    .max(256, "Invalid token length"),
});

export const switchOrganizationSchema = z.object({
  targetOrgId: z.string().uuid("Invalid organization ID"),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  roleId: z.string().uuid("Invalid role ID"),
  departmentId: z.string().uuid("Invalid department ID").optional(),
});
