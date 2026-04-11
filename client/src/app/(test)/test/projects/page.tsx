"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateProjectMutation,
  useProjectsQuery,
} from "@/features/projects/hooks/use-projects-query";

export default function TestProjectsPage() {
  const projectsQuery = useProjectsQuery({ page: 1, limit: 50 });
  const createProjectMutation = useCreateProjectMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-heading text-3xl font-semibold">
        Projects Integration Test
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="project-name" label="Name">
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField id="project-description" label="Description">
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
          <Button
            loading={createProjectMutation.isPending}
            disabled={!name}
            onClick={async () => {
              await createProjectMutation.mutateAsync({
                name,
                description: description || undefined,
              });
              setName("");
              setDescription("");
            }}
          >
            6. Create Project
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Fetch Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={() => projectsQuery.refetch()}
            loading={projectsQuery.isFetching}
          >
            Reload Projects
          </Button>
          {projectsQuery.error ? (
            <p className="text-destructive">{String(projectsQuery.error)}</p>
          ) : null}
          {projectsQuery.isLoading ? <p>Loading projects...</p> : null}
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(projectsQuery.data?.data ?? null, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
