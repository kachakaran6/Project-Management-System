"use client";

import React from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTaskPanelStore } from "@/features/tasks/store/task-panel-store";
import { useTaskQuery } from "@/features/tasks/hooks/use-tasks-query";
import { TaskHeader } from "./task-header";
import { TaskProperties } from "./task-properties";
import { TaskDescription } from "./task-description";
import { TaskComments } from "./task-comments";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

export function TaskSidePanel() {
  const { isOpen, closePanel, openPanel, selectedTaskId } = useTaskPanelStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Sync state from URL on mount or URL change
  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (taskId && taskId !== selectedTaskId) {
      openPanel(taskId);
    } else if (!taskId && isOpen) {
      closePanel();
    }
  }, [searchParams]);

  // Sync URL from state when panel opens/closes
  const handleOpenChange = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (open) {
      if (selectedTaskId) params.set("taskId", selectedTaskId);
    } else {
      params.delete("taskId");
      closePanel();
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { data, isLoading, error } = useTaskQuery(selectedTaskId || "", isOpen);

  const task = data?.data;

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent 
        side="right" 
        hideClose={true}
        className="size-full p-0 sm:max-w-[50vw] xl:max-w-[40vw] border-l shadow-2xl bg-background flex flex-col focus:outline-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Task Side Panel</SheetTitle>
        </SheetHeader>

        {/* Header container for close button and actions */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b bg-muted/5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-background">Task Details</Badge>
          </div>
          <button 
            onClick={closePanel}
            className="p-2 hover:bg-accent rounded-full transition-all text-muted-foreground hover:text-foreground group"
          >
            <X className="size-4.5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-4 sm:p-8 space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="pt-8 space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <div className="flex gap-4">
                   <Skeleton className="h-10 flex-1" />
                   <Skeleton className="h-10 flex-1" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 sm:p-12 text-center space-y-4">
              <div className="inline-flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <X className="size-6" />
              </div>
              <h3 className="text-lg font-semibold">Failed to load task</h3>
              <p className="text-sm text-muted-foreground">This task might have been deleted or you don't have permission to view it.</p>
              <button 
                onClick={closePanel}
                className="text-primary text-sm font-medium hover:underline"
              >
                Go back
              </button>
            </div>
          ) : task ? (
            <div className="h-full overflow-y-auto px-4 sm:px-8 py-6 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-2">
                <TaskHeader task={task} />
                <TaskProperties task={task} />
                <TaskDescription task={task} />
                <div className="border-t pt-2" />
                <TaskComments taskId={task.id || (task as any)._id} />
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
