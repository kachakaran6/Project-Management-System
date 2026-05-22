
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
  const members = Array.isArray(teamData) 
    ? teamData.filter(m => m.status !== "PENDING") 
    : [];

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
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-card border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all gap-2"
              disabled={isLoading}
            >
              <UserPlus className="size-4" />
              <span className="text-[12px] font-medium">Add Member</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto p-1 rounded-card shadow-xl border-border bg-popover custom-scrollbar">
            {members.length === 0 && (
              <div className="p-4 text-center text-[12px] text-muted-foreground font-medium">
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
                  className="flex items-center gap-2 rounded-card px-2 py-1.5 cursor-pointer mb-0.5 last:mb-0"
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleMember(mId);
                  }}
                >
                  <div className="relative size-7 shrink-0">
                    <Avatar className="size-7">
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {isSelected && (
                      <div className="absolute -right-0.5 -top-0.5 size-3 bg-primary rounded-full flex items-center justify-center border border-background">
                        <Check className="size-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-semibold truncate text-foreground">{fullName}</span>
                    <span className="text-[10px] text-muted-foreground truncate font-medium">{member.email}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex -space-x-2 overflow-hidden items-center">
          {selectedMembers.slice(0, 5).map((member) => (
            <Avatar key={member.id} className="size-8 border-2 border-background shadow-sm transition-transform hover:translate-y-[-2px] cursor-help">
              <AvatarImage src={member.avatarUrl} />
              <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground font-bold">
                {member.firstName?.[0]}{member.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          ))}
          {selectedMembers.length > 5 && (
            <div className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-bold text-muted-foreground shadow-sm">
              +{selectedMembers.length - 5}
            </div>
          )}
          {selectedMembers.length === 0 && (
            <span className="text-[12px] text-muted-foreground/60 font-medium ml-2 italic">No members added</span>
          )}
        </div>
      </div>
    </div>
  );
}
