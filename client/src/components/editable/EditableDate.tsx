"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Loader2, X } from "lucide-react";

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
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayDate = value ? format(new Date(value), "MMM d, yyyy") : null;
  const isoDate = value ? format(new Date(value), "yyyy-MM-dd") : "";

  const handleOpen = () => {
    setIsEditing(true);
    // Timeout to allow the element to render if it was hidden, though here it's always in DOM technically if we use a hidden input trick
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // We only close if we are not clicking the input again
    // Native date picker often stays open or handles blurs differently
    setIsEditing(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="relative group/date-wrapper">
      {isEditing ? (
        <input
          ref={inputRef}
          type="date"
          value={isoDate}
          autoFocus
          onBlur={handleBlur}
          onChange={(e) => {
            onChange(e.target.value);
            setIsEditing(false);
          }}
          className={cn(
            "absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full",
            className
          )}
        />
      ) : (
        <div 
          onClick={handleOpen}
          className="absolute inset-0 cursor-pointer z-10 w-full h-full" 
        />
      )}
      
      <button
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 -ml-2 transition-all hover:bg-[#F8F9FA] text-sm w-full text-left focus:outline-none",
          className
        )}
      >
        <CalendarIcon className={cn("size-3.5", displayDate ? "text-[#0D6EFD]" : "opacity-50")} />
        {displayDate ? (
          <span className="font-semibold text-[#0D6EFD]">{displayDate}</span>
        ) : (
          <span className="text-[#6C757D] italic">{placeholder}</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {isSaving && <Loader2 className="size-3 animate-spin text-[#0D6EFD]" />}
          {displayDate && (
             <X 
              onClick={clearDate}
              className="size-3.5 opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity z-20" 
             />
          )}
          <ChevronDown className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
        </div>
      </button>
    </div>
  );
}
