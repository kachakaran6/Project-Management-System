"use client";

import { useParams, useRouter } from "@/lib/next-navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ProjectForm } from "@/features/projects/components/project-form";
import {
  useProjectQuery,
  useUpdateProjectMutation,
} from "@/features/projects/hooks/use-projects-query";
import { ProjectFormValues } from "@/features/projects/schemas/project.schema";

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);
  const router = useRouter();
  const { activeOrg } = useAuth();

  const projectQuery = useProjectQuery(id, Boolean(id));
  const updateProject = useUpdateProjectMutation();

  const canMutate =
    activeOrg?.role === "SUPER_ADMIN" ||
    activeOrg?.role === "ADMIN" ||
    activeOrg?.role === "MANAGER";

  if (!canMutate) {
    return (
      <Alert variant="warning">
        <AlertTitle>Limited access</AlertTitle>
        <AlertDescription>
          Only ADMIN, SUPER_ADMIN, and MANAGER can update projects.
        </AlertDescription>
      </Alert>
    );
  }

  if (projectQuery.isLoading) return <p>Loading project...</p>;
  if (projectQuery.error || !projectQuery.data?.data)
    return <p className="text-destructive">Project not found.</p>;

  const project = projectQuery.data.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Edit Project</h1>
        <p className="text-muted-foreground mt-1">
          Update project details and lifecycle status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Form</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            initialValues={{
              name: project.name,
              description: project.description || "",
              status: project.status,
            }}
            isSubmitting={updateProject.isPending}
            onSubmit={async (values: ProjectFormValues) => {
              try {
                await updateProject.mutateAsync({
                  id,
                  data: {
                    name: values.name,
                    description: values.description || undefined,
                    status: values.status,
                  },
                });
                toast.success("Project updated");
                router.push(`/projects/${id}`);
              } catch {
                toast.error("Failed to update project");
              }
            }}
            submitLabel="Update Project"
          />
        </CardContent>
      </Card>
    </div>
  );
}

