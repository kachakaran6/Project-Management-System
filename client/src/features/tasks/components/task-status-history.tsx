import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { 
  ArrowRight, 
  History, 
  User, 
  Clock, 
  ChevronRight,
  CircleDot,
  AlertCircle
} from "lucide-react";
import { taskApi } from "../api/task.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskStatusHistoryProps {
  taskId: string;
}

export const TaskStatusHistory: React.FC<TaskStatusHistoryProps> = ({ taskId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", taskId, "history"],
    queryFn: () => taskApi.getStatusHistory(taskId),
    enabled: !!taskId,
  });

  const history = data?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-6 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 items-start">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-full rounded-button" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="size-12 rounded-button bg-destructive/10 flex items-center justify-center text-destructive mb-4">
          <AlertCircle className="size-6" />
        </div>
        <h3 className="text-sm font-bold">Failed to load history</h3>
        <p className="text-xs text-muted-foreground mt-1">Something went wrong while fetching status changes.</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 px-1.5 opacity-40 italic">
        <History className="size-3" />
        <p className="text-[10px] font-medium tracking-tight">No status changes recorded</p>
      </div>
    );
  }

  return (
    <div className="relative pl-0 pb-2">
      {/* Timeline Line */}
      <div className="absolute left-4 top-2 bottom-0 w-[1.5px] bg-border/40" />

      <div className="space-y-5 relative">
        {history.map((item, index) => (
            <div
              key={item.id}
              className="group relative flex gap-3 items-center"
            >
              {/* Avatar Container */}
              <div className="relative z-10 shrink-0">
                <Avatar className="size-8 border border-background shadow-sm ring-1 ring-border/30 group-hover:ring-primary/40 transition-all">
                  <AvatarImage src={item.changedByAvatar} />
                  <AvatarFallback className="bg-primary/5 text-primary text-[8px] font-bold">
                    {item.changedByName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Connector Dot */}
                {index === 0 && (
                  <div className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-background flex items-center justify-center border border-border">
                    <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
              </div>

              {/* In-line Content */}
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3 py-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden">
                  <span className="text-[13px] font-bold text-foreground/90 truncate max-w-30">
                    {item.changedByName}
                  </span>
                  
                  <div className="flex items-center gap-1.5 shrink-0 scale-[0.85] origin-left">
                    {item.fromStatus ? (
                      <>
                        <Badge 
                          variant="outline" 
                          style={{ 
                            borderColor: `${(item.fromStatus?.color || '#64748b')}30`, 
                            color: item.fromStatus?.color || '#64748b', 
                            backgroundColor: `${(item.fromStatus?.color || '#64748b')}08` 
                          }}
                          className="text-[9px] px-1.5 py-0 border-[0.5px] uppercase font-bold tracking-tight h-5 flex items-center rounded-xs"
                        >
                          {item.fromStatus?.name || 'Unknown'}
                        </Badge>
                        <ArrowRight className="size-2.5 text-muted-foreground/40" />
                      </>
                    ) : (
                      <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter italic mr-1">
                        Created
                      </span>
                    )}
                    
                    <Badge 
                      style={{ backgroundColor: item.toStatus?.color || '#64748b', color: 'white' }}
                      className="text-[9px] px-1.5 py-0 border-none shadow-sm uppercase font-bold tracking-tight h-5 flex items-center rounded-xs"
                    >
                      {item.toStatus?.name || 'Unknown'}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70">
                    <Clock className="size-2.5" />
                    {formatDistanceToNow(new Date(item.changedAt), { addSuffix: true })}
                  </div>
                  {/* Precise date on hover (subtle) */}
                  <span className="text-[8px] text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors">
                    {format(new Date(item.changedAt), "MMM d, HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
