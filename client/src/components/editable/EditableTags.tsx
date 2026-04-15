"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";

interface EditableTagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  isSaving?: boolean;
}

export function EditableTags({
  tags = [],
  onChange,
  placeholder = "Add tags...",
  className,
  isSaving = false,
}: EditableTagsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue("");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTag();
    }
    if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue("");
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5 items-center", className)}>
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="group/tag flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-[#F8F9FA] hover:bg-[#0D6EFD]/10 transition-colors"
        >
          {tag}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="opacity-0 group-hover/tag:opacity-100 p-0.5 hover:text-[#DC3545]"
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}

      {isEditing ? (
        <div className="flex items-center">
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={addTag}
            onKeyDown={handleKeyDown}
            placeholder="Tag name..."
            className="text-[11px] font-medium border-b border-[#0D6EFD] bg-transparent outline-none w-20 px-1 py-0.5"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed text-[11px] text-[#6C757D] hover:bg-[#F8F9FA] hover:border-[#0D6EFD] hover:text-[#0D6EFD] transition-all"
        >
          {isSaving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Plus className="size-3" />
          )}
          {tags.length === 0 ? placeholder : "Add"}
        </button>
      )}
    </div>
  );
}
