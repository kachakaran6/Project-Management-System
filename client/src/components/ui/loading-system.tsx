
import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * 🟢 LEVEL 1 — PAGE LOADING (Full Screen)
 */
export const PageLoader = ({ 
  message = "Loading...", 
  icon: Icon,
  className 
}: { 
  message?: string; 
  icon?: React.ElementType;
  className?: string;
}) => {
  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300",
      className
    )}>
      <div className="relative flex flex-col items-center">
        {Icon ? (
          <div className="relative mb-4">
            <Icon className="size-10 text-primary animate-pulse" />
            <div className="absolute inset-0 size-10 bg-primary/20 rounded-full animate-ping blur-xl" />
          </div>
        ) : (
          <Loader2 className="size-8 text-primary animate-spin mb-4" />
        )}
        <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground/70 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

/**
 * 🟡 LEVEL 2 — SECTION LOADING (Skeleton Units)
 */

export const SkeletonBlock = ({ 
  className,
  width,
  height,
  rounded = "rounded-md"
}: { 
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}) => {
  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-muted/40",
        rounded,
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer-slide_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:dark:via-white/5 before:to-transparent",
        className
      )}
      style={{ width, height }}
    />
  );
};

export const RepositoryRowSkeleton = () => (
  <div className="flex items-center justify-between py-2.5 px-3 border-b border-border/20">
    <div className="flex items-center gap-3 flex-[0.4]">
      <SkeletonBlock width={28} height={28} rounded="rounded" />
      <div className="space-y-1.5 flex-1">
        <SkeletonBlock width="60%" height={12} />
        <SkeletonBlock width="40%" height={8} />
      </div>
    </div>
    <div className="flex items-center gap-8 flex-[0.4] justify-center">
      <div className="flex flex-col items-center space-y-1.5">
        <SkeletonBlock width={40} height={8} />
        <SkeletonBlock width={30} height={10} />
      </div>
      <div className="flex flex-col items-center space-y-1.5">
        <SkeletonBlock width={40} height={8} />
        <SkeletonBlock width={30} height={10} />
      </div>
    </div>
    <SkeletonBlock width={48} height={28} rounded="rounded" />
  </div>
);

export const ActivityRowSkeleton = () => (
  <div className="flex gap-2.5 py-2 px-1">
    <SkeletonBlock width={20} height={20} rounded="rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <SkeletonBlock width="40%" height={10} />
        <SkeletonBlock width="20%" height={8} />
      </div>
      <SkeletonBlock width="100%" height={14} rounded="rounded" />
    </div>
  </div>
);

/**
 * 🔵 LEVEL 3 — ACTION LOADING (Inline)
 */

export const InlineLoader = ({ 
  className,
  size = 14
}: { 
  className?: string;
  size?: number;
}) => {
  return (
    <Loader2 
      className={cn("animate-spin", className)} 
      style={{ width: size, height: size }}
    />
  );
};

export const LoadingButtonContent = ({ 
  loading, 
  text, 
  loadingText,
  icon: Icon
}: { 
  loading: boolean; 
  text: string; 
  loadingText?: string;
  icon?: any;
}) => {
  if (loading) {
    return (
      <>
        <InlineLoader className="mr-2" />
        {loadingText || text}
      </>
    );
  }
  return (
    <>
      {Icon && <Icon className="mr-2 size-4" />}
      {text}
    </>
  );
};
