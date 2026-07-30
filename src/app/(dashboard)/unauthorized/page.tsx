import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/features/auth/current-user";

export const metadata = {
  title: "Access denied",
};

/**
 * Unauthorized page (Phase 2.11 port from WorkTrack, pulled forward in
 * Sprint 2 / WP-105E): permission-denied redirects land here instead of a
 * 404 (merge doc 13 §7.4). Authenticated-only — the (dashboard) layout's
 * auth guard handles the unauthenticated case via /login?returnTo=.
 */
export default async function UnauthorizedPage() {
  const user = await requireCurrentUser();

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-destructive/10 flex h-20 w-20 items-center justify-center rounded-2xl">
            <ShieldX
              className="text-destructive h-10 w-10"
              aria-hidden="true"
            />
          </div>
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Access denied
        </h1>
        <p className="text-muted-foreground mb-1 text-lg">403 — Forbidden</p>
        <p className="text-muted-foreground mb-8 text-sm">
          You do not have permission to access this page. Your current role (
          <strong className="text-foreground">{user.roleName}</strong>) does not
          include it — contact an administrator if you believe this is a
          mistake.
        </p>
        <div className="flex justify-center">
          <Button render={<Link href="/dashboard" />}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
