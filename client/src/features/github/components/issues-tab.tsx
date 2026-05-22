"use client";

import { useRepoIssues } from "@/features/github/hooks/use-github";
import { IssueSkeleton } from "@/components/ui/loading-system";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, CheckCircle2, ExternalLink, Plus, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { CreateTaskModal } from "@/features/tasks/components/create-task-modal";
import { Badge } from "@/components/ui/badge";

export const IssuesTab = ({ owner, repo }: { owner: string; repo: string }) => {
  // useRepoIssues defaults to "all" issues, so we fetch both open and closed!
  const { data: issues, isLoading, error } = useRepoIssues(owner, repo);

  if (isLoading) {
    return (
      <div className="space-y-0 border border-border/20 rounded-card overflow-hidden bg-card/30">
        {[...Array(5)].map((_, i) => <IssueSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-button">Error loading issues.</div>;
  }

  // Filter out pull requests as GitHub API returns them as issues
  const actualIssues = issues?.filter((issue: any) => !issue.pull_request) || [];

  if (!actualIssues.length) {
    return (
      <div className="p-12 text-center border border-dashed border-border/40 rounded-card bg-card text-muted-foreground shadow-sm">
        <div className="flex justify-center mb-3">
          <AlertCircle className="size-8 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-medium">No issues found in this repository.</p>
      </div>
    );
  }

  return (
    <div className="border border-border/20 rounded-card bg-card/30 shadow-sm animate-in fade-in duration-300">
      {actualIssues.map((issue: any, index: number) => {
        const isLast = index === actualIssues.length - 1;
        return (
          <div 
            key={issue.id} 
            className={`flex gap-4 p-4 hover:bg-muted/10 transition-colors group ${!isLast ? 'border-b border-border/20' : ''}`}
          >
            <div className="mt-1 shrink-0 bg-background rounded-full p-1 shadow-sm border border-border/40">
              {issue.state === "open" ? (
                <AlertCircle className="size-4 text-emerald-500" />
              ) : (
                <CheckCircle2 className="size-4 text-purple-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground/90 text-base leading-snug flex items-center gap-2 flex-wrap group-hover:text-primary transition-colors">
                {issue.title}
                {issue.labels?.map((label: any) => (
                  <Badge 
                    key={label.id} 
                    variant="outline" 
                    className="h-5 text-[10px] font-bold tracking-tight px-1.5"
                    style={{ borderColor: `#${label.color}40`, backgroundColor: `#${label.color}15`, color: `#${label.color}` }}
                  >
                    {label.name}
                  </Badge>
                ))}
              </h3>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">#{issue.number}</span>
                <span>{issue.state === "open" ? "opened" : "closed"} {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })} by</span>
                
                <div className="flex items-center gap-1.5 text-foreground/70 font-medium bg-muted/30 px-2 py-0.5 rounded-full border border-border/40">
                  <Avatar className="size-3.5 rounded-full">
                    <AvatarImage src={issue.user?.avatar_url} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                      {(issue.user?.login || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {issue.user?.login}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              {issue.comments > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold bg-muted/50 px-2 py-1 rounded border border-border/40 mr-2 opacity-80 group-hover:opacity-100 transition-opacity">
                  <MessageSquare className="size-3.5" />
                  {issue.comments}
                </div>
              )}
              
              <CreateTaskModal 
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 font-bold text-xs gap-1.5 shadow-sm border-border/40 hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline">Create Task</span>
                  </Button>
                }
                initialValuesOverride={{
                  title: issue.title,
                  description: `Imported from GitHub Issue #${issue.number}\n\n${issue.body || ""}\n\n[View Issue on GitHub](${issue.html_url})`
                }}
              />
              
              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-60 group-hover:opacity-100 transition-opacity hover:bg-muted"
                onClick={() => window.open(issue.html_url, '_blank')}
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
