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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Github className="size-4 text-muted-foreground" />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">GitHub Activity</h3>
        <Badge variant="outline" className="ml-auto h-5 px-1.5 rounded-full border-primary/10 bg-primary/5 text-[9px] font-bold text-primary">
          {links.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {sortedLinks.length > 0 ? (
          sortedLinks.map((link, idx) => (
            <div 
              key={`${link.url}-${idx}`}
              className="group relative flex gap-3 p-3 rounded-2xl border border-border/40 bg-muted/5 hover:bg-muted/10 transition-all"
            >
              <div className="shrink-0 mt-0.5">
                {link.type === 'pr' && <GitPullRequest className="size-4 text-purple-500" />}
                {link.type === 'commit' && <GitCommit className="size-4 text-blue-500" />}
                {link.type === 'branch' && <GitBranch className="size-4 text-green-500" />}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold truncate leading-tight group-hover:text-primary transition-colors">
                    {link.message}
                  </p>
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="size-3.5 border border-border/40">
                      <AvatarImage src={link.authorAvatar} />
                      <AvatarFallback className="text-[6px]">{link.author?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate max-w-[80px]">{link.author}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    <span>{formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}</span>
                  </div>
                  {link.hash && (
                     <>
                      <span>•</span>
                      <code className="bg-muted/20 px-1 rounded text-[9px] font-mono text-primary/80">
                        {link.hash}
                      </code>
                     </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border/40 bg-muted/5 gap-2 group hover:bg-muted/10 transition-all">
            <div className="p-2 rounded-full bg-muted/20 group-hover:scale-110 transition-transform">
              <Github className="size-4 text-muted-foreground/40" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">No GitHub activity linked</p>
            <p className="text-[9px] text-muted-foreground/60 text-center max-w-[180px]">Include the Task ID in your commit messages or PR titles.</p>
          </div>
        )}
      </div>
    </div>
  );
}
