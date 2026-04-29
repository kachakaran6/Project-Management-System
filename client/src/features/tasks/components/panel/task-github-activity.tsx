"use client";

import { ExternalLink, GitPullRequest, GitCommit, GitBranch, Calendar } from "lucide-react";
import { GithubIcon as Github } from "@/components/icons/github-icon";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface GithubLink {
  type: 'commit' | 'pr' | 'branch';
  url: string;
  message: string;
  author: string;
  authorAvatar?: string;
  hash?: string;
  createdAt: string;
}

interface TaskGithubActivityProps {
  links: GithubLink[];
}

export function TaskGithubActivity({ links }: TaskGithubActivityProps) {
  // Sort by newest first
  const sortedLinks = links ? [...links].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) : [];

  const getStatusIndicator = (link: GithubLink) => {
    if (link.type === 'pr') {
      if (link.message.toLowerCase().includes('[merged]')) return { color: 'bg-green-500', label: 'Merged' };
      if (link.message.toLowerCase().includes('[closed]')) return { color: 'bg-red-500', label: 'Closed' };
      return { color: 'bg-purple-500', label: 'Review' };
    }
    if (link.type === 'branch') return { color: 'bg-blue-500', label: 'Active' };
    return { color: 'bg-muted-foreground/30', label: 'Commit' };
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2 px-1">
        <div className="size-6 rounded-lg bg-primary/5 flex items-center justify-center text-primary/70">
          <Github className="size-3.5" />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground/80">GitHub Activity</h3>
        <Badge variant="outline" className="ml-auto h-4.5 px-1.5 rounded-full border-primary/10 bg-primary/5 text-[8px] font-black text-primary">
          {links.length}
        </Badge>
      </div>

      <div className="relative pl-3.5 space-y-0">
        {/* Vertical timeline line */}
        {sortedLinks.length > 0 && (
          <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border/40" />
        )}

        {sortedLinks.length > 0 ? (
          sortedLinks.map((link, idx) => {
            const indicator = getStatusIndicator(link);
            return (
              <div 
                key={`${link.url}-${idx}`}
                className="group relative flex gap-4 pb-6 last:pb-0"
              >
                {/* Timeline Dot */}
                <div className={cn(
                  "absolute -left-3 size-3 rounded-full border-2 border-background z-10 top-1 transition-transform group-hover:scale-125",
                  indicator.color
                )} />

                <div className="flex-1 min-w-0 bg-muted/10 rounded-xl p-2.5 border border-transparent hover:border-border/60 hover:bg-muted/20 transition-all">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {link.type === 'pr' && <GitPullRequest className="size-3 text-purple-500 shrink-0" />}
                      {link.type === 'commit' && <GitCommit className="size-3 text-blue-500 shrink-0" />}
                      {link.type === 'branch' && <GitBranch className="size-3 text-green-500 shrink-0" />}
                      <span className="text-[11px] font-bold truncate text-foreground/90 leading-tight">
                        {link.message.replace(/\[.*?\]\s*/, '')}
                      </span>
                    </div>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 rounded-md hover:bg-background/80 text-muted-foreground/50 hover:text-primary transition-all"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-medium">
                    <div className="flex items-center gap-1">
                      <Avatar className="size-3.5 border border-border/40 grayscale group-hover:grayscale-0 transition-all">
                        <AvatarImage src={link.authorAvatar} />
                        <AvatarFallback className="text-[6px] font-black">{link.author?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[60px]">{link.author}</span>
                    </div>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
                    </span>
                    {link.hash && (
                       <>
                        <span>•</span>
                        <code className="text-[8px] font-mono opacity-60">
                          {link.hash}
                        </code>
                       </>
                    )}
                    
                    <Badge className={cn(
                      "ml-auto h-4 px-1 rounded-sm border-none text-[7px] font-black uppercase tracking-tighter",
                      indicator.color,
                      "text-white"
                    )}>
                      {indicator.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="ml-[-14px] flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border/40 bg-muted/5 gap-2 group hover:bg-muted/10 transition-all">
            <div className="p-2 rounded-full bg-muted/20 group-hover:scale-110 transition-transform">
              <Github className="size-4 text-muted-foreground/40" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">No GitHub activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
