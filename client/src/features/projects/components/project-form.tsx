"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarDays, AlignLeft, Tag } from "lucide-react";

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
  ProjectFormValues,
  projectFormSchema,
} from "@/features/projects/schemas/project.schema";

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned", color: "#6366f1" },
  { value: "ACTIVE", label: "Active", color: "#0D6EFD" },
  { value: "ON_HOLD", label: "On Hold", color: "#f59e0b" },
  { value: "COMPLETED", label: "Completed", color: "#10b981" },
  { value: "ARCHIVED", label: "Archived", color: "#9ca3af" },
] as const;

interface ProjectFormProps {
  initialValues?: Partial<ProjectFormValues>;
  onSubmit: (values: ProjectFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function ProjectForm({
  initialValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save Project",
}: ProjectFormProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      status: initialValues?.status ?? "PLANNED",
      startDate: initialValues?.startDate ?? "",
      endDate: initialValues?.endDate ?? "",
    },
  });

  const currentStatus = form.watch("status");

  return (
    <form
      className="space-y-5"
      onSubmit={form.handleSubmit(async (values) => onSubmit(values))}
    >
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="project-name" className="text-sm font-semibold">
          Project Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="project-name"
          {...form.register("name")}
          placeholder="e.g. Platform Migration Q2"
          className="h-10"
        />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="project-desc" className="flex items-center gap-1.5 text-sm font-semibold">
          <AlignLeft className="size-3.5 text-muted-foreground" />
          Description
        </Label>
        <Textarea
          id="project-desc"
          rows={3}
          {...form.register("description")}
          placeholder="Describe the scope, goals, and expected outcomes…"
          className="resize-none"
        />
        {form.formState.errors.description && (
          <p className="text-xs text-destructive">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <Tag className="size-3.5 text-muted-foreground" />
          Status <span className="text-destructive">*</span>
        </Label>
        <Select
          value={currentStatus}
          onValueChange={(val) =>
            form.setValue("status", val as ProjectFormValues["status"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select a status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: opt.color }}
                  />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="project-start" className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            Start Date
          </Label>
          <Input
            id="project-start"
            type="date"
            {...form.register("startDate")}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project-end" className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            End Date
          </Label>
          <Input
            id="project-end"
            type="date"
            {...form.register("endDate")}
            className="h-10"
          />
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          size="md"
          className="w-full"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
