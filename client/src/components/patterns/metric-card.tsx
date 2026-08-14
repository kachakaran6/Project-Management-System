import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  variant?: "default" | "muted" | "primary";
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = "default",
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "p-5 flex flex-col justify-between transition-colors border-border/80",
        variant === "muted" && "bg-muted/40",
        variant === "primary" && "border-primary/30 bg-primary/5",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-muted/60 text-muted-foreground shrink-0">
            <Icon className="size-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {value}
        </div>

        {(trend || description) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded text-[11px]",
                  trend.isPositive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {trend.value}
              </span>
            )}
            <span>{trend?.label || description}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
