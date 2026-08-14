import * as React from "react";
import { cn } from "@/lib/utils";

export interface PropertyRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function PropertyRow({
  label,
  icon,
  children,
  className,
  ...props
}: PropertyRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors text-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground min-w-[120px] shrink-0">
        {icon && <span className="shrink-0 opacity-70">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="flex-1 flex items-center justify-end min-w-0">{children}</div>
    </div>
  );
}
