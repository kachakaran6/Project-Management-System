import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="size-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
          <AlertCircle className="size-6" />
        </div>
        <h3 className="text-sm font-bold">Failed to load history</h3>
        <p className="text-xs text-muted-foreground mt-1">Something went wrong while fetching status changes.</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/5">
        <div className="size-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
          <History className="size-6" />
        </div>
        <h3 className="text-sm font-bold text-foreground/80">No status changes yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Status updates will appear here as the task progresses.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-2 pb-8">
      {/* Timeline Line */}
      <div className="absolute left-7 top-4 bottom-0 w-px bg-gradient-to-b from-border via-border/60 to-transparent" />

      <div className="space-y-8 relative">
        <AnimatePresence mode="popLayout">
          {history.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative flex gap-5 items-start"
            >
              {/* Avatar / Icon Container */}
              <div className="relative z-10">
                <Avatar className="size-10 border-2 border-background shadow-sm ring-1 ring-border/50 group-hover:ring-primary/50 transition-all">
                  <AvatarImage src={item.changedByAvatar} />
                  <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                    {item.changedByName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Visual Connector Dot */}
                <div className="absolute -right-1 -bottom-1 size-4 rounded-full bg-background flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
                   <div className={cn(
                     "size-2 rounded-full",
                     index === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                   )} />
                </div>
              </div>

              {/* Content Card */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <span className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors">
                    {item.changedByName}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                    <Clock className="size-3" />
                    {formatDistanceToNow(new Date(item.changedAt), { addSuffix: true })}
                  </div>
                </div>

                <div className="relative p-4 rounded-2xl border border-border/80 bg-card/50 backdrop-blur-sm group-hover:border-primary/20 group-hover:bg-primary/[0.02] transition-all shadow-sm">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {item.fromStatus ? (
                      <>
                        <Badge 
                          variant="outline" 
                          style={{ borderColor: `${(item.fromStatus?.color || '#64748b')}40`, color: item.fromStatus?.color || '#64748b', backgroundColor: `${(item.fromStatus?.color || '#64748b')}10` }}
                          className="text-[10px] px-2 py-0 border-[0.5px] uppercase font-black tracking-wider"
                        >
                          {item.fromStatus?.name || 'Unknown'}
                        </Badge>
                        <ArrowRight className="size-3 text-muted-foreground/50" />
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-md border border-border/40 uppercase tracking-tighter italic">
                        Initial Creation
                      </span>
                    )}
                    
                    <Badge 
                      style={{ backgroundColor: item.toStatus?.color || '#64748b', color: 'white' }}
                      className="text-[10px] px-2 py-0 border-none shadow-sm shadow-black/5 uppercase font-black tracking-wider"
                    >
                      {item.toStatus?.name || 'Unknown'}
                    </Badge>

                  </div>
                  
                  {/* Absolute Timestamp on Hover */}
                  <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <History className="size-3 text-muted-foreground/40" />
                    <span className="text-[9px] font-medium text-muted-foreground">
                      {format(new Date(item.changedAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
