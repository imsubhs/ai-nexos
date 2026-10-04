"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface SharePortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    clientId: string;
    companyName: string;
  };
}

export function SharePortalDialog({
  open,
  onOpenChange,
  client,
}: SharePortalDialogProps) {
  const [copied, setCopied] = useState(false);

  // Portal URL: /portal
  const portalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/portal`
    : "/portal";

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success("Portal link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary">
              <ShieldCheck className="size-4" />
            </div>
            <DialogTitle>Client Portal Collaboration</DialogTitle>
          </div>
          <DialogDescription>
            External stakeholder portal access for {client.companyName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg border border-border-subtle bg-surface-1 text-xs text-foreground-secondary leading-relaxed space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span>Cryptographic Share Boundary</span>
            </div>
            <p>
              External clients access deliverables, reviews, and meeting recordings exclusively through cryptographically signed share links. Internal CRM details, contact records, and workforce attendance are strictly quarantined and never exposed to the public portal.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portal-link" className="text-xs text-foreground-secondary font-medium">
              Client Portal Entrance
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="portal-link"
                readOnly
                value={portalUrl}
                className="bg-surface-2 border-border font-mono text-xs"
              />
              <Button size="sm" onClick={handleCopy} className="shrink-0 gap-1.5">
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-border-subtle">
            <a
              href="/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-primary hover:underline"
            >
              <span>Preview Portal Root</span>
              <ExternalLink className="size-3" />
            </a>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
