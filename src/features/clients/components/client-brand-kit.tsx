"use client";

import { BrandColorSwatches } from "./brand-color-swatches";
import { NoBrandKitEmptyState } from "./client-empty-state";
import { Button } from "@/components/ui/button";
import { ExternalLink, FolderGit2, HardDrive, Type, Image as ImageIcon } from "lucide-react";

interface ClientBrandKitProps {
  client: {
    clientId: string;
    companyName: string;
    brandColors?: unknown;
    typography?: unknown;
    moodboards?: unknown;
    brandAssetsUrl?: string | null;
    googleDriveFolderUrl?: string | null;
    referenceAssets?: unknown;
  };
  onEditBrandKit?: () => void;
}

export function ClientBrandKit({ client, onEditBrandKit }: ClientBrandKitProps) {
  const hasColors = Array.isArray(client.brandColors) && client.brandColors.length > 0;
  const hasAssetsUrl = Boolean(client.brandAssetsUrl);
  const hasDriveUrl = Boolean(client.googleDriveFolderUrl);
  const hasTypography = Boolean(client.typography);
  const hasMoodboards = Boolean(client.moodboards);
  const hasReferenceAssets = Boolean(client.referenceAssets);

  const hasAnyBrandData =
    hasColors ||
    hasAssetsUrl ||
    hasDriveUrl ||
    hasTypography ||
    hasMoodboards ||
    hasReferenceAssets;

  if (!hasAnyBrandData) {
    return <NoBrandKitEmptyState onConfigureBrandKit={onEditBrandKit} />;
  }

  const parseJsonSafe = (data: unknown) => {
    if (!data) return null;
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }
    return data;
  };

  const parsedTypography = parseJsonSafe(client.typography);
  const parsedMoodboards = parseJsonSafe(client.moodboards);
  const parsedReferenceAssets = parseJsonSafe(client.referenceAssets);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground-heading">
            Brand Guidelines & Creative Assets
          </h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Core visual identity standards, asset repositories, and reference materials.
          </p>
        </div>
        {onEditBrandKit && (
          <Button variant="outline" size="sm" onClick={onEditBrandKit}>
            Edit Brand Kit
          </Button>
        )}
      </div>

      {/* 1. Color Palette */}
      <div className="p-5 rounded-lg border border-border-subtle bg-surface-2 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-brand-primary" />
            <h4 className="text-sm font-semibold text-foreground">Brand Color Palette</h4>
          </div>
          <span className="text-[11px] text-foreground-muted">
            {hasColors ? `${(client.brandColors as string[]).length} configured swatches` : "0 swatches"}
          </span>
        </div>

        <BrandColorSwatches colors={client.brandColors} />
      </div>

      {/* 2. External Repositories / Cloud Storage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Google Drive */}
        <div className="p-4 rounded-lg border border-border-subtle bg-surface-2 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <HardDrive className="size-4 text-emerald-400" />
              <span>Google Drive Folder</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Shared cloud storage folder containing master source footage, raw graphics, and project deliverables.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle">
            {hasDriveUrl ? (
              <a
                href={client.googleDriveFolderUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:text-brand-primary-hover hover:underline"
              >
                <span>Open Google Drive</span>
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <span className="text-xs text-foreground-muted italic">No folder URL configured</span>
            )}
          </div>
        </div>

        {/* Brand Assets Repository */}
        <div className="p-4 rounded-lg border border-border-subtle bg-surface-2 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <FolderGit2 className="size-4 text-brand-primary" />
              <span>Brand Assets Repository</span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">
              Digital asset management link, vector logos, brand books, and standardized identity kits.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle">
            {hasAssetsUrl ? (
              <a
                href={client.brandAssetsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:text-brand-primary-hover hover:underline"
              >
                <span>Open Asset Library</span>
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <span className="text-xs text-foreground-muted italic">No asset library URL configured</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Typography & Moodboard Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Typography */}
        <div className="p-4 rounded-lg border border-border-subtle bg-surface-2 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <Type className="size-4 text-sky-400" />
            <span>Typography System</span>
          </div>
          {parsedTypography ? (
            <div className="p-3 rounded-md bg-surface-1 border border-border-subtle font-mono text-xs text-foreground-secondary whitespace-pre-wrap">
              {typeof parsedTypography === "object"
                ? JSON.stringify(parsedTypography, null, 2)
                : String(parsedTypography)}
            </div>
          ) : (
            <div className="text-xs text-foreground-muted italic">No typography guidelines recorded.</div>
          )}
        </div>

        {/* Moodboards & References */}
        <div className="p-4 rounded-lg border border-border-subtle bg-surface-2 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <ImageIcon className="size-4 text-purple-400" />
            <span>Moodboards & References</span>
          </div>
          {parsedMoodboards || parsedReferenceAssets ? (
            <div className="p-3 rounded-md bg-surface-1 border border-border-subtle font-mono text-xs text-foreground-secondary whitespace-pre-wrap">
              {parsedMoodboards
                ? typeof parsedMoodboards === "object"
                  ? JSON.stringify(parsedMoodboards, null, 2)
                  : String(parsedMoodboards)
                : typeof parsedReferenceAssets === "object"
                  ? JSON.stringify(parsedReferenceAssets, null, 2)
                  : String(parsedReferenceAssets)}
            </div>
          ) : (
            <div className="text-xs text-foreground-muted italic">No moodboard links recorded.</div>
          )}
        </div>
      </div>
    </div>
  );
}
