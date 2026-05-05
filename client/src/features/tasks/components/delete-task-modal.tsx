import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isPending: boolean;
  taskTitle?: string;
}

export function DeleteTaskModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  taskTitle,
}: DeleteTaskModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl bg-background">
        <div className="bg-destructive/5 pt-8 pb-6 px-6 flex flex-col items-center text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center text-destructive animate-in zoom-in duration-300">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Delete Task
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-muted-foreground leading-relaxed max-w-[320px]">
              Are you sure you want to delete
              {taskTitle ? (
                <span className="font-bold text-foreground mx-1 italic underline decoration-destructive/30 decoration-2 underline-offset-2 uppercase tracking-tight px-1">
                  &quot;{taskTitle}&quot;
                </span>
              ) : (
                " this task"
              )}?
              This action is permanent and cannot be undone.
            </AlertDialogDescription>
          </div>
        </div>

        <AlertDialogFooter className="bg-muted/30 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 border-t border-border/20">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              disabled={isPending}
              className="flex-1 font-medium bg-background border-border/50 hover:bg-muted hover:text-foreground transition-all rounded-md h-10"
            >
              Cancel
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="flex-1 font-bold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-md h-10"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Confirm Delete
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
