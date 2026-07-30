import { getMyProfile } from "@/features/users/actions";
import { ProfileForm } from "./_components/profile-form";
import { ThemePreferences } from "./_components/theme-preferences";

export const metadata = {
  title: "Profile | Settings",
};

export default async function ProfileSettingsPage() {
  const profile = await getMyProfile();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your personal information and preferences.
        </p>
      </div>

      <ProfileForm profile={profile} />
      <ThemePreferences />
    </div>
  );
}
