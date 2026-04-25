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
  ExternalLink,
  Shield 
} from "lucide-react";
import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectOverview } from "@/features/projects/components/project-overview";
import { ProjectVault } from "@/features/projects/components/vault/project-vault";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EditProjectModal } from "@/features/projects/components/edit-project-modal";
import { useAuth } from "@/features/auth/hooks/use-auth";
import Link from "next/link";
import { TaskDashboard } from "@/features/tasks/components/task-dashboard";
import { cn } from "@/lib/utils";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const { activeOrg } = useAuth();

  const canEdit = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN" || activeOrg?.role === "MANAGER";

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
    <div className={cn(
      "mx-auto space-y-8 animate-in fade-in duration-500",
      activeTab === "tasks" ? "max-w-[1600px]" : "max-w-7xl"
    )}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="-ml-2 h-8 text-muted-foreground hover:text-foreground transition-colors group"
            asChild
          >
            <Link href="/projects">
              <ArrowLeft className="mr-2 size-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to Projects
            </Link>
          </Button>
 
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-foreground">{project.name}</h1>
              <Badge variant="outline" className="h-6 rounded-full border-primary/20 bg-primary/5 text-primary text-[10px] uppercase font-black tracking-widest shadow-sm">
                {project.status}
              </Badge>
              {project.visibility === 'private' && (
                <Badge variant="outline" className="h-6 rounded-full border-amber-500/20 bg-amber-500/5 text-amber-600 text-[10px] uppercase font-black tracking-widest shadow-sm">
                  Private
                </Badge>
              )}
            </div>
            {project.description && (
              <p className="text-muted-foreground max-w-3xl text-[14px] leading-relaxed font-medium">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && (
            <Button 
              variant="outline" 
              className="rounded-2xl h-11 px-5 gap-2.5 border-border/40 bg-muted/5 font-bold text-xs transition-all hover:bg-muted/10 active:scale-95"
              onClick={() => setIsEditing(true)}
            >
              <Settings className="size-4 text-muted-foreground" />
              Settings
            </Button>
          )}
          <Button className="rounded-2xl h-11 px-6 gap-2.5 font-black text-xs shadow-premium bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 transition-all" asChild>
            <Link href={`/tasks?projectId=${id}`}>
              <Plus className="size-4" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border/10 mb-6 sticky top-0 bg-background/50 backdrop-blur-md z-40">
          <TabsList className="bg-transparent h-auto p-0 gap-10 rounded-none border-none">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-[13px] font-black uppercase tracking-widest transition-all hover:text-primary/70"
            >
              <LayoutDashboard className="mr-2 size-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-[13px] font-black uppercase tracking-widest transition-all hover:text-primary/70"
            >
              <CheckSquare className="mr-2 size-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="vault" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-[13px] font-black uppercase tracking-widest transition-all hover:text-primary/70"
            >
              <Shield className="mr-2 size-4" />
              Vault
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-[13px] font-black uppercase tracking-widest transition-all hover:text-primary/70"
            >
              <History className="mr-2 size-4" />
              Activity
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 ring-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
          <ProjectOverview projectId={id as string} />
        </TabsContent>

        <TabsContent value="vault" className="mt-0 ring-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
          <ProjectVault projectId={id as string} />
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-0 ring-0 outline-none h-[calc(100vh-280px)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
          <TaskDashboard fixedProjectId={id as string} isEmbedded={true} />
        </TabsContent>

        <TabsContent value="activity" className="mt-0 ring-0 outline-none text-center py-32 bg-muted/5 rounded-[2rem] border border-dashed border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <History className="size-12 text-muted-foreground/10 mx-auto mb-6" />
           <p className="text-muted-foreground text-[10px] uppercase tracking-[0.3em] font-black">Project History coming soon</p>
        </TabsContent>
      </Tabs>

      {isEditing && project && (
        <EditProjectModal
          project={project}
          open={isEditing}
          onOpenChange={setIsEditing}
        />
      )}
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
