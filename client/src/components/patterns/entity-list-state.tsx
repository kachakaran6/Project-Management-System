import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, FolderSearch, ShieldAlert, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityLoadingStateProps {
  count?: number;
  type?: "table" | "grid" | "cards";
  className?: string;
}

export function EntityLoadingState({
  count = 5,
  type = "table",
  className,
}: EntityLoadingStateProps) {
  if (type === "grid" || type === "cards") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-5 border rounded-xl space-y-3 bg-card">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <div className="pt-3 flex justify-between items-center border-t border-border/50">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 rounded-xl border p-4 bg-card", className)}>
      <Skeleton className="h-8 w-full rounded-md" />
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

interface EntityEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EntityEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EntityEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-card/50", className)}>
      {icon ? (
        <div className="p-3 mb-3 rounded-full bg-muted/60 text-muted-foreground">{icon}</div>
      ) : (
        <div className="p-3 mb-3 rounded-full bg-muted/60 text-muted-foreground">
          <FolderSearch className="size-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

interface EntityNoResultsStateProps {
  searchQuery?: string;
  onClearFilters: () => void;
  className?: string;
}

export function EntityNoResultsState({
  searchQuery,
  onClearFilters,
  className,
}: EntityNoResultsStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-card/40", className)}>
      <div className="p-3 mb-3 rounded-full bg-muted/60 text-muted-foreground">
        <FolderSearch className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">No matching results</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {searchQuery
          ? `No items found matching "${searchQuery}". Try adjusting your filters or search criteria.`
          : "No items match your active filters."}
      </p>
      <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-4">
        Clear filters
      </Button>
    </div>
  );
}

interface EntityErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function EntityErrorState({
  title = "Failed to load data",
  message = "An error occurred while fetching information. Please try again.",
  onRetry,
  className,
}: EntityErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border border-destructive/20 rounded-xl bg-destructive/5 text-foreground", className)}>
      <div className="p-3 mb-3 rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-2">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

interface EntityPermissionStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function EntityPermissionState({
  title = "Access Restricted",
  message = "You do not have permission to view or manage this resource.",
  className,
}: EntityPermissionStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-muted/30", className)}>
      <div className="p-3 mb-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <ShieldAlert className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}
