import { ShieldCheck } from "lucide-react";

/**
 * Secure share-link entry: portal.<domain>/s/{secure_token}.
 * M1 reserves the route and contract; token validation, permission profiles,
 * and the client-facing portals ship in Milestone 4. Until then every token
 * resolves to a friendly "not active" state — nothing is ever leaked.
 */
export default async function ShareLinkPage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>) {
  await params; // Token intentionally unused until the M4 validation service.

  return (
    <main className="flex min-h-[70svh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <ShieldCheck className="text-muted-foreground size-6" />
      </div>
      <h1 className="text-lg font-semibold tracking-tight">
        This link is not active
      </h1>
      <p className="text-muted-foreground max-w-sm text-sm text-balance">
        The share link you opened is invalid, expired, or not yet enabled.
        Please ask your project contact for a new link.
      </p>
    </main>
  );
}
