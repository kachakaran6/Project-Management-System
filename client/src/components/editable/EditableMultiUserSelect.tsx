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
import { Check, ChevronDown, Loader2, Users, X } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface EditableMultiUserSelectProps {
  value: UserOption[];
  options: UserOption[];
  onChange: (userIds: string[]) => void;
  placeholder?: string;
  className?: string;
  isSaving?: boolean;
}

export function EditableMultiUserSelect({
  value = [],
  options,
  onChange,
  placeholder = "Unassigned",
  className,
  isSaving = false,
}: EditableMultiUserSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedIds = value.map(v => v.id);

  const handleToggle = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter(id => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex items-center gap-2 rounded-md px-2 py-1.5 -ml-2 transition-all hover:bg-muted text-sm w-full text-left focus:outline-none min-h-[36px]",
            className
          )}
        >
          {value.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-hidden flex-wrap">
              <div className="flex items-center -space-x-1.5 mr-1">
                {value.slice(0, 3).map((user) => (
                  <Avatar key={user.id} className="size-6 border border-background ring-1 ring-border/10 shrink-0">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="truncate max-w-[150px] font-medium">
                {value.length === 1 
                  ? value[0].name 
                  : `${value.length} assignees`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground italic">
              <Users className="size-4 opacity-50" />
              <span>{placeholder}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {isSaving && <Loader2 className="size-3 animate-spin text-primary" />}
            {value.length > 0 && (
              <X 
                className="size-3 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity cursor-pointer" 
                onClick={handleClear}
              />
            )}
            <ChevronDown className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[260px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search members..." 
            className="h-9 focus-visible:outline-none!" 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No member found.</CommandEmpty>
            <CommandGroup heading="Project Members">
              {options
                .filter(user => 
                  user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  user.email.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleToggle(user.id)}
                    className="flex items-center gap-2 px-2 py-2 cursor-pointer"
                  >
                    <div className="relative">
                      <Avatar className="size-7 border border-border/50">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="text-[11px]">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {selectedIds.includes(user.id) && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full size-3.5 flex items-center justify-center border-2 border-background">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-[13px] font-semibold leading-tight truncate">
                        {user.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight truncate">
                        {user.email}
                      </span>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
