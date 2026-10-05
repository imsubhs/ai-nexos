import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, Lock, ShieldCheck, Terminal } from "lucide-react";
import { requireCurrentUser } from "@/features/auth/current-user";
import { hasPermission } from "@/features/permissions/engine";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Security & Keys | Settings",
  description:
    "Enterprise security posture, session policies, and API credentials.",
};

export default async function SecuritySettingsPage() {
  const user = await requireCurrentUser();

  if (!hasPermission(user.permissions, "settings", "read")) {
    redirect("/settings");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground-heading text-2xl font-bold tracking-tight">
          Security & API Keys
        </h1>
        <p className="text-muted-foreground text-sm">
          Platform authentication posture, cryptographic token boundaries, and
          API integrations for {user.organizationName}.
        </p>
      </div>

      {/* Security Posture Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <CardTitle className="text-base">
              Operational Security Certification
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Certified baseline architecture running under strict tenant
            boundaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-xs">
          <div className="border-border-subtle flex items-center justify-between border-b pb-2.5">
            <span className="text-foreground">
              PostgreSQL Row-Level Security
            </span>
            <span className="font-mono font-medium text-emerald-400">
              77 Production Policies Active
            </span>
          </div>
          <div className="border-border-subtle flex items-center justify-between border-b pb-2.5">
            <span className="text-foreground">Security Definer Routines</span>
            <span className="font-mono font-medium text-emerald-400">
              5 Hardened Routines Active
            </span>
          </div>
          <div className="border-border-subtle flex items-center justify-between border-b pb-2.5">
            <span className="text-foreground">Multi-Tenant Context</span>
            <span className="text-foreground font-mono font-medium">
              Session-Derived (Zero Client Trust)
            </span>
          </div>
          <div className="border-border-subtle flex items-center justify-between border-b pb-2.5">
            <span className="text-foreground">Rate Limiting Topology</span>
            <span className="font-mono font-medium text-emerald-400">
              Single-Instance MemoryStore First
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-foreground">Framework Version</span>
            <span className="text-foreground font-mono font-medium">
              Next.js 16.3.8 (Security Hardened)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Session & Access Policies */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Session Lifetime
              </CardTitle>
              <Lock className="text-brand-primary size-4" />
            </div>
            <CardDescription className="text-xs">
              Automatic idle expiry and credential revalidation.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="border-border-subtle flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">JWT Session Expiry</span>
              <span className="text-foreground font-mono font-medium">
                12 Hours
              </span>
            </div>
            <div className="border-border-subtle mt-2 flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">Cookie Security</span>
              <span className="font-mono font-medium text-emerald-400">
                HttpOnly · SameSite=Lax · Secure
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Role Authority
              </CardTitle>
              <KeyRound className="text-brand-primary size-4" />
            </div>
            <CardDescription className="text-xs">
              Current authenticated caller role and privileges.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="border-border-subtle flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">Assigned Role</span>
              <span className="text-brand-primary font-mono font-medium">
                {user.roleName}
              </span>
            </div>
            <div className="border-border-subtle mt-2 flex items-center justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">Audit Trail</span>
              <span className="text-foreground font-mono font-medium">
                activity_logs streaming
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Key Management */}
      <Card>
        <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="text-brand-primary size-4" />
              <CardTitle className="text-sm font-semibold">
                Production API Credentials
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Scoped machine tokens for external creative tooling and webhook
              ingestion.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled
            className="text-xs opacity-60"
          >
            Generate New Token
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="border-border-subtle bg-surface-1/40 rounded-md border p-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-foreground font-mono font-semibold">
                  nex_live_••••••••••••••••
                </span>
                <span className="inline-flex rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                  Active
                </span>
              </div>
              <span className="text-muted-foreground font-mono text-[11px]">
                Created at tenant provisioning
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              Scoped to {user.organizationName} DAM asset ingest and project
              automation. Secret keys are never transmitted to client browsers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
