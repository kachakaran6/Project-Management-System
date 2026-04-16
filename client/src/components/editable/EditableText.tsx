"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  isSaving?: boolean;
}

export function EditableText({
  value,
  onChange,
  placeholder = "Click to edit...",
  className,
  inputClassName,
  multiline = false,
  isSaving = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onChange(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return multiline ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full bg-background border border-primary rounded-md p-2 text-[15px] focus:outline-none transition-all resize-none",
          inputClassName
        )}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full bg-background border border-primary rounded-md px-2 py-1 text-[15px] focus:outline-none transition-all",
          inputClassName
        )}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "group relative cursor-text rounded-md px-2 py-1 -ml-2 transition-all hover:bg-muted min-h-[1.5em] flex items-center",
        className
      )}
    >
      <div className={cn(
        "w-full break-words",
        !value && "text-muted-foreground italic"
      )}>
        {value || placeholder}
      </div>
      {isSaving && (
        <Loader2 className="size-3 animate-spin ml-2 text-primary shrink-0" />
      )}
    </div>
  );
}
