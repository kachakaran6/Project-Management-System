import * as React from "react";
import { getPriorityAppearance, SemanticTone } from "./status-resolver";
import { cn } from "@/lib/utils";

interface PriorityIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const toneColorMap: Record<SemanticTone, string> = {
  neutral: "text-muted-foreground bg-muted/50 border-border/60",
  info: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  danger: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export function PriorityIndicator({
  priority,
  showLabel = true,
  size = "md",
  className,
  ...props
}: PriorityIndicatorProps) {
  const { label, tone, icon: Icon } = getPriorityAppearance(priority);
  const colorClasses = toneColorMap[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium transition-colors select-none",
        size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
        colorClasses,
        className
      )}
      {...props}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "size-3" : "size-3.5")} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
