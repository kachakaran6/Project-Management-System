import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, error = false, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        aria-invalid={error || props["aria-invalid"] === true}
        className={cn(
          "flex min-h-24 w-full rounded-md border bg-surface px-3 py-2 text-sm transition-all duration-200 outline-none",
          "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ring-offset-background",
          error ? "border-destructive" : "border-input",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
