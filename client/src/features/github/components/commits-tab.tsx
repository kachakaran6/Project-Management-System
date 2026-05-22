"use client";

import { useState, useEffect } from "react";
import { useRepoCommits, useRepoBranches } from "@/features/github/hooks/use-github";
import { CommitSkeleton } from "@/components/ui/loading-system";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GitCommit, ExternalLink, GitBranch, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const CommitsTab = ({ owner, repo }: { owner: string; repo: string }) => {
  const { data: branches, isLoading: branchesLoading } = useRepoBranches(owner, repo);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  // Set default branch when branches load
  useEffect(() => {
    if (branches?.length > 0 && !selectedBranch) {
      const defaultBranch = branches.find((b: any) => b.name === "main" || b.name === "master" || b.protected) || branches[0];
      setSelectedBranch(defaultBranch.name);
    }
  }, [branches, selectedBranch]);

  const { data: commits, isLoading: commitsLoading, error } = useRepoCommits(owner, repo, selectedBranch || undefined);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header and Branch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border/40 rounded-card bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <GitCommit className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground tracking-tight">Commit History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Track code changes over time</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/40 font-normal">
            {commits?.length || 0} commits
          </Badge>
          <div className="w-[220px]">
            <Select 
              value={selectedBranch} 
              onValueChange={setSelectedBranch} 
              disabled={branchesLoading}
            >
              <SelectTrigger className="h-9 border-border/50 bg-background hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 text-foreground font-medium truncate">
                  <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Select branch" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {branches?.map((b: any) => (
                  <SelectItem key={b.name} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Commits List */}
      {commitsLoading || branchesLoading ? (
        <div className="space-y-0 border border-border/20 rounded-card overflow-hidden bg-card shadow-sm">
          {[...Array(5)].map((_, i) => <CommitSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-card text-sm font-medium">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <p>Failed to load commit history for {selectedBranch}. The branch might not exist or the GitHub API is rate-limited.</p>
        </div>
      ) : !commits?.length ? (
        <div className="p-12 flex flex-col items-center justify-center text-center bg-card border border-dashed border-border/40 rounded-card text-muted-foreground shadow-sm">
          <div className="p-4 rounded-full bg-muted/20 mb-3">
            <GitCommit className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">No commits found for branch '{selectedBranch}'</p>
        </div>
      ) : (
        <div className="border border-border/40 rounded-card bg-card shadow-sm">
          {commits.map((item: any, index: number) => {
            const isLast = index === commits.length - 1;
            return (
              <div 
                key={item.sha} 
                className={`flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors group relative ${!isLast ? 'border-b border-border/40' : ''}`}
              >
                {/* Visual Timeline Connector */}
                {!isLast && (
                  <div className="absolute left-[31px] top-[48px] bottom-[-16px] w-[2px] bg-border/40 z-0"></div>
                )}
                
                <Avatar className="size-8 rounded-full border border-border/40 mt-0.5 shadow-sm shrink-0 z-10 bg-background">
                  <AvatarImage src={item.author?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {(item.commit.author?.name || "U")[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground/90 text-[13px] leading-snug group-hover:text-primary transition-colors">
                    {item.commit.message.split("\n")[0]}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground/70">{item.commit.author?.name}</span>
                    <span>committed</span>
                    <span>{formatDistanceToNow(new Date(item.commit.author?.date), { addSuffix: true })}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span className="text-[11px] font-mono px-2 py-1 bg-muted/50 border border-border/40 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-default">
                    {item.sha.substring(0, 7)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7 border-border/40 bg-transparent shadow-none"
                    onClick={() => window.open(item.html_url, '_blank')}
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
