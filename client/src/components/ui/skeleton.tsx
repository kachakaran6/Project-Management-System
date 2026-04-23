import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-base", className)}
      aria-busy="true"
      {...props}
    />
  )
}

function SkeletonText({ 
  lines = 1, 
  className,
  ...props 
}: { lines?: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4 w-full",
            i === lines - 1 && lines > 1 && "w-2/3"
          )} 
        />
      ))}
    </div>
  )
}

function SkeletonAvatar({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("size-10 rounded-full", className)}
      {...props}
    />
  )
}

function SkeletonCard({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-3xl border border-border/40 bg-card/30 p-6 space-y-4", className)} {...props}>
      <Skeleton className="h-6 w-1/3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="pt-4 flex items-center gap-3">
        <SkeletonAvatar className="size-8" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

function SkeletonTaskItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4 border border-border/40 rounded-2xl flex items-center gap-4", className)} {...props}>
      <Skeleton className="size-5 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <SkeletonAvatar className="size-8" />
      </div>
    </div>
  )
}

function SkeletonTableRow({ columns = 4, className, ...props }: { columns?: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid items-center gap-4 py-4 px-6 border-b border-border/20", className)} 
         style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }} 
         {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-3/4" />
      ))}
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonTaskItem, 
  SkeletonTableRow 
}
