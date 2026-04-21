"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Settings, 
  Plus, 
  LayoutDashboard, 
  CheckSquare, 
  History,
  ExternalLink 
} from "lucide-react";
import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectOverview } from "@/features/projects/components/project-overview";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: projectResult, isLoading, error } = useProjectQuery(id as string);
  const project = projectResult?.data;

  if (isLoading) return <ProjectDetailsSkeleton />;
  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-xl font-bold">Project not found</h2>
        <Button onClick={() => router.push("/projects")}>Back to Projects</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/projects">
              <ArrowLeft className="mr-2 size-3.5" />
              Back to Projects
            </Link>
          </Button>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge variant="outline" className="h-6 rounded-full border-primary/20 bg-primary/5 text-primary text-[10px] uppercase font-bold tracking-widest">
                {project.status}
              </Badge>
              {project.visibility === 'private' && (
                <Badge variant="outline" className="h-6 rounded-full border-amber-500/20 bg-amber-500/5 text-amber-600 text-[10px] uppercase font-bold tracking-widest">
                  Private
                </Badge>
              )}
            </div>
            {project.description && (
              <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed truncate">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl h-10 px-4 gap-2">
            <Settings className="size-4 opacity-70" />
            Settings
          </Button>
          <Button className="rounded-xl h-10 px-4 gap-2 shadow-lg shadow-primary/20" asChild>
            <Link href={`/tasks?projectId=${id}`}>
              <Plus className="size-4" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border/40 mb-6">
          <TabsList className="bg-transparent h-auto p-0 gap-8 rounded-none border-none">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm font-semibold transition-all hover:text-primary/70"
            >
              <LayoutDashboard className="mr-2 size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm font-semibold transition-all hover:text-primary/70"
            >
              <CheckSquare className="mr-2 size-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-sm font-semibold transition-all hover:text-primary/70"
            >
              <History className="mr-2 size-4" />
              Activity
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 ring-0 outline-none">
          <ProjectOverview projectId={id as string} />
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-0 ring-0 outline-none">
          <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center bg-muted/5">
            <div className="size-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Detailed Task View</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              You can view and manage all tasks associated with this project here.
            </p>
            <Button variant="secondary" className="rounded-xl font-semibold gap-2" asChild>
              <Link href={`/tasks?projectId=${id}`}>
                View Project Board
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 ring-0 outline-none text-center py-20 bg-muted/5 rounded-3xl border border-dashed">
           <History className="size-10 text-muted-foreground/30 mx-auto mb-4" />
           <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Project History coming soon</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectDetailsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="flex gap-8 border-b pb-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-[400px] rounded-3xl" />
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    </div>
  );
}
