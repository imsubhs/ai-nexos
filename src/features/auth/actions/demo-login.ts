"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env.server";
import { setDemoSessionCookie } from "../demo-session";

export async function enterDemoWorkspace() {
  // isDemoMode() is false under NODE_ENV=production regardless of how
  // DEMO_MODE is set, so this action cannot mint a demo session there.
  if (!isDemoMode()) {
    throw new Error("Demo mode is not enabled.");
  }

  setDemoSessionCookie(await cookies());

  redirect("/");
}
