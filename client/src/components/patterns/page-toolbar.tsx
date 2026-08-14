import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  filterControls?: React.ReactNode;
  viewControls?: React.ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
}

export function PageToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterControls,
  viewControls,
  activeFilterCount = 0,
  onClearFilters,
  className,
  ...props
}: PageToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8 h-9 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {filterControls}

        {activeFilterCount > 0 && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="size-3.5" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {viewControls && <div className="flex shrink-0 items-center gap-2">{viewControls}</div>}
    </div>
  );
}
