"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BrandColorSwatchesProps {
  colors: string[] | unknown;
  compact?: boolean;
  className?: string;
  showLabels?: boolean;
}

export function BrandColorSwatches({
  colors,
  compact = false,
  className,
  showLabels = true,
}: BrandColorSwatchesProps) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  if (!colors || !Array.isArray(colors) || colors.length === 0) {
    if (compact) return null;
    return (
      <div className="text-foreground-muted text-xs italic">
        No brand colors specified.
      </div>
    );
  }

  // Filter valid hex strings
  const validColors = colors.filter(
    (c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c),
  );

  if (validColors.length === 0) {
    if (compact) return null;
    return (
      <div className="text-foreground-muted text-xs italic">
        No valid brand colors configured.
      </div>
    );
  }

  const handleCopy = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    toast.success(`Copied ${color} to clipboard`);
    setTimeout(() => setCopiedColor(null), 1500);
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {validColors.slice(0, 4).map((color, idx) => (
          <div
            key={idx}
            className="size-3.5 shrink-0 rounded-full border border-white/20 shadow-xs"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        {validColors.length > 4 && (
          <span className="text-foreground-muted font-mono text-[10px]">
            +{validColors.length - 4}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4",
        className,
      )}
    >
      {validColors.map((color, idx) => {
        const isCopied = copiedColor === color;

        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleCopy(color)}
            className="group border-border-subtle bg-surface-2 hover:border-brand-primary/40 hover:bg-surface-3 focus-visible:ring-brand-primary relative flex cursor-pointer flex-col overflow-hidden rounded-lg border p-2.5 text-left transition-all duration-200 outline-none focus-visible:ring-2"
          >
            <div
              className="flex h-14 w-full items-center justify-center rounded-md border border-white/10 shadow-inner transition-transform group-hover:scale-[1.02]"
              style={{ backgroundColor: color }}
            >
              <div className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 font-mono text-[11px] text-white opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                {isCopied ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </>
                )}
              </div>
            </div>

            {showLabels && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-foreground font-mono text-xs font-semibold tracking-wider uppercase">
                  {color}
                </span>
                <span className="text-foreground-subtle text-[10px] font-medium">
                  Color #{idx + 1}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
