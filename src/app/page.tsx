import { redirect } from "next/navigation";

/** Internal domain root → dashboard (proxy handles auth gating). */
export default function RootPage() {
  redirect("/dashboard");
}
