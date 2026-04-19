/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {useEffect, useState} from "react";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm, Controller} from "react-hook-form";
import {
  X,
  Calendar as CalendarIcon,
  UserPlus,
  Flag,
  CircleDot,
  Layout,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Hash,
  PlusCircle,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  TaskFormValues,
  taskFormSchema,
} from "@/features/tasks/schemas/task.schema";
import {MultiUserSelect} from "@/features/team/components/multi-user-select";
import {TaskDescriptionEditor} from "./task-description-editor";
import {useAuthStore} from "@/store/auth-store";
import {cn} from "@/lib/utils";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";

interface ProjectOption {
  id: string;
  name: string;
}

interface TaskFormProps {
  projects: ProjectOption[];
  initialValues?: Partial<TaskFormValues>;
  onSubmit: (
    values: TaskFormValues,
    createMore?: boolean,
  ) => Promise<void> | void;
  onCancel?: () => void;
  onCreated?: () => void;
  isSuccess: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  title?: string;
  subtitle?: string;
}

const statusConfig: Record<string, {icon: any; color: string}> = {
  BACKLOG: {icon: Clock, color: "text-muted-foreground"},
  TODO: {icon: CircleDot, color: "text-blue-500"},
  IN_PROGRESS: {icon: AlertCircle, color: "text-yellow-500"},
  IN_REVIEW: {icon: AlertCircle, color: "text-purple-500"},
  DONE: {icon: CheckCircle2, color: "text-green-500"},
  ARCHIVED: {icon: X, color: "text-red-500"},
};

const priorityConfig: Record<string, {color: string}> = {
  LOW: {color: "text-blue-400"},
  MEDIUM: {color: "text-yellow-400"},
  HIGH: {color: "text-orange-400"},
  URGENT: {color: "text-red-500"},
};

