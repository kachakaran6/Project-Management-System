
import { useState } from "react";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/features/projects/components/project-form";
import { ProjectFormValues } from "@/features/projects/schemas/project.schema";
import { useCreateProjectMutation } from "@/features/projects/hooks/use-projects-query";
import { projectResourcesApi } from "@/features/projects/api/project-resources.api";


interface CreateProjectModalProps {
  trigger?: React.ReactNode;
  onCreated?: () => void;
}

export function CreateProjectModal({
  trigger,
  onCreated,
}: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const createProject = useCreateProjectMutation();

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      const result = await createProject.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        status: values.status,
        visibility: values.visibility,
        techStack: values.techStack,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
        members: values.members,
        code: values.code || undefined,
      });

      // Handle resource creation if any were added
      if (values.resources && values.resources.length > 0) {
        const newProjectId = result.data?.id || (result.data as any)?._id;
        if (newProjectId) {
          await Promise.all(
            values.resources.map((res) => {
              const { id: _, ...resData } = res as any;
              return projectResourcesApi.createResource(newProjectId, resData);
            })
          );
        }
      }

      toast.success(`Project "${values.name}" created!`);
      setOpen(false);
      onCreated?.();
    } catch (err: any) {
      const message = err?.response?.data?.message || "Failed to create project. Please try again.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <FolderPlus className="mr-2 size-4" />
            Create Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl p-6 rounded-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new project to organize and track your team&apos;s work.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          onSubmit={handleSubmit}
          isSubmitting={createProject.isPending}
          submitLabel="Create Project"
        />
      </DialogContent>
    </Dialog>
  );
}
