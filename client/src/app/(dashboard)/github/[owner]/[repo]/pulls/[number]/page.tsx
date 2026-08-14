"use client";

import Link from "@/lib/next-link";
import { useParams, useRouter } from "@/lib/next-navigation";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  GitPullRequestClosed,
  RefreshCcw,
  ShieldAlert,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreatePullRequestReviewMutation,
  useMergePullRequestMutation,
  useRepoPullRequestDetail,
} from "@/features/github/hooks/use-github";
import { cn } from "@/lib/utils";

const reviewStateLabels: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Approved", className: "bg-success/15 text-success border-success/20" },
  CHANGES_REQUESTED: { label: "Changes requested", className: "bg-warning/15 text-warning border-warning/20" },
  COMMENTED: { label: "Commented", className: "bg-muted/60 text-muted-foreground border-border/40" },
  DISMISSED: { label: "Dismissed", className: "bg-destructive/15 text-destructive border-destructive/20" },
  PENDING: { label: "Pending", className: "bg-muted/60 text-muted-foreground border-border/40" },
};

const mergeStateMeta = (pullRequest: any) => {
  const mergeableState = pullRequest?.mergeable_state;

  if (pullRequest?.draft) {
    return {
      label: "Draft PR",
      description: "This pull request is still marked as draft.",
      tone: "bg-muted/60 text-muted-foreground border-border/40",
      icon: CircleDashed,
    };
  }

  if (pullRequest?.merged) {
    return {
      label: "Merged",
      description: "The pull request has already been merged.",
      tone: "bg-success/15 text-success border-success/20",
      icon: CheckCircle2,
    };
  }

  if (pullRequest?.state === "closed") {
    return {
      label: "Closed",
      description: "The pull request is closed without merge.",
      tone: "bg-destructive/15 text-destructive border-destructive/20",
      icon: GitPullRequestClosed,
    };
  }

  if (mergeableState === "dirty") {
    return {
      label: "Conflicting",
      description: "GitHub reports merge conflicts on the source branch.",
      tone: "bg-destructive/15 text-destructive border-destructive/20",
      icon: AlertTriangle,
    };
  }

  if (mergeableState === "behind") {
    return {
      label: "Branch outdated",
      description: "The source branch is behind the base branch.",
      tone: "bg-warning/15 text-warning border-warning/20",
      icon: RefreshCcw,
    };
  }

  if (mergeableState === "blocked") {
    return {
      label: "Blocked",
      description: "Required checks or approvals are still pending.",
      tone: "bg-warning/15 text-warning border-warning/20",
      icon: ShieldAlert,
    };
  }

  if (mergeableState === "clean") {
    return {
      label: "Ready to merge",
      description: "GitHub considers this branch mergeable.",
      tone: "bg-success/15 text-success border-success/20",
      icon: CheckCircle2,
    };
  }

  return {
    label: "Mergeability pending",
    description: "GitHub is still calculating mergeability for this PR.",
    tone: "bg-muted/60 text-muted-foreground border-border/40",
    icon: Waypoints,
  };
};

const reviewSummary = (reviews: any[] = []) => {
  const latestByUser = new Map<string, any>();

  reviews.forEach((review) => {
    const login = review.user?.login;
    if (!login) return;
    const current = latestByUser.get(login);
    if (!current || new Date(review.submitted_at || review.created_at).getTime() > new Date(current.submitted_at || current.created_at).getTime()) {
      latestByUser.set(login, review);
    }
  });

  const summary = { approved: 0, changesRequested: 0, comment: 0, dismissed: 0, pending: 0 };
  latestByUser.forEach((review) => {
    switch (review.state) {
      case "APPROVED":
        summary.approved += 1;
        break;
      case "CHANGES_REQUESTED":
        summary.changesRequested += 1;
        break;
      case "COMMENTED":
        summary.comment += 1;
        break;
      case "DISMISSED":
        summary.dismissed += 1;
        break;
      default:
        summary.pending += 1;
    }
  });

  return summary;
};

const splitPatch = (patch: string) => {
  const removed: string[] = [];
  const added: string[] = [];
  patch.split("\n").forEach((line) => {
    if (line.startsWith("-") && !line.startsWith("---")) {
      removed.push(line);
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      added.push(line);
    }
  });
  return { removed, added };
};

