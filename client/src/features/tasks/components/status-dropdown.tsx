"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateTaskStatusMutation } from "@/features/tasks/hooks/use-tasks-query";
import { TaskStatus } from "@/types/task.types";

// ─── Config ────────────────────────────────────────────────────────────────

const STATUSES: { value: TaskStatus; label: string; cls: string }[] = [
  { value: "BACKLOG",     label: "Backlog",     cls: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "TODO",        label: "To Do",       cls: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "IN_PROGRESS", label: "In Progress", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "IN_REVIEW",   label: "In Review",   cls: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "DONE",        label: "Done",        cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "REJECTED",    label: "Rejected",    cls: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: "ARCHIVED",    label: "Archived",    cls: "bg-slate-100 text-slate-500 border-slate-200" },
];

const statusMap = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

// ─── Component ─────────────────────────────────────────────────────────────

interface StatusDropdownProps {
  taskId: string;
  currentStatus: TaskStatus;
  disabled?: boolean;
}

export function StatusDropdown({ taskId, currentStatus, disabled }: StatusDropdownProps) {
  const [optimistic, setOptimistic] = useState<TaskStatus>(currentStatus);
  const changeStatus = useUpdateTaskStatusMutation();

  const current = statusMap[optimistic] ?? statusMap["TODO"];

  const handleSelect = async (newStatus: TaskStatus) => {
    if (newStatus === optimistic) return;
    const prev = optimistic;
    setOptimistic(newStatus); // optimistic update
    try {
      await changeStatus.mutateAsync({ id: taskId, status: newStatus });
      toast.success(`Status → ${statusMap[newStatus]?.label}`);
    } catch {
      setOptimistic(prev); // revert on error
      toast.error("Failed to update status.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || changeStatus.isPending}>
        <button
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 focus:outline-none ${current.cls}`}
        >
          {changeStatus.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : null}
          {current.label}
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Change Status
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onClick={() => handleSelect(s.value)}
            className={`text-xs ${optimistic === s.value ? "font-semibold" : ""}`}
          >
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                s.value === "TODO" || s.value === "BACKLOG"
                  ? "bg-slate-400"
                  : s.value === "IN_PROGRESS"
                  ? "bg-blue-500"
                  : s.value === "IN_REVIEW"
                  ? "bg-amber-500"
                  : s.value === "DONE"
                  ? "bg-emerald-500"
                  : s.value === "REJECTED"
                  ? "bg-rose-500"
                  : "bg-slate-300"
              }`}
            />
            {s.label}
            {optimistic === s.value && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
