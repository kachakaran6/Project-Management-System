
import React from "react";
import { format } from "date-fns";
import { Calendar, Paperclip, Users } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Task } from "@/types/task.types";
import { cn } from "@/lib/utils";

interface ProjectTaskCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
  canEdit: boolean;
  isDraggable?: boolean;
}

export function ProjectTaskCard({ task, index, onClick, canEdit, isDraggable = true }: ProjectTaskCardProps) {
  const assignees = task.assigneeUsers || [];
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const taskId = String(task.id || (task as any)._id);

  const createdByUser = (task as any).creatorUser ?? (task as any).createdBy ?? (task as any).creator ?? (task as any).created_by;
  const createdByName = createdByUser?.firstName
    ? `${createdByUser.firstName} ${createdByUser.lastName}`.trim()
    : createdByUser?.name || "System";
  const createdByEmail = createdByUser?.email || "";

  const renderContent = (provided?: any, snapshot?: any) => (
    <div 
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      onClick={() => onClick(task)}
      className={cn(
        "group flex flex-col gap-2.5 p-3 rounded-xl border bg-card transition-all cursor-pointer",
        snapshot?.isDragging 
          ? "border-primary shadow-xl ring-2 ring-primary/20 scale-[1.02] z-50" 
          : "border-border/10 hover:border-primary/20 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground leading-tight line-clamp-2">
          {task.title}
        </h4>
        <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
          {task.taskCode || (task as any).code || `T-${taskId.slice(-4).toUpperCase()}`}
        </span>
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className="h-4 px-1.5 rounded-full text-[9px] font-medium uppercase tracking-wider border-primary/20 bg-primary/5 text-primary"
          >
            {task.priority?.toLowerCase() || "medium"}
          </Badge>
          
          {dueDate && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-medium",
              new Date(dueDate) < new Date() && task.status !== "DONE" ? "text-rose-500" : "text-muted-foreground"
            )}>
              <Calendar className="size-3" />
              <span>{format(dueDate, "MMM d")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(task.attachments?.length > 0 || (task as any).files?.length > 0) && (
             <Paperclip className="size-3 text-muted-foreground/30" />
          )}
          
          {/* CREATOR TOOLTIP */}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div className="shrink-0 cursor-help">
                  <Avatar className="size-5 rounded-full border border-border/20 shadow-sm opacity-60 hover:opacity-100 transition-opacity ring-2 ring-background">
                    <AvatarImage src={createdByUser?.avatarUrl} alt={createdByName} />
                    <AvatarFallback className="text-[7px] bg-muted text-muted-foreground font-bold">
                      {createdByName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex flex-col gap-0.5 p-2 rounded-lg border-border/10 bg-card/95 backdrop-blur-md shadow-xl z-[100]">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">Created By</span>
                <span className="text-xs font-semibold">{createdByName}</span>
                {createdByEmail && <span className="text-[10px] text-muted-foreground font-medium">{createdByEmail}</span>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* ASSIGNEE STACK */}
          <div className="flex items-center -space-x-2">
            {assignees.slice(0, 2).map((a, idx) => (
              <TooltipProvider key={a.id || idx}>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Avatar className="size-5 border border-background ring-1 ring-border/10 rounded-full shadow-sm hover:z-10 transition-transform hover:scale-110">
                      <AvatarImage src={a.avatarUrl} />
                      <AvatarFallback className="text-[7px] font-bold bg-primary/10 text-primary uppercase flex items-center justify-center">
                        {a.firstName?.[0] || a.name?.[0] || <Users className="size-2.5" />}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="p-2 rounded-lg bg-card/95 backdrop-blur-md border border-border/10">
                     <p className="text-[10px] font-bold">{a.firstName} {a.lastName}</p>
                     <p className="text-[9px] text-muted-foreground">{a.email}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {assignees.length > 2 && (
              <div className="size-5 rounded-full bg-muted border border-background flex items-center justify-center text-[7px] font-black text-muted-foreground z-0 ring-1 ring-border/10">
                +{assignees.length - 2}
              </div>
            )}
            {assignees.length === 0 && (
               <div className="size-5 rounded-full border border-dashed border-border/20 flex items-center justify-center">
                  <Users className="size-2.5 text-muted-foreground/30" />
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!isDraggable) {
    return renderContent();
  }

  return (
    <Draggable draggableId={taskId} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => renderContent(provided, snapshot)}
    </Draggable>
  );
}
