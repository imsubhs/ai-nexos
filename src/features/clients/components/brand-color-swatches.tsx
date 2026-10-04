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
            className="size-3.5 rounded-full border border-white/20 shadow-xs shrink-0"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
        {validColors.length > 4 && (
          <span className="text-[10px] font-mono text-foreground-muted">
            +{validColors.length - 4}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", className)}>
      {validColors.map((color, idx) => {
        const isCopied = copiedColor === color;

        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleCopy(color)}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-2 p-2.5 text-left transition-all duration-200 hover:border-brand-primary/40 hover:bg-surface-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
          >
            <div
              className="h-14 w-full rounded-md border border-white/10 shadow-inner transition-transform group-hover:scale-[1.02] flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-xs rounded-md px-2 py-1 flex items-center gap-1 text-[11px] text-white font-mono">
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
                <span className="font-mono text-xs font-semibold text-foreground tracking-wider uppercase">
                  {color}
                </span>
                <span className="text-[10px] text-foreground-subtle font-medium">
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
