"use client";

import { useState } from "react";
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
        },
      });
      toast.success(`Project "${values.name}" updated!`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to update project. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Project</DialogTitle>
          <DialogDescription>
            Update the details and status of this project.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          initialValues={{
            name: project.name,
            description: project.description ?? "",
            status: project.status,
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateProject.isPending}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
