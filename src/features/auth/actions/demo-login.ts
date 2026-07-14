"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function enterDemoWorkspace() {
  if (process.env.DEMO_MODE !== "true") {
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
