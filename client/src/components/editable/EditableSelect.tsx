"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronDown, Loader2 } from "lucide-react";

interface Option {
  value: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

interface EditableSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isSaving?: boolean;
}

export function EditableSelect({
  value,
  options,
  onChange,
  placeholder = "Select status...",
  className,
  isSaving = false,
}: EditableSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex items-center gap-2 rounded-md px-2 py-1.5 -ml-2 transition-all hover:bg-muted text-sm w-full text-left focus:outline-none",
            className
          )}
        >
          {selectedOption?.icon}
          {selectedOption ? (
            <span className="flex items-center gap-2 font-medium">
              {selectedOption.color && (
                <span className={cn("size-2 rounded-full", selectedOption.color)} />
              )}
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-muted-foreground italic">{placeholder}</span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {isSaving && <Loader2 className="size-3 animate-spin text-primary" />}
            <ChevronDown className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[200px]" align="start">
        <Command>
          <CommandInput placeholder="Search..." className="h-9" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {option.icon}
                    {option.color && (
                      <span className={cn("size-2 rounded-full", option.color)} />
                    )}
                    <span>{option.label}</span>
                  </div>
                  {value === option.value && (
                    <Check className="size-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
