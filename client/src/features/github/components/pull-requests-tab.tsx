"use client";

import { useState, useMemo } from "react";
import Link from "@/lib/next-link";
import { useRepoPullRequests } from "@/features/github/hooks/use-github";
import { PRSkeleton } from "@/components/ui/loading-system";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GitPullRequest, GitMerge, GitPullRequestClosed, ExternalLink, MessageSquare, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const PullRequestsTab = ({ owner, repo }: { owner: string; repo: string }) => {
  // Fetch "all" PRs by default so client-side filtering works across open/closed
  const { data: prs, isLoading, error } = useRepoPullRequests(owner, repo, "all");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [reviewerFilter, setReviewerFilter] = useState("all");

  // Extract unique authors and reviewers
  const { authors, reviewers } = useMemo(() => {
    if (!prs) return { authors: [], reviewers: [] };
    
    const authorMap = new Map();
    const reviewerMap = new Map();
    
    prs.forEach((pr: any) => {
      if (pr.user) {
        authorMap.set(pr.user.login, pr.user);
      }
      if (pr.requested_reviewers) {
        pr.requested_reviewers.forEach((rev: any) => {
          reviewerMap.set(rev.login, rev);
        });
      }
    });
    
    return {
      authors: Array.from(authorMap.values()),
      reviewers: Array.from(reviewerMap.values())
    };
  }, [prs]);

  const filteredPRs = useMemo(() => {
    if (!prs) return [];
    
    return prs.filter((pr: any) => {
      // 1. Search Query
      if (searchQuery && !pr.title.toLowerCase().includes(searchQuery.toLowerCase()) && !pr.number.toString().includes(searchQuery)) {
        return false;
      }
      
      // 2. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "open" && pr.state !== "open") return false;
        if (statusFilter === "merged" && !pr.merged_at) return false;
        if (statusFilter === "declined" && (pr.state !== "closed" || pr.merged_at)) return false;
      }
      
      // 3. Author Filter
      if (authorFilter !== "all" && pr.user?.login !== authorFilter) {
        return false;
      }
      
      // 4. Reviewer Filter
      if (reviewerFilter !== "all") {
        const isReviewer = pr.requested_reviewers?.some((rev: any) => rev.login === reviewerFilter);
        if (!isReviewer) return false;
      }
      
      return true;
    });
  }, [prs, searchQuery, statusFilter, authorFilter, reviewerFilter]);

  const getStatusIcon = (pr: any) => {
    if (pr.merged_at) return <GitMerge className="size-4 text-purple-500" />;
    if (pr.state === "closed") return <GitPullRequestClosed className="size-4 text-rose-500" />;
    return <GitPullRequest className="size-4 text-emerald-500" />;
  };

  const getStatusBadge = (pr: any) => {
    if (pr.merged_at) return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] uppercase tracking-wider h-5">Merged</Badge>;
    if (pr.state === "closed") return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] uppercase tracking-wider h-5">Declined</Badge>;
    if (pr.draft) return <Badge variant="outline" className="bg-muted/60 text-muted-foreground border-border/40 text-[10px] uppercase tracking-wider h-5">Draft</Badge>;
    if (pr.mergeable_state === "dirty") return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] uppercase tracking-wider h-5">Conflicting</Badge>;
    if (pr.mergeable_state === "behind") return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] uppercase tracking-wider h-5">Outdated</Badge>;
    return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] uppercase tracking-wider h-5">Open</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton for Filters */}
        <div className="h-14 w-full bg-card border border-border/20 rounded-card animate-pulse" />
        <div className="space-y-0 border border-border/20 rounded-card overflow-hidden bg-card/30">
          {[...Array(5)].map((_, i) => <PRSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-button border border-destructive/20 text-sm font-medium">Error loading pull requests.</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 p-4 border border-border/40 rounded-card bg-card shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search pull requests by title or #number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 border-border/50 bg-background"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-30">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 border-border/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="merged">Merged</SelectItem>
                <SelectItem value="declined">Declined/Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-35">
            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger className="h-9 border-border/50">
                <SelectValue placeholder="Author" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Authors</SelectItem>
                {authors.map((author: any) => (
                  <SelectItem key={author.login} value={author.login}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-4 rounded-full">
                        <AvatarImage src={author.avatar_url} />
                        <AvatarFallback className="text-[8px]">{(author.login || "U")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{author.login}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-37.5">
            <Select value={reviewerFilter} onValueChange={setReviewerFilter}>
              <SelectTrigger className="h-9 border-border/50">
                <SelectValue placeholder="Reviewer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviewers</SelectItem>
                {reviewers.length === 0 && <SelectItem value="none" disabled>No reviewers found</SelectItem>}
                {reviewers.map((rev: any) => (
                  <SelectItem key={rev.login} value={rev.login}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-4 rounded-full">
                        <AvatarImage src={rev.avatar_url} />
                        <AvatarFallback className="text-[8px]">{(rev.login || "U")[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{rev.login}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* PR List */}
      {!prs?.length ? (
        <div className="p-12 text-center border border-dashed border-border/40 rounded-card bg-card text-muted-foreground shadow-sm">
          <div className="flex justify-center mb-3">
            <GitPullRequest className="size-8 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium">No pull requests found in this repository.</p>
        </div>
      ) : filteredPRs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/40 rounded-card bg-card text-muted-foreground shadow-sm">
          <div className="flex justify-center mb-3">
            <Filter className="size-8 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium">No pull requests match your active filters.</p>
          <Button variant="link" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setAuthorFilter("all"); setReviewerFilter("all"); }} className="mt-2 text-xs">
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="border border-border/40 rounded-card bg-card shadow-sm">
          {filteredPRs.map((pr: any, index: number) => {
            const isLast = index === filteredPRs.length - 1;
            return (
              <div 
                key={pr.id} 
                className={`flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors group ${!isLast ? 'border-b border-border/40' : ''}`}
              >
                <div className="mt-1 shrink-0 bg-background rounded-full p-1 shadow-sm border border-border/40">
                  {getStatusIcon(pr)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/github/${owner}/${repo}/pulls/${pr.number}`} className="font-semibold text-foreground/90 text-[14px] leading-snug group-hover:text-primary transition-colors">
                      {pr.title}
                    </Link>
                    <div className="shrink-0 pt-0.5">
                      {getStatusBadge(pr)}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                    <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">#{pr.number}</span>
                    <span>{pr.state === "open" ? "opened" : pr.merged_at ? "merged" : "closed"} {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })} by</span>
                    
                    <div className="flex items-center gap-1.5 text-foreground/70 font-medium bg-muted/30 px-2 py-0.5 rounded-full border border-border/40">
                      <Avatar className="size-3.5 rounded-full">
                        <AvatarImage src={pr.user?.avatar_url} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                          {(pr.user?.login || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {pr.user?.login}
                    </div>

                    {pr.requested_reviewers?.length > 0 && (
                      <>
                        <span className="text-muted-foreground/40">•</span>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground/70">Reviewers:</span>
                          <div className="flex -space-x-1.5 ml-1">
                            {pr.requested_reviewers.map((rev: any) => (
                              <Avatar key={rev.login} className="size-4 rounded-full border border-background shadow-sm" title={rev.login}>
                                <AvatarImage src={rev.avatar_url} />
                                <AvatarFallback className="text-[8px]">{(rev.login || "U")[0]}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  {pr.comments > 0 && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold bg-muted/50 px-2 py-1 rounded border border-border/40">
                      <MessageSquare className="size-3.5" />
                      {pr.comments}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 border-border/40 bg-transparent shadow-none"
                    asChild
                  >
                    <Link href={`/github/${owner}/${repo}/pulls/${pr.number}`} aria-label="Open PR detail">
                      <GitMerge className="size-3.5 text-muted-foreground" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 border-border/40 bg-transparent shadow-none"
                    onClick={() => window.open(pr.html_url, '_blank')}
                  >
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
