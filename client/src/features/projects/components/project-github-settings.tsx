import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/axios-instance";
import { githubApi } from "../api/github.api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ExternalLink, Link2, Unlink, CheckCircle2, AlertCircle, RefreshCw, GitBranch, ShieldAlert } from "lucide-react";
import { GithubIcon as Github } from "@/components/icons/github-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import Link from "@/lib/next-link";

interface ProjectGithubSettingsProps {
  projectId: string;
}

export function ProjectGithubSettings({ projectId }: ProjectGithubSettingsProps) {
  const queryClient = useQueryClient();
  const { activeOrg } = useAuth();
  
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [selectedPermissions, setSelectedPermissions] = useState<string>("read");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all repositories linked to the workspace
  const { data: workspaceRepos = [], isLoading: isLoadingRepos, refetch } = useQuery<any[]>({
    queryKey: ["github", "workspace-repos", activeOrg?.id],
    queryFn: async () => {
      const res = await api.get(`/github/workspace-repos/${activeOrg?.id}`);
      return res.data.data || [];
    },
    enabled: !!activeOrg?.id
  });

  // Find the repository linked to THIS project
  const linkedRepo = workspaceRepos.find(
    (r) => r.projectId === projectId || r.projectId?._id === projectId
  );

  // List of available repositories to link (either unlinked or linked to this project)
  const availableRepos = workspaceRepos.filter(
    (r) => !r.projectId || r.projectId === projectId || r.projectId?._id === projectId
  );

  const linkMutation = useMutation({
    mutationFn: async ({ repoId, data }: { repoId: string; data: any }) => {
      const res = await api.put(`/github/repos/${repoId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github", "workspace-repos", activeOrg?.id] });
      toast.success("GitHub repository linked successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to link repository");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ repoId, data }: { repoId: string; data: any }) => {
      const res = await api.put(`/github/repos/${repoId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github", "workspace-repos", activeOrg?.id] });
      toast.success("Repository settings updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update settings");
    }
  });

  const handleLink = () => {
    if (!selectedRepoId) {
      toast.error("Please select a repository to link");
      return;
    }
    linkMutation.mutate({
      repoId: selectedRepoId,
      data: {
        projectId,
        branch: selectedBranch,
        permissions: selectedPermissions,
      }
    });
  };

  const handleUnlink = (repoId: string) => {
    if (confirm("Are you sure you want to unlink this repository from the project? Webhook activity will no longer update this project.")) {
      updateMutation.mutate({
        repoId,
        data: {
          projectId: null
        }
      });
    }
  };

  const handleToggleAutoUpdate = (repoId: string, enabled: boolean) => {
    updateMutation.mutate({
      repoId,
      data: {
        settings: {
          autoStatusUpdate: enabled
        }
      }
    });
  };

  if (isLoadingRepos) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no repositories linked to the workspace, redirect to Global Integrations
  if (workspaceRepos.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 overflow-hidden rounded-button">
        <CardContent className="pt-8 pb-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center border border-border/60">
            <Github className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="font-bold text-sm">No connected repositories</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect your GitHub account and link repositories to the workspace in Global Integrations before linking them to projects.
            </p>
          </div>
          <Link href="/github">
            <Button size="sm" className="rounded-button text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 mt-2">
              Go to Global Integrations <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {linkedRepo ? (
        /* CONNECTED STATE */
        <Card className="border-border/40 bg-card/50 overflow-hidden rounded-button shadow-premium">
          <CardHeader className="bg-primary/5 border-b border-border/10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-foreground text-background rounded-button">
                  <Github className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {linkedRepo.owner} / {linkedRepo.repoName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Linked to this project
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-button text-[10px] uppercase font-black tracking-widest text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5"
                onClick={() => handleUnlink(linkedRepo._id)}
                disabled={updateMutation.isPending}
              >
                <Unlink className="size-3.5" />
                Unlink Project
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Sync & Webhook Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-button border border-border/40 bg-background/30 flex items-center gap-3">
                {linkedRepo.isWebhookActive ? (
                  <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="size-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest block">Webhook Status</span>
                  <span className="text-xs font-bold text-foreground">
                    {linkedRepo.isWebhookActive ? "Active & Healthy" : "Offline / Check Settings"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-button border border-border/40 bg-background/30 flex items-center gap-3">
                <GitBranch className="size-5 text-blue-500 shrink-0" />
                <div>
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest block">Monitored Branch</span>
                  <span className="text-xs font-bold text-foreground">{linkedRepo.branch || "main"}</span>
                </div>
              </div>

              <div className="p-4 rounded-button border border-border/40 bg-background/30 flex items-center gap-3">
                <RefreshCw className="size-5 text-purple-500 shrink-0" />
                <div>
                  <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest block">Last Synced</span>
                  <span className="text-xs font-bold text-foreground">
                    {linkedRepo.lastSyncAt ? formatDistanceToNow(new Date(linkedRepo.lastSyncAt)) + " ago" : "Never"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="space-y-4 pt-4 border-t border-border/10">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Integration Options</h4>

              <div className="flex items-center justify-between p-4 bg-muted/5 rounded-button border border-border/40">
                <div className="space-y-0.5 max-w-xl">
                  <Label className="text-xs font-bold">Auto Status Updates</Label>
                  <p className="text-[10px] text-muted-foreground">Automatically update task workflow columns (e.g. In Progress, Done) based on commit keywords (e.g. "fix TASK-123").</p>
                </div>
                <Switch 
                  checked={linkedRepo.settings?.autoStatusUpdate} 
                  onCheckedChange={(checked) => handleToggleAutoUpdate(linkedRepo._id, checked)}
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Change Monitored Branch</Label>
                  <Select
                    defaultValue={linkedRepo.branch || "main"}
                    onValueChange={(val) => updateMutation.mutate({ repoId: linkedRepo._id, data: { branch: val } })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="h-10 rounded-button bg-muted/10 border-border/40 text-xs">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-button border-border/40">
                      <SelectItem value="main">main</SelectItem>
                      <SelectItem value="master">master</SelectItem>
                      <SelectItem value="develop">develop</SelectItem>
                      <SelectItem value="staging">staging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sync Permissions</Label>
                  <Select
                    defaultValue={linkedRepo.permissions || "read"}
                    onValueChange={(val) => updateMutation.mutate({ repoId: linkedRepo._id, data: { permissions: val } })}
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="h-10 rounded-button bg-muted/10 border-border/40 text-xs">
                      <SelectValue placeholder="Select Permissions" />
                    </SelectTrigger>
                    <SelectContent className="rounded-button border-border/40">
                      <SelectItem value="read">Read Only (Pull Commits & PRs)</SelectItem>
                      <SelectItem value="write">Read & Write (Sync comments back to GitHub)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* UNCONNECTED / LINKING STATE */
        <Card className="border-border/40 bg-card/50 overflow-hidden rounded-button shadow-premium">
          <CardHeader className="bg-primary/5 border-b border-border/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-foreground text-background rounded-button">
                <Github className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Link GitHub Repository</CardTitle>
                <CardDescription className="text-xs">
                  Connect a workspace repository to this project to enable automation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Repository</Label>
              <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
                <SelectTrigger className="h-11 rounded-button bg-muted/10 border-border/40 text-sm">
                  <SelectValue placeholder="Choose a repository connected to workspace..." />
                </SelectTrigger>
                <SelectContent className="rounded-button border-border/40">
                  {availableRepos.map((repo) => (
                    <SelectItem key={repo._id} value={repo._id}>
                      {repo.fullName}
                    </SelectItem>
                  ))}
                  {availableRepos.length === 0 && (
                    <SelectItem value="none" disabled>All workspace repositories are linked</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Track Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-10 rounded-button bg-muted/10 border-border/40 text-xs">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent className="rounded-button border-border/40">
                    <SelectItem value="main">main</SelectItem>
                    <SelectItem value="master">master</SelectItem>
                    <SelectItem value="develop">develop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permissions Mode</Label>
                <Select value={selectedPermissions} onValueChange={setSelectedPermissions}>
                  <SelectTrigger className="h-10 rounded-button bg-muted/10 border-border/40 text-xs">
                    <SelectValue placeholder="Permissions" />
                  </SelectTrigger>
                  <SelectContent className="rounded-button border-border/40">
                    <SelectItem value="read">Read Only</SelectItem>
                    <SelectItem value="write">Read & Write</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/10 mt-6">
              <Button
                onClick={handleLink}
                disabled={linkMutation.isPending || !selectedRepoId}
                className="rounded-button h-11 px-8 font-bold gap-2 min-w-[140px]"
              >
                {linkMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                Link Repository
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Developer instructions card */}
      <div className="p-4 rounded-button bg-amber-500/5 border border-amber-500/10 flex gap-3">
        <ExternalLink className="size-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-amber-600 block mb-1">Developer Guidelines</strong>
          Include the Task ID (e.g. <strong>PHX-123</strong>) in your commit messages, PR titles, or branch names.
          Use keywords like <strong>"fix PHX-123"</strong> to automatically mark the task as done.
        </p>
      </div>
    </div>
  );
}
