import { cn } from "@/lib/utils";
import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";

export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/50 p-4 shadow-sm",
        className
      )}
    >
      {/* Header: ID and Menu */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-4 w-4 rounded-md" />
      </div>

      {/* Title lines */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-[90%] rounded-md" />
        <Skeleton className="h-4 w-[65%] rounded-md" />
      </div>

      {/* Footer metadata */}
      <div className="mt-3 flex items-center gap-2">
        {/* Creator Avatar */}
        <SkeletonAvatar className="size-6" />
        
        {/* Status Chip */}
        <Skeleton className="h-6 w-16 rounded-full" />
        
        {/* Priority Flag */}
        <Skeleton className="h-6 w-6 rounded-md" />
        
        {/* Assignees (Right aligned) */}
        <div className="ml-auto flex items-center -space-x-1.5">
          <SkeletonAvatar className="size-6 border-2 border-card" />
          <SkeletonAvatar className="size-6 border-2 border-card" />
        </div>
      </div>
    </div>
  );
}

export function TaskBoardSkeleton() {
  return (
    <div className="flex h-full gap-4 overflow-hidden p-4 no-scrollbar">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="flex h-full w-[300px] flex-col gap-4 shrink-0">
          {/* Column Header */}
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <Skeleton className="h-5 w-5 rounded-md" />
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
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-border/40 bg-card/30 p-4">
          <Skeleton className="h-5 w-[45%] rounded-md" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <SkeletonAvatar className="size-9" />
        </div>
      ))}
    </div>
  );
}

export function TaskTableSkeleton() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="grid grid-cols-[1fr,150px,120px,120px,150px,150px,150px] gap-4 py-4 px-8 border-b border-border/40 bg-muted/20">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20 rounded-md opacity-50" />
        ))}
      </div>
      <div className="divide-y divide-border/10">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="grid grid-cols-[1fr,150px,120px,120px,150px,150px,150px] gap-4 py-5 px-8">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}


