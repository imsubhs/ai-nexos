"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  nonce,
}: Readonly<{ children: React.ReactNode; nonce?: string }>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Stamped onto the inline theme script so it satisfies the CSP that
      // src/proxy.ts sets for this response.
      nonce={nonce}
    >
      {children}
    </NextThemesProvider>
  );
}
