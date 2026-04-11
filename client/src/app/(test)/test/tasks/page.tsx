"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjectsQuery } from "@/features/projects/hooks/use-projects-query";
import {
  useCreateTaskMutation,
  useTasksQuery,
} from "@/features/tasks/hooks/use-tasks-query";

export default function TestTasksPage() {
  const projectsQuery = useProjectsQuery({ page: 1, limit: 50 });
  const tasksQuery = useTasksQuery({ page: 1, limit: 50 });
  const createTaskMutation = useCreateTaskMutation();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="font-heading text-3xl font-semibold">
        Tasks Integration Test
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField id="task-title" label="Title">
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>

          <FormField id="task-project" label="Project">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="task-project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {(projectsQuery.data?.data.items ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <Button
            loading={createTaskMutation.isPending}
            disabled={!title || !projectId}
            onClick={async () => {
              await createTaskMutation.mutateAsync({ title, projectId });
              setTitle("");
            }}
          >
            8. Create Task
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Fetch Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={() => tasksQuery.refetch()}
            loading={tasksQuery.isFetching}
          >
            Reload Tasks
          </Button>
          {tasksQuery.error ? (
            <p className="text-destructive">{String(tasksQuery.error)}</p>
          ) : null}
          {tasksQuery.isLoading ? <p>Loading tasks...</p> : null}
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(tasksQuery.data?.data ?? null, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
