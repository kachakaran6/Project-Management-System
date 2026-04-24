import React, { useMemo, useRef } from 'react';
import { Task, TaskStatus } from '@/types/task.types';
import { format, isToday, isYesterday } from 'date-fns';
import { 
  motion, 
  useScroll, 
  useSpring,
  useInView
} from 'framer-motion';
import { 
  Clock, 
  Plus, 
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface TaskTimelineProps {
  tasks: Task[];
}

const STATUS_ORDER: TaskStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'ARCHIVED'
];

interface TimelineEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  type: 'creation' | 'status_change';
  fromStatus?: TaskStatus;
  toStatus: TaskStatus;
  timestamp: Date;
  priority: string;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  BACKLOG: '#94a3b8',
  TODO: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  IN_REVIEW: '#a855f7',
  DONE: '#22c55e',
  ARCHIVED: '#475569',
  REJECTED: '#ef4444'
};

// ─── Cinematic Node Component ───────────────────────────────────────────────

const TimelineNode = ({ event, index, isDark }: { event: TimelineEvent, index: number, isDark: boolean }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-10% 0px -10% 0px" });
  const isLeft = index % 2 === 0;
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.9, rotateY: isLeft ? -5 : 5 }}
      animate={isInView ? { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        rotateY: 0,
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
      } : {}}
      className={cn(
        "relative w-full flex items-center mb-24",
        isLeft ? "justify-start" : "justify-end text-right"
      )}
    >
      {/* Immersive Path Connector Dot */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <motion.div 
          animate={isInView ? { scale: [1, 1.2, 1], opacity: 1 } : { scale: 0.5, opacity: 0.3 }}
          className={cn(
            "size-3 rounded-full border-2",
            isDark ? "bg-white border-background" : "bg-background border-white shadow-md"
          )}
          style={{ backgroundColor: STATUS_COLORS[event.toStatus] }}
        />
      </div>

      {/* Glassmorphic Node Card */}
      <div className={cn(
        "w-[42%] p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl relative overflow-hidden group",
        isDark ? "bg-white/[0.03] border-white/5" : "bg-white/80 border-black/5 shadow-xl",
        isLeft ? "rounded-tl-none mr-[58%]" : "rounded-tr-none ml-[58%]"
      )}>
        {/* Subtle Depth Layers */}
        {isDark && <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />}
        
        <div className={cn("flex items-center gap-1.5 mb-2", isLeft ? "justify-start" : "justify-end")}>
          <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full border", isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5")}>
            <Clock className={cn("size-2", isDark ? "text-white/40" : "text-black/40")} />
            <span className={cn("text-[8px] font-bold tracking-wider", isDark ? "text-white/60" : "text-black/60")}>
              {format(event.timestamp, 'HH:mm')}
            </span>
          </div>
        </div>

        <h3 className={cn("text-[11px] font-semibold mb-2 leading-tight line-clamp-2", isDark ? "text-white/90" : "text-black/90")}>
          {event.taskTitle}
        </h3>

        <div className={cn("flex items-center gap-1.5", isLeft ? "justify-start" : "justify-end")}>
          {event.type === 'creation' ? (
            <div className={cn("flex items-center gap-1 text-[9px] font-bold", isDark ? "text-white/40" : "text-black/40")}>
              <Plus className="size-2.5 text-emerald-500/80" />
              <span>Created</span>
            </div>
          ) : (
            <div className={cn("flex items-center gap-1.5 text-[9px] font-bold", isLeft ? "" : "flex-row-reverse")}>
              <span className={cn("uppercase tracking-tighter truncate max-w-[40px]", isDark ? "text-white/30" : "text-black/30")}>
                {event.fromStatus?.toLowerCase()}
              </span>
              <ArrowRight className={cn("size-2", isDark ? "text-white/20" : "text-black/20")} />
              <span className="uppercase tracking-tight truncate max-w-[40px]" style={{ color: STATUS_COLORS[event.toStatus] }}>
                {event.toStatus.toLowerCase()}
              </span>
            </div>
          )}
        </div>

        {/* Subtle Glow on Hover/Active */}
        <div className={cn("absolute -bottom-1 -right-1 size-12 blur-2xl rounded-full opacity-0 group-active:opacity-100 transition-opacity", isDark ? "bg-white/5" : "bg-black/5")} />
      </div>
    </motion.div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const TaskTimeline: React.FC<TaskTimelineProps> = ({ tasks }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];
    tasks.forEach(task => {
      allEvents.push({
        id: `${task.id}-creation`,
        taskId: task.id,
        taskTitle: task.title,
        type: 'creation',
        toStatus: 'BACKLOG',
        timestamp: new Date(task.createdAt),
        priority: task.priority
      });

      const start = new Date(task.createdAt).getTime();
      const end = new Date(task.updatedAt).getTime();
      const statusIdx = STATUS_ORDER.indexOf(task.status);

      if (statusIdx > 0) {
        const interval = (end - start) / (statusIdx + 1);
        for (let i = 1; i <= statusIdx; i++) {
          allEvents.push({
            id: `${task.id}-move-${i}`,
            taskId: task.id,
            taskTitle: task.title,
            type: 'status_change',
            fromStatus: STATUS_ORDER[i-1],
            toStatus: STATUS_ORDER[i],
            timestamp: new Date(start + interval * i),
            priority: task.priority
          });
        }
      }
    });
    return allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [tasks]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};
    events.forEach(event => {
      const dateKey = format(event.timestamp, 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(event);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [events]);

  return (
    <div className={cn("relative min-h-screen overflow-x-hidden font-jakarta select-none transition-colors duration-500", isDark ? "bg-[#050505] text-white" : "bg-white text-black")}>
      {/* Cinematic Background Layer */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={cn("absolute inset-0 bg-gradient-to-b", isDark ? "from-blue-500/[0.02] via-transparent to-emerald-500/[0.02]" : "from-primary/[0.05] via-transparent to-primary/[0.02]")} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
      </div>

      <header className={cn("sticky top-0 z-50 px-8 py-10 bg-gradient-to-b", isDark ? "from-[#050505]" : "from-white")}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-3">
            <h1 className={cn("text-3xl font-bold tracking-tighter", isDark ? "text-white/90" : "text-black/90")}>Task Odyssey</h1>
            <div className={cn("px-2 py-0.5 rounded-md border", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Beta</span>
            </div>
          </div>
          <p className={cn("text-xs font-medium tracking-wide uppercase", isDark ? "text-white/30" : "text-black/30")}>Scroll to navigate the workflow history</p>
        </motion.div>
      </header>

      <div ref={containerRef} className="relative px-6 pb-40 mt-10">
        {/* Immersive Curved Path SVG */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-full flex justify-center pointer-events-none">
          <svg width="200" height="100%" className="overflow-visible opacity-20">
            <motion.path
              d={`M 100 0 
                 ${events.map((_, i) => 
                   `C ${i % 2 === 0 ? 0 : 200} ${i * 300 + 150}, 
                      ${i % 2 === 0 ? 200 : 0} ${i * 300 + 150}, 
                      100 ${i * 300 + 300}`
                 ).join(' ')}`}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="2"
              strokeDasharray="1 1"
              pathLength={1}
              style={{ pathLength }}
            />
            <defs>
              <linearGradient id="pathGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {groupedEvents.map(([date, groupEvents], groupIdx) => (
          <div key={date} className="relative z-20 mb-20">
            <div className="flex justify-center mb-24 sticky top-32 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className={cn("px-6 py-2 rounded-full backdrop-blur-xl border shadow-2xl", isDark ? "bg-white/5 border-white/10" : "bg-white/90 border-black/5")}
              >
                <span className={cn("text-[10px] font-black uppercase tracking-[0.4em]", isDark ? "text-white/40" : "text-black/40")}>
                  {isToday(new Date(date)) ? 'Present' : isYesterday(new Date(date)) ? 'Yesterday' : format(new Date(date), 'MMMM d')}
                </span>
              </motion.div>
            </div>

            <div className="space-y-10">
              {groupEvents.map((event, i) => (
                <TimelineNode 
                  key={event.id} 
                  event={event} 
                  index={i + (groupIdx * 100)} 
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col items-center justify-center pt-20 pb-40">
          <div className={cn("size-1 rounded-full mb-4", isDark ? "bg-white/20" : "bg-black/20")} />
          <p className={cn("text-[10px] font-black uppercase tracking-[0.5em]", isDark ? "text-white/10" : "text-black/10")}>End of Journey</p>
        </div>
      </div>

      {/* Immersive Controls Overlay */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <div className={cn("w-px h-10 bg-gradient-to-b", isDark ? "from-white/20 to-transparent" : "from-black/20 to-transparent")} />
          <span className={cn("text-[8px] font-black uppercase tracking-widest", isDark ? "text-white/20" : "text-black/20")}>Swipe to Travel</span>
        </motion.div>
      </div>
    </div>
  );
};
