import { z } from "zod";

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/i, "Invalid hex color format");

export const insertClientSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  industry: z.string().optional().nullable(),
  website: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "prospect", "archived"]).default("active"),
  clientHealth: z.enum(["good", "at_risk", "critical"]).optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  brandColors: z.array(hexColorSchema).optional().nullable(),
  typography: z.any().optional().nullable(),
  moodboards: z.any().optional().nullable(),
  brandAssetsUrl: z.string().url().optional().nullable().or(z.literal("")),
  googleDriveFolderUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal("")),
  referenceAssets: z.any().optional().nullable(),
  preferredCommunication: z
    .enum(["email", "slack", "whatsapp", "phone"])
    .optional()
    .nullable(),
});

export const updateClientSchema = insertClientSchema.partial();

export const insertContactSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  name: z.string().min(2, "Name is required"),
  contactType: z
    .enum(["primary", "billing", "marketing", "technical", "legal"])
    .default("primary"),
  designation: z.string().optional().nullable(),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().optional().nullable(),
  linkedin: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const updateContactSchema = insertContactSchema
  .partial()
  .omit({ clientId: true });
