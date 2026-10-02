import { db } from "@/db";
import { departments, organizations, roles, users } from "@/db/schema";
import { requireCurrentUser } from "@/features/auth/current-user";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateProfileSchema } from "./schemas";

export async function getMyProfile() {
  const currentUser = await requireCurrentUser();

  const [dbUser] = await db
    .select({
      userId: users.userId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      phone: users.phone,
      status: users.status,
      joiningDate: users.joiningDate,
      organizationName: organizations.organizationName,
      roleName: roles.roleName,
      departmentName: departments.departmentName,
    })
    .from(users)
    .innerJoin(
      organizations,
      eq(users.organizationId, organizations.organizationId),
    )
    .innerJoin(roles, eq(users.roleId, roles.roleId))
    .leftJoin(departments, eq(users.departmentId, departments.departmentId))
    .where(eq(users.userId, currentUser.userId));

  if (!dbUser) throw new Error("Profile not found");

  return {
    userId: dbUser.userId,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    avatarUrl: dbUser.avatarUrl,
    phone: dbUser.phone,
    status: dbUser.status,
    joiningDate: dbUser.joiningDate,
    organizationName: dbUser.organizationName ?? currentUser.organizationName,
    roleName: dbUser.roleName ?? currentUser.roleName,
    departmentName: dbUser.departmentName ?? null,
  };
}

export async function updateMyProfile(
  data: z.infer<typeof updateProfileSchema>,
) {
  const user = await requireCurrentUser();
  const parsed = updateProfileSchema.parse(data);

  const [updated] = await db
    .update(users)
    .set({
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: parsed.phone,
      avatarUrl: parsed.avatarUrl === "" ? null : parsed.avatarUrl,
      updatedAt: new Date(),
      updatedBy: user.userId,
    })
    .where(eq(users.userId, user.userId))
    .returning();

  if (!updated) throw new Error("Profile not found");

  revalidatePath("/settings/profile");
  return updated;
}
