import * as React from "react";
import { StatusBadge } from "./status-badge";
import { PriorityIndicator } from "./priority-indicator";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface DetailHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  status?: string;
  priority?: string;
  actions?: React.ReactNode;
  metadata?: React.ReactNode;
}

export function DetailHeader({
  title,
  breadcrumbs,
  status,
  priority,
  actions,
  metadata,
  className,
  ...props
}: DetailHeaderProps) {
  return (
    <div className={cn("space-y-3 pb-4 border-b border-border/70", className)} {...props}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          {breadcrumbs.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />}
              {item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-foreground transition-colors truncate max-w-[200px]"
                >
                  {item.label}
                </button>
              ) : item.href ? (
                <a
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-[200px]"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground/80 font-medium truncate max-w-[200px]">
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {status && <StatusBadge status={status} size="sm" />}
          {priority && <PriorityIndicator priority={priority} size="sm" />}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {metadata && <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">{metadata}</div>}
    </div>
  );
}
