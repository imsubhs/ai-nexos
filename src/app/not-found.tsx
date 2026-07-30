import Link from "next/link";

/**
 * App-wide 404 for URLs that match no route (several sidebar destinations are
 * not implemented yet). Rendered inside the root layout only, so it keeps its
 * own minimal, unauthenticated styling.
 */
export default function RootNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground font-mono text-sm">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        This page does not exist or has not been built yet.
      </p>
      <Link
        href="/dashboard"
        className="text-primary text-sm font-medium underline underline-offset-4"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
