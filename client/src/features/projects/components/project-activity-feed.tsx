"use client";

import { useRef, useCallback, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { GitCommitHorizontal, GitPullRequest, GitMerge, GitBranch, ExternalLink, RefreshCw, Settings2 } from "lucide-react";
import { GithubIcon } from "@/components/icons/github-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { githubApi, GithubFullActivityItem } from "@/features/projects/api/github.api";
import { useRouter } from "next/navigation";

interface ProjectActivityFeedProps {
  projectId: string;
}

type FilterType = "all" | "commit" | "pr";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getTypeConfig(item: GithubFullActivityItem) {
  if (item.type === "pr") {
    const state = item.prState ?? "open";
    if (state === "merged") return {
      icon: <GitMerge className="size-4" />,
      label: "Merged PR",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      ring: "ring-purple-500/20",
      badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };
    if (state === "closed") return {
      icon: <GitPullRequest className="size-4" />,
      label: "Closed PR",
      color: "text-red-400",
      bg: "bg-red-500/10",
      ring: "ring-red-500/20",
      badge: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return {
      icon: <GitPullRequest className="size-4" />,
      label: "Pull Request",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      ring: "ring-emerald-500/20",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }
  if (item.type === "branch") return {
    icon: <GitBranch className="size-4" />,
    label: "Branch",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  // commit
  return {
    icon: <GitCommitHorizontal className="size-4" />,
    label: "Commit",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/20",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

// ─── ACTIVITY ITEM ─────────────────────────────────────────────────────────────

function ActivityItem({ item }: { item: GithubFullActivityItem }) {
  const cfg = getTypeConfig(item);
  const initials = (item.author ?? "GH").slice(0, 2).toUpperCase();

  return (
    <div className="group relative flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0">
        <a href={item.authorProfile ?? "#"} target="_blank" rel="noopener noreferrer" title={item.author}>
          <div className={cn(
            "size-7 rounded-lg flex items-center justify-center ring-1 transition-all group-hover:scale-105 cursor-pointer",
            cfg.bg, cfg.ring, cfg.color
          )}>
            {cfg.icon}
          </div>
        </a>
        <div className="w-px flex-1 bg-border/8 mt-1.5" />
      </div>

      {/* Content card */}
      <div className="pb-3 flex-1 min-w-0">
        <div className="bg-card/20 border border-border/8 rounded-xl px-3 py-2.5 space-y-1.5 hover:border-primary/10 hover:bg-card/40 transition-all">
          {/* Top row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn("h-5 text-[9px] font-black uppercase tracking-widest border rounded-lg px-2", cfg.badge)}>
                {cfg.label}
              </Badge>
              {item.prNumber && (
                <span className="text-[10px] font-mono text-muted-foreground/40">#{item.prNumber}</span>
              )}
              {item.taskCode && (
                <Link
                  href={`/tasks/${item.taskId}`}
                  className="inline-flex items-center gap-1 text-[10px] font-black text-primary/70 hover:text-primary uppercase tracking-widest transition-colors bg-primary/5 hover:bg-primary/10 rounded-md px-1.5 py-0.5"
                >
                  🔗 {item.taskCode}
                </Link>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/40 font-medium shrink-0">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-foreground/85 leading-relaxed line-clamp-2 break-words">
            {item.title || "No message"}
          </p>

          {/* Footer: author + hash + link */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2">
              <Avatar className="size-5 ring-1 ring-border/20">
                <AvatarImage src={item.authorAvatar} />
                <AvatarFallback className="text-[8px] font-black bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-bold text-muted-foreground/50">{item.author}</span>
              {item.hash && (
                <span className="text-[9px] font-mono text-muted-foreground/25 bg-muted/10 px-1.5 py-0.5 rounded-md">
                  {item.hash}
                </span>
              )}
            </div>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/40 hover:text-primary transition-colors"
              >
                <ExternalLink className="size-3" />
                View on GitHub
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 mb-0.5">
      <span className="text-[9px] font-black text-muted-foreground/35 uppercase tracking-[0.2em] shrink-0">{label}</span>
      <div className="flex-1 h-px bg-border/8" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="size-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-3 w-32 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotConnectedState({ projectId }: { projectId: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="p-3.5 rounded-2xl bg-muted/10 ring-1 ring-border/10">
        <GithubIcon className="size-7 text-muted-foreground/20" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-black text-foreground/50">GitHub Not Connected</p>
        <p className="text-[11px] text-muted-foreground/35 leading-relaxed">
          Connect a GitHub repository and add a Personal Access Token in Settings to see the full activity feed.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 rounded-lg gap-1.5 text-xs font-bold h-7"
          onClick={() => router.push(`/projects`)}
        >
          <Settings2 className="size-3" />
          Open Project Settings → GitHub
        </Button>
      </div>
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="p-3.5 rounded-2xl bg-muted/10 ring-1 ring-border/10">
        <GithubIcon className="size-7 text-muted-foreground/20" />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-black text-foreground/50">No GitHub activity found</p>
        <p className="text-[11px] text-muted-foreground/35 leading-relaxed">
          Activity will appear here once commits or PRs are pushed to the connected repository.
        </p>
      </div>
    </div>
  );
}

// ─── FILTER BAR ────────────────────────────────────────────────────────────────

function FilterBar({ active, onChange }: { active: FilterType; onChange: (f: FilterType) => void }) {
  const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: <GithubIcon className="size-3.5" /> },
    { value: "commit", label: "Commits", icon: <GitCommitHorizontal className="size-3.5" /> },
    { value: "pr", label: "Pull Requests", icon: <GitPullRequest className="size-3.5" /> },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 transition-all border",
            active === f.value
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-muted/5 text-muted-foreground/50 border-border/10 hover:bg-muted/15"
          )}
        >
          {f.icon}
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

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
    getNextPageParam: (lastPage) =>
      lastPage.data.meta.hasMore ? lastPage.data.meta.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const allItems: GithubFullActivityItem[] = data?.pages.flatMap((p) => p.data.items) ?? [];
  const isConnected = data?.pages[0]?.data.connected ?? true; // assume true until loaded
  const repoInfo = data?.pages[0]?.data.repoInfo;

  // Infinite scroll sentinel
  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
      });
      if (node) observer.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // Group by date
  const grouped = allItems.reduce<Record<string, GithubFullActivityItem[]>>((acc, item) => {
    const group = getDateGroup(item.createdAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  if (isLoading) return <ActivitySkeleton />;

  if (!isConnected && !isLoading) return <NotConnectedState projectId={projectId} />;

  return (
    <div className="max-w-2xl space-y-3 animate-in fade-in duration-500">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GithubIcon className="size-4 text-muted-foreground/50" />
          <span className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest">
            {repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : "GitHub Activity"}
          </span>
          {repoInfo && (
            <a
              href={`https://github.com/${repoInfo.owner}/${repoInfo.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/30 hover:text-primary transition-colors"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground/40 hover:text-primary transition-colors uppercase tracking-widest"
        >
          <RefreshCw className="size-3" />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <FilterBar active={typeFilter} onChange={(f) => setTypeFilter(f)} />

      {isError && (
        <div className="text-center py-6 text-[11px] text-destructive/60 font-medium bg-destructive/5 rounded-2xl border border-destructive/10">
          Failed to load activity. Check your GitHub connection and try refreshing.
        </div>
      )}

      {/* Timeline */}
      {allItems.length === 0 && !isLoading && !isError ? (
        <EmptyActivity />
      ) : (
        <div className="space-y-1">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <DateGroupHeader label={dateLabel} />
              {items.map((item, idx) => (
                <ActivityItem
                  key={`${item.id}-${idx}`}
                  item={item}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-2 flex justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/35">
            <div className="size-2.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading more...
          </div>
        )}
        {!hasNextPage && allItems.length > 5 && !isFetchingNextPage && (
          <p className="text-[9px] text-muted-foreground/20 font-black uppercase tracking-widest">
            All activity loaded
          </p>
        )}
      </div>
    </div>
  );
}
