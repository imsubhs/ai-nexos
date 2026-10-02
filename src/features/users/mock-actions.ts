import { DEMO_ADMIN_USER } from "@/features/auth/current-user";
import { z } from "zod";
import { updateProfileSchema } from "./schemas";

export async function getMyProfile() {
  return {
    userId: DEMO_ADMIN_USER.userId,
    email: DEMO_ADMIN_USER.email,
    firstName: DEMO_ADMIN_USER.firstName,
    lastName: DEMO_ADMIN_USER.lastName,
    avatarUrl: DEMO_ADMIN_USER.avatarUrl,
    phone: "+1 (555) 000-0000",
    status: "active",
    joiningDate: "2024-01-01",
    organizationName: DEMO_ADMIN_USER.organizationName,
    roleName: DEMO_ADMIN_USER.roleName,
    departmentName: "Engineering",
  };
}

export async function updateMyProfile(
  data: z.infer<typeof updateProfileSchema>,
) {
  const parsed = updateProfileSchema.parse(data);
  return {
    userId: DEMO_ADMIN_USER.userId,
    organizationId: DEMO_ADMIN_USER.organizationId,
    roleId: DEMO_ADMIN_USER.roleId,
    email: DEMO_ADMIN_USER.email,
    firstName: parsed.firstName,
    lastName: parsed.lastName ?? null,
    avatarUrl: parsed.avatarUrl === "" ? null : (parsed.avatarUrl ?? null),
    phone: parsed.phone ?? null,
    status: "active",
    joiningDate: "2024-01-01",
    timezone: "UTC",
    departmentId: DEMO_ADMIN_USER.departmentId,
    workingHours: null,
    employmentType: "full_time" as const,
    designation: DEMO_ADMIN_USER.designation,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_ADMIN_USER.userId,
    updatedBy: DEMO_ADMIN_USER.userId,
  };
}
