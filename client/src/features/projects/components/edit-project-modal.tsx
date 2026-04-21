"use client";

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

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      await updateProject.mutateAsync({
        id: (project as any).id || (project as any)._id,
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
      onOpenChange(false);
    } catch (err: any) {
      console.error("Update error:", err);
      const message = err?.response?.data?.message || "Failed to update project. Please try again.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 h-[92vh] md:h-[85vh] rounded-[32px] overflow-hidden border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-6 md:p-8 pb-4">
            <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight">Edit Project</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Refine your project scope, update the tech stack, and manage team access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
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
               // Handle different member formats (raw ID, full user object, or nested user object)
               return m.user?.id || m.user?._id || m.id || m._id || m;
            }) || [],
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateProject.isPending}
          submitLabel="Save Changes"
        />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
