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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronDown, Loader2, User } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface EditableUserSelectProps {
  value?: UserOption;
  options: UserOption[];
  onChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
  isSaving?: boolean;
}

export function EditableUserSelect({
  value,
  options,
  onChange,
  placeholder = "Unassigned",
  className,
  isSaving = false,
}: EditableUserSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex items-center gap-2 rounded-md px-2 py-1.5 -ml-2 transition-all hover:bg-muted text-sm w-full text-left focus:outline-none",
            className
          )}
        >
          {value ? (
            <div className="flex items-center gap-2 font-medium overflow-hidden">
              <Avatar className="size-5 border border-border/50 shrink-0">
                <AvatarImage src={value.avatarUrl} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {value.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{value.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground italic">
              <User className="size-4 opacity-50" />
              <span>{placeholder}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {isSaving && <Loader2 className="size-3 animate-spin text-primary" />}
            <ChevronDown className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[240px]" align="start">
        <Command>
          <CommandInput placeholder="Search members..." className="h-9" />
          <CommandList>
            <CommandEmpty>No member found.</CommandEmpty>
            <CommandGroup heading="Project Members">
              <CommandItem
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-destructive"
              >
                <div className="size-6 rounded-full border border-dashed flex items-center justify-center opacity-70">
                   <User className="size-3" />
                </div>
                <span className="flex-1">Unassign</span>
                {!value && <Check className="size-4" />}
              </CommandItem>
              {options.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                >
                  <Avatar className="size-6 border border-border/50">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="text-[10px]">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="text-[13px] font-medium leading-tight truncate">
                      {user.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight truncate">
                      {user.email}
                    </span>
                  </div>
                  {value?.id === user.id && (
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
