import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().url("Must be a valid URL").nullable().optional().or(z.literal("")),
});
