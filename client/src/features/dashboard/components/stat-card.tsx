import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  helperText?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend = 0,
  helperText,
}: StatCardProps) {
  const isPositive = trend >= 0;

  return (
    <Card className="overflow-hidden border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="rounded-md bg-secondary p-2 text-secondary-foreground">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-heading font-semibold tracking-tight">
          {value}
        </p>
        {helperText ? (
          <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
        ) : null}
        <p
          className={cn(
            "mt-2 inline-flex items-center text-xs font-medium",
            isPositive ? "text-success" : "text-destructive",
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="mr-1 size-3.5" />
          ) : (
            <ArrowDownRight className="mr-1 size-3.5" />
          )}
          {Math.abs(trend)}% vs last week
        </p>
      </CardContent>
    </Card>
  );
}
