import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/app";
import { getCurrentIdentity } from "@/features/auth/membership-service";
import { getInvitationByToken } from "@/features/organizations/invitation-service";
import { OnboardingWizard } from "@/features/organizations/components/onboarding-wizard";

export const metadata: Metadata = { title: "Join Workspace Invitation" };

export default async function InvitePage({
  params,
}: Readonly<{
  params: Promise<{ token: string }>;
}>) {
  const { token } = await params;
  const identity = await getCurrentIdentity();
  const invitation = await getInvitationByToken(token);

  if (!invitation.valid) {
    let errorTitle = "Invalid Invitation";
    let errorDesc = "This invitation link is not valid or was not found.";

    if (invitation.error === "INVITATION_EXPIRED") {
      errorTitle = "Invitation Expired";
      errorDesc = "This invitation has expired. Ask an administrator to issue a new invitation.";
    } else if (invitation.error === "INVITATION_REVOKED") {
      errorTitle = "Invitation Revoked";
      errorDesc = "This invitation was revoked by an administrator.";
    } else if (invitation.error === "INVITATION_ALREADY_ACCEPTED") {
      errorTitle = "Already Accepted";
      errorDesc = "This invitation has already been accepted.";
    }

    return (
      <main className="bg-background relative flex min-h-svh items-center justify-center p-6">
        <div className="bg-card/80 border-border/60 relative w-full max-w-sm rounded-2xl border p-8 text-center shadow-xl backdrop-blur-sm">
          <div className="bg-destructive/10 text-destructive mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">{errorTitle}</h1>
          <p className="text-muted-foreground mt-2 text-sm text-balance">{errorDesc}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button render={<Link href="/login" />} variant="outline">
              Sign In to {APP_NAME}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // If user is unauthenticated, prompt sign in or sign up with return path
  if (!identity?.authUserId) {
    const nextPath = `/invite/${encodeURIComponent(token)}`;
    return (
      <main className="bg-background relative flex min-h-svh items-center justify-center p-6">
        <div className="bg-card/80 border-border/60 relative w-full max-w-sm rounded-2xl border p-8 text-center shadow-xl backdrop-blur-sm">
          <div className="bg-primary text-primary-foreground mx-auto mb-4 flex size-12 items-center justify-center rounded-xl text-base font-bold">
            NX
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Team Invitation</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            You&apos;ve been invited to join{" "}
            <strong className="text-foreground font-semibold">
              {invitation.organizationName}
            </strong>{" "}
            as{" "}
            <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-xs font-semibold">
              {invitation.roleName}
            </span>
            .
          </p>
          <p className="text-muted-foreground mt-4 text-xs">
            Sign in with your account or create one to accept this invitation.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button render={<Link href={`/login?next=${encodeURIComponent(nextPath)}`} />} className="w-full">
              Sign In to Accept
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated user: present acceptance wizard directly
  const isEmailMismatch =
    Boolean(identity.email) &&
    identity.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase();

  return (
    <main className="bg-background relative flex min-h-svh items-center justify-center p-6">
      <div className="bg-card/80 border-border/60 relative w-full max-w-md rounded-2xl border p-8 shadow-xl backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Accept Team Invitation</h1>
          <p className="text-muted-foreground text-sm">
            Join <strong className="text-foreground">{invitation.organizationName}</strong> as{" "}
            <span className="text-primary font-medium">{invitation.roleName}</span>.
          </p>
        </div>

        {isEmailMismatch && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-400">
            <p className="font-semibold">Account Mismatch</p>
            <p className="mt-1">
              You are currently signed in as <strong>{identity.email}</strong>, but this invitation was sent to <strong>{invitation.email}</strong>.
            </p>
            <div className="mt-3">
              <Link
                href={`/login?next=${encodeURIComponent(`/invite/${encodeURIComponent(token)}`)}`}
                className="font-medium underline hover:text-amber-700 dark:hover:text-amber-300"
              >
                Sign in with invited account &rarr;
              </Link>
            </div>
          </div>
        )}

        <OnboardingWizard
          initialInviteToken={token}
          userEmail={identity.email}
          hasExistingOrganizations={true}
        />
      </div>
    </main>
  );
}