export function TaskForm({
  projects,
  initialValues,
  onSubmit,
  onCancel,
  isSuccess,
  isSubmitting = false,
  submitLabel = "Save",
  title = "Create new work item",
  subtitle,
}: TaskFormProps) {
  const {user} = useAuthStore();
  const [createMore, setCreateMore] = useState(false);
  const [newTag, setNewTag] = useState("");

  const currentRole = user?.role || "MEMBER";
  const isMemberOnlySelection = currentRole === "MEMBER";

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      status: initialValues?.status ?? "TODO",
      priority: initialValues?.priority ?? "MEDIUM",
      projectId: initialValues?.projectId ?? "",
      assigneeIds:
        initialValues?.assigneeIds && initialValues.assigneeIds.length > 0
          ? initialValues.assigneeIds
          : isMemberOnlySelection && user?.id
            ? [user.id]
            : [],
      dueDate: initialValues?.dueDate ?? "",
      tags: initialValues?.tags ?? [],
    },
  });

  const statusValue = form.watch("status");
  const priorityValue = form.watch("priority");
  const projectIdValue = form.watch("projectId");
  const assigneeIdsValue = form.watch("assigneeIds") || [];
  const dueDateValue = form.watch("dueDate");
  const tagsValue = form.watch("tags") || [];
  const currentProject = projects.find((p) => p.id === projectIdValue);
  const StatusIcon = statusConfig[statusValue]?.icon || CircleDot;

  useEffect(() => {
    if (isSuccess) {
      form.reset({
        projectId: projectIdValue ?? "",
        status: statusValue ?? "TODO",
        priority: priorityValue ?? "MEDIUM",
      });
    }
  }, [isSuccess])
  


  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      form.handleSubmit((values) => onSubmit(values, createMore))();
    }
  };



  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !tagsValue.includes(tag)) {
      form.setValue("tags", [...tagsValue, tag]);
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    form.setValue(
      "tags",
      tagsValue.filter((t) => t !== tag),
    );
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden rounded-[inherit] border border-border shadow-2xl">
      {/* Header Area */}
      <div className="pt-6 pb-2 px-6 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground/60 leading-none">
                {subtitle}
              </p>
            )}
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8 rounded-full text-muted-foreground/50 hover:text-foreground transition-all">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Project Pill Select */}
        <div className="flex flex-col">
          <Select
            value={projectIdValue}
            onValueChange={(v) =>
              form.setValue("projectId", v, {shouldValidate: true})
            }
            >
            <SelectTrigger className="px-3 bg-muted/20 border-border/30 text-[11px] font-bold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all ring-0 focus:ring-0">
              <div className="flex items-center gap-1.5">
                <Layout className="h-3 w-3 opacity-60" />
                <span>{currentProject?.name || "Select Project"}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50 w-80">
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="w-80">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.projectId && (
            <p className="text-[11px] font-semibold text-destructive ml-1">
              {form.formState.errors.projectId.message}
            </p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar">
        {/* Professional Title Input */}
        <div className="space-y-1">
          <Controller
          name="title"
          control={form.control}
          render={({field}) => (
            <Input
              id="title"
              {...field}
              onKeyDown={handleTitleKeyDown}
              placeholder="What needs to be done?"
              className={cn(
                "h-12 px-4 text-lg font-medium bg-muted/10 border border-border/20 rounded-xl transition-all duration-200",
                "placeholder:text-muted-foreground/30 focus:border-primary/40 focus:ring-4 focus:ring-primary/5 focus:bg-background",
                form.formState.errors.title &&
                  "border-destructive/40 focus:border-destructive/40 focus:ring-destructive/5",
              )}
              autoFocus
            />
          )}
          />
          {form.formState.errors.title && (
            <p className="text-[11px] font-semibold text-destructive ml-1">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        {/* Professional Description Area */}
        <Controller
          name="description"
          control={form.control}
          render={({field}) => (
            <TaskDescriptionEditor
              value={field.value || ""}
              onChange={field.onChange}
              placeholder="Click to add description..."
              alwaysEditing={true}
              className="min-h-[160px]"
            />
          )}
        />
      </div>

      {/* Metadata Action Bar */}
      <div className="px-6 py-4 shrink-0 overflow-x-auto no-scrollbar border-t border-border/20 bg-muted/5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Select */}
          <Select
            value={statusValue}
            onValueChange={(v) => form.setValue("status", v as any)}>
            <SelectTrigger className="w-auto h-8 px-3 bg-background border border-border/40 rounded-full text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all focus:ring-0">
              <div className="flex items-center gap-2">
                <StatusIcon
                  className={cn(
                    "h-3.5 w-3.5",
                    statusConfig[statusValue]?.color,
                  )}
                />
                <span className="capitalize">
                  {statusValue.toLowerCase().replace("_", " ")}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/30">
              {Object.keys(statusConfig).map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-xs uppercase focus:bg-primary/10">
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Select */}
          <Select
            value={priorityValue}
            onValueChange={(v) => form.setValue("priority", v as any)}>
            <SelectTrigger className="w-auto h-8 px-3 bg-background border border-border/40 rounded-full text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all focus:ring-0">
              <div className="flex items-center gap-2">
                <Flag
                  className={cn(
                    "h-3.5 w-3.5",
                    priorityConfig[priorityValue]?.color,
                  )}
                />
                <span className="capitalize">
                  {priorityValue.toLowerCase()}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/30">
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                <SelectItem
                  key={p}
                  value={p}
                  className="text-xs focus:bg-primary/10">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assignees Selector */}
          <div className="flex-shrink-0">
            <Controller
              name="assigneeIds"
              control={form.control}
              render={({field}) => (
                <MultiUserSelect
                  value={field.value || []}
                  onChange={field.onChange}
                  trigger={
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-2 h-8 px-3 bg-background border border-border/40 rounded-full text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
                        assigneeIdsValue.length > 0 &&
                          "border-primary/30 bg-primary/5 text-primary",
                      )}>
                      <UserPlus className="h-3.5 w-3.5 opacity-70" />
                      <span>
                        {assigneeIdsValue.length > 0
                          ? `${assigneeIdsValue.length} Assignee${assigneeIdsValue.length > 1 ? "s" : ""}`
                          : "Assignees"}
                      </span>
                    </button>
                  }
                  hideDefaultTrigger={true}
                  placeholder="Assignees"
                  disabled={isMemberOnlySelection}
                />
              )}
            />
          </div>

          {/* Due Date - Native Picker Fix */}
          <div className="relative group">
            <input
              type="date"
              id="date-input"
              {...form.register("dueDate")}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              onFocus={(e) => (e.target as any).showPicker?.()}
            />
            <div
              className={cn(
                "inline-flex items-center gap-2 h-8 px-3 bg-background border border-border/40 rounded-full text-[13px] text-muted-foreground transition-all",
                dueDateValue
                  ? "text-primary border-primary/30 bg-primary/5"
                  : "hover:bg-muted",
              )}>
              <CalendarIcon className="h-3.5 w-3.5 opacity-70" />
              <span>{dueDateValue || "Due date"}</span>
            </div>
          </div>

          {/* Labels / Tags - Functional Implementation */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 h-8 px-3 bg-background border border-border/40 rounded-full text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
                  tagsValue.length > 0 &&
                    "border-primary/30 bg-primary/5 text-primary",
                )}>
                <Hash className="h-3.5 w-3.5 opacity-70" />
                <span>
                  {tagsValue.length > 0
                    ? `${tagsValue.length} Tags`
                    : "Tags"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 bg-background border-border/50 shadow-2xl rounded-2xl">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add tag..."
                    className="h-8 text-xs bg-muted/20 border-border/30 rounded-lg"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg"
                    onClick={addTag}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>

                {tagsValue.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                    {tagsValue.map((tag) => (
                      <Badge
                        key={typeof tag === 'string' ? tag : Math.random()}
                        variant="secondary"
                        className="pl-2 pr-1 py-0.5 text-[10px] font-bold rounded-md bg-primary/10 text-primary border-none flex items-center gap-1">
                        {String(tag)}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-foreground transition-colors p-0.5">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {tagsValue.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-2">
                    No tags added yet.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Footer Area */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-background border-t border-border/10">
        <div className="flex items-center gap-2">
          <Switch
            id="create-more"
            checked={createMore}
            onCheckedChange={setCreateMore}
            className="data-[state=checked]:bg-primary"
          />
          <Label
            htmlFor="create-more"
            className="text-xs text-muted-foreground/50 cursor-pointer select-none hover:text-muted-foreground transition-colors">
            Create more
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 px-5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
            Discard
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit((values) =>
              onSubmit(values, createMore),
            )}
            disabled={isSubmitting}
            className="h-9 px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm">
            {isSubmitting ? "Saving..." : submitLabel}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* Fix for native date picker appearing behind modal */
        #date-input::-webkit-calendar-picker-indicator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
