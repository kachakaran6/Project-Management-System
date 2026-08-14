import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "flat" | "muted" | "inset";
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  footer,
  variant = "default",
  className,
  ...props
}: SectionCardProps) {
  return (
    <Card
      className={cn(
        "border-border/80 transition-colors",
        variant === "flat" && "shadow-none",
        variant === "muted" && "bg-muted/30",
        variant === "inset" && "bg-background border-dashed",
        className
      )}
      {...props}
    >
      {(title || description || actions) && (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5 pb-3">
          <div className="space-y-1 min-w-0">
            {title && typeof title === "string" ? (
              <CardTitle className="text-base font-semibold text-foreground tracking-tight">
                {title}
              </CardTitle>
            ) : (
              title
            )}
            {description && typeof description === "string" ? (
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </CardDescription>
            ) : (
              description
            )}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}

      {children && <CardContent className={cn("p-5", (title || description || actions) && "pt-2")}>{children}</CardContent>}

      {footer && <CardFooter className="p-5 pt-3 border-t border-border/60">{footer}</CardFooter>}
    </Card>
  );
}
