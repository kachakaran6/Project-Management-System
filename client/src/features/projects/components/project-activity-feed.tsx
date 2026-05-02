
import { useRef, useCallback, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { GitCommitHorizontal, GitPullRequest, GitMerge, GitBranch, ExternalLink, RefreshCw } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { githubApi, GithubFullActivityItem } from "@/features/projects/api/github.api";

interface ProjectActivityFeedProps {
  projectId: string;
}

type FilterType = "all" | "commit" | "pr";

function getTypeConfig(item: GithubFullActivityItem) {
  if (item.type === "pr") {
    const state = item.prState ?? "open";
    if (state === "merged") return {
      icon: <GitMerge className="size-3" />,
      label: "Merged PR",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    };
    return {
      icon: <GitPullRequest className="size-3" />,
      label: "Pull Request",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    };
  }
  return {
    icon: <GitCommitHorizontal className="size-3" />,
    label: "Commit",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  };
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

function ActivityItem({ item }: { item: GithubFullActivityItem }) {
  const cfg = getTypeConfig(item);
  const authorName = typeof item.author === 'string' 
    ? item.author 
    : (item.author as any)?.username || (item.author as any)?.name || "GH";
  const initials = authorName.slice(0, 2).toUpperCase();
  const authorAvatar = item.authorAvatar || (item.author as any)?.avatarUrl;

  return (
    <div className="group relative flex gap-4 pb-6 last:pb-0">
      {/* VERTICAL LINE */}
      <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border/10 group-last:hidden" />
      
      <div className={cn(
        "size-7 rounded-full flex items-center justify-center shrink-0 z-10",
        cfg.bg, cfg.color
      )}>
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0 space-y-1 mt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
              <Avatar className="size-5 border border-border/10">
                <AvatarImage src={authorAvatar} />
                <AvatarFallback className="text-[8px] font-bold">{initials}</AvatarFallback>
             </Avatar>
             <span className="text-xs font-semibold text-foreground/90 line-clamp-1 flex-1">
               {item.title || (item as any).message || "No message"}
             </span>
             <span className="text-[10px] text-muted-foreground/60 shrink-0">{cfg.label.toLowerCase()}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/40 font-medium shrink-0">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Removed redundant body text since it's now in the header */}

        {item.hash && (
          <div className="flex items-center gap-2 pt-1">
             <span className="text-[10px] font-mono text-muted-foreground/30 bg-muted/20 px-1.5 py-0.5 rounded-md">
                {item.hash.slice(0, 7)}
             </span>
             {item.url && (
               <a 
                 href={item.url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-[10px] font-medium text-primary/60 hover:text-primary transition-colors flex items-center gap-1"
               >
                 <ExternalLink className="size-2.5" />
                 View
               </a>
             )}
          </div>
        )}
      </div>
    </div>
  );
}

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-4 first:pt-0">
      <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest shrink-0">{label}</span>
      <div className="flex-1 h-px bg-border/5" />
    </div>
  );
}

export function ProjectActivityFeed({ projectId }: ProjectActivityFeedProps) {
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isError,
  } = useInfiniteQuery({
    queryKey: ["github-full-activity", projectId, typeFilter],
    queryFn: ({ pageParam = 1 }) =>
      githubApi.getFullActivity(projectId, { page: pageParam as number, per_page: 30, type: typeFilter }),
    getNextPageParam: (lastPage) => {
      // If we got fewer items than requested, we've reached the end
      if (Array.isArray(lastPage.data) && lastPage.data.length < 30) return undefined;
      // For now, if it's an array, we just return undefined to stop infinite scroll 
      // unless we want to implement offset-based pagination in backend
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const allItems: GithubFullActivityItem[] = data?.pages.flatMap((p) => 
    Array.isArray(p.data) ? p.data : (p.data as any).items ?? []
  ) ?? [];
  const isConnected = true; // Default to true if we got data

  const grouped = allItems.reduce<Record<string, GithubFullActivityItem[]>>((acc, item) => {
    const group = getDateGroup(item.createdAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  if (isLoading) return <div className="space-y-6">
    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
  </div>;

  if (!isConnected) return (
    <div className="py-12 text-center">
       <p className="text-xs text-muted-foreground/40 font-medium uppercase tracking-widest">GitHub not connected</p>
    </div>
  );

  return (
    <div className="max-w-xl space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
           <GithubIcon className="size-3.5 text-muted-foreground/50" />
           <h3 className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Recent Activity</h3>
        </div>
        <button onClick={() => refetch()} className="text-[10px] font-bold text-primary/60 hover:text-primary gap-1.5 flex items-center transition-colors">
          <RefreshCw className="size-3" />
          REFRESH
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(grouped).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <DateGroupHeader label={dateLabel} />
            <div className="pl-1">
              {items.map((item, idx) => (
                <ActivityItem key={`${item.id}-${idx}`} item={item} />
              ))}
            </div>
          </div>
        ))}
        {allItems.length === 0 && (
          <div className="py-12 text-center border border-dashed border-border/10 rounded-xl">
             <p className="text-xs text-muted-foreground/30 font-medium uppercase tracking-widest">No activity found</p>
          </div>
        )}
      </div>

      {hasNextPage && (
        <button 
          onClick={() => fetchNextPage()} 
          disabled={isFetchingNextPage}
          className="w-full py-2 text-[10px] font-bold text-muted-foreground/40 hover:text-primary transition-colors uppercase tracking-widest"
        >
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
