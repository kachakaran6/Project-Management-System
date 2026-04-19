"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

interface EditableDateProps {
  value?: string | Date;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  isSaving?: boolean;
}

export function EditableDate({
  value,
  onChange,
  placeholder = "No date",
  className,
  isSaving = false,
}: EditableDateProps) {
  return (
    <div className={cn("relative group/date-wrapper", className)}>
      <DatePicker
        value={value}
        onChange={(val) => onChange(typeof val === 'string' ? val : "")}
        placeholder={placeholder}
        showClear={true}
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 -ml-2 transition-all hover:bg-muted text-sm w-full text-left border-none focus-visible:ring-0",
          !value && "text-muted-foreground italic",
          value && "font-semibold text-primary"
        )}
      />
      {isSaving && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Loader2 className="size-3 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
