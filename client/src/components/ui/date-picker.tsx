"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: string | Date | { from: Date; to?: Date };
  onChange: (date: string | { from: string; to: string } | undefined) => void;
  placeholder?: string;
  className?: string;
  mode?: "single" | "range";
  showClear?: boolean;
  inline?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  mode = "single",
  showClear = true,
  inline = false,
}: DatePickerProps) {
  // Convert value to Date or DateRange
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    if (mode === "single") {
      return typeof value === "string" ? (value ? new Date(value) : undefined) : (value instanceof Date ? value : undefined);
    } else {
      const range = value as any;
      const from = range.from ? (typeof range.from === 'string' ? new Date(range.from) : range.from) : undefined;
      const to = range.to ? (typeof range.to === 'string' ? new Date(range.to) : range.to) : undefined;
      return { from, to } as DateRange;
    }
  }, [value, mode]);

  const handleSelect = (val: any) => {
    if (mode === "single") {
      if (!val) {
        onChange(undefined);
        return;
      }
      // Store as ISO format
      onChange(format(val, "yyyy-MM-dd"));
    } else {
      const range = val as DateRange;
      if (!range) {
        onChange(undefined);
        return;
      }
      onChange({
        from: range.from ? format(range.from, "yyyy-MM-dd") : "",
        to: range.to ? format(range.to, "yyyy-MM-dd") : "",
      });
    }
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const displayText = React.useMemo(() => {
    if (!dateValue) return placeholder;
    if (mode === "single") {
      return format(dateValue as Date, "MMM d, yyyy");
    } else {
      const range = dateValue as DateRange;
      if (range.from && range.to) {
        return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`;
      }
      if (range.from) {
        return format(range.from, "MMM d, yyyy");
      }
      return placeholder;
    }
  }, [dateValue, mode, placeholder]);

  if (inline) {
    return (
      <Calendar
        mode={mode as any}
        selected={dateValue as any}
        onSelect={handleSelect}
        initialFocus
        className={className}
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-background border-border/40 hover:bg-muted/50 transition-all",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
          <span className="truncate">{displayText}</span>
          {showClear && dateValue && (
            <X 
              className="ml-auto h-3 w-3 opacity-50 hover:opacity-100 transition-opacity" 
              onClick={clearDate}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border/50 shadow-2xl" align="start">
        <Calendar
          mode={mode as any}
          selected={dateValue as any}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
