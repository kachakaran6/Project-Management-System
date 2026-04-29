"use client";

import React, { useState, useEffect } from "react";
import {
  Link2,
  Unlink,
  RefreshCw,
  Settings,
  Activity,
  Search,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  GitCommit,
  CheckCircle2,
  Clock,
  Shield,
  Trash2,
  Lock,
  Globe,
  Plus,
  ArrowRight,
  MoreVertical,
  LogOut,
  ChevronRight,
  History,
  LayoutGrid,
  List
} from "lucide-react";
import { GithubIcon as Github } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api/axios-instance";
import {
  RepositoryRowSkeleton,
  ActivityRowSkeleton,
  LoadingButtonContent,
  PageLoader
} from "@/components/ui/loading-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GithubOnboardingModal } from "@/features/github/components/github-onboarding-modal";

/**
 * 🧱 SHARED COMPONENTS
 */

const RepoStatusBadge = ({ status }: { status: string }) => {
  const isLinked = status === "connected";
  const isLegacy = status === "legacy";

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className={cn(
        "size-1.5 rounded-full",
        isLinked && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
        isLegacy && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
        !isLinked && !isLegacy && "bg-slate-300"
      )} />
      <span className={cn(
        "text-[9px] font-black uppercase tracking-widest",
        isLinked && "text-emerald-600",
        isLegacy && "text-amber-600",
        !isLinked && !isLegacy && "text-slate-400"
      )}>
        {isLinked ? "Linked" : isLegacy ? "Legacy" : "Offline"}
      </span>
    </div>
  );
};

