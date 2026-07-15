"use client";

import { useState } from "react";
import { 
  Star, 
  GitFork, 
  Eye, 
  Activity, 
  Link2, 
  Unlink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  GitBranch, 
  ShieldAlert, 
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useRepositoryDetails, 
  useRepositoryLinkage, 
  useUpdateRepositorySettingsMutation 
} from "../hooks/use-github";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "@/lib/next-link";

interface RepositoryDetailsHeaderProps {
  owner: string;
  repo: string;
}

export const RepositoryDetailsHeader = ({ owner, repo }: RepositoryDetailsHeaderProps) => {
  const router = useRouter();
  const [showLinkFields, setShowLinkFields] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [selectedPermissions, setSelectedPermissions] = useState<string>("read");

  // Fetch GitHub metadata
  const { data: repoDetails, isLoading: isLoadingDetails } = useRepositoryDetails(owner, repo);

  // Fetch DB Linkage record
  const { data: linkage, isLoading: isLoadingLinkage } = useRepositoryLinkage(owner, repo);

  // Fetch Projects in workspace to allow linking
  const { data: projectsResult } = useProjectsQuery();
  const projects = projectsResult?.data || [];

  // Update Settings mutation
  const updateMutation = useUpdateRepositorySettingsMutation(owner, repo);

  const handleLinkProject = () => {
    if (!selectedProjectId) {
      toast.error("Please select a project to link");
      return;
    }
    
    if (!linkage?._id) {
      toast.error("This repository must first be registered to the workspace globally");
      return;
    }

    updateMutation.mutate({
      repoId: linkage._id,
      data: {
        projectId: selectedProjectId,
        branch: selectedBranch,
        permissions: selectedPermissions
      }
    }, {
      onSuccess: () => {
        toast.success("Project linked successfully!");
        setShowLinkFields(false);
        setSelectedProjectId("");
      }
    });
  };

  const handleUnlinkProject = () => {
    if (!linkage?._id) return;
    if (confirm("Are you sure you want to unlink this project? Webhook commits and pull requests will no longer map to this project's tasks.")) {
      updateMutation.mutate({
        repoId: linkage._id,
        data: {
          projectId: null
        }
      }, {
        onSuccess: () => {
          toast.success("Project unlinked successfully.");
        }
      });
    }
  };

  const isLinked = !!linkage?.projectId;

  return (
    <div className="space-y-6">
      {/* Back Button & Navigation Path */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-button gap-1.5 px-2.5"
          onClick={() => router.push("/github")}
        >
          <ArrowLeft className="size-3.5" /> Back to GitHub
        </Button>
        <ChevronRight className="size-3" />
        <span>{owner}</span>
        <ChevronRight className="size-3" />
        <span className="font-bold text-foreground">{repo}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT CARD: REPOSITORY METADATA */}
        <div className="lg:col-span-2 flex flex-col justify-between p-6 bg-card/40 border border-border/40 rounded-card shadow-sm space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-button bg-primary/5 flex items-center justify-center border border-primary/10">
                  <Activity className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">{repo}</h2>
                  <p className="text-muted-foreground text-xs font-medium">
                    Owner: <span className="text-foreground font-bold">{owner}</span>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-button text-[10px] uppercase font-black tracking-widest gap-1.5"
                onClick={() => window.open(repoDetails?.html_url || `https://github.com/${owner}/${repo}`, "_blank")}
              >
                Open on GitHub <ExternalLink className="size-3.5" />
              </Button>
            </div>
            {repoDetails?.description ? (
              <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                {repoDetails.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic leading-relaxed pt-2">
                No description provided for this repository.
              </p>
            )}
          </div>

          <div className="flex items-center gap-8 pt-4 border-t border-border/10">
            <div className="flex items-center gap-2">
              <Star className="size-4 text-amber-500 fill-amber-500/20" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider leading-none">Stars</span>
                <span className="text-sm font-bold mt-0.5">{repoDetails?.stargazers_count ?? "--"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GitFork className="size-4 text-blue-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider leading-none">Forks</span>
                <span className="text-sm font-bold mt-0.5">{repoDetails?.forks_count ?? "--"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider leading-none">Watchers</span>
                <span className="text-sm font-bold mt-0.5">{repoDetails?.watchers_count ?? "--"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: WORKSPACE LINKAGE & Webhook/Sync STATUS */}
        <div className="p-6 bg-card/40 border border-border/40 rounded-card shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground/80">Project Linkage</h3>
              {linkage && (
                <div className="flex items-center gap-1">
                  <div className={`size-1.5 rounded-full ${linkage.isWebhookActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {linkage.isWebhookActive ? "Webhook Active" : "No Webhook"}
                  </span>
                </div>
              )}
            </div>

            {isLoadingLinkage ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : linkage ? (
              isLinked ? (
                /* LINKED STATE */
                <div className="space-y-3">
                  <div className="p-3 bg-primary/5 border border-primary/10 rounded-button space-y-1.5">
                    <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest block">Linked Project</span>
                    <Link href={`/projects/${linkage.projectId?._id || linkage.projectId}`}>
                      <span className="text-sm font-bold text-primary hover:underline cursor-pointer block">
                        {linkage.projectId?.name || "Linked Project"} ({linkage.projectId?.code || "PRJ"})
                      </span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="size-3.5 text-muted-foreground/60" />
                      <span>Branch: <strong>{linkage.branch || "main"}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="size-3.5 text-muted-foreground/60" />
                      <span>Synced: <strong>{linkage.lastSyncAt ? formatDistanceToNow(new Date(linkage.lastSyncAt)) + " ago" : "Never"}</strong></span>
                    </div>
                  </div>
                </div>
              ) : showLinkFields ? (
                /* LINKING FORM */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Choose Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="h-9 rounded-button bg-muted/10 border-border/40 text-xs">
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-button border-border/40">
                        {projects.map((proj: any) => (
                          <SelectItem key={proj.id || proj._id} value={proj.id || proj._id}>
                            {proj.name} ({proj.code})
                          </SelectItem>
                        ))}
                        {projects.length === 0 && (
                          <SelectItem value="none" disabled>No projects found in workspace</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Track Branch</Label>
                      <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                        <SelectTrigger className="h-9 rounded-button bg-muted/10 border-border/40 text-xs">
                          <SelectValue placeholder="Branch" />
                        </SelectTrigger>
                        <SelectContent className="rounded-button border-border/40">
                          <SelectItem value="main">main</SelectItem>
                          <SelectItem value="master">master</SelectItem>
                          <SelectItem value="develop">develop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Permissions</Label>
                      <Select value={selectedPermissions} onValueChange={setSelectedPermissions}>
                        <SelectTrigger className="h-9 rounded-button bg-muted/10 border-border/40 text-xs">
                          <SelectValue placeholder="Permissions" />
                        </SelectTrigger>
                        <SelectContent className="rounded-button border-border/40">
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-1.5 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-button flex-1 text-xs font-bold"
                      onClick={() => setShowLinkFields(false)}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 rounded-button flex-1 text-xs font-bold bg-primary text-primary-foreground"
                      onClick={handleLinkProject}
                      disabled={updateMutation.isPending || !selectedProjectId}
                    >
                      {updateMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Link2 className="size-3 mr-1.5" />}
                      Link
                    </Button>
                  </div>
                </div>
              ) : (
                /* UNLINKED STATE */
                <div className="space-y-2 text-center py-2">
                  <p className="text-[11px] text-muted-foreground">
                    This repository is connected to the workspace but not linked to any project.
                  </p>
                  <Button
                    size="sm"
                    className="w-full h-9 rounded-button font-bold text-xs bg-primary text-primary-foreground gap-1.5 mt-2"
                    onClick={() => setShowLinkFields(true)}
                  >
                    <Link2 className="size-3.5" />
                    Link Project
                  </Button>
                </div>
              )
            ) : (
              /* NOT REGISTERED STATE */
              <div className="space-y-2 text-center py-2">
                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1.5 justify-center">
                  <ShieldAlert className="size-4 shrink-0" />
                  Not registered in workspace.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Go to Global Integrations to link this repository to your workspace.
                </p>
              </div>
            )}
          </div>

          {isLinked && !showLinkFields && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 rounded-button text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 gap-1.5 shrink-0"
              onClick={handleUnlinkProject}
              disabled={updateMutation.isPending}
            >
              <Unlink className="size-3.5" />
              Unlink Project
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
