"use client";

import Link from "@/lib/next-link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useSearchQuery } from "@/features/search/hooks/use-search-query";
import { SearchResultItem } from "@/types/search.types";

function ResultRow({ item, onSelect }: { item: SearchResultItem; onSelect: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className="flex items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-primary/8"
    >
      <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-semibold uppercase text-primary">
        {item.type.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">{item.subtitle ?? item.href}</p>
      </div>
    </Link>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  const searchQuery = useSearchQuery({ q: debouncedQuery, type: "all" }, open);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const groups = useMemo(
    () => [
      ["Projects", searchQuery.data?.data.projects ?? []],
      ["Tasks", searchQuery.data?.data.tasks ?? []],
      ["Users", searchQuery.data?.data.users ?? []],
      ["Messages", searchQuery.data?.data.messages ?? []],
    ] as const,
    [searchQuery.data?.data],
  );

  const hasResults = groups.some(([, items]) => items.length > 0);
  const isVisible = open && debouncedQuery.length >= 2;

  return (
    <div ref={wrapperRef} className="relative hidden w-full max-w-xl md:block">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 pr-9"
          placeholder="Search projects, tasks, users"
          aria-label="Global search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.target.value);
          }}
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setOpen(false);
            }}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {isVisible ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Global Search</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery.isFetching ? "Searching" : `${searchQuery.data?.data.meta?.totalItems ?? 0} results`}
              </p>
            </div>
            {searchQuery.isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {!searchQuery.isFetching && !hasResults ? (
              <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            ) : null}

            {groups.map(([label, items]) =>
              items.length > 0 ? (
                <div key={label} className="mb-2 last:mb-0">
                  <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {label}
                  </p>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <ResultRow key={item.id} item={item} onSelect={() => setOpen(false)} />
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
