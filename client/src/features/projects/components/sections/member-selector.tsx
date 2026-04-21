"use client";

import { Check, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeamMembersQuery } from "@/features/team/hooks/use-team-query";
import { cn } from "@/lib/utils";

interface MemberSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function MemberSelector({ value, onChange }: MemberSelectorProps) {
  const { data: teamData, isLoading } = useTeamMembersQuery();
  const members = Array.isArray(teamData) ? teamData : [];

  const toggleMember = (memberId: string) => {
    if (value.includes(memberId)) {
      onChange(value.filter((id) => id !== memberId));
    } else {
      onChange([...value, memberId]);
    }
  };

  const selectedMembers = members.filter(m => value.includes(m.id || (m as any)._id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 rounded-full border-dashed p-0 shrink-0 hover:bg-primary/5 hover:border-primary/30"
              disabled={isLoading}
            >
              <UserPlus className="size-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-32px)] md:w-64 p-1 rounded-xl shadow-xl border-border/40 backdrop-blur-lg">
            {members.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No team members found
              </div>
            )}
            {members.map((member) => {
              const mId = member.id || (member as any)._id;
              const isSelected = value.includes(mId);
              const fullName = `${member.firstName} ${member.lastName}`;
              
              return (
                <DropdownMenuItem
                  key={mId}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleMember(mId);
                  }}
                >
                  <div className="relative size-7 shrink-0">
                    <Avatar className="size-7">
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {isSelected && (
                      <div className="absolute -right-0.5 -top-0.5 size-3 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                        <Check className="size-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium truncate">{fullName}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex -space-x-2 overflow-hidden items-center">
          {selectedMembers.slice(0, 5).map((member) => (
            <Avatar key={member.id} className="size-8 border-2 border-background ring-1 ring-border/20 transition-transform hover:scale-110 hover:z-10 cursor-help">
              <AvatarImage src={member.avatarUrl} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {member.firstName?.[0]}{member.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          ))}
          {selectedMembers.length > 5 && (
            <div className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium ring-1 ring-border/20">
              +{selectedMembers.length - 5}
            </div>
          )}
          {selectedMembers.length === 0 && (
            <span className="text-xs text-muted-foreground ml-4 italic">No members selected (Private)</span>
          )}
        </div>
      </div>
    </div>
  );
}
