import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskMobileNavigationProps {
  sourceLabel: string;
  positionLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isNavigating?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function TaskMobileNavigation({
  sourceLabel,
  positionLabel,
  canGoPrevious,
  canGoNext,
  isNavigating = false,
  onPrevious,
  onNext,
}: TaskMobileNavigationProps) {
  return (
    <div className="border-t border-border/20 bg-background/95 px-4 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="rounded-[1.25rem] border border-border/50 bg-muted/10 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-12 min-w-12 rounded-full border-border/50 px-3 text-xs font-bold",
              !canGoPrevious && "opacity-45",
            )}
            disabled={!canGoPrevious || isNavigating}
            onClick={onPrevious}
            aria-label="Go to previous task"
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-foreground/80">
              {sourceLabel}
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
              {isNavigating ? "Loading next task..." : positionLabel}
            </p>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground/70">
              Swipe left or right to keep moving
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-12 min-w-12 rounded-full border-border/50 px-3 text-xs font-bold",
              !canGoNext && "opacity-45",
            )}
            disabled={!canGoNext || isNavigating}
            onClick={onNext}
            aria-label="Go to next task"
          >
            {isNavigating ? <Loader2 className="size-4 animate-spin" /> : null}
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
