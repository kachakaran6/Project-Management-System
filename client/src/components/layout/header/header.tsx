"use client";

import Link from "@/lib/next-link";

import { MoonStar, Menu, SunMedium, Search } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { HeaderOrgSwitcher } from "@/components/layout/header/org-switcher";
import { GlobalSearch } from "@/components/layout/header/global-search";
import { NotificationBell } from "@/components/layout/header/notification-bell";
import { HeaderUserMenu } from "@/components/layout/header/user-menu";
import { Breadcrumbs } from "./breadcrumbs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useApplyTheme } from "@/providers/theme-provider";
import { useUIStore } from "@/store/ui-store";
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSearchQuery } from "@/features/search/hooks/use-search-query";
import { Loader2 } from "lucide-react";
import { SearchResultItem } from "@/types/search.types";

function MobileSearchResult({ item, onSelect }: { item: SearchResultItem; onSelect: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className="flex items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-primary/8 active:bg-primary/10"
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

export function AppHeader() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQueryStr, setSearchQueryStr] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { setMobileSidebarOpen } = useUIStore();
  const { resolvedTheme } = useTheme();
  const { mode, changeMode } = useApplyTheme();
  const effectiveTheme = resolvedTheme ?? (mode === "system" ? "light" : mode);
  const nextMode = effectiveTheme === "dark" ? "light" : "dark";
  const tooltipLabel =
    effectiveTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";

  const handleThemeToggle = () => {
    changeMode(nextMode);
  };

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQueryStr.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchQueryStr]);

  const searchResults = useSearchQuery({ q: debouncedQuery, type: "all" }, showSearch);

  const groups = [
    ["Projects", searchResults.data?.data.projects ?? []],
    ["Tasks", searchResults.data?.data.tasks ?? []],
    ["Users", searchResults.data?.data.users ?? []],
  ] as const;

  const hasResults = groups.some(([, items]) => items.length > 0);

  return (
    <header className="sticky top-0 z-30 flex h-[52px] md:h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-2.5 backdrop-blur-md md:px-6">
      {/* Mobile Left: Menu + App Identity */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 rounded-lg hover:bg-accent/50 transition-colors"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-5 text-foreground/80" />
        </Button>
        <span className="md:hidden text-[15px] font-semibold tracking-tight text-foreground/90 letter-spacing-[0.3px]">PMS</span>
        
        <div className="hidden sm:flex flex-col min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold mb-0.5 md:block hidden">Workspace</p>
          <Breadcrumbs />
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex items-center gap-1 md:gap-3 ml-auto min-w-0">
        {/* Mobile Search Icon - Ghost style */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all shrink-0"
          onClick={() => setShowSearch(true)}
        >
          <Search className="size-[18px]" />
        </Button>

        <Dialog open={showSearch} onOpenChange={setShowSearch}>
          <DialogContent className="sm:max-w-[425px] top-[20%] translate-y-0 p-0 overflow-hidden border-none bg-card/95 backdrop-blur-xl shadow-2xl">
            <DialogHeader className="p-4 pb-2 border-b border-border/40">
              <DialogTitle className="sr-only">Search</DialogTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-11 bg-secondary/20 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                  placeholder="Search everything..."
                  autoFocus
                  value={searchQueryStr}
                  onChange={(e) => setSearchQueryStr(e.target.value)}
                />
              </div>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {searchResults.isFetching ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="size-6 animate-spin text-primary/40" />
                  <p className="text-xs text-muted-foreground font-medium">Searching the workspace...</p>
                </div>
              ) : debouncedQuery.length < 2 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
                </div>
              ) : !hasResults ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No results found for "{debouncedQuery}"</p>
                </div>
              ) : (
                <div className="space-y-4 p-1">
                  {groups.map(([label, items]) => (
                    items.length > 0 && (
                      <div key={label}>
                        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</p>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <MobileSearchResult 
                              key={item.id} 
                              item={item} 
                              onSelect={() => setShowSearch(false)} 
                            />
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Desktop Global Search */}
        <div className="hidden lg:block lg:flex-1 max-w-xs xl:max-w-sm">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <HeaderOrgSwitcher />

          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleThemeToggle}
                    aria-label={tooltipLabel}
                    className={cn(
                      "relative h-9 w-9 md:h-10 md:w-10 rounded-[10px] md:rounded-full border-border/70 bg-card shadow-sm transition-all duration-300",
                      "hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-md:hidden",
                    )}
                  >
                    <SunMedium
                      className={cn(
                        "absolute size-4 transition-all duration-300",
                        effectiveTheme === "dark"
                          ? "rotate-90 scale-0 opacity-0"
                          : "rotate-0 scale-100 opacity-100",
                      )}
                    />
                    <MoonStar
                      className={cn(
                        "absolute size-4 transition-all duration-300",
                        effectiveTheme === "dark"
                          ? "rotate-0 scale-100 opacity-100"
                          : "-rotate-90 scale-0 opacity-0",
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tooltipLabel}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <NotificationBell />
            <HeaderUserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
