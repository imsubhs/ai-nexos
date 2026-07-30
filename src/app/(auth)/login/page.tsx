import type { Metadata } from "next";
import { APP_NAME, APP_TAGLINE } from "@/config/app";
import { LoginForm } from "@/features/auth/components/login-form";
import { enterDemoWorkspace } from "@/features/auth/actions/demo-login";
import { Button } from "@/components/ui/button";

// Bare title — the root layout template appends "· AI NEX OS".
export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback:
    "That sign-in link is invalid or has expired. Request a new one.",
  oauth: "Google sign-in could not be started. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; next?: string }>;
}>) {
  const { error, next } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? null) : null;

  return (
    <main className="bg-background relative flex min-h-svh items-center justify-center p-6">
      {/* Subtle brand backdrop — premium, minimal (Design System §2). */}
      <div
        aria-hidden="true"
        className="bg-[radial-gradient(60%_50%_at_50%_0%,--theme(--color-primary/8%),transparent)] pointer-events-none absolute inset-0"
      />

      <div className="bg-card/80 border-border/60 relative w-full max-w-sm rounded-2xl border p-8 shadow-xl backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl text-sm font-bold tracking-tight">
            NX
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            {APP_NAME}
          </h1>
          <p className="text-muted-foreground text-sm">{APP_TAGLINE}</p>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive mb-6 rounded-lg border px-3 py-2 text-sm"
          >
            {errorMessage}
          </p>
        ) : null}

        <LoginForm next={next} />

        {process.env.DEMO_MODE === "true" && (
          <div className="mt-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="border-border w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card text-muted-foreground px-2">Or</span>
              </div>
            </div>
            <form action={enterDemoWorkspace}>
              <Button type="submit" variant="outline" className="w-full">
                Enter Demo Workspace
              </Button>
            </form>
          </div>
        )}

        <p className="text-muted-foreground mt-8 text-center text-xs">
          Internal workspace. Client access is provided through secure share
          links — no account required.
        </p>
      </div>
    </main>
  );
}
