"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrganizationAction,
  acceptInvitationAction,
  previewInvitationAction,
} from "@/features/organizations/onboarding-actions";
import {
  slugify,
  deriveCodePrefixFromName,
} from "@/features/organizations/schemas";

interface OnboardingWizardProps {
  initialInviteToken?: string;
  userEmail?: string;
  hasExistingOrganizations?: boolean;
}

export function OnboardingWizard({
  initialInviteToken = "",
  userEmail = "",
  hasExistingOrganizations = false,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">(
    initialInviteToken ? "join" : "create",
  );
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Form State
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [codePrefix, setCodePrefix] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [prefixEdited, setPrefixEdited] = useState(false);

  // Join Form State
  const [inviteToken, setInviteToken] = useState(initialInviteToken);
  const [invitePreview, setInvitePreview] = useState<{
    valid: boolean;
    organizationName?: string;
    roleName?: string;
    email?: string;
    error?: string;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgName(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
    if (!prefixEdited) {
      setCodePrefix(deriveCodePrefixFromName(val));
    }
  };

  // If initial token present, load preview
  useEffect(() => {
    if (initialInviteToken) {
      loadTokenPreview(initialInviteToken);
    }
  }, [initialInviteToken]);

  async function loadTokenPreview(token: string) {
    if (!token.trim()) return;
    setIsLoadingPreview(true);
    setErrorMessage(null);
    try {
      const preview = await previewInvitationAction({ rawToken: token.trim() });
      if (preview.valid) {
        setInvitePreview({
          valid: true,
          organizationName: preview.organizationName,
          roleName: preview.roleName,
          email: preview.email,
        });
      } else {
        setInvitePreview({
          valid: false,
          error: preview.error ?? "Invalid or expired invitation token",
        });
        setErrorMessage(
          preview.error === "INVITATION_EXPIRED"
            ? "This invitation has expired. Ask an administrator for a new one."
            : preview.error === "INVITATION_REVOKED"
              ? "This invitation was revoked by an administrator."
              : preview.error === "INVITATION_ALREADY_ACCEPTED"
                ? "This invitation has already been accepted."
                : "Invitation token is invalid or not found.",
        );
      }
    } catch {
      setInvitePreview({ valid: false, error: "Failed to verify invitation" });
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (!orgName.trim() || orgName.trim().length < 2) {
      setErrorMessage("Organization name must be at least 2 characters");
      return;
    }

    startTransition(async () => {
      const res = await createOrganizationAction({
        organizationName: orgName.trim(),
        slug: slug.trim() || undefined,
        codePrefix: codePrefix.trim().toUpperCase() || undefined,
      });

      if (res.success) {
        setSuccessMessage("Workspace created successfully! Redirecting...");
        router.push("/dashboard");
      } else {
        setErrorMessage(res.error ?? "Failed to create organization");
      }
    });
  }

  function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const token = inviteToken.trim();
    if (!token) {
      setErrorMessage("Please enter an invitation token");
      return;
    }

    startTransition(async () => {
      const res = await acceptInvitationAction({ rawToken: token });
      if (res.success) {
        setSuccessMessage(
          "Invitation accepted! Welcome to the workspace. Redirecting...",
        );
        router.push("/dashboard");
      } else {
        setErrorMessage(res.error ?? "Failed to accept invitation");
      }
    });
  }

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="bg-muted mb-6 flex rounded-xl p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => {
            setTab("create");
            setErrorMessage(null);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 transition-all ${
            tab === "create"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="size-4" />
          <span>Create Workspace</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("join");
            setErrorMessage(null);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 transition-all ${
            tab === "join"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="size-4" />
          <span>Join via Invitation</span>
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mb-6 rounded-lg border px-3 py-2 text-sm"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="border-primary/30 bg-primary/10 text-primary mb-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {tab === "create" ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization / Agency Name</Label>
            <Input
              id="orgName"
              placeholder="e.g. Vanguard Creative Studio"
              value={orgName}
              onChange={handleOrgNameChange}
              disabled={isPending}

              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="slug"
              className="flex items-center justify-between text-xs"
            >
              <span>Workspace Identifier (Slug)</span>
              <span className="text-muted-foreground">
                app.domain/{slug || "workspace"}
              </span>
            </Label>
            <Input
              id="slug"
              placeholder="vanguard-creative"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="codePrefix"
              className="flex items-center justify-between text-xs"
            >
              <span>Entity Code Prefix</span>
              <span className="text-muted-foreground">
                e.g. {codePrefix || "VCS"}-2026-0001
              </span>
            </Label>
            <Input
              id="codePrefix"
              placeholder="VCS"
              maxLength={8}
              value={codePrefix}
              onChange={(e) => {
                setCodePrefix(e.target.value.toUpperCase());
                setPrefixEdited(true);
              }}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">
              Used to generate sequential project, task, and deliverable codes.
            </p>
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Provisioning Workspace...
              </>
            ) : (
              <>
                <span>Launch Agency Workspace</span>
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleAcceptInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteToken">Invitation Token or Code</Label>
            <div className="flex gap-2">
              <Input
                id="inviteToken"
                placeholder="Paste 64-character token"
                value={inviteToken}
                onChange={(e) => {
                  setInviteToken(e.target.value);
                  setInvitePreview(null);
                }}
                disabled={isPending || isLoadingPreview}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => loadTokenPreview(inviteToken)}
                disabled={!inviteToken.trim() || isLoadingPreview || isPending}
              >
                {isLoadingPreview ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </div>

          {invitePreview?.valid && (
            <div className="border-border/80 bg-muted/40 space-y-2 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="text-primary size-5" />
                <span>Verified Invitation</span>
              </div>
              <p className="text-sm">
                You are invited to join{" "}
                <strong className="text-foreground font-semibold">
                  {invitePreview.organizationName}
                </strong>{" "}
                as{" "}
                <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-xs font-semibold">
                  {invitePreview.roleName}
                </span>
                .
              </p>
              {invitePreview.email && (
                <p className="text-muted-foreground text-xs">
                  Issued for: {invitePreview.email}
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="mt-2 w-full"
            disabled={isPending || isLoadingPreview || !inviteToken.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Joining Workspace...
              </>
            ) : (
              <>
                <span>Accept Invitation & Enter</span>
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </form>
      )}

      {hasExistingOrganizations && (
        <div className="mt-6 border-t pt-4 text-center">
          <p className="text-muted-foreground mb-2 text-xs">
            Already have an active workspace?
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-xs"
          >
            Return to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
