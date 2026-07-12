import { APP_NAME, APP_TAGLINE } from "@/config/app";

/** Portal root: no token, nothing to show — deliberately minimal. */
export default function PortalHomePage() {
  return (
    <main className="flex min-h-[70svh] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl text-sm font-bold">
        NX
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="text-muted-foreground max-w-sm text-sm text-balance">
        {APP_TAGLINE} If you received a project link, open it directly — access
        works only through secure share links.
      </p>
    </main>
  );
}
