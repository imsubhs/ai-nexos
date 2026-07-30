"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateMyProfile } from "@/features/users/actions";
import { updateProfileSchema } from "@/features/users/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  FieldGroup,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

type ProfileFormValues = z.infer<typeof updateProfileSchema>;

interface ProfileFormProps {
  profile: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string | null;
    avatarUrl: string | null;
    phone: string | null;
    status: string;
    joiningDate: string | null;
    organizationName: string;
    roleName: string;
    departmentName: string | null;
  };
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      phone: profile.phone ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    startTransition(async () => {
      try {
        await updateMyProfile(data);
        toast.success("Profile updated successfully");
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to update profile");
        }
      }
    });
  };

  const avatarUrlValue = watch("avatarUrl");
  const initials = `${profile.firstName.charAt(0)}${profile.lastName ? profile.lastName.charAt(0) : ""}`.toUpperCase();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrlValue || ""} alt={profile.firstName} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={profile.status === "active" ? "default" : "secondary"}>
                  {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                </Badge>
                <Badge variant="outline">{profile.roleName}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details. Some fields are managed by your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field orientation="vertical">
                  <FieldLabel htmlFor="profile-firstName">First Name</FieldLabel>
                  <FieldContent>
                    <Input
                      {...register("firstName")}
                      id="profile-firstName"
                      disabled={isPending}
                    />
                  </FieldContent>
                  <FieldError errors={[errors.firstName]} />
                </Field>

                <Field orientation="vertical">
                  <FieldLabel htmlFor="profile-lastName">Last Name</FieldLabel>
                  <FieldContent>
                    <Input
                      {...register("lastName")}
                      id="profile-lastName"
                      disabled={isPending}
                    />
                  </FieldContent>
                  <FieldError errors={[errors.lastName]} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field orientation="vertical">
                  <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                  <FieldContent>
                    <Input
                      id="profile-email"
                      value={profile.email}
                      disabled
                      readOnly
                    />
                  </FieldContent>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
                  <FieldContent>
                    <Input
                      {...register("phone")}
                      id="profile-phone"
                      disabled={isPending}
                      placeholder="+1 (555) 000-0000"
                    />
                  </FieldContent>
                  <FieldError errors={[errors.phone]} />
                </Field>
              </div>

              <Field orientation="vertical">
                <FieldLabel htmlFor="profile-avatarUrl">Avatar URL</FieldLabel>
                <FieldContent>
                  <Input
                    {...register("avatarUrl")}
                    id="profile-avatarUrl"
                    disabled={isPending}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </FieldContent>
                <FieldError errors={[errors.avatarUrl]} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t">
                <Field orientation="vertical">
                  <FieldLabel htmlFor="profile-organization">Organization</FieldLabel>
                  <FieldContent>
                    <Input
                      id="profile-organization"
                      value={profile.organizationName}
                      disabled
                      readOnly
                    />
                  </FieldContent>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel htmlFor="profile-department">Department</FieldLabel>
                  <FieldContent>
                    <Input
                      id="profile-department"
                      value={profile.departmentName || "None"}
                      disabled
                      readOnly
                    />
                  </FieldContent>
                </Field>

                <Field orientation="vertical">
                  <FieldLabel htmlFor="profile-joinedDate">Joined Date</FieldLabel>
                  <FieldContent>
                    <Input
                      id="profile-joinedDate"
                      value={profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : "Unknown"}
                      disabled
                      readOnly
                    />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex justify-end pt-6">
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
