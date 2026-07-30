"use client";

/**
 * Header global search (P2-04).
 *
 * The header previously rendered a prominent "Search projects, clients, tasks…"
 * input that was purely decorative: typing and pressing Enter produced no
 * overlay and no navigation. It now opens a real results panel over
 * globalSearch(), which fans out across the search-capable public reads.
 *
 * Sprint 12B added `searchTasks`, so the placeholder can promise tasks again —
 * it deliberately still omits meetings and timelines, which have no
 * search-capable read. Naming something the search cannot find is the same
 * defect in smaller print.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { globalSearch, type SearchGroup } from "../actions";

const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

export function GlobalSearch() {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Click-away close. The panel is inline (not a portal), so a document
  // listener scoped to the container is sufficient.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const runSearch = (value: string) => {
    setTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < MIN_QUERY) {
      setGroups([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setGroups(await globalSearch(value));
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const go = (href: string) => {
    setOpen(false);
    setTerm("");
    setGroups([]);
    router.push(href);
  };

  const hasQuery = term.trim().length >= MIN_QUERY;
  const isEmpty = !loading && hasQuery && groups.length === 0;

  return (
    <div ref={containerRef} className="relative hidden max-w-md flex-1 md:block">
      <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={term}
        onChange={(event) => runSearch(event.target.value)}
        onFocus={() => hasQuery && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          // Enter jumps to the first result — the behaviour the decorative
          // input previously implied but never had.
          if (event.key === "Enter") {
            const first = groups[0]?.hits[0];
            if (first) go(first.href);
          }
        }}
        placeholder="Search projects, clients, people, tasks, files…"
        className="h-9 pl-8"
        aria-label="Global search"
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-autocomplete="list"
      />

      {open && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border shadow-md"
        >
          {loading && (
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          )}

          {isEmpty && (
            <div className="text-muted-foreground px-3 py-3 text-sm">
              No matches for &ldquo;{term.trim()}&rdquo;. Meetings and timelines
              are not searchable yet.
            </div>
          )}

          {!loading &&
            groups.map((group) => (
              <div key={group.key} className="border-b last:border-b-0">
                <p className="text-muted-foreground px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wide">
                  {group.label}
                </p>
                {group.hits.map((hit) => (
                  <button
                    key={`${group.key}-${hit.id}`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => go(hit.href)}
                    className="hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm outline-none"
                  >
                    <span className="truncate font-medium">{hit.title}</span>
                    {hit.subtitle && (
                      <span className="text-muted-foreground truncate text-xs capitalize">
                        {hit.subtitle.replaceAll("_", " ")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
