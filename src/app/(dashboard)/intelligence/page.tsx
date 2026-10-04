import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import { getExecutiveIntelligence } from "@/features/intelligence/actions";
import { ExecutiveIntelligenceDashboard } from "@/features/intelligence/components/executive-intelligence-dashboard";

export const metadata: Metadata = {
  title: "Executive Intelligence | AI NEX OS",
  description:
    "Executive decision-support console, operational threat radar, and organizational velocity analytics.",
};

export default async function ExecutiveIntelligencePage() {
  const user = await requireCurrentUser();

  // Server-side authorization gate: requires "analytics.read" permission
  if (!hasPermission(user.permissions, "analytics", "read")) {
    redirect("/unauthorized");
  }

  const initialData = await getExecutiveIntelligence("30d");

  return <ExecutiveIntelligenceDashboard initialData={initialData} />;
}
