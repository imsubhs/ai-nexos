"use client";

import { BrandColorSwatches } from "./brand-color-swatches";
import { NoBrandKitEmptyState } from "./client-empty-state";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  FolderGit2,
  HardDrive,
  Type,
  Image as ImageIcon,
} from "lucide-react";

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

export function ClientBrandKit({
  client,
  onEditBrandKit,
}: ClientBrandKitProps) {
  const hasColors =
    Array.isArray(client.brandColors) && client.brandColors.length > 0;
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
          <h3 className="font-heading text-foreground-heading text-base font-semibold">
            Brand Guidelines & Creative Assets
          </h3>
          <p className="text-foreground-muted mt-0.5 text-xs">
            Core visual identity standards, asset repositories, and reference
            materials.
          </p>
        </div>
        {onEditBrandKit && (
          <Button variant="outline" size="sm" onClick={onEditBrandKit}>
            Edit Brand Kit
          </Button>
        )}
      </div>

      {/* 1. Color Palette */}
      <div className="border-border-subtle bg-surface-2 space-y-3.5 rounded-lg border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-primary size-2 rounded-full" />
            <h4 className="text-foreground text-sm font-semibold">
              Brand Color Palette
            </h4>
          </div>
          <span className="text-foreground-muted text-[11px]">
            {hasColors
              ? `${(client.brandColors as string[]).length} configured swatches`
              : "0 swatches"}
          </span>
        </div>

        <BrandColorSwatches colors={client.brandColors} />
      </div>

      {/* 2. External Repositories / Cloud Storage */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Google Drive */}
        <div className="border-border-subtle bg-surface-2 flex flex-col justify-between rounded-lg border p-4">
          <div className="space-y-2">
            <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="size-4 text-emerald-400" />
              <span>Google Drive Folder</span>
            </div>
            <p className="text-foreground-muted text-xs leading-relaxed">
              Shared cloud storage folder containing master source footage, raw
              graphics, and project deliverables.
            </p>
          </div>

          <div className="border-border-subtle mt-4 border-t pt-3">
            {hasDriveUrl ? (
              <a
                href={client.googleDriveFolderUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
              >
                <span>Open Google Drive</span>
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <span className="text-foreground-muted text-xs italic">
                No folder URL configured
              </span>
            )}
          </div>
        </div>

        {/* Brand Assets Repository */}
        <div className="border-border-subtle bg-surface-2 flex flex-col justify-between rounded-lg border p-4">
          <div className="space-y-2">
            <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
              <FolderGit2 className="text-brand-primary size-4" />
              <span>Brand Assets Repository</span>
            </div>
            <p className="text-foreground-muted text-xs leading-relaxed">
              Digital asset management link, vector logos, brand books, and
              standardized identity kits.
            </p>
          </div>

          <div className="border-border-subtle mt-4 border-t pt-3">
            {hasAssetsUrl ? (
              <a
                href={client.brandAssetsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
              >
                <span>Open Asset Library</span>
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <span className="text-foreground-muted text-xs italic">
                No asset library URL configured
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Typography & Moodboard Specs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Typography */}
        <div className="border-border-subtle bg-surface-2 space-y-3 rounded-lg border p-4">
          <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <Type className="size-4 text-sky-400" />
            <span>Typography System</span>
          </div>
          {parsedTypography ? (
            <div className="bg-surface-1 border-border-subtle text-foreground-secondary rounded-md border p-3 font-mono text-xs whitespace-pre-wrap">
              {typeof parsedTypography === "object"
                ? JSON.stringify(parsedTypography, null, 2)
                : String(parsedTypography)}
            </div>
          ) : (
            <div className="text-foreground-muted text-xs italic">
              No typography guidelines recorded.
            </div>
          )}
        </div>

        {/* Moodboards & References */}
        <div className="border-border-subtle bg-surface-2 space-y-3 rounded-lg border p-4">
          <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
            <ImageIcon className="size-4 text-purple-400" />
            <span>Moodboards & References</span>
          </div>
          {parsedMoodboards || parsedReferenceAssets ? (
            <div className="bg-surface-1 border-border-subtle text-foreground-secondary rounded-md border p-3 font-mono text-xs whitespace-pre-wrap">
              {parsedMoodboards
                ? typeof parsedMoodboards === "object"
                  ? JSON.stringify(parsedMoodboards, null, 2)
                  : String(parsedMoodboards)
                : typeof parsedReferenceAssets === "object"
                  ? JSON.stringify(parsedReferenceAssets, null, 2)
                  : String(parsedReferenceAssets)}
            </div>
          ) : (
            <div className="text-foreground-muted text-xs italic">
              No moodboard links recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
