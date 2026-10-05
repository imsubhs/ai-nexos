"use client";

/**
 * Global Search & Command Palette (Phase 4B).
 *
 * Provides a responsive, accessible command palette accessible via:
 * - Desktop search input trigger in the header with ⌘K badge
 * - Mobile search icon trigger in the header
 * - Global keyboard shortcuts: ⌘K (macOS) and Ctrl+K (Windows/Linux)
 * - Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
 * - Safe, tenant-scoped, permission-tolerant queries via globalSearch()
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FileText,
  Files,
  FolderKanban,
  Loader2,
  Search,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { globalSearch, type SearchGroup, type SearchHit } from "../actions";

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

const GROUP_ICONS: Record<string, typeof FolderKanban> = {
  projects: FolderKanban,
  clients: Building2,
  deliverables: FileText,
  people: Users,
  tasks: CheckSquare,
  files: Files,
};

const QUICK_LINKS: SearchHit[] = [
  {
    id: "ql-projects",
    title: "Projects",
    subtitle: "All agency projects",
    href: "/projects",
  },
  {
    id: "ql-clients",
    title: "Clients",
    subtitle: "Client roster & relationships",
    href: "/clients",
  },
  {
    id: "ql-deliverables",
    title: "Deliverables",
    subtitle: "Review & approval pipeline",
    href: "/deliverables",
  },
  {
    id: "ql-tasks",
    title: "Tasks",
    subtitle: "Production task board",
    href: "/tasks",
  },
  {
    id: "ql-files",
    title: "Files",
    subtitle: "Asset repository & storage",
    href: "/files",
  },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: ⌘K or Ctrl+K opens the command palette.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setOpen((prev) => {
          const next = !prev;
          if (next) {
            setActiveIndex(0);
            setError(null);
          } else {
            setTerm("");
            setGroups([]);
            setLoading(false);
            setError(null);
          }
          return next;
        });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Cleanup debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Focus input on dialog open.
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setActiveIndex(0);
      setError(null);
    } else {
      setTerm("");
      setGroups([]);
      setLoading(false);
      setError(null);
    }
  };

  const allHits: SearchHit[] =
    term.trim().length < MIN_QUERY
      ? QUICK_LINKS
      : groups.flatMap((g) => g.hits);

  const runSearch = (value: string) => {
    setTerm(value);
    setActiveIndex(0);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < MIN_QUERY) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await globalSearch(value);
        setGroups(results);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Search request failed. Please try again.",
        );
        setGroups([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const go = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (allHits.length > 0) {
        setActiveIndex((prev) => (prev + 1) % allHits.length);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (allHits.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? allHits.length - 1 : prev - 1));
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (allHits.length > 0 && allHits[activeIndex]) {
        go(allHits[activeIndex].href);
      }
    }
  };

  const hasQuery = term.trim().length >= MIN_QUERY;
  const isEmpty = !loading && hasQuery && groups.length === 0 && !error;

  return (
    <>
      {/* Desktop Search Trigger */}
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="bg-surface-2/60 hover:bg-surface-3 text-muted-foreground hover:text-foreground border-border focus-visible:ring-ring relative hidden h-9 w-full max-w-md items-center justify-between rounded-md border px-3 text-sm shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none md:flex"
        aria-label="Search projects, clients, deliverables (Press ⌘K to open)"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Search className="text-brand-primary size-4 shrink-0" />
          <span className="truncate">
            Search projects, clients, deliverables…
          </span>
        </div>
        <kbd className="bg-surface-3 border-border text-foreground-subtle pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Mobile Search Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleOpenChange(true)}
        aria-label="Open search dialog"
        className="md:hidden"
      >
        <Search className="text-brand-primary size-4" />
      </Button>

      {/* Accessible Command Palette Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="border-border-strong bg-surface-4 top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-xl border p-0 shadow-2xl backdrop-blur-xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Global Command Palette</DialogTitle>
          </DialogHeader>

          {/* Search Input Bar */}
          <div className="border-border-subtle bg-surface-4/90 flex items-center gap-2.5 border-b px-3.5 py-3">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={term}
              onChange={(e) => runSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search projects, clients, deliverables, tasks, files…"
              className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
              aria-label="Search across the operating system"
              role="combobox"
              aria-expanded={true}
              aria-controls="command-palette-results"
              aria-autocomplete="list"
            />
            {loading && (
              <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
            )}
            {term && (
              <button
                type="button"
                onClick={() => runSearch("")}
                className="text-muted-foreground hover:text-foreground rounded p-0.5"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
            <kbd className="bg-muted text-muted-foreground hidden rounded border px-1.5 font-mono text-[10px] sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results Container */}
          <div
            id="command-palette-results"
            role="listbox"
            aria-label="Search results"
            className="max-h-80 overflow-y-auto p-1 text-sm"
          >
            {/* Error Message */}
            {error && (
              <div className="text-destructive flex items-center gap-2 px-3 py-3 text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Empty State */}
            {isEmpty && (
              <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                No matching results found for &ldquo;{term.trim()}&rdquo;.
              </div>
            )}

            {/* Initial State / Quick Navigation */}
            {!hasQuery && !loading && (
              <div>
                <p className="text-muted-foreground px-3 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase">
                  Quick Navigation
                </p>
                {QUICK_LINKS.map((hit, idx) => {
                  const isSelected = activeIndex === idx;
                  const Icon =
                    GROUP_ICONS[hit.id.replace("ql-", "")] || FolderKanban;
                  return (
                    <button
                      key={hit.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => go(hit.href)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-surface-3 text-foreground border-brand-primary border-l-2 font-medium"
                          : "hover:bg-surface-3/60 text-foreground"
                      }`}
                    >
                      <Icon className="text-muted-foreground size-4 shrink-0" />
                      <div className="flex flex-1 items-center justify-between overflow-hidden">
                        <span className="truncate">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="text-muted-foreground text-xs">
                            {hit.subtitle}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Live Search Results */}
            {hasQuery &&
              !loading &&
              groups.map((group) => {
                const Icon = GROUP_ICONS[group.key] || FolderKanban;
                return (
                  <div key={group.key} className="mb-1 last:mb-0">
                    <p className="text-muted-foreground px-3 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase">
                      {group.label}
                    </p>
                    {group.hits.map((hit) => {
                      const itemFlatIndex = allHits.findIndex(
                        (h) => h.id === hit.id,
                      );
                      const isSelected = activeIndex === itemFlatIndex;

                      return (
                        <button
                          key={`${group.key}-${hit.id}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => go(hit.href)}
                          onMouseEnter={() => setActiveIndex(itemFlatIndex)}
                          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? "bg-surface-3 text-foreground border-brand-primary border-l-2 font-medium"
                              : "hover:bg-surface-3/60 text-foreground"
                          }`}
                        >
                          <Icon className="text-muted-foreground size-4 shrink-0" />
                          <div className="flex flex-1 flex-col overflow-hidden">
                            <span className="truncate">{hit.title}</span>
                            {hit.subtitle && (
                              <span className="text-muted-foreground truncate text-xs capitalize">
                                {hit.subtitle.replaceAll("_", " ")}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          {/* Footer Guide */}
          <div className="bg-surface-4/90 text-foreground-subtle border-border-subtle flex items-center justify-between border-t px-3.5 py-2 text-[11px]">
            <span>
              Navigate with <kbd className="font-mono">↑</kbd>{" "}
              <kbd className="font-mono">↓</kbd>
            </span>
            <span>
              Select with <kbd className="font-mono">↵</kbd>
            </span>
            <span>
              Close with <kbd className="font-mono">esc</kbd>
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
