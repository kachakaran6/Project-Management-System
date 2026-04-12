"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, User, Search, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemberSearch } from "../hooks/use-member-search";
import { Input } from "@/components/ui/input";

interface UserMentionSelectProps {
  value?: string;
  onSelect: (userId: string) => void;
  placeholder?: string;
  className?: string;
}

export function UserMentionSelect({
  value,
  onSelect,
  placeholder = "Assign to...",
  className,
}: UserMentionSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: members, isLoading } = useMemberSearch(query);
  const [selectedName, setSelectedName] = useState<string>("");

  // Sync selected name when value changes or members load
  useEffect(() => {
    if (value && members) {
      const selected = members.find((m) => m.id === value);
      if (selected) {
        setSelectedName(`${selected.firstName} ${selected.lastName}`);
      } else if (value === "") {
        setSelectedName("");
      }
    }
  }, [value, members]);

  const handleSelect = (memberId: string, name: string) => {
    onSelect(memberId);
    setSelectedName(name);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background font-normal hover:bg-background h-10 border-input"
          >
            {value ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={members?.find(m => m.id === value)?.avatarUrl} />
                  <AvatarFallback className="text-[10px]">
                    {selectedName.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedName}</span>
              </div>
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                {placeholder}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-0" align="start">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search team members..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading team members...
              </div>
            ) : members && members.length > 0 ? (
              members.map((member) => (
                <DropdownMenuItem
                  key={member.id}
                  onSelect={() => handleSelect(member.id, `${member.firstName} ${member.lastName}`)}
                  className="flex items-center gap-3 p-2 cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback>
                      {member.firstName[0]}{member.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </span>
                  </div>
                  {value === member.id && (
                    <Check className="ml-auto h-4 w-4 opacity-100" />
                  )}
                </DropdownMenuItem>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {query ? "No members found." : "Type to search members..."}
              </div>
            )}
          </div>
          <div className="border-t p-1">
             <Button 
               variant="ghost" 
               className="w-full justify-start text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
               onClick={() => {
                 onSelect("");
                 setSelectedName("");
                 setOpen(false);
               }}
             >
               Clear Assignee
             </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
