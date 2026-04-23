"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ProjectForm } from "@/features/projects/components/project-form";
import {
  useProjectQuery,
  useUpdateProjectMutation,
} from "@/features/projects/hooks/use-projects-query";
import { ProjectFormValues } from "@/features/projects/schemas/project.schema";
import { projectResourcesApi } from "@/features/projects/api/project-resources.api";

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
      <div className="max-w-xl mx-auto mt-20">
        <Alert variant="destructive" className="rounded-3xl border-destructive/20 bg-destructive/5 p-6">
          <AlertTitle className="text-lg font-bold">Access Denied</AlertTitle>
          <AlertDescription className="text-sm opacity-90 mt-1">
            You don't have the necessary permissions to edit projects.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (projectQuery.isLoading) return <p>Loading project...</p>;
  if (projectQuery.error || !projectQuery.data?.data)
    return <p className="text-destructive">Project not found.</p>;

  const project = projectQuery.data.data;

  return (
    <div className="min-h-[calc(100vh-80px)] py-6 md:py-0 flex items-start md:items-center justify-center animate-in fade-in zoom-in-95 duration-500 px-4">
      <div className="w-full max-w-6xl rounded-[32px] border border-border/40 bg-card/30 backdrop-blur-md p-4 md:p-6 shadow-2xl shadow-primary/5">
        <div className="mb-6 md:mb-8 px-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight">Edit Project</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Update project metadata and access permissions.
          </p>
        </div>

        <ProjectForm
          initialValues={{
            name: project.name,
            description: project.description || "",
            status: project.status,
            visibility: project.visibility,
            techStack: project.techStack,
            startDate: project.startDate ? new Date(project.startDate) : null,
            endDate: project.endDate ? new Date(project.endDate) : null,
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
                  visibility: values.visibility,
                  techStack: values.techStack,
                  startDate: values.startDate instanceof Date ? values.startDate.toISOString() : undefined,
                  endDate: values.endDate instanceof Date ? values.endDate.toISOString() : undefined,
                },
              });

              // Handle resource creation if any were added
              if (values.resources && values.resources.length > 0) {
                await Promise.all(
                  values.resources.map((res) => {
                    const { id: _, ...resData } = res as any;
                    return projectResourcesApi.createResource(id, resData);
                  })
                );
              }

              toast.success("Project updated successfully");
              router.push(`/projects/${id}`);
            } catch (err: any) {
              const message = err?.response?.data?.message || "Failed to update project.";
              toast.error(message);
            }
          }}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}

