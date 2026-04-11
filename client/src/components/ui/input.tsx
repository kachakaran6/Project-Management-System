import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type = "text", error = false, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        aria-invalid={error || props["aria-invalid"] === true}
        className={cn(
          "flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm transition-all duration-200 outline-none",
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
