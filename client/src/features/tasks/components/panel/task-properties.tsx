
import { Task, UpdateTaskInput } from "@/types/task.types";
import { 
  Calendar, 
  Flag, 
  User, 
  CircleDot, 
  Tag as TagIcon,
} from "lucide-react";
import { useStatusesQuery } from "@/features/status/hooks/use-statuses";
import { useUpdateTaskMutation } from "@/features/tasks/hooks/use-tasks-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useOrganizationMembersQuery } from "@/features/organization/hooks/use-organization-members";
import { Separator } from "@/components/ui/separator";
import { EditableSelect } from "@/components/editable/EditableSelect";
import { EditableMultiUserSelect } from "@/components/editable/EditableMultiUserSelect";
import { EditableDate } from "@/components/editable/EditableDate";
import { TagSelect } from "@/features/tags/components/tag-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskPropertiesProps {
  task: Task;
}

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-400" },
  { value: "MEDIUM", label: "Medium", color: "bg-[#0D6EFD]" },
  { value: "HIGH", label: "High", color: "bg-[#FFC107]" },
  { value: "URGENT", label: "Urgent", color: "bg-[#DC3545]" },
];

export function TaskProperties({ task }: TaskPropertiesProps) {
  const { activeOrgId } = useAuth();
  const membersQuery = useOrganizationMembersQuery(activeOrgId || "");
  const statusesQuery = useStatusesQuery();
  const updateTaskMutation = useUpdateTaskMutation();

  const members = (membersQuery.data?.data.members ?? []).map(m => ({
    id: m.id,
    name: `${m.firstName} ${m.lastName}`.trim(),
    email: m.email,
    avatarUrl: m.avatarUrl
  }));

  const dynamicStatuses = (statusesQuery.data ?? []).map((s: any) => ({
    value: s.id || s._id,
    label: s.name,
    color: s.color, // We'll handle hex in EditableSelect or here
    isHex: true
  }));

  const getStatusId = (status: any) => {
    if (!status) return "";
    const id = (status && typeof status === 'object') ? (status.id || status._id) : String(status);
    
    // If the ID exists in our dynamic statuses, return it
    if (dynamicStatuses.some(s => s.value === id)) return id;
    
    // FALLBACK: If it's a legacy string (e.g. "IN_PROGRESS" or "In_review")
    // try to match by name normalization
    const normalizedId = String(id).toLowerCase().replace(/[\s_-]/g, "");
    const match = (statusesQuery.data ?? []).find((s: any) => 
      s.name.toLowerCase().replace(/[\s_-]/g, "") === normalizedId
    );
    
    return match ? (match.id || match._id) : id;
  };

  const handleUpdate = (data: UpdateTaskInput) => {
    updateTaskMutation.mutate({ id: task.id || (task as any)._id, data });
  };

  const currentAssignees = (task.assigneeUsers || []).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl
  }));

  const isSaving = updateTaskMutation.isPending;

  return (
    <div className="py-4 md:py-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 md:gap-y-6">
      {/* Status */}
      <div className="grid grid-cols-[110px_1fr] items-center group min-h-9">
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
          <CircleDot className="size-3.5 opacity-70" />
          <span>Status</span>
        </div>
        <div className="flex justify-start">
          <EditableSelect
            value={getStatusId(task.status)}
            options={dynamicStatuses}
            onChange={(status) => handleUpdate({ status: status as any })}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Priority */}
      <div className="grid grid-cols-[110px_1fr] items-center group min-h-9">
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
          <Flag className="size-3.5 opacity-70" />
          <span>Priority</span>
        </div>
        <div className="flex justify-start">
          <EditableSelect
            value={task.priority}
            options={PRIORITIES}
            onChange={(priority) => handleUpdate({ priority: priority as any })}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Due Date */}
      <div className="grid grid-cols-[110px_1fr] items-center group min-h-9">
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
          <Calendar className="size-3.5 opacity-70" />
          <span>Due Date</span>
        </div>
        <div className="flex justify-start">
          <EditableDate
            value={task.dueDate}
            onChange={(date) => handleUpdate({ dueDate: date })}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Assignees */}
      <div className="grid grid-cols-[110px_1fr] items-center group min-h-9">
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
          <User className="size-3.5 opacity-70" />
          <span>Assignees</span>
        </div>
        <div className="flex justify-start">
          <EditableMultiUserSelect
            value={currentAssignees}
            options={members}
            onChange={(userIds) => handleUpdate({ assigneeIds: userIds })}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Created by */}
      {(() => {
        const creatorData = (task as any).creator || (task as any).createdBy || (task as any).created_by || (task as any).creatorId;
        const creatorMember = typeof creatorData === 'string'
          ? members.find((member) => String(member.id) === String(creatorData))
          : null;
        const creatorInfo = creatorData && typeof creatorData === 'object' ? {
          name: (creatorData as any).name || ((creatorData as any).firstName ? `${(creatorData as any).firstName} ${(creatorData as any).lastName || ''}`.trim() : 'Unknown creator'),
          email: (creatorData as any).email || '',
          avatarUrl: (creatorData as any).avatarUrl
        } : creatorMember ? {
          name: creatorMember.name,
          email: creatorMember.email,
          avatarUrl: creatorMember.avatarUrl
        } : {
          name: typeof creatorData === 'string' ? `Creator ID: ${creatorData}` : 'Unknown creator',
          email: '',
          avatarUrl: undefined
        };

        return (
          <div className="grid grid-cols-[110px_1fr] items-center group min-h-9">
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest">
              <User className="size-3.5 opacity-70" />
              <span>Created By</span>
            </div>
            <div>
              <div className="flex items-center gap-2 rounded-button border border-border/10 bg-muted/5 px-2 py-1 transition-colors cursor-default max-w-fit">
                <Avatar className="h-5.5 w-5.5 ring-1 ring-border/10">
                  <AvatarImage src={creatorInfo.avatarUrl} alt={creatorInfo.name} />
                  <AvatarFallback className="text-[9px] bg-muted/50 text-muted-foreground font-bold uppercase">
                    {creatorInfo.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-foreground/90 leading-tight">
                    {creatorInfo.name}
                  </span>
                  {creatorInfo.email ? (
                    <span className="text-[8px] text-muted-foreground/60 truncate max-w-[110px] leading-none">
                      {creatorInfo.email}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tags */}
      <div className="grid grid-cols-[110px_1fr] items-center group min-h-9">
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest h-9">
          <TagIcon className="size-3.5 opacity-70" />
          <span>Tags</span>
        </div>
        <div>
          <TagSelect
            selectedTagIds={(task.tags || []).map((t: any) => typeof t === 'string' ? t : t.id)}
            onChange={(tagIds) => handleUpdate({ tags: tagIds })}
          />
        </div>
      </div>
    </div>
  );
}
