"use client";

import { useRouter } from "@/lib/next-navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ProjectForm } from "@/features/projects/components/project-form";
import { useCreateProjectMutation } from "@/features/projects/hooks/use-projects-query";
import { ProjectFormValues } from "@/features/projects/schemas/project.schema";

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
      <Alert variant="warning">
        <AlertTitle>Limited access</AlertTitle>
        <AlertDescription>
          Only ADMIN, SUPER_ADMIN, and MANAGER can create projects.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Create Project</h1>
        <p className="text-muted-foreground mt-1">
          Define scope, status, and metadata for a new project.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Form</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            isSubmitting={createProject.isPending}
            onSubmit={async (values: ProjectFormValues) => {
              try {
                await createProject.mutateAsync({
                  name: values.name,
                  description: values.description || undefined,
                  status: values.status,
                });
                toast.success("Project created successfully");
                router.push("/projects");
              } catch {
                toast.error("Failed to create project");
              }
            }}
            submitLabel="Create Project"
          />
        </CardContent>
      </Card>
    </div>
  );
}

