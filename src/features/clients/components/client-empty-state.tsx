import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LucideIcon,
  Building2,
  FolderKanban,
  Users,
  Palette,
  Activity,
} from "lucide-react";

interface ClientEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    render?: React.ReactNode;
  };
  className?: string;
}

export function ClientEmptyState({
  icon: Icon = Building2,
  title,
  description,
  action,
  className,
}: ClientEmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border-strong bg-surface-1/40 flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center",
        className,
      )}
    >
      <div className="border-border-subtle bg-surface-2 text-foreground-muted mb-3.5 flex size-11 items-center justify-center rounded-lg border">
        <Icon className="text-brand-primary size-5" />
      </div>
      <h3 className="font-heading text-foreground-heading text-sm font-semibold">
        {title}
      </h3>
      <p className="text-foreground-muted mt-1 max-w-sm text-xs text-balance">
        {description}
      </p>
      {action && (
        <div className="mt-4">
          {action.render ? (
            action.render
          ) : (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function NoClientsEmptyState({
  onAddClient,
}: {
  onAddClient?: () => void;
}) {
  return (
    <ClientEmptyState
      icon={Building2}
      title="No clients yet"
      description="Add your first client to start managing accounts, brand guidelines, contacts, and collaborative engagements."
      action={
        onAddClient ? { label: "Add Client", onClick: onAddClient } : undefined
      }
    />
  );
}

export function NoProjectsEmptyState({
  onCreateProject,
}: {
  onCreateProject?: () => void;
}) {
  return (
    <ClientEmptyState
      icon={FolderKanban}
      title="No active projects for this client"
      description="There are currently no active project engagements linked to this client account."
      action={
        onCreateProject
          ? { label: "Create Project", onClick: onCreateProject }
          : undefined
      }
    />
  );
}

export function NoContactsEmptyState({
  onAddContact,
}: {
  onAddContact?: () => void;
}) {
  return (
    <ClientEmptyState
      icon={Users}
      title="No stakeholder contacts yet"
      description="Maintain client roster with primary, billing, creative, and technical stakeholder details."
      action={
        onAddContact
          ? { label: "Add Contact", onClick: onAddContact }
          : undefined
      }
    />
  );
}

export function NoBrandKitEmptyState({
  onConfigureBrandKit,
}: {
  onConfigureBrandKit?: () => void;
}) {
  return (
    <ClientEmptyState
      icon={Palette}
      title="No brand kit configured yet"
      description="Store brand colors, typography guidelines, drive folders, and reference assets for team execution."
      action={
        onConfigureBrandKit
          ? { label: "Configure Brand Kit", onClick: onConfigureBrandKit }
          : undefined
      }
    />
  );
}

export function NoActivityEmptyState() {
  return (
    <ClientEmptyState
      icon={Activity}
      title="No client activity yet"
      description="Client interactions, contact changes, approvals, and updates will be logged here chronologically."
    />
  );
}
