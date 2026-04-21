"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ProjectForm } from "@/features/projects/components/project-form";
import { useCreateProjectMutation } from "@/features/projects/hooks/use-projects-query";
import { ProjectFormValues } from "@/features/projects/schemas/project.schema";
import Link from "next/link";

export default function CreateProjectPage() {
  const router = useRouter();
  const { activeOrg } = useAuth();
  const createProject = useCreateProjectMutation();

  const canMutate =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  if (!canMutate) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <Alert variant="destructive" className="rounded-3xl border-destructive/20 bg-destructive/5 p-6">
          <AlertTitle className="text-lg font-bold">Access Denied</AlertTitle>
          <AlertDescription className="text-sm opacity-90 mt-1">
            You don't have the necessary permissions to create projects in this organization.
          </AlertDescription>
        </Alert>
        <Button variant="ghost" className="mt-4 rounded-xl" asChild>
          <Link href="/projects">Go back to projects</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      await createProject.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        status: values.status,
        visibility: values.visibility,
        techStack: values.techStack,
        startDate: values.startDate instanceof Date ? values.startDate.toISOString() : undefined,
        endDate: values.endDate instanceof Date ? values.endDate.toISOString() : undefined,
        members: values.members,
      });
      toast.success(`Project "${values.name}" created!`);
      router.push("/projects");
    } catch (err: any) {
      console.error("Create error:", err);
      const message = err?.response?.data?.message || "Failed to create project.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] py-6 md:py-0 md:h-[calc(100vh-100px)] flex items-start md:items-center justify-center md:-mt-4 overflow-y-auto md:overflow-hidden animate-in fade-in zoom-in-95 duration-500 px-4">
      <div className="w-full max-w-6xl rounded-[32px] border border-border/40 bg-card/30 backdrop-blur-md p-4 md:p-6 shadow-2xl shadow-primary/5 mb-8 md:mb-0">
        <ProjectForm
          isSubmitting={createProject.isPending}
          onSubmit={handleSubmit}
          submitLabel="Create Project"
        />
      </div>
    </div>
  );
}
