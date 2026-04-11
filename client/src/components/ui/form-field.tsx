import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  id?: string;
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  helperText,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={fieldId}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
