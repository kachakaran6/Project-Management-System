"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ArrowUpDown, Star, GitFork, Activity } from "lucide-react";

interface RepositoryPerformanceTableProps {
  repos: any[];
}

export const RepositoryPerformanceTable = ({ repos }: RepositoryPerformanceTableProps) => {
  const [sortField, setSortField] = useState<"name" | "stargazers_count" | "forks_count" | "updated_at">("stargazers_count");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: any) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedRepos = [...repos].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === "updated_at") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortHeader = ({ field, label }: { field: any, label: string }) => (
    <th 
      className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {sortField === field && <ArrowUpDown className="size-3" />}
      </div>
    </th>
  );

  return (
    <div className="w-full border border-border/40 rounded-card bg-card/40 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/10 border-b border-border/40">
            <tr>
              <SortHeader field="name" label="Repository" />
              <SortHeader field="stargazers_count" label="Stars" />
              <SortHeader field="forks_count" label="Forks" />
              <SortHeader field="updated_at" label="Last Activity" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {sortedRepos.slice(0, 15).map((repo) => (
              <tr key={repo.id} className="hover:bg-muted/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground/90 truncate max-w-[200px]">{repo.name}</span>
                    {repo.private && <span className="px-1.5 py-0.5 rounded-xs bg-muted/40 text-[9px] font-black uppercase">Private</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground font-medium tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <Star className="size-3 text-amber-500" />
                    {repo.stargazers_count}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground font-medium tabular-nums">
                  <div className="flex items-center gap-1.5">
                    <GitFork className="size-3 text-muted-foreground" />
                    {repo.forks_count}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground font-medium text-xs">
                  {format(new Date(repo.updated_at), "MMM d, yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
