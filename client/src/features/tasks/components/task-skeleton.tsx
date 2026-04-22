import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-3 shadow-sm",
        className
      )}
    >
      {/* Header: ID and Menu */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-12 rounded-full opacity-40" />
        <Skeleton className="h-4 w-4 rounded-md opacity-20" />
      </div>

      {/* Title lines */}
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-[85%] rounded-md" />
        <Skeleton className="h-3.5 w-[60%] rounded-md" />
      </div>

      {/* Footer metadata */}
      <div className="mt-2 flex items-center gap-2">
        {/* Creator Avatar */}
        <Skeleton className="h-5 w-5 rounded-full" />
        
        {/* Status Chip */}
        <Skeleton className="h-5 w-16 rounded-full" />
        
        {/* Priority Flag */}
        <Skeleton className="h-5 w-5 rounded-md" />
        
        {/* Date Chip */}
        <Skeleton className="h-5 w-14 rounded-md" />
        
        {/* Assignees (Right aligned) */}
        <div className="ml-auto flex items-center -space-x-1.5">
          <Skeleton className="h-5 w-5 rounded-full border-2 border-card" />
          <Skeleton className="h-5 w-5 rounded-full border-2 border-card" />
        </div>
      </div>
    </div>
  );
}

export function TaskBoardSkeleton() {
  return (
    <div className="flex h-full gap-4 overflow-hidden p-4 no-scrollbar">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="flex h-full w-72 flex-col gap-3 shrink-0">
          {/* Column Header */}
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <Skeleton className="h-4 w-4 rounded-md opacity-20" />
          </div>
          
          {/* Cards in column */}
          {[1, 2, 3].map((card) => (
            <TaskCardSkeleton key={card} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-3 pt-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border/30 bg-card/30 p-3">
          <Skeleton className="h-4 w-[40%] rounded-md" />
          <Skeleton className="h-6 w-16 rounded-full ml-auto" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}