const GithubProfileChip = ({ account, onDisconnect, onConnect, isDisconnecting }: any) => {
  if (!account) {
    return (
      <Button onClick={onConnect} size="sm" className="h-7 rounded-sm px-3 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm text-[10px]">
        <Github className="mr-1.5 size-3" />
        Connect
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 px-1.5 rounded-sm hover:bg-muted/50 gap-2 border border-border/40 shrink-0">
          <Avatar className="size-5 border border-border/60">
            <AvatarImage src={account.avatarUrl} />
            <AvatarFallback className="bg-primary/5 text-primary text-[7px] font-bold">{account.username?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start hidden sm:flex">
            <span className="text-[10px] font-bold leading-none">{account.username}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="size-1 rounded-full bg-emerald-500" />
              <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest leading-none">Linked</span>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-md border-border/60 shadow-xl p-1">
        <DropdownMenuItem
          className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-sm cursor-pointer font-bold text-xs py-2"
          disabled={isDisconnecting}
          onClick={onDisconnect}
        >
          <LoadingButtonContent
            loading={isDisconnecting}
            text="Disconnect"
            loadingText="Disconnecting..."
            icon={LogOut}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * 🖥️ DESKTOP ONLY COMPONENTS
 */

const RepositoryRowDesktop = ({ repo, status, onLink, onUnlink, isLinking, isUnlinking }: any) => {
  const isLinked = status === "connected";
  const isLegacy = status === "legacy";

  return (
    <div className="group flex items-center h-14 py-2 px-4 hover:bg-muted/30 border-b border-border/20 last:border-0 transition-all">
      {/* LEFT: Identity (Flexible) */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="size-8 rounded-sm bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
          <Github className="size-4 text-primary/70" />
        </div>
        <div className="flex flex-col min-w-0">
          <h4 className="font-bold text-[13px] text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
            {repo.name}
          </h4>
          <span className="text-[10px] text-muted-foreground truncate font-medium">
            {repo.owner?.login || repo.owner}
          </span>
        </div>
      </div>

      {/* CENTER: Metadata (Fixed Widths for alignment) */}
      <div className="flex items-center gap-12 shrink-0 px-6">
        <div className="flex flex-col items-start w-20">
          <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-[0.15em] mb-0.5">Branch</span>
          <div className="flex items-center gap-1.5">
            <GitBranch className="size-2.5 text-muted-foreground/40" />
            <span className="text-[11px] font-semibold text-foreground/80 truncate max-w-full">
              {repo.default_branch || "main"}
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-border/20" />

        <div className="flex flex-col items-start w-28">
          <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-[0.15em] mb-0.5">Status</span>
          <RepoStatusBadge status={status} />
        </div>
      </div>

      {/* RIGHT: Actions (Fixed Width) */}
      <div className="flex items-center gap-1.5 shrink-0 w-24 justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-sm text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all"
          onClick={() => window.open(repo.html_url || `https://github.com/${repo.fullName}`, '_blank')}
        >
          <ExternalLink className="size-3.5" />
        </Button>

        {isLinked ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-sm text-destructive hover:bg-destructive/10 transition-all lg:opacity-0 lg:group-hover:opacity-100"
            disabled={isUnlinking}
            onClick={onUnlink}
          >
            <LoadingButtonContent loading={isUnlinking} text="" icon={Trash2} />
          </Button>
        ) : !isLegacy && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 rounded-sm font-black uppercase tracking-widest text-[9px] text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
            disabled={isLinking}
            onClick={() => onLink(repo)}
          >
            <LoadingButtonContent loading={isLinking} text="Link" icon={Plus} />
          </Button>
        )}

        {isLegacy && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-sm font-black uppercase tracking-widest text-[9px] border-amber-500/20 bg-amber-500/5 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
            disabled={isLinking}
            onClick={() => onLink(repo)}
          >
            <LoadingButtonContent loading={isLinking} text="Migrate" />
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * 📱 MOBILE ONLY COMPONENTS
 */

const RepositoryCardMobile = ({ repo, status, onLink, onUnlink, isLinking, isUnlinking }: any) => {
  const isLinked = status === "connected";
  const isLegacy = status === "legacy";

  return (
    <div className="p-4 bg-card/40 rounded-md border border-border/40 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-sm bg-primary/5 flex items-center justify-center">
            <Github className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-[13px] text-foreground tracking-tight truncate">{repo.name}</h4>
            <span className="text-[10px] text-muted-foreground">{repo.owner?.login || repo.owner}</span>
          </div>
        </div>
        <RepoStatusBadge status={status} />
      </div>

      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <GitBranch className="size-3 text-muted-foreground" />
          <span className="text-[11px] font-medium text-foreground/80">{repo.default_branch || "main"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/20">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 rounded-sm text-[10px] font-bold"
          onClick={() => window.open(repo.html_url || `https://github.com/${repo.fullName}`, '_blank')}
        >
          <ExternalLink className="size-3 mr-1.5" />
          View GitHub
        </Button>

        {isLinked ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 rounded-sm text-destructive hover:bg-destructive/10"
            disabled={isUnlinking}
            onClick={onUnlink}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : !isLegacy ? (
          <Button
            size="sm"
            className="h-9 flex-1 rounded-sm text-[10px] font-bold bg-primary text-primary-foreground"
            disabled={isLinking}
            onClick={() => onLink(repo)}
          >
            <LoadingButtonContent loading={isLinking} text="Link Repository" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 rounded-sm text-[10px] font-bold border-amber-500/20 bg-amber-500/5 text-amber-600"
            disabled={isLinking}
            onClick={() => onLink(repo)}
          >
            <LoadingButtonContent loading={isLinking} text="Migrate Repo" />
          </Button>
        )}
      </div>
    </div>
  );
};

const ActivityItemMobile = ({ activity }: any) => (
  <div className="p-3 bg-card/40 rounded-md border border-border/40 flex gap-3" onClick={() => window.open(activity.url, '_blank')}>
    <Avatar className="size-8 shrink-0 border border-border/40">
      <AvatarImage src={activity.author.avatarUrl} />
      <AvatarFallback className="text-[10px] font-black uppercase">{activity.author.username?.slice(0, 2)}</AvatarFallback>
    </Avatar>

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-[11px] text-foreground truncate">{activity.author.username}</span>
        <span className="text-[9px] font-medium text-muted-foreground">
          {formatDistanceToNow(new Date(activity.createdAt))}
        </span>
      </div>
      <p className="text-[11px] font-medium text-foreground/80 leading-snug line-clamp-2">
        {activity.message.split(/([A-Z]{2,}-\d+)/g).map((part, i) => (
          part.match(/[A-Z]{2,}-\d+/) ? (
            <span key={i} className="text-primary font-bold">{part}</span>
          ) : part
        ))}
      </p>
    </div>
  </div>
);

/**
 * 🚀 MAIN DASHBOARD
 */

export default function GithubPage() {
  const { user, activeOrg } = useAuth();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [linkingRepoId, setLinkingRepoId] = useState<string | null>(null);
  const [unlinkingRepoId, setUnlinkingRepoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (searchParams.get("connected") === "success") {
      toast.success("GitHub account connected successfully!");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const accRes = await api.get("/github/account");
      if (accRes.data.success) {
        setAccount(accRes.data.data);
        const repoRes = await api.get("/github/repos");
        if (repoRes.data.success) setRepos(repoRes.data.data);
      }

      if (activeOrg?.id) {
        const [connRes, actRes] = await Promise.all([
          api.get(`/github/workspace-repos/${activeOrg.id}`),
          api.get(`/github/workspace-activity/${activeOrg.id}`)
        ]);
        if (connRes.data.success) setConnectedRepos(connRes.data.data);
        if (actRes.data.success) setActivities(actRes.data.data);
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        console.error("GitHub data fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOrg?.id]);

  const handleConnect = async () => {
    try {
      const res = await api.get("/github/connect");
      if (res.data.success && res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      toast.error("Failed to initiate GitHub connection");
    }
  };

  const handleDisconnectAccount = async () => {
    setIsDisconnecting(true);
    try {
      await api.delete("/github/account");
      setAccount(null);
      setRepos([]);
      toast.success("GitHub disconnected");
    } catch (err) {
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleLinkRepo = async (repo: any) => {
    if (!activeOrg?.id) return;
    setLinkingRepoId(repo.id.toString());
    try {
      const res = await api.post("/github/repos/link", { workspaceId: activeOrg.id, repo });
      if (res.data.success) {
        toast.success(`Linked ${repo.name}`);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to link repository");
    } finally {
      setLinkingRepoId(null);
    }
  };

  const handleUnlinkRepo = async (repoId: string) => {
    setUnlinkingRepoId(repoId);
    try {
      await api.delete(`/github/repos/${repoId}`);
      toast.success("Repository unlinked");
      fetchData();
    } catch (err) {
      toast.error("Failed to unlink");
    } finally {
      setUnlinkingRepoId(null);
    }
  };

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.owner?.login || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen lg:h-[calc(100vh-theme(spacing.16))] bg-background">
      <GithubOnboardingModal />
      {loading && repos.length === 0 && (
        <PageLoader message="Syncing repositories..." icon={Github} />
      )}

      {/* 📱 MOBILE LAYOUT (< 1024px) */}
      <div className="lg:hidden flex flex-col space-y-4 p-2">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="size-5 text-primary" />
            <h1 className="text-base font-black tracking-tight">GitHub</h1>
          </div>
          <GithubProfileChip
            account={account}
            onConnect={handleConnect}
            onDisconnect={handleDisconnectAccount}
            isDisconnecting={isDisconnecting}
          />
        </header>

        <Tabs defaultValue="repos" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-10 p-1 bg-muted/40 rounded-md">
            <TabsTrigger value="repos" className="rounded-sm text-xs font-bold gap-2">
              <LayoutGrid className="size-3.5" />
              Repositories
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-sm text-xs font-bold gap-2">
              <History className="size-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repos" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                placeholder="Search repositories..."
                className="w-full h-10 rounded-sm border border-border/40 bg-card/40 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {repos.length === 0 && !loading && (
                <div className="p-8 text-center bg-muted/5 rounded-md border border-dashed border-border/60">
                  <p className="text-xs font-bold text-muted-foreground">No repositories found.</p>
                </div>
              )}
              {repos.map((repo) => {
                const linkedRepo = connectedRepos.find(cr => cr.fullName === repo.full_name || cr.repoId === repo.id.toString());
                let status = "unlinked";
                if (linkedRepo) status = linkedRepo.isLegacy ? "legacy" : "connected";

                return (
                  <RepositoryCardMobile
                    key={repo.id}
                    repo={repo}
                    status={status}
                    onLink={handleLinkRepo}
                    onUnlink={() => handleUnlinkRepo(linkedRepo?._id)}
                    isLinking={linkingRepoId === repo.id.toString()}
                    isUnlinking={unlinkingRepoId === linkedRepo?._id}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-3">
            {activities.length > 0 ? (
              activities.map((activity, idx) => (
                <ActivityItemMobile key={idx} activity={activity} />
              ))
            ) : (
              <div className="p-12 text-center opacity-40">
                <p className="text-xs font-black uppercase tracking-widest">No recent activity</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 🖥️ DESKTOP LAYOUT (>= 1024px) */}
      <main className="hidden lg:flex flex-1 overflow-hidden gap-4 p-4">
        {/* LEFT: REPOSITORY PANEL */}
        <section className="flex-[0.7] flex flex-col min-w-0 bg-white/50 dark:bg-card/20 rounded-md border border-border/60 shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b border-border/40 flex items-center gap-4 shrink-0 bg-muted/5">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-sm bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
                <Github className="size-3.5" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[11px] font-black uppercase tracking-tight text-foreground leading-none">GitHub</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="h-3 px-1 rounded-xs text-[7px] font-black bg-primary/5 text-primary border-primary/20 leading-none">
                    {repos.length} REPOS
                  </Badge>
                </div>
              </div>
            </div>

            <div className="h-4 w-px bg-border/40 mx-1 hidden sm:block" />

            <div className="relative flex-1 max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-2.5 text-muted-foreground" />
              <input
                placeholder="Search..."
                className="w-full h-7 rounded-sm border border-border/40 bg-white/80 dark:bg-card/40 pl-7 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <GithubProfileChip
              account={account}
              onConnect={handleConnect}
              onDisconnect={handleDisconnectAccount}
              isDisconnecting={isDisconnecting}
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {!loading && !account && (
              <div className="p-4 flex items-center gap-3 bg-muted/5 rounded-sm m-4 border border-dashed border-border/60">
                <Github className="size-4 text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground flex-1">Authorize access to see your repositories.</span>
                <Button onClick={handleConnect} size="sm" className="h-7 px-3 text-[10px] font-bold bg-primary text-primary-foreground rounded-sm">Connect Account</Button>
              </div>
            )}

            {loading && repos.length === 0 ? (
              <div className="divide-y divide-border/20">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <RepositoryRowSkeleton key={i} />)}
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {filteredRepos.map((repo) => {
                  const linkedRepo = connectedRepos.find(cr => cr.fullName === repo.full_name || cr.repoId === repo.id.toString());
                  let status = "unlinked";
                  if (linkedRepo) status = linkedRepo.isLegacy ? "legacy" : "connected";

                    return (
                      <RepositoryRowDesktop
                        key={repo.id}
                        repo={repo}
                        status={status}
                        onLink={handleLinkRepo}
                        onUnlink={() => handleUnlinkRepo(linkedRepo?._id)}
                        isLinking={linkingRepoId === repo.id.toString()}
                        isUnlinking={unlinkingRepoId === linkedRepo?._id}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: ACTIVITY PANEL */}
        <section className="flex-[0.3] flex flex-col min-w-0 bg-white/50 dark:bg-card/20 rounded-md border border-border/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0 bg-muted/5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Live Activity</h2>
            <History className="size-3 text-muted-foreground" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {loading && activities.length === 0 ? (
              <div className="space-y-4 p-2">
                {[1, 2, 3, 4, 5, 6, 7].map(i => <ActivityRowSkeleton key={i} />)}
              </div>
            ) : (
              <div className="space-y-0.5">
                {activities.map((activity, idx) => (
                  <ActivityRowDesktop key={idx} activity={activity} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

const ActivityRowDesktop = ({ activity }: any) => (
  <div className="group relative flex gap-2.5 py-2 px-1 hover:bg-muted/20 rounded-sm transition-colors cursor-pointer" onClick={() => window.open(activity.url, '_blank')}>
    <Avatar className="size-5 shrink-0 border border-border/40 mt-0.5">
      <AvatarImage src={activity.author.avatarUrl} />
      <AvatarFallback className="text-[7px] font-black uppercase">{activity.author.username?.slice(0, 2)}</AvatarFallback>
    </Avatar>

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-bold text-[10px] text-foreground tracking-tight truncate">{activity.author.username}</span>
        <span className="text-[8px] font-medium text-muted-foreground whitespace-nowrap ml-2">
          {formatDistanceToNow(new Date(activity.createdAt))}
        </span>
      </div>

      <div className="flex items-center gap-1.5 min-w-0">
        <GitCommit className="size-2.5 text-primary/60" />
        <p className="text-[10px] font-medium text-foreground/80 leading-tight truncate flex-1">
          {activity.message.split(/([A-Z]{2,}-\d+)/g).map((part, i) => (
            part.match(/[A-Z]{2,}-\d+/) ? (
              <span key={i} className="text-primary font-bold">{part}</span>
            ) : part
          ))}
        </p>
      </div>
    </div>
  </div>
);
