import type { Metadata } from "next";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/app";
import { signOut } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Account not provisioned" };

/**
 * Landing spot for authenticated identities without an internal user profile
 * (or with a deactivated one). Public in the proxy, so it breaks the
 * login → dashboard → login redirect cycle; the only action is signing out.
 */
export default function UnprovisionedPage() {
  return (
    <main className="bg-background flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <UserX className="text-muted-foreground size-6" />
      </div>
      <h1 className="text-lg font-semibold tracking-tight">
        Your account isn&apos;t set up yet
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm text-balance">
        You signed in successfully, but this email hasn&apos;t been added to a
        {" " + APP_NAME} workspace, or your access has been deactivated. Ask an
        administrator to provision your account, then sign in again.
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
