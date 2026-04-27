"use client";

import { useState, useEffect } from "react";
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
import { ProjectTasksMobileView } from "@/features/tasks/components/project-tasks-mobile-view";
import { ProjectActivityFeed } from "@/features/projects/components/project-activity-feed";
import { cn } from "@/lib/utils";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { activeOrg } = useAuth();

  const canEdit = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN" || activeOrg?.role === "MANAGER";

  const { data: projectResult, isLoading, error } = useProjectQuery(id as string);
  const project = projectResult?.data;

  // Track mobile breakpoint
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);


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
      "mx-auto space-y-3 animate-in fade-in duration-500",
      activeTab === "tasks" ? "max-w-[1400px]" : "max-w-[1280px]"
    )}>
      {/* TOP NAVIGATION & SETTINGS ROW */}
      <div className="px-4 md:px-6 pt-3 flex items-center justify-between">
        <Link href="/projects" className="group flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-all">
          <div className="p-1 rounded-md bg-muted/20 group-hover:bg-primary/10 transition-colors">
            <ArrowLeft className="size-3" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Projects</span>
        </Link>

        {canEdit && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-7 rounded-lg border border-border/10 bg-muted/5 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={() => setIsEditing(true)}
          >
            <Settings className="size-3.5" />
          </Button>
        )}
      </div>

      {/* PROJECT HEADER — inline title + status */}
      <div className="px-4 md:px-6 pb-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-black tracking-tight text-foreground line-clamp-1 max-md:text-xl leading-tight">
            {project.name}
          </h1>
          <Badge variant="outline" className="h-5 rounded-full border-primary/20 bg-primary/5 text-primary text-[9px] uppercase font-black tracking-widest">
            {project.status.replace(/_/g, ' ')}
          </Badge>
          {project.visibility === 'private' && (
            <Badge variant="outline" className="h-5 rounded-full border-amber-500/20 bg-amber-500/5 text-amber-600 text-[9px] uppercase font-black tracking-widest">
              Private
            </Badge>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-border/10 mb-4 sticky top-0 bg-background/80 backdrop-blur-md z-40 overflow-x-auto no-scrollbar">
          <TabsList className="bg-transparent h-auto p-0 gap-6 md:gap-8 rounded-none border-none min-w-max px-4 md:px-6">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all hover:text-primary/70"
            >
              <LayoutDashboard className="mr-1.5 size-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all hover:text-primary/70"
            >
              <CheckSquare className="mr-1.5 size-3.5" />
              Tasks
            </TabsTrigger>
            <TabsTrigger 
              value="vault" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all hover:text-primary/70"
            >
              <Shield className="mr-1.5 size-3.5" />
              Vault
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-2.5 text-[11px] font-black uppercase tracking-widest transition-all hover:text-primary/70"
            >
              <History className="mr-1.5 size-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 ring-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300 px-4 md:px-6">
          <ProjectOverview projectId={id as string} />
        </TabsContent>

        <TabsContent value="vault" className="mt-0 ring-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300 px-4 md:px-6">
          <ProjectVault projectId={id as string} />
        </TabsContent>
        
        <TabsContent value="tasks" className="mt-0 ring-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Mobile: accordion grouped view | Desktop: full task dashboard */}
          <div className="md:hidden px-4">
            <ProjectTasksMobileView projectId={id as string} />
          </div>
          <div className="hidden md:block">
            <TaskDashboard fixedProjectId={id as string} isEmbedded={true} />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 ring-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300 px-4 md:px-6">
          <ProjectActivityFeed projectId={id as string} />
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
    <div className="max-w-[1280px] mx-auto space-y-3 px-4 md:px-6 pt-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-6 border-b border-border/10 pb-2.5 pt-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
        <Skeleton className="lg:col-span-2 h-[300px] rounded-2xl" />
        <Skeleton className="h-[300px] rounded-2xl" />
      </div>
    </div>
  );
}
