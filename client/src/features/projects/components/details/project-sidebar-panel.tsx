
import React from "react";
import { format } from "date-fns";
import { CalendarDays, Clock, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectSidebarPanelProps {
  startDate?: string;
  endDate?: string;
  createdAt: string;
  progress: number;
  members: any[];
}

export function ProjectSidebarPanel({ 
  startDate, 
  endDate, 
  createdAt, 
  progress, 
  members 
}: ProjectSidebarPanelProps) {
  return (
    <div className="space-y-6 lg:w-[280px] shrink-0">
      {/* KEY INFO */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Key Information</h3>
        <div className="space-y-3">
          <InfoRow 
            icon={<CalendarDays className="size-3.5" />} 
            label="Timeline" 
            value={`${startDate ? format(new Date(startDate), "MMM d, yyyy") : "TBD"} — ${endDate ? format(new Date(endDate), "MMM d, yyyy") : "TBD"}`} 
          />
          <InfoRow 
            icon={<Clock className="size-3.5" />} 
            label="Created" 
            value={format(new Date(createdAt), "MMM d, yyyy")} 
          />
        </div>
      </div>

      {/* PROGRESS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Progress</h3>
          <span className="text-xs font-semibold text-primary">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* TEAM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Team</h3>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border-border/20">
            {members.length}
          </Badge>
        </div>
        <div className="space-y-2">
          {members.slice(0, 5).map((member) => (
            <div key={member.user.id} className="flex items-center gap-2.5">
              <Avatar className="size-7 border border-border/10">
                <AvatarImage src={member.user.avatarUrl} />
                <AvatarFallback className="text-[10px] font-medium bg-primary/5 text-primary">
                  {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate text-foreground">
                  {member.user.firstName} {member.user.lastName}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{member.role.toLowerCase()}</span>
              </div>
            </div>
          ))}
          {members.length > 5 && (
            <p className="text-[10px] text-muted-foreground font-medium pl-9">
              + {members.length - 5} more members
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-7 rounded-card bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-xs font-medium text-foreground leading-tight">{value}</span>
      </div>
    </div>
  );
}
