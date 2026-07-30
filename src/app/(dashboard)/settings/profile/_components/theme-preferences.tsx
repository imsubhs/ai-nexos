"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Stable no-op subscription: the hydration flag never changes after mount. */
const subscribeToNothing = () => () => {};

export function ThemePreferences() {
  const { theme, setTheme } = useTheme();

  // The resolved theme is only knowable in the browser (it comes from
  // localStorage / the OS media query), so the server cannot render the
  // selected variant. Hold the theme back until after mount so the first
  // client render reproduces the server HTML exactly, then let it update.
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const selectedTheme = mounted ? theme : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Preferences</CardTitle>
        <CardDescription>
          Customize the appearance of the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button
            variant={selectedTheme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
          >
            Light
          </Button>
          <Button
            variant={selectedTheme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
          >
            Dark
          </Button>
          <Button
            variant={selectedTheme === "system" ? "default" : "outline"}
            onClick={() => setTheme("system")}
          >
            System
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
