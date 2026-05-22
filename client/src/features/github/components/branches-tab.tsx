"use client";

import { useState, useMemo } from "react";
import { useRepoBranches, useRepoFileTree, useRepoFileContent } from "@/features/github/hooks/use-github";
import { BranchSkeleton } from "@/components/ui/loading-system";
import { GitBranch, Shield, Copy, ChevronLeft, FileText, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const FileViewer = ({ owner, repo, path, branchName }: { owner: string, repo: string, path: string, branchName: string }) => {
  const { data, isLoading, error } = useRepoFileContent(owner, repo, path, branchName);
  
  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="p-6 text-destructive bg-destructive/10 rounded-button border border-destructive/20 text-sm font-medium">Failed to load file. It might be too large or binary.</div>;
  if (!data) return null;

  // GitHub API returns content as base64
  let decoded = "";
  try {
    // Only try to decode if it's base64 encoded
    if (data.encoding === "base64") {
      // Decode base64 to utf-8 safely
      const binString = atob(data.content);
      const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
      decoded = new TextDecoder().decode(bytes);
    } else {
      decoded = data.content;
    }
  } catch(e) {
    decoded = "// Unable to display file content. It might be a binary file or too large.";
  }

  return (
    <div className="border border-border/40 rounded-button shadow-sm overflow-hidden bg-[#0d1117] flex flex-col max-h-[70vh]">
      <div className="bg-[#161b22] px-4 py-2.5 border-b border-border/20 flex items-center justify-between shrink-0">
        <span className="text-xs font-mono font-medium text-[#c9d1d9] truncate mr-4">{path}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e] shrink-0 whitespace-nowrap bg-white/5 px-2 py-1 rounded">
          {data.size ? `${(data.size / 1024).toFixed(1)} KB` : 'Unknown size'}
        </span>
      </div>
      <div className="p-5 overflow-x-auto text-[13px] font-mono text-[#c9d1d9] flex-1 overflow-y-auto custom-scrollbar leading-relaxed">
        <pre><code>{decoded}</code></pre>
      </div>
    </div>
  );
};

const BranchCodeExplorer = ({ owner, repo, branch }: { owner: string, repo: string, branch: any }) => {
  const { data, isLoading } = useRepoFileTree(owner, repo, branch.commit.sha);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const files = useMemo(() => {
    if (!data?.tree) return [];
    let list = data.tree.filter((t: any) => t.type === "blob");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t: any) => t.path.toLowerCase().includes(q));
    }
    // Sort alphabetically
    return list.sort((a: any, b: any) => a.path.localeCompare(b.path));
  }, [data, search]);

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm font-medium">Fetching file tree for {branch.name}...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="lg:col-span-1 border border-border/40 rounded-button shadow-sm bg-card flex flex-col h-[70vh]">
        <div className="p-3 border-b border-border/40 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search files..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="h-8 text-xs pl-8 bg-background border-border/50" 
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar p-1.5 space-y-0.5">
          {files.length > 0 ? (
            files.map((file: any) => {
              const parts = file.path.split("/");
              const filename = parts.pop();
              const dir = parts.length > 0 ? parts.join("/") + "/" : "";
              
              return (
                <div 
                  key={file.path} 
                  className={cn(
                    "flex flex-col gap-0.5 px-3 py-2 rounded-button cursor-pointer transition-colors group", 
                    selectedPath === file.path ? "bg-primary/10 border-primary/20" : "hover:bg-muted/50 border-transparent"
                  )}
                  onClick={() => setSelectedPath(file.path)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className={cn("size-3.5 shrink-0", selectedPath === file.path ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground/80")} />
                    <span className={cn("text-xs font-medium truncate", selectedPath === file.path ? "text-primary" : "text-foreground/80 group-hover:text-foreground")}>
                      {filename}
                    </span>
                  </div>
                  {dir && (
                    <span className="text-[9px] text-muted-foreground truncate pl-5 tracking-wide">
                      {dir}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">No files found matching "{search}"</div>
          )}
        </div>
      </div>
      <div className="lg:col-span-2">
         {selectedPath ? (
            <FileViewer owner={owner} repo={repo} path={selectedPath} branchName={branch.name} />
         ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center gap-3 border border-dashed border-border/40 rounded-button bg-muted/5 text-muted-foreground">
              <div className="p-4 rounded-full bg-muted/20">
                <FileText className="size-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium">Select a file from the explorer to view its source code</p>
            </div>
         )}
      </div>
    </div>
  );
};

export const BranchesTab = ({ owner, repo }: { owner: string; repo: string }) => {
  const { data: branches, isLoading, error } = useRepoBranches(owner, repo);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => <BranchSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive p-4 bg-destructive/10 rounded-button border border-destructive/20 text-sm font-medium">Error loading branches.</div>;
  }

  if (!branches?.length) {
    return <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-button border border-dashed border-border/40">No branches found.</div>;
  }

  // Determine default branch if available (usually the one protected or first one)
  const defaultBranch = branches.find((b: any) => b.name === "main" || b.name === "master" || b.protected) || branches[0];

  if (selectedBranch) {
    return (
      <div className="space-y-6">
        {/* Header for selected branch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-button border border-border/40 bg-card shadow-sm">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedBranch(null)}
              className="h-8 px-3 text-xs font-bold"
            >
              <ChevronLeft className="size-3.5 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-primary/10">
                <GitBranch className="size-4 text-primary" />
              </div>
              <h3 className="font-bold text-foreground text-lg tracking-tight">{selectedBranch.name}</h3>
              {selectedBranch.protected && (
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20 ml-2 uppercase tracking-widest gap-1">
                  <Shield className="size-2.5" /> Protected
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded bg-muted/40 border border-border/40 font-mono text-[11px] text-muted-foreground">
              {selectedBranch.commit.sha.substring(0, 7)}
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`git checkout ${selectedBranch.name}`);
                toast.success("Copied checkout command!");
              }}
              className="h-8 text-xs font-bold shadow-sm"
            >
              <Copy className="size-3.5 mr-2" /> Checkout
            </Button>
          </div>
        </div>

        {/* Code Explorer */}
        <BranchCodeExplorer owner={owner} repo={repo} branch={selectedBranch} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground tracking-tight">Active Branches ({branches.length})</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {branches.map((branch: any) => {
          const isDefault = branch.name === defaultBranch.name;
          return (
            <div 
              key={branch.name} 
              className={cn(
                "p-4 border rounded-button flex items-center justify-between transition-all cursor-pointer group",
                isDefault ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card border-border/40 hover:border-primary/40 hover:shadow-sm"
              )}
              onClick={() => setSelectedBranch(branch)}
            >
              <div className="flex items-center gap-4">
                <div className={cn("size-10 rounded-full flex items-center justify-center shrink-0 transition-colors", isDefault ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10")}>
                  <GitBranch className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2 tracking-tight group-hover:text-primary transition-colors">
                    {branch.name}
                    {isDefault && (
                      <Badge variant="secondary" className="h-4.5 px-1.5 text-[9px] uppercase tracking-widest bg-primary text-primary-foreground ml-1">Default</Badge>
                    )}
                    {branch.protected && !isDefault && (
                      <Shield className="size-3 text-amber-500" />
                    )}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[11px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
                      {branch.commit.sha.substring(0, 7)}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(`git checkout ${branch.name}`);
                  toast.success("Copied checkout command!");
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              >
                <Copy className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
