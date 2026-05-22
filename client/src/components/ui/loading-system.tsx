
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
  <div className="flex items-center h-14 py-2 px-4 border-b border-border/20 gap-3">
    <SkeletonBlock width={32} height={32} rounded="rounded-sm" className="shrink-0" />
    <div className="flex flex-col gap-1.5 flex-1">
      <SkeletonBlock width="40%" height={12} />
      <SkeletonBlock width="20%" height={10} />
    </div>
    <div className="hidden sm:flex items-center gap-12 px-6">
      <div className="flex flex-col gap-1 w-20">
        <SkeletonBlock width={30} height={8} />
        <SkeletonBlock width={50} height={10} />
      </div>
      <div className="flex flex-col gap-1 w-28">
        <SkeletonBlock width={40} height={8} />
        <SkeletonBlock width={60} height={10} />
      </div>
    </div>
    <div className="flex gap-2 w-24 justify-end shrink-0">
      <SkeletonBlock width={32} height={32} rounded="rounded-sm" />
      <SkeletonBlock width={60} height={32} rounded="rounded-sm" />
    </div>
  </div>
);

export const BranchSkeleton = () => (
  <div className="p-3 border border-border/40 rounded-md bg-card/40 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <SkeletonBlock width={16} height={16} rounded="rounded-sm" />
      <div className="space-y-1.5">
        <SkeletonBlock width={120} height={12} />
        <SkeletonBlock width={80} height={10} />
      </div>
    </div>
    <SkeletonBlock width={60} height={20} rounded="rounded-full" />
  </div>
);

export const CommitSkeleton = () => (
  <div className="flex gap-3 py-3 px-4 border-b border-border/20 last:border-0">
    <SkeletonBlock width={32} height={32} rounded="rounded-full" className="shrink-0" />
    <div className="flex-1 space-y-2">
      <SkeletonBlock width="70%" height={12} />
      <div className="flex gap-2">
        <SkeletonBlock width={60} height={10} />
        <SkeletonBlock width={100} height={10} />
      </div>
    </div>
    <SkeletonBlock width={60} height={24} rounded="rounded-sm" className="shrink-0" />
  </div>
);

export const PRSkeleton = () => (
  <div className="p-4 border-b border-border/20 last:border-0 flex gap-4">
    <SkeletonBlock width={16} height={16} rounded="rounded-sm" className="shrink-0 mt-1" />
    <div className="flex-1 space-y-2.5">
      <SkeletonBlock width="80%" height={14} />
      <div className="flex items-center gap-3">
        <SkeletonBlock width={80} height={10} />
        <SkeletonBlock width={120} height={10} />
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <SkeletonBlock width={24} height={24} rounded="rounded-full" />
      <SkeletonBlock width={40} height={20} rounded="rounded-sm" />
    </div>
  </div>
);

export const IssueSkeleton = () => (
  <div className="p-4 border-b border-border/20 last:border-0 flex gap-4">
    <SkeletonBlock width={16} height={16} rounded="rounded-sm" className="shrink-0 mt-1" />
    <div className="flex-1 space-y-2.5">
      <SkeletonBlock width="70%" height={14} />
      <div className="flex gap-2">
        <SkeletonBlock width={60} height={16} rounded="rounded-full" />
        <SkeletonBlock width={40} height={16} rounded="rounded-full" />
      </div>
      <SkeletonBlock width={150} height={10} />
    </div>
    <SkeletonBlock width={80} height={28} rounded="rounded-md" className="shrink-0" />
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

export const ProfileAnalyticsSkeleton = () => (
  <div className="flex flex-col h-full bg-background relative max-w-[1200px] mx-auto w-full animate-in fade-in duration-300">
    <div className="flex items-center gap-4 py-4 px-6 border-b border-border/20 sticky top-0 bg-background/95 backdrop-blur z-20">
      <SkeletonBlock width={32} height={32} rounded="rounded-sm" />
      <SkeletonBlock width={250} height={24} />
    </div>

    <div className="flex-1 overflow-auto p-6 space-y-8">
      {/* Profile Header Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6 bg-card/40 border border-border/40 rounded-xl">
        <SkeletonBlock width={96} height={96} rounded="rounded-xl" className="shrink-0" />
        <div className="space-y-4 flex-1 w-full">
          <SkeletonBlock width="40%" height={32} />
          <SkeletonBlock width="20%" height={20} />
          <div className="flex gap-4">
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width={120} height={16} />
            <SkeletonBlock width={90} height={16} />
          </div>
          <SkeletonBlock width="80%" height={14} />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 border border-border/40 bg-card rounded-xl flex flex-col items-center justify-center">
            <SkeletonBlock width={40} height={40} rounded="rounded-full" className="mb-4" />
            <SkeletonBlock width={60} height={24} className="mb-2" />
            <SkeletonBlock width={80} height={12} />
          </div>
        ))}
      </div>

      {/* 2x2 Grid for Charts/Streaks Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 border border-border/40 bg-card rounded-xl flex flex-col">
            <SkeletonBlock width={150} height={20} className="mb-6" />
            <SkeletonBlock width="100%" height={200} rounded="rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
