import { APP_NAME } from "@/config/app";

/**
 * Client portal shell (portal.<domain>) — login-free by design (PRD Module 13).
 * No internal navigation, no authenticated context. Everything rendered here
 * must come from the share-link service layer after token validation.
 */
export default function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <div className="flex-1">{children}</div>
      <footer className="text-muted-foreground border-t px-6 py-4 text-center text-xs">
        Powered by {APP_NAME}
      </footer>
    </div>
  );
}
