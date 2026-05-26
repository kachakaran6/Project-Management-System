
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
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberSearch } from "../hooks/use-member-search";

interface UserInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  email: string;
}

interface SingleUserSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  className?: string;
  // Optional pre-filled user objects for display when only IDs are available in value
  prefilledUsers?: UserInfo[];
  disabled?: boolean;
  trigger?: React.ReactNode;
  hideDefaultTrigger?: boolean;
}

export function SingleUserSelect({
  value = null,
  onChange,
  placeholder = "Assign to...",
  className,
  prefilledUsers = [],
  disabled = false,
  trigger,
  hideDefaultTrigger = false,
}: SingleUserSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: searchResults, isLoading } = useMemberSearch(query);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);

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

    if (!value) {
      setSelectedUser(null);
      return;
    }

    const found = allKnownUsers.find((u) => u.id === value);
    if (found) {
      setSelectedUser(found);
    } else {
      setSelectedUser({ id: value, name: "...", email: "" });
    }
  }, [value, searchResults, prefilledUsers]);

  const toggleUser = (userId: string) => {
    if (value === userId) {
      onChange(null);
    } else {
      onChange(userId);
      setOpen(false);
    }
  };

  const removeUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {trigger || (
            !hideDefaultTrigger && (
              <div
                className={cn(
                  "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-button border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  disabled && "opacity-60 cursor-not-allowed pointer-events-none bg-muted/20"
                )}
                onClick={() => !disabled && setOpen(true)}
              >
                {selectedUser ? (
                  <div className="flex flex-wrap gap-1">
                      <Badge
                        key={selectedUser.id}
                        variant="secondary"
                        className="flex items-center gap-1 pl-1 pr-1 h-6 hover:bg-secondary/80 transition-colors"
                      >
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={selectedUser.avatarUrl} />
                          <AvatarFallback className="text-[8px]">
                            {selectedUser.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[100px] truncate">{selectedUser.name}</span>
                        <button
                          type="button"
                          onClick={(e) => removeUser(e)}
                          className="ml-0.5 rounded-full outline-none hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </Badge>
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
              className="flex h-10 w-full rounded-button bg-transparent py-3 text-sm focus-visible:outline-none! placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search team members..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-75 overflow-y-auto overflow-x-hidden p-1">
            {/* Assign All Option removed for Single select */}

            {isLoading ? (
              <div className="space-y-1 p-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-24 rounded-button" />
                      <Skeleton className="h-2.5 w-32 rounded-button opacity-60" />
                    </div>
                  </div>
                ))}
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
                    {value === user.id && (
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
                onChange(null);
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
