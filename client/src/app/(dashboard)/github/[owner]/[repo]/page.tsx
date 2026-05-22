"use client";

import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepositoryDetailsHeader } from "@/features/github/components/repository-details-header";
import { BranchesTab } from "@/features/github/components/branches-tab";
import { CommitsTab } from "@/features/github/components/commits-tab";
import { PullRequestsTab } from "@/features/github/components/pull-requests-tab";
import { IssuesTab } from "@/features/github/components/issues-tab";
import { ArrowLeft, GitBranch, GitCommit, GitPullRequest, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RepositoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const repo = params.repo as string;

  if (!owner || !repo) return null;

  return (
    <div className="flex flex-col h-full bg-background relative max-w-[1600px] mx-auto w-full">
      {/* <div className="flex items-center gap-4 py-4 px-6 border-b border-border/20 sticky top-0 bg-background/95 backdrop-blur z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/github")}
          className="size-8 rounded-button hover:bg-muted/50"
        >
          <ArrowLeft className="size-4 text-muted-foreground" />
        </Button>
        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
          <span className="text-muted-foreground font-semibold">{owner}</span>
          <span className="text-muted-foreground/30">/</span>
          <span>{repo}</span>
        </h1>
      </div> */}

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <RepositoryDetailsHeader owner={owner} repo={repo} />

        <Tabs defaultValue="branches" className="w-full">
          <TabsList className="bg-muted/30 border border-border/20 p-1 rounded-button h-12 w-full justify-start overflow-x-auto overflow-y-hidden">
            <TabsTrigger value="branches" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-button text-sm font-semibold h-full px-6 flex items-center gap-2">
              <GitBranch className="size-4" />
              Branches & Code
            </TabsTrigger>
            <TabsTrigger value="commits" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-button text-sm font-semibold h-full px-6 flex items-center gap-2">
              <GitCommit className="size-4" />
              Commits
            </TabsTrigger>
            <TabsTrigger value="pulls" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-button text-sm font-semibold h-full px-6 flex items-center gap-2">
              <GitPullRequest className="size-4" />
              Pull Requests
            </TabsTrigger>
            <TabsTrigger value="issues" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-button text-sm font-semibold h-full px-6 flex items-center gap-2">
              <AlertCircle className="size-4" />
              Issues
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="branches" className="mt-0 outline-none">
              <BranchesTab owner={owner} repo={repo} />
            </TabsContent>

            <TabsContent value="commits" className="mt-0 outline-none">
              <CommitsTab owner={owner} repo={repo} />
            </TabsContent>

            <TabsContent value="pulls" className="mt-0 outline-none">
              <PullRequestsTab owner={owner} repo={repo} />
            </TabsContent>

            <TabsContent value="issues" className="mt-0 outline-none">
              <IssuesTab owner={owner} repo={repo} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
