"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, AtSign, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMemberSearch } from "../hooks/use-member-search";

interface UserInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  email: string;
}

interface MultiUserSelectProps {
  value: string[];
  onChange: (userIds: string[]) => void;
  placeholder?: string;
  className?: string;
  // Optional pre-filled user objects for display when only IDs are available in value
  prefilledUsers?: UserInfo[];
  disabled?: boolean;
  trigger?: React.ReactNode;
  hideDefaultTrigger?: boolean;
}

export function MultiUserSelect({
  value = [],
  onChange,
  placeholder = "Assign to...",
  className,
  prefilledUsers = [],
  disabled = false,
  trigger,
  hideDefaultTrigger = false,
}: MultiUserSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: searchResults, isLoading } = useMemberSearch(query);
  const [selectedUsers, setSelectedUsers] = useState<UserInfo[]>([]);

  const toUserInfo = (user: any): UserInfo => {
    const firstName = user?.firstName ?? "";
    const lastName = user?.lastName ?? "";
    const name =
      user?.name ??
      (`${firstName} ${lastName}`.trim() || user?.email || "Unknown User");

    return {
      id: String(user?.id || user?._id || ""),
      name,
      email: user?.email || "",
      avatarUrl: user?.avatarUrl,
    };
  };

  // Sync selected users list - memoize to prevent infinite loops
  useEffect(() => {
    // Merge search results and prefilled users to find the names/avatars for the current IDs in 'value'
    const allKnownUsers: UserInfo[] = [
      ...(searchResults || []).map(toUserInfo),
      ...prefilledUsers.map(toUserInfo),
    ];

    const matched: UserInfo[] = value.map((id) => {
      const found = allKnownUsers.find((u) => u.id === id);
      if (found) return found;
      // Fallback if we have an ID but no user object yet
      return { id, name: "Loading...", email: "" };
    });

    // Remove duplicates by ID and keep the most complete info
    const unique: UserInfo[] = Array.from(
      new Map(matched.map((u) => [u.id, u])).values(),
    );

    // Only update state if selection actually changed (prevent infinite loops)
    setSelectedUsers((prev) => {
      if (prev.length !== unique.length) return unique;
      if (prev.every((p, i) => p.id === unique[i]?.id)) return prev;
      return unique;
    });
  }, [value, searchResults, prefilledUsers]);

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const removeUser = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    onChange(value.filter((id) => id !== userId));
  };

  return (
    <div className={cn("relative w-full", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {trigger || (
            !hideDefaultTrigger && (
              <div
                className={cn(
                  "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  disabled && "opacity-60 cursor-not-allowed pointer-events-none bg-muted/20"
                )}
                onClick={() => !disabled && setOpen(true)}
              >
                {selectedUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedUsers.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="flex items-center gap-1 pl-1 pr-1 h-6 hover:bg-secondary/80 transition-colors"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="text-[8px]">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[100px] truncate">{user.name}</span>
                        <button
                          type="button"
                          onClick={(e) => removeUser(e, user.id)}
                          className="ml-0.5 rounded-full outline-none hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <AtSign className="h-4 w-4" />
                    {placeholder}
                  </span>
                )}
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </div>
            )
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 p-0" align="start">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 "
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
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((member) => {
                const user = toUserInfo(member);

                return (
                  <DropdownMenuItem
                    key={user.id}
                    onSelect={(e) => {
                      e.preventDefault(); // Prevent closing on selection
                      toggleUser(user.id);
                    }}
                    className="flex items-center gap-3 p-2 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </span>
                    </div>
                    {value.includes(user.id) && (
                      <Check className="ml-auto h-4 w-4 opacity-100" />
                    )}
                  </DropdownMenuItem>
                );
              })
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
                onChange([]);
                setOpen(false);
              }}
            >
              Clear All
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
