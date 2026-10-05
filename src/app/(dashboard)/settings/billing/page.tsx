import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard, HardDrive, Cpu, CheckCircle2 } from "lucide-react";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getActiveProjectsCount } from "@/features/projects/actions";
import { getFiles } from "@/features/files/actions";

export const metadata: Metadata = {
  title: "Billing & Compute | Settings",
  description: "Subscription tier, compute limits, and storage telemetry.",
};

export default async function BillingSettingsPage() {
  const user = await requireCurrentUser();

  if (!hasPermission(user.permissions, "settings", "read")) {
    redirect("/settings");
  }

  const [activeProjects, files] = await Promise.all([
    getActiveProjectsCount().catch(() => 0),
    getFiles({}, 0, 100).catch(() => []),
  ]);

  const totalFileBytes = files.reduce(
    (acc, f) => acc + (f.totalSizeBytes || 0),
    0,
  );
  const storageMb = (totalFileBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground-heading text-2xl font-bold tracking-tight">
          Billing & Compute
        </h1>
        <p className="text-muted-foreground text-sm">
          Subscription tier, compute limits, and cloud resource allocations for{" "}
          {user.organizationName}.
        </p>
      </div>

      {/* Plan Overview Card */}
      <Card>
        <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                Enterprise Creative Suite
              </CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-400">
                Active Tier
              </span>
            </div>
            <CardDescription className="text-xs">
              Unlimited project workspaces, dedicated PostgreSQL tenant
              isolation, and custom workflows.
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-foreground-heading text-2xl font-bold">
              $299
            </span>
            <span className="text-muted-foreground text-xs"> / month</span>
          </div>
        </CardHeader>
        <CardContent className="border-border-subtle space-y-4 border-t pt-2">
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <div className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span>Multi-tenant strict Row-Level Security</span>
            </div>
            <div className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span>Workforce attendance & work validation engine</span>
            </div>
            <div className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span>Client review portal & versioned approval chains</span>
            </div>
            <div className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span>Digital Asset Management (DAM) & preview inspection</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Allocation & Telemetry */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-foreground-muted text-xs font-medium tracking-wider uppercase">
                Cloud Asset Storage
              </CardDescription>
              <HardDrive className="text-brand-primary size-4" />
            </div>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {storageMb} MB{" "}
              <span className="text-muted-foreground text-sm font-normal">
                / 500 GB
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-surface-3 mt-1 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-brand-primary h-full rounded-full"
                style={{
                  width: `${Math.max(2, Math.min(100, (Number(storageMb) / 512000) * 100))}%`,
                }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              {files.length} creative assets cataloged in DAM storage.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-foreground-muted text-xs font-medium tracking-wider uppercase">
                Active Project Pipelines
              </CardDescription>
              <Cpu className="text-brand-primary size-4" />
            </div>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {activeProjects}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                / Unlimited
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-surface-3 mt-1 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-brand-primary h-full rounded-full"
                style={{
                  width: `${Math.max(5, Math.min(100, activeProjects * 5))}%`,
                }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Dedicated background processing & notification routing.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment & Security Signal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="text-brand-primary size-4" />
            <CardTitle className="text-sm font-semibold">
              Payment Method & Invoicing
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-xs">
          <div className="border-border-subtle flex items-center justify-between border-b pb-2">
            <span>Primary Payment Card</span>
            <span className="text-foreground font-mono">
              •••• •••• •••• 4242 (Enterprise ACH / Visa)
            </span>
          </div>
          <div className="border-border-subtle flex items-center justify-between border-b pb-2">
            <span>Next Billing Cycle</span>
            <span className="text-foreground font-mono">
              Active (Auto-renew)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Billing Contact</span>
            <span className="text-foreground font-mono">{user.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
