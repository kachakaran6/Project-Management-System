/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TaskFormValues,
  taskFormSchema,
} from "@/features/tasks/schemas/task.schema";
import { MultiUserSelect } from "@/features/team/components/multi-user-select";

interface ProjectOption {
  id: string;
  name: string;
}

interface TaskFormProps {
  projects: ProjectOption[];
  initialValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function TaskForm({
  projects,
  initialValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save Task",
}: TaskFormProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      status: initialValues?.status ?? "TODO",
      priority: initialValues?.priority ?? "MEDIUM",
      projectId: initialValues?.projectId ?? "",
      assigneeIds: initialValues?.assigneeIds ?? [],
      dueDate: initialValues?.dueDate ?? "",
    },
  });

  // Reset form when initialValues change (critical for edit modal)
  React.useEffect(() => {
    if (initialValues) {
      form.reset({
        title: initialValues.title ?? "",
        description: initialValues.description ?? "",
        status: initialValues.status ?? "TODO",
        priority: initialValues.priority ?? "MEDIUM",
        projectId: initialValues.projectId ?? "",
        assigneeIds: initialValues.assigneeIds ?? [],
        dueDate: initialValues.dueDate ?? "",
      });
    }
  }, [initialValues, form]);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => onSubmit(values))}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...form.register("title")}
          placeholder="Ship admin audit logs"
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          {...form.register("description")}
          placeholder="Implementation details"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Project</Label>
          <Select
            value={form.watch("projectId")}
            onValueChange={(value) =>
              form.setValue("projectId", value || "", { shouldValidate: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.projectId ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.projectId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) =>
              form.setValue("status", value as TaskFormValues["status"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Task status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BACKLOG">Backlog</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={form.watch("priority")}
            onValueChange={(value) =>
              form.setValue("priority", value as TaskFormValues["priority"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" {...form.register("dueDate")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assignees</Label>
        <MultiUserSelect
          value={form.watch("assigneeIds") || []}
          onChange={(userIds) =>
            form.setValue("assigneeIds", userIds, { shouldDirty: true })
          }
          placeholder="Select team members"
          prefilledUsers={(initialValues as any)?.assigneeUsers}
        />
        {form.formState.errors.assigneeIds ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.assigneeIds.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
