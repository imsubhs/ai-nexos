"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env.server";

export async function enterDemoWorkspace() {
  if (!isDemoMode()) {
    throw new Error("Demo mode is not enabled.");
  }

  const cookieStore = await cookies();
  cookieStore.set("demo_session", "true", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/");
}
