"use client";

import { Star, GitFork, Eye, Activity } from "lucide-react";

export const RepositoryDetailsHeader = ({ owner, repo }: { owner: string; repo: string }) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-card/50 border border-border/40 rounded-card">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-button bg-primary/10 flex items-center justify-center border border-primary/20">
          <Activity className="size-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">{repo}</h2>
          <p className="text-muted-foreground text-sm font-medium">
            Managed by {owner}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-amber-500">
            <Star className="size-4 fill-current" />
            <span className="font-bold">Stars</span>
          </div>
          <span className="text-xl font-black">--</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-blue-500">
            <GitFork className="size-4" />
            <span className="font-bold">Forks</span>
          </div>
          <span className="text-xl font-black">--</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <Eye className="size-4" />
            <span className="font-bold">Watchers</span>
          </div>
          <span className="text-xl font-black">--</span>
        </div>
      </div>
    </div>
  );
};
