import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { getStatusAppearance, SemanticTone } from "./status-resolver";
import { cn } from "@/lib/utils";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const toneVariantMap: Record<SemanticTone, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  neutral: "secondary",
  info: "default",
  success: "success",
  warning: "warning",
  danger: "destructive",
};

export function StatusBadge({
  status,
  showIcon = true,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  const { label, tone, icon: Icon } = getStatusAppearance(status);
  const variant = toneVariantMap[tone];

  return (
    <Badge
      variant={variant}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium capitalize transition-colors select-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
      {...props}
    >
      {showIcon && <Icon className={cn("shrink-0", size === "sm" ? "size-3" : "size-3.5")} />}
      <span>{label}</span>
    </Badge>
  );
}
