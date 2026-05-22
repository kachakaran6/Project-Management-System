
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ProjectOverview } from "@/features/projects/components/project-overview";
import { ProjectVault } from "@/features/projects/components/vault/project-vault";
import { ProjectActivityFeed } from "@/features/projects/components/project-activity-feed";
import { EditProjectModal } from "@/features/projects/components/edit-project-modal";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ProjectHeader } from "@/features/projects/components/details/project-header";
import { ProjectTabsList } from "@/features/projects/components/details/project-tabs";
import { ProjectSidebarPanel } from "@/features/projects/components/details/project-sidebar-panel";
import { ProjectTaskBoard } from "@/features/projects/components/details/task-board/project-task-board";
import { useTaskPanelStore } from "@/features/tasks/store/task-panel-store";
import { useProjectLayout } from "@/features/projects/hooks/use-project-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  
  const { isFocusMode, toggleFocusMode } = useProjectLayout();
  const { activeOrg } = useAuth();
  const { openPanel } = useTaskPanelStore();

  const canEdit = activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN" || activeOrg?.role === "MANAGER";

  const { data: projectResult, isLoading, error } = useProjectQuery(id as string);
  const project = projectResult?.data;

  // Sync tab state with URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  // Sync state if URL changes externally
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    
    // Auto-open edit modal if requested
    if (searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [searchParams]);

  if (isLoading) return <ProjectDetailsSkeleton />;
  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-xl font-bold">Project not found</h2>
        <button onClick={() => router.push("/projects")} className="text-primary hover:underline">Back to Projects</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 overflow-hidden">
      <div className="shrink-0">
        <ProjectHeader 
          name={project.name} 
          status={project.status} 
          canEdit={canEdit} 
          onEditClick={() => setIsEditing(true)}
          isFocusMode={isFocusMode}
          toggleFocusMode={toggleFocusMode}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      <Tabs 
        defaultValue={initialTab} 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className={cn(
          "shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          isFocusMode ? "h-0 opacity-0 pointer-events-none" : "h-auto opacity-100"
        )}>
          <ProjectTabsList />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className={cn(
            "h-full mx-auto transition-all duration-300",
            isFocusMode ? "max-w-none px-2" : "max-w-[1400px] px-4 md:px-6 py-6"
          )}>
            <div className="flex flex-col lg:flex-row gap-8 h-full">
              {/* MAIN CONTENT */}
              <div className="flex-1 min-w-0 h-full">
                <TabsContent value="overview" className="mt-0 outline-none h-full overflow-y-auto no-scrollbar">
                  <ProjectOverview projectId={id as string} />
                </TabsContent>

                <TabsContent value="tasks" className="mt-0 outline-none h-full overflow-hidden">
                  <ProjectTaskBoard 
                    projectId={id as string} 
                    onTaskClick={(task) => openPanel(String(task.id || (task as any)._id))} 
                  />
                </TabsContent>

                <TabsContent value="vault" className="mt-0 outline-none h-full overflow-y-auto no-scrollbar">
                  <ProjectVault projectId={id as string} />
                </TabsContent>

                <TabsContent value="activity" className="mt-0 outline-none h-full overflow-y-auto no-scrollbar">
                  <ProjectActivityFeed projectId={id as string} />
                </TabsContent>
              </div>

              {/* RIGHT SIDEBAR - CONTEXT PANEL */}
              {activeTab === "overview" && !isFocusMode && (
                <div className="shrink-0 w-80 h-full overflow-y-auto no-scrollbar pb-10">
                  <ProjectSidebarPanel 
                    startDate={project.startDate}
                    endDate={project.endDate}
                    createdAt={project.createdAt}
                    progress={project.taskStats?.percent || 0}
                    members={project.members || []}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64 rounded-card" />
        <Skeleton className="h-8 w-8 rounded-card" />
      </div>
      <div className="h-10 w-full bg-muted/20 rounded-card" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-card" />
          <div className="grid grid-cols-4 gap-3">
             {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-card" />)}
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-card" />
      </div>
    </div>
  );
}
