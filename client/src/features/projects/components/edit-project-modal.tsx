
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/features/projects/components/project-form";
import { ProjectFormValues } from "@/features/projects/schemas/project.schema";
import { useUpdateProjectMutation } from "@/features/projects/hooks/use-projects-query";
import { Project } from "@/types/project.types";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectGithubSettings } from "@/features/projects/components/project-github-settings";
import { useSearchParams } from "next/navigation";
import { Settings2 } from "lucide-react";
import { GithubIcon as Github } from "@/components/icons/github-icon";

interface EditProjectModalProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectModal({
  project,
  open,
  onOpenChange,
}: EditProjectModalProps) {
  const updateProject = useUpdateProjectMutation();
  const searchParams = useSearchParams();
  const projectId = (project as any).id || (project as any)._id;
  
  const defaultTab = searchParams.get("tab") || "general";

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: {
          name: values.name,
          description: values.description || undefined,
          status: values.status,
          visibility: values.visibility,
          techStack: values.techStack,
          startDate: values.startDate instanceof Date ? values.startDate.toISOString() : undefined,
          endDate: values.endDate instanceof Date ? values.endDate.toISOString() : undefined,
          members: values.members,
        },
      });
      toast.success(`Project "${values.name}" updated!`);
      // Don't close immediately if they want to check other tabs? 
      // Actually, standard behavior is fine.
      onOpenChange(false);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to update project. Please try again.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 h-[92vh] md:h-[85vh] rounded-md overflow-hidden border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-6 md:p-8 pb-4">
            <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight">Project Settings</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Manage your project scope, team access, and external integrations.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 md:px-8 border-b border-border/10">
              <TabsList className="bg-transparent h-auto p-0 gap-6 rounded-none border-none">
                <TabsTrigger 
                  value="general" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-[11px] font-black uppercase tracking-widest transition-all gap-2"
                >
                  <Settings2 className="size-3.5" />
                  General
                </TabsTrigger>
                <TabsTrigger 
                  value="github" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 text-[11px] font-black uppercase tracking-widest transition-all gap-2"
                >
                  <Github className="size-3.5" />
                  GitHub Integration
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <TabsContent value="general" className="m-0 p-6 md:p-8 outline-none">
                <ProjectForm
                  initialValues={{
                    name: project.name,
                    description: project.description ?? "",
                    status: project.status,
                    visibility: project.visibility,
                    techStack: project.techStack,
                    startDate: project.startDate ? new Date(project.startDate) : undefined,
                    endDate: project.endDate ? new Date(project.endDate) : undefined,
                    members: project.members?.map((m: any) => {
                      return m.user?.id || m.user?._id || m.id || m._id || m;
                    }) || [],
                  }}
                  onSubmit={handleSubmit}
                  isSubmitting={updateProject.isPending}
                  submitLabel="Save Changes"
                />
              </TabsContent>
              <TabsContent value="github" className="m-0 p-6 md:p-8 outline-none">
                <ProjectGithubSettings projectId={projectId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
