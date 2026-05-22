
import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Task } from "@/types/task.types";
import { ProjectTaskCard } from "./project-task-card";
import { cn } from "@/lib/utils";

interface ProjectTaskColumnProps {
  id: string;
  title: string;
  count: number;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  canEdit: boolean;
}

export function ProjectTaskColumn({ id, title, count, tasks, onTaskClick, canEdit }: ProjectTaskColumnProps) {
  return (
    <div className="flex flex-col gap-3 w-[280px] shrink-0 h-full">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {title}
          <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/60">
            {count}
          </span>
        </h3>
      </div>

      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar pb-20 transition-colors rounded-card",
              snapshot.isDraggingOver ? "bg-primary/5 ring-1 ring-primary/10" : ""
            )}
          >
            {tasks.map((task, index) => (
              <ProjectTaskCard 
                key={task.id} 
                task={task} 
                index={index}
                onClick={onTaskClick} 
                canEdit={canEdit}
              />
            ))}
            {provided.placeholder}
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-24 rounded-card border border-dashed border-border/10 flex items-center justify-center">
                <span className="text-[10px] font-medium text-muted-foreground/30 uppercase tracking-widest">
                  No tasks
                </span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