export default function PullRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const number = Number(params.number);

  const [reviewBody, setReviewBody] = useState("");
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("merge");
  const [mergeTitle, setMergeTitle] = useState("");
  const [mergeMessage, setMergeMessage] = useState("");
  const [includeDeleteBranch, setIncludeDeleteBranch] = useState(true);
  const [diffView, setDiffView] = useState<"unified" | "split">("unified");

  const { data, isLoading, error } = useRepoPullRequestDetail(owner, repo, number);
  const approveMutation = useCreatePullRequestReviewMutation(owner, repo, number);
  const mergeMutation = useMergePullRequestMutation(owner, repo, number);

  const pullRequest = data?.pullRequest;
  const reviews = data?.reviews || [];
  const reviewComments = data?.reviewComments || [];
  const issueComments = data?.issueComments || [];
  const files = data?.files || [];
  const commits = data?.commits || [];
  const checks = data?.checks || {};

  const mergeability = useMemo(() => mergeStateMeta(pullRequest), [pullRequest]);
  const summary = useMemo(() => reviewSummary(reviews), [reviews]);
  const reviewTimeline = useMemo(() => {
    const items = [
      ...reviewComments.map((item: any) => ({
        kind: "line-comment",
        actor: item.user,
        body: item.body,
        createdAt: item.created_at,
        url: item.html_url,
      })),
      ...issueComments.map((item: any) => ({
        kind: "comment",
        actor: item.user,
        body: item.body,
        createdAt: item.created_at,
        url: item.html_url,
      })),
      ...reviews.map((item: any) => ({
        kind: "review",
        actor: item.user,
        body: item.body,
        createdAt: item.submitted_at || item.created_at,
        url: item.html_url,
        state: item.state,
      })),
      ...commits.map((item: any) => ({
        kind: "commit",
        actor: item.author,
        body: item.commit?.message,
        createdAt: item.commit?.author?.date,
        url: item.html_url,
      })),
    ];

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reviewComments, issueComments, reviews, commits]);

  const mergeEnabled = Boolean(
    pullRequest &&
      pullRequest.state === "open" &&
      !pullRequest.draft &&
      pullRequest.mergeable !== false &&
      mergeability.label !== "Conflicting",
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
        Loading pull request review workspace...
      </div>
    );
  }

  if (error || !pullRequest) {
    return (
      <div className="p-6">
        <div className="rounded-card border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          Failed to load pull request details.
        </div>
      </div>
    );
  }

  const statusIcon = mergeability.icon;
  const StatusIcon = statusIcon;

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 rounded-card border border-border/40 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-9 rounded-button">
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn("border", mergeability.tone)}>
                  <StatusIcon className="mr-1.5 size-3.5" />
                  {mergeability.label}
                </Badge>
                {pullRequest.draft && <Badge variant="outline" className="bg-muted/60 text-muted-foreground border-border/40">Draft</Badge>}
                {pullRequest.auto_merge && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Auto merge enabled</Badge>}
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                {pullRequest.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                #{pullRequest.number} opened {formatDistanceToNow(new Date(pullRequest.created_at), { addSuffix: true })} by {pullRequest.user?.login}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => window.open(pullRequest.html_url, "_blank")}>Open on GitHub</Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(pullRequest.html_url);
                toast.success("PR link copied");
              }}
            >
              Copy link
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-card border border-border/40 bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Approvals</div>
            <div className="mt-2 text-2xl font-black">{summary.approved}</div>
            <p className="text-xs text-muted-foreground">{pullRequest.requested_reviewers?.length || 0} requested reviewers</p>
          </div>
          <div className="rounded-card border border-border/40 bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Checks</div>
            <div className="mt-2 text-2xl font-black">{checks?.status?.state || pullRequest.mergeable_state || "pending"}</div>
            <p className="text-xs text-muted-foreground">GitHub status and check runs</p>
          </div>
          <div className="rounded-card border border-border/40 bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Files changed</div>
            <div className="mt-2 text-2xl font-black">{pullRequest.changed_files ?? files.length}</div>
            <p className="text-xs text-muted-foreground">{pullRequest.additions ?? 0} additions, {pullRequest.deletions ?? 0} deletions</p>
          </div>
          <div className="rounded-card border border-border/40 bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mergeability</div>
            <div className="mt-2 text-2xl font-black">{pullRequest.mergeable_state || "unknown"}</div>
            <p className="text-xs text-muted-foreground">{mergeability.description}</p>
          </div>
        </div>

        <div className={cn("flex flex-col gap-3 rounded-card border p-4", mergeability.tone)}>
          <div className="flex items-center gap-2 font-semibold">
            <StatusIcon className="size-4" />
            {mergeability.label}
          </div>
          <p className="text-sm opacity-90">{mergeability.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs opacity-90">
            <span>Base: {pullRequest.base?.ref}</span>
            <span>•</span>
            <span>Head: {pullRequest.head?.ref}</span>
            <span>•</span>
            <span>Merge method: {mergeMethod}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="conversation" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-card border border-border/40 bg-card p-2">
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="files">Files Changed</TabsTrigger>
          <TabsTrigger value="checks">Checks</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        <TabsContent value="conversation" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4 rounded-card border border-border/40 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Review conversation</h2>
                  <p className="text-sm text-muted-foreground">Threaded timeline from reviews, comments, and commits.</p>
                </div>
                <Badge variant="outline" className="bg-muted/30 text-muted-foreground">{reviewTimeline.length} entries</Badge>
              </div>

              <Separator />

              <div className="space-y-4">
                {reviewTimeline.map((item: any, index: number) => (
                  <div key={`${item.kind}-${item.createdAt}-${index}`} className="rounded-card border border-border/40 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 rounded-full border border-border/40">
                          <AvatarImage src={item.actor?.avatar_url} />
                          <AvatarFallback>{(item.actor?.login || item.actor?.name || "U")[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.actor?.login || item.actor?.name || "Unknown"}</span>
                            {item.state && (
                              <Badge variant="outline" className={reviewStateLabels[item.state]?.className || "bg-muted/60 text-muted-foreground border-border/40"}>
                                {reviewStateLabels[item.state]?.label || item.state}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-background/70 text-muted-foreground">{item.kind}</Badge>
                    </div>
                    {item.body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{item.body}</p> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-card border border-border/40 bg-card p-5 shadow-sm">
              <div>
                <h3 className="text-base font-bold">Review actions</h3>
                <p className="text-sm text-muted-foreground">Approve, request changes, or leave a review comment.</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="review-body">Review summary</Label>
                <Textarea
                  id="review-body"
                  value={reviewBody}
                  onChange={(event) => setReviewBody(event.target.value)}
                  rows={6}
                  placeholder="Summarize the overall code review..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => approveMutation.mutate({ event: "APPROVE", body: reviewBody || undefined })}
                  disabled={approveMutation.isPending}
                >
                  Approve PR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => approveMutation.mutate({ event: "REQUEST_CHANGES", body: reviewBody || undefined })}
                  disabled={approveMutation.isPending}
                >
                  Request changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => approveMutation.mutate({ event: "COMMENT", body: reviewBody || undefined })}
                  disabled={approveMutation.isPending}
                >
                  Comment review
                </Button>
              </div>

              <Separator />

              <div className="space-y-3 rounded-card border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Merge readiness</span>
                  <Badge variant="outline" className={mergeEnabled ? "bg-success/15 text-success border-success/20" : "bg-warning/15 text-warning border-warning/20"}>
                    {mergeEnabled ? "Ready" : "Blocked"}
                  </Badge>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="merge-title">Merge title</Label>
                    <Input id="merge-title" value={mergeTitle} onChange={(event) => setMergeTitle(event.target.value)} placeholder={pullRequest.title} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="merge-message">Merge message</Label>
                    <Textarea id="merge-message" value={mergeMessage} onChange={(event) => setMergeMessage(event.target.value)} rows={4} placeholder="Optional merge commit message" />
                  </div>
                  <div className="space-y-2">
                    <Label>Merge method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["merge", "squash", "rebase"] as const).map((method) => (
                        <Button
                          key={method}
                          type="button"
                          variant={mergeMethod === method ? "default" : "outline"}
                          onClick={() => setMergeMethod(method)}
                        >
                          {method}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-button border border-border/40 bg-background p-3">
                    <div>
                      <p className="text-sm font-medium">Delete branch after merge</p>
                      <p className="text-xs text-muted-foreground">Requests branch cleanup after a successful merge.</p>
                    </div>
                    <Switch checked={includeDeleteBranch} onCheckedChange={setIncludeDeleteBranch} />
                  </div>
                  <Button
                    disabled={!mergeEnabled || mergeMutation.isPending}
                    onClick={() => {
                      mergeMutation.mutate({
                        merge_method: mergeMethod,
                        commit_title: mergeTitle || pullRequest.title,
                        commit_message: mergeMessage || undefined,
                        sha: pullRequest.head?.sha,
                        delete_branch_after_merge: includeDeleteBranch,
                      });
                    }}
                  >
                    Merge pull request
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="commits" className="mt-6">
          <div className="space-y-3 rounded-card border border-border/40 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Commits</h2>
                <p className="text-sm text-muted-foreground">{commits.length} commits in this pull request.</p>
              </div>
              <Badge variant="outline" className="bg-muted/30 text-muted-foreground">Head {pullRequest.head?.sha?.slice(0, 7)}</Badge>
            </div>
            <Separator />
            <div className="space-y-3">
              {commits.map((commit: any) => (
                <div key={commit.sha} className="flex items-start justify-between gap-4 rounded-card border border-border/40 p-4">
                  <div>
                    <div className="font-semibold">{commit.commit?.message?.split("\n")[0]}</div>
                    <div className="text-xs text-muted-foreground">{commit.commit?.author?.name} • {formatDistanceToNow(new Date(commit.commit?.author?.date), { addSuffix: true })}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(commit.html_url, "_blank")}>Open</Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <div className="space-y-4 rounded-card border border-border/40 bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Files changed</h2>
                <p className="text-sm text-muted-foreground">Switch between unified and split diff views.</p>
              </div>
              <div className="flex items-center gap-2 rounded-button border border-border/40 bg-muted/20 p-1">
                <Button size="sm" variant={diffView === "unified" ? "default" : "ghost"} onClick={() => setDiffView("unified")}>Unified</Button>
                <Button size="sm" variant={diffView === "split" ? "default" : "ghost"} onClick={() => setDiffView("split")}>Split</Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              {files.map((file: any) => {
                const diff = file.patch ? splitPatch(file.patch) : { removed: [], added: [] };
                return (
                  <div key={file.sha || file.filename} className="overflow-hidden rounded-card border border-border/40">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/20 p-4">
                      <div>
                        <div className="font-semibold">{file.filename}</div>
                        <div className="text-xs text-muted-foreground">{file.status} • {file.changes} changes</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-success/15 px-2 py-1 text-success">+{file.additions}</span>
                        <span className="rounded-full bg-destructive/15 px-2 py-1 text-destructive">-{file.deletions}</span>
                      </div>
                    </div>
                    <div className="grid gap-0 lg:grid-cols-2">
                      {diffView === "split" ? (
                        <>
                          <div className="border-r border-border/40 bg-background p-4">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Removed</div>
                            <pre className="max-h-105 overflow-auto whitespace-pre-wrap rounded-button bg-destructive/5 p-3 text-xs leading-6 text-destructive">
                              {diff.removed.join("\n") || "No removed lines in this file."}
                            </pre>
                          </div>
                          <div className="bg-background p-4">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Added</div>
                            <pre className="max-h-105 overflow-auto whitespace-pre-wrap rounded-button bg-success/5 p-3 text-xs leading-6 text-success">
                              {diff.added.join("\n") || "No added lines in this file."}
                            </pre>
                          </div>
                        </>
                      ) : (
                          <div className="lg:col-span-2 bg-background p-4">
                          <pre className="max-h-130 overflow-auto whitespace-pre-wrap rounded-button bg-muted/10 p-4 text-xs leading-6">
                            {file.patch || "GitHub did not include a patch for this file."}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="checks" className="mt-6">
          <div className="space-y-4 rounded-card border border-border/40 bg-card p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold">Checks</h2>
              <p className="text-sm text-muted-foreground">Status checks are sourced from the latest head SHA.</p>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-card border border-border/40 p-4">
                <div className="text-sm font-semibold">Combined status</div>
                <div className="mt-2 text-2xl font-black">{checks?.status?.state || "unknown"}</div>
                <p className="text-xs text-muted-foreground">{checks?.status?.total_count ?? 0} statuses reported.</p>
              </div>
              <div className="rounded-card border border-border/40 p-4">
                <div className="text-sm font-semibold">Check runs</div>
                <div className="mt-2 text-2xl font-black">{checks?.checkRuns?.total_count ?? 0}</div>
                <p className="text-xs text-muted-foreground">Recent CI checks and workflows.</p>
              </div>
            </div>
            <div className="space-y-3">
              {(checks?.checkRuns?.check_runs || []).map((checkRun: any) => (
                <div key={checkRun.id} className="flex items-start justify-between gap-4 rounded-card border border-border/40 p-4">
                  <div>
                    <div className="font-semibold">{checkRun.name}</div>
                    <div className="text-xs text-muted-foreground">{checkRun.status} • {checkRun.conclusion || "pending"}</div>
                  </div>
                  <Badge variant="outline">{checkRun.conclusion || checkRun.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reviewers" className="mt-6">
          <div className="space-y-4 rounded-card border border-border/40 bg-card p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold">Reviewers</h2>
              <p className="text-sm text-muted-foreground">Track reviewer assignments and latest review state.</p>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-card border border-border/40 p-4">
                <div className="text-sm font-semibold">Approved</div>
                <div className="mt-2 text-2xl font-black">{summary.approved}</div>
              </div>
              <div className="rounded-card border border-border/40 p-4">
                <div className="text-sm font-semibold">Changes requested</div>
                <div className="mt-2 text-2xl font-black">{summary.changesRequested}</div>
              </div>
              <div className="rounded-card border border-border/40 p-4">
                <div className="text-sm font-semibold">Pending</div>
                <div className="mt-2 text-2xl font-black">{pullRequest.requested_reviewers?.length || 0}</div>
              </div>
            </div>
            <div className="space-y-3">
              {(pullRequest.requested_reviewers || []).map((reviewer: any) => {
                const latestReview = [...reviews].reverse().find((review: any) => review.user?.login === reviewer.login);
                const state = latestReview?.state || "PENDING";
                const meta = reviewStateLabels[state] || reviewStateLabels.PENDING;
                return (
                  <div key={reviewer.login} className="flex items-center justify-between gap-4 rounded-card border border-border/40 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 rounded-full border border-border/40">
                        <AvatarImage src={reviewer.avatar_url} />
                        <AvatarFallback>{reviewer.login?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{reviewer.login}</div>
                        <div className="text-xs text-muted-foreground">Requested reviewer</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <div className="space-y-4 rounded-card border border-border/40 bg-card p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold">Activity</h2>
              <p className="text-sm text-muted-foreground">A combined timeline for comments, reviews, and commits.</p>
            </div>
            <Separator />
            <div className="space-y-3">
              {reviewTimeline.map((item: any, index: number) => (
                <div key={`activity-${index}`} className="rounded-card border border-border/40 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7 rounded-full border border-border/40">
                        <AvatarImage src={item.actor?.avatar_url} />
                        <AvatarFallback>{(item.actor?.login || item.actor?.name || "U")[0]}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{item.actor?.login || item.actor?.name || "Unknown"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</div>
                  </div>
                  {item.body ? <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{item.body}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conflicts" className="mt-6">
          <div className="space-y-4 rounded-card border border-border/40 bg-card p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-bold">Conflicts</h2>
              <p className="text-sm text-muted-foreground">GitHub mergeability is the source of truth for conflict detection.</p>
            </div>
            <Separator />
            {pullRequest.mergeable === false || pullRequest.mergeable_state === "dirty" ? (
              <div className="space-y-4">
                <div className="rounded-card border border-destructive/20 bg-destructive/10 p-4 text-destructive">
                  This branch has conflicts and cannot be merged until the source branch is updated.
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-card border border-border/40 p-4">
                    <div className="text-sm font-semibold">Conflict indicators</div>
                    <div className="mt-2 text-sm text-muted-foreground">Mergeability state: {pullRequest.mergeable_state || "unknown"}</div>
                    <div className="mt-1 text-sm text-muted-foreground">Conflict count is inferred from GitHub mergeability and changed files.</div>
                  </div>
                  <div className="rounded-card border border-border/40 p-4">
                    <div className="text-sm font-semibold">Changed files</div>
                    <div className="mt-2 text-sm text-muted-foreground">{files.length} files currently involved in the pull request.</div>
                    <div className="mt-3 space-y-2">
                      {files.map((file: any) => (
                        <div key={`conflict-${file.filename}`} className="flex items-center justify-between rounded-button border border-border/40 px-3 py-2 text-sm">
                          <span className="truncate">{file.filename}</span>
                          <span className="text-xs text-muted-foreground">{file.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-card border border-success/20 bg-success/10 p-4 text-success">
                GitHub reports this pull request as mergeable. No conflict resolution is required right now.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
