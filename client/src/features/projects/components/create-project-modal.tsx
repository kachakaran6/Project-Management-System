"use client";

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

interface CreateProjectModalProps {
  trigger?: React.ReactNode;
  onCreated?: () => void;
}

export function CreateProjectModal({ trigger, onCreated }: CreateProjectModalProps) {
  const [open, setOpen] = useState(false);
  const createProject = useCreateProjectMutation();

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      await createProject.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        status: values.status,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
      });
      toast.success(`Project "${values.name}" created!`);
      setOpen(false);
      onCreated?.();
    } catch {
      toast.error("Failed to create project. Please try again.");
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
      <DialogContent className="max-w-lg">
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
