import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME, APP_TAGLINE } from "@/config/app";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
};

/**
 * Reading `x-nonce` here is what opts every route into dynamic rendering, and
 * that is the deliberate cost of removing `'unsafe-inline'` from `script-src`
 * (see src/lib/security/headers.ts). A prerendered document is generated once,
 * at build time, and cannot carry a per-request nonce; it would either need a
 * constant one — which is no nonce at all — or have its inline scripts blocked.
 *
 * The header is set by `src/proxy.ts`, which deletes any inbound value first,
 * so it cannot be chosen by the caller.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* next-themes writes an inline script to apply the stored theme
            before first paint; without the nonce the CSP blocks it and every
            visitor gets a flash of the default theme. */}
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
