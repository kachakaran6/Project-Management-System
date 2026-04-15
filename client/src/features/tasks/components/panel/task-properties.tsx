"use client";

import React from "react";
import { Task, TaskPriority, TaskStatus } from "@/types/task.types";
import { 
  Calendar, 
  Flag, 
  User, 
  CircleDot, 
  Tag as TagIcon,
} from "lucide-react";
import { useUpdateTaskMutation } from "@/features/tasks/hooks/use-tasks-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { Separator } from "@/components/ui/separator";
import { EditableSelect } from "@/components/editable/EditableSelect";
import { EditableUserSelect } from "@/components/editable/EditableUserSelect";
import { EditableDate } from "@/components/editable/EditableDate";
import { EditableTags } from "@/components/editable/EditableTags";

interface TaskPropertiesProps {
  task: Task;
}

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-400" },
  { value: "MEDIUM", label: "Medium", color: "bg-[#0D6EFD]" },
  { value: "HIGH", label: "High", color: "bg-[#FFC107]" },
  { value: "URGENT", label: "Urgent", color: "bg-[#DC3545]" },
];

const STATUSES = [
  { value: "BACKLOG", label: "Backlog", color: "bg-slate-400" },
  { value: "TODO", label: "To Do", color: "bg-slate-500" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-[#0D6EFD]" },
  { value: "IN_REVIEW", label: "In Review", color: "bg-[#FFC107]" },
  { value: "DONE", label: "Done", color: "bg-[#198754]" },
];

export function TaskProperties({ task }: TaskPropertiesProps) {
  const { activeOrgId } = useAuth();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");
  const updateTaskMutation = useUpdateTaskMutation();

  const members = (membersQuery.data?.data.members ?? []).map(m => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName}`.trim(),
    email: m.email,
    avatarUrl: m.avatarUrl
  }));

  const handleUpdate = (data: Partial<Task>) => {
    updateTaskMutation.mutate({ id: task.id || (task as any)._id, data });
  };

  const currentAssignee = task.assigneeUsers?.[0] ? {
    id: task.assigneeUsers[0].id,
    name: task.assigneeUsers[0].name,
    email: task.assigneeUsers[0].email,
    avatarUrl: task.assigneeUsers[0].avatarUrl
  } : undefined;

  const isSaving = updateTaskMutation.isPending;

  return (
    <div className="py-6 space-y-3">
      {/* Status */}
      <div className="grid grid-cols-3 items-center group min-h-[40px]">
        <div className="flex items-center gap-2.5 text-[#6C757D] text-sm font-medium">
          <CircleDot className="size-4 opacity-70" />
          <span>Status</span>
        </div>
        <div className="col-span-2">
          <EditableSelect
            value={task.status}
            options={STATUSES}
            onChange={(status) => handleUpdate({ status: status as any })}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Priority */}
      <div className="grid grid-cols-3 items-center group min-h-[40px]">
        <div className="flex items-center gap-2.5 text-[#6C757D] text-sm font-medium">
          <Flag className="size-4 opacity-70" />
          <span>Priority</span>
        </div>
        <div className="col-span-2">
          <EditableSelect
            value={task.priority}
            options={PRIORITIES}
            onChange={(priority) => handleUpdate({ priority: priority as any })}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Assignee */}
      <div className="grid grid-cols-3 items-center group min-h-[40px]">
        <div className="flex items-center gap-2.5 text-[#6C757D] text-sm font-medium">
          <User className="size-4 opacity-70" />
          <span>Assignee</span>
        </div>
        <div className="col-span-2">
          <EditableUserSelect
            value={currentAssignee}
            options={members}
            onChange={(userId) => handleUpdate({ assigneeIds: userId ? [userId] : [] })}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Due Date */}
      <div className="grid grid-cols-3 items-center group min-h-[40px]">
        <div className="flex items-center gap-2.5 text-[#6C757D] text-sm font-medium">
          <Calendar className="size-4 opacity-70" />
          <span>Due date</span>
        </div>
        <div className="col-span-2">
          <EditableDate
            value={task.dueDate}
            onChange={(date) => handleUpdate({ dueDate: date })}
            isSaving={isSaving}
          />
        </div>
      </div>

      <Separator className="my-2 opacity-50" />

      {/* Tags */}
      <div className="grid grid-cols-3 items-start group min-h-[40px]">
        <div className="flex items-center gap-2.5 text-[#6C757D] text-sm font-medium mt-1.5">
          <TagIcon className="size-4 opacity-70" />
          <span>Tags</span>
        </div>
        <div className="col-span-2 px-1 py-1">
          <EditableTags
            tags={task.tags || []}
            onChange={(tags) => handleUpdate({ tags })}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
}
