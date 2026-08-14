import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppPageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Standard page layout canvas conforming to Section 3.4 layout specs:
 * max-w-7xl, responsive padding, consistent block gap.
 */
export function AppPage({ children, fullWidth = false, className, ...props }: AppPageProps) {
  return (
    <div
      className={cn(
        "w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6 min-h-[calc(100vh-4rem)]",
        !fullWidth && "max-w-7xl mx-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
