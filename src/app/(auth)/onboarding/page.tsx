import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { APP_NAME, APP_TAGLINE } from "@/config/app";
import { getCurrentIdentity, getUserMemberships } from "@/features/auth/membership-service";
import { OnboardingWizard } from "@/features/organizations/components/onboarding-wizard";

export const metadata: Metadata = { title: "Set up your Workspace" };

export default async function OnboardingPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ invite?: string; next?: string }>;
}>) {
  const { invite } = await searchParams;
  const identity = await getCurrentIdentity();

  if (!identity?.authUserId) {
    const nextUrl = invite ? `/onboarding?invite=${encodeURIComponent(invite)}` : "/onboarding";
    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }

  const memberships = await getUserMemberships(identity.authUserId);
  const activeMemberships = memberships.filter((m) => m.status === "active");

  return (
    <main className="bg-background relative flex min-h-svh items-center justify-center p-6">
      {/* Subtle brand backdrop */}
      <div
        aria-hidden="true"
        className="bg-[radial-gradient(60%_50%_at_50%_0%,--theme(--color-primary/8%),transparent)] pointer-events-none absolute inset-0"
      />

      <div className="bg-card/80 border-border/60 relative w-full max-w-md rounded-2xl border p-8 shadow-xl backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl text-sm font-bold tracking-tight">
            NX
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            Welcome to {APP_NAME}
          </h1>
          <p className="text-muted-foreground text-sm">
            {activeMemberships.length > 0
              ? "Create another agency workspace or join an existing team."
              : "Set up your sovereign agency workspace or accept a team invitation to get started."}
          </p>
        </div>

        <OnboardingWizard
          initialInviteToken={invite ?? ""}
          userEmail={identity.email}
          hasExistingOrganizations={activeMemberships.length > 0}
        />
      </div>
    </main>
  );
}
