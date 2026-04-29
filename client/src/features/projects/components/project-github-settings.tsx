
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { githubApi, GithubSettings } from "../api/github.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Copy, Check, ExternalLink, Info } from "lucide-react";
import { GithubIcon as Github } from "@/components/icons/github-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectGithubSettingsProps {
  projectId: string;
}

export function ProjectGithubSettings({ projectId }: ProjectGithubSettingsProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  
  const { data: settingsResult, isLoading } = useQuery({
    queryKey: ["project-github-settings", projectId],
    queryFn: () => githubApi.getSettings(projectId),
    enabled: !!projectId
  });

  const [formData, setFormData] = useState<GithubSettings & { accessToken?: string }>({
    repoUrl: "",
    webhookSecret: "",
    autoStatusUpdate: false,
    isEnabled: false,
    hasAccessToken: false,
  });

  useEffect(() => {
    if (settingsResult?.data) {
      setFormData(settingsResult.data);
    }
  }, [settingsResult]);

  const updateMutation = useMutation({
    mutationFn: (data: GithubSettings) => githubApi.updateSettings(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-github-settings", projectId] });
      toast.success("GitHub settings updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update GitHub settings");
    }
  });

  const handleCopyWebhookUrl = () => {
    const baseUrl = window.location.origin.replace(":3000", ":5000"); // Crude hack for dev
    const url = `${baseUrl}/api/v1/github/webhook`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Webhook URL copied to clipboard!");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-card/50 overflow-hidden rounded-md">
        <CardHeader className="bg-primary/5 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-foreground text-background rounded-sm">
              <Github className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg">GitHub Integration</CardTitle>
              <CardDescription className="text-xs">
                Link your GitHub repository to track commits and PRs directly in tasks.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-between p-4 bg-muted/5 rounded-md border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Enable Integration</Label>
                <p className="text-[11px] text-muted-foreground">Activate GitHub webhook processing for this project.</p>
              </div>
              <Switch 
                checked={formData.isEnabled} 
                onCheckedChange={(val) => setFormData(prev => ({ ...prev, isEnabled: val }))} 
              />
            </div>

            {formData.isEnabled && (
              <>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Repository URL</Label>
                    <Input 
                      placeholder="https://github.com/user/repo" 
                      value={formData.repoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, repoUrl: e.target.value }))}
                      className="rounded-sm bg-muted/10 border-border/40 h-11"
                    />
                    <p className="text-[10px] text-muted-foreground px-1">Must match the URL GitHub sends in the webhook payload.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Webhook Secret</Label>
                    <Input 
                      type="password"
                      placeholder="Your GitHub Webhook Secret" 
                      value={formData.webhookSecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
                      className="rounded-sm bg-muted/10 border-border/40 h-11"
                    />
                    <p className="text-[10px] text-muted-foreground px-1">Highly recommended for security. Set this in your GitHub Repo Settings &rarr; Webhooks.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Personal Access Token (PAT)
                    </Label>
                    <Input 
                      type="password"
                      placeholder={formData.hasAccessToken ? "••••••••  (token already saved — leave blank to keep)" : "ghp_xxxxxxxxxxxx"}
                      onChange={(e) => setFormData(prev => ({ ...prev, accessToken: e.target.value }))}
                      className="rounded-sm bg-muted/10 border-border/40 h-11"
                    />
                    <p className="text-[10px] text-muted-foreground px-1">
                      Required for the <strong>Full Activity Feed</strong> (5,000 req/hr). 
                      Generate at <strong>GitHub → Settings → Developer settings → Personal access tokens</strong>.
                      Needs <code className="bg-muted/30 px-1 rounded-xs">repo</code> scope for private repos.
                    </p>
                    {formData.hasAccessToken && (
                      <p className="text-[10px] text-emerald-600 font-bold px-1">✓ A token is currently saved for this project.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-md border border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Auto Status Updates</Label>
                    <p className="text-[11px] text-muted-foreground">Automatically move tasks to "In Progress" or "Done" based on keywords in commit messages.</p>
                  </div>
                  <Switch 
                    checked={formData.autoStatusUpdate} 
                    onCheckedChange={(val) => setFormData(prev => ({ ...prev, autoStatusUpdate: val }))} 
                  />
                </div>

                <div className="p-4 bg-blue-500/5 rounded-md border border-blue-500/10 space-y-3">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Info className="size-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">How to Setup</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      1. Go to your GitHub Repository Settings.
                      <br />
                      2. Navigate to <strong>Webhooks</strong> and click <strong>Add webhook</strong>.
                      <br />
                      3. Paste the Payload URL below.
                      <br />
                      4. Set Content type to <strong>application/json</strong>.
                      <br />
                      5. Choose <strong>Let me select individual events</strong>: check Pushes and Pull Requests.
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 bg-muted/20 rounded-sm px-3 py-2 text-[10px] font-mono truncate border border-border/20">
                        {window.location.origin.replace(":3000", ":5000")}/api/v1/github/webhook
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="size-8 rounded-sm"
                        onClick={handleCopyWebhookUrl}
                      >
                        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                className="rounded-sm h-11 px-8 font-bold gap-2 min-w-[140px]"
              >
                {updateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Save Configuration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="p-4 rounded-md bg-amber-500/5 border border-amber-500/10 flex gap-3">
        <ExternalLink className="size-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-amber-600 block mb-1">Developer Guidelines</strong>
          Include the Task ID (e.g. <strong>PMS-123</strong>) in your commit messages, PR titles, or branch names.
          Use keywords like <strong>"fix PMS-123"</strong> to automatically mark the task as done.
        </p>
      </div>
    </div>
  );
}
