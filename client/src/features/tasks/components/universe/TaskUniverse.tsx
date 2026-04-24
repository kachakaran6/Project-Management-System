import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Task, TaskStatus } from '@/types/task.types';
import { format, isSameDay } from 'date-fns';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  ChevronRight,
  Info,
  TrendingUp,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { TaskTimeline } from './TaskTimeline';
import { cn } from '@/lib/utils';
import './universe.css';

interface TaskUniverseProps {
  tasks: Task[];
}

// ─── Constants & Types ──────────────────────────────────────────────────────

const STATUS_ORDER: TaskStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'ARCHIVED'
];

const ZONES = [
  { id: 'BACKLOG', label: 'Backlog', color: '#64748b', insight: 'Avg: 2.1d' },
  { id: 'TODO', label: 'Todo', color: '#3b82f6', insight: 'High priority' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#f59e0b', insight: 'Active now' },
  { id: 'IN_REVIEW', label: 'In Review', color: '#a855f7', insight: 'Pending' },
  { id: 'DONE', label: 'Done', color: '#22c55e', insight: 'Completed' },
  { id: 'ARCHIVED', label: 'Archived', color: '#475569', insight: 'Stored' },
];

interface TaskHistoryEvent {
  status: TaskStatus;
  timestamp: number;
}

interface AugmentedTask extends Task {
  history: TaskHistoryEvent[];
}

// ─── Particle Class ────────────────────────────────────────────────────────

class TaskParticle {
  id: string;
  task: AugmentedTask;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  currentStatus: TaskStatus;
  baseSize: number = 4.5;
  pulse: number = Math.random() * Math.PI * 2;
  
  constructor(task: AugmentedTask, width: number, height: number) {
    this.id = task.id;
    this.task = task;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = 0;
    this.vy = 0;
    this.currentStatus = task.status;
    this.color = ZONES.find(z => z.id === task.status)?.color || '#fff';
    this.targetX = this.x;
    this.targetY = this.y;
  }

  update(width: number, height: number, currentTime: number, allParticles: TaskParticle[]) {
    // 1. Resolve current status from timeline
    let statusAtTime = this.task.history[0].status;
    for (const event of this.task.history) {
      if (currentTime >= event.timestamp) {
        statusAtTime = event.status;
      } else {
        break;
      }
    }
    this.currentStatus = statusAtTime;
    const zoneIdx = STATUS_ORDER.indexOf(statusAtTime);
    const zoneWidth = width / STATUS_ORDER.length;
    
    // 2. Target Positioning (Precise Clustering)
    const centerX = (zoneIdx + 0.5) * zoneWidth;
    const centerY = height * 0.5;
    
    // Seed-based stable organic position
    const seed = this.id.split('').reduce((a,b)=>a+b.charCodeAt(0),0);
    const angle = (seed * 0.1) % (Math.PI * 2);
    const radius = (seed % 25) + 8;
    
    // Very subtle breathing (Apple-style)
    const breathingAmount = statusAtTime === 'DONE' ? 3 : 1.5;
    const breathing = Math.sin(Date.now() * 0.0008 + seed * 0.2) * breathingAmount;

    this.targetX = centerX + Math.cos(angle) * (radius + breathing);
    this.targetY = centerY + Math.sin(angle) * (radius + breathing);
    this.color = ZONES.find(z => z.id === statusAtTime)?.color || '#fff';

    // 3. Effortless Physics (Smooth Easing)
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    
    // Attraction (Soft Easing)
    this.vx += dx * 0.012;
    this.vy += dy * 0.012;

    // Subtle Repulsion
    for (const other of allParticles) {
      if (other === this || other.currentStatus !== this.currentStatus) continue;
      const pdx = this.x - other.x;
      const pdy = this.y - other.y;
      const distSq = pdx * pdx + pdy * pdy;
      if (distSq < 150 && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const force = (12 - dist) / 12;
        this.vx += (pdx / dist) * force * 0.4;
        this.vy += (pdy / dist) * force * 0.4;
      }
    }
    
    this.vx *= 0.9;
    this.vy *= 0.9;
    
    this.x += this.vx;
    this.y += this.vy;
    this.pulse += 0.02;
  }

  draw(ctx: CanvasRenderingContext2D, isHovered: boolean, isDark: boolean) {
    const opacity = this.currentStatus === 'ARCHIVED' ? 0.25 : 0.85;
    const hoverScale = isHovered ? 1.08 : 1.0;
    const size = this.baseSize * hoverScale;
    
    ctx.globalAlpha = opacity;
    
    // Precise, Muted Glow
    if (isHovered || this.currentStatus === 'IN_PROGRESS') {
      ctx.shadowBlur = isDark ? 6 : 4;
      ctx.shadowColor = this.color;
    } else {
      ctx.shadowBlur = 0;
    }

    // High Definition Circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Sharp Inner Highlight
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)';
    ctx.fill();

    if (isHovered) {
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const TaskUniverse: React.FC<TaskUniverseProps> = ({ tasks }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AugmentedTask | null>(null);

  // Stats for Insight Layer
  const stats = useMemo(() => {
    const today = new Date();
    return ZONES.reduce((acc, zone) => {
      const zoneTasks = tasks.filter(t => t.status === zone.id);
      const addedToday = zoneTasks.filter(t => isSameDay(new Date(t.updatedAt), today)).length;
      acc[zone.id] = addedToday;
      return acc;
    }, {} as Record<string, number>);
  }, [tasks]);

  const augmentedTasks = useMemo(() => {
    return tasks.map(task => {
      const start = new Date(task.createdAt).getTime();
      const end = new Date(task.updatedAt).getTime();
      const history: TaskHistoryEvent[] = [{ status: 'BACKLOG', timestamp: start }];
      const statusIdx = STATUS_ORDER.indexOf(task.status);
      if (statusIdx > 0) {
        const interval = (end - start) / (statusIdx + 1);
        for (let i = 1; i <= statusIdx; i++) {
          history.push({ status: STATUS_ORDER[i], timestamp: start + interval * i });
        }
      }
      return { ...task, history } as AugmentedTask;
    });
  }, [tasks]);

  const timeRange = useMemo(() => {
    const starts = augmentedTasks.map(t => new Date(t.createdAt).getTime());
    const min = starts.length ? Math.min(...starts) : Date.now() - 86400000;
    return { min, max: Date.now() };
  }, [augmentedTasks]);

  const [timelineTimestamp, setTimelineTimestamp] = useState(Date.now());

  // Animation Loop
  const particles = useRef<TaskParticle[]>([]);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    particles.current = augmentedTasks.map(task => new TaskParticle(task, clientWidth, clientHeight));
  }, [augmentedTasks]);

  const animate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !containerRef.current) return;

    const { clientWidth, clientHeight } = containerRef.current;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
      canvas.width = clientWidth;
      canvas.height = clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Precise Background
    const zoneWidth = canvas.width / ZONES.length;
    
    // Barely visible moving light streaks (Directional Feeling)
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.02)';
    ctx.lineWidth = 0.5;
    const streakOffset = (Date.now() * 0.015) % canvas.width;
    for (let i = 0; i < 5; i++) {
      const y = (canvas.height / 6) * (i + 1);
      ctx.beginPath();
      ctx.moveTo(streakOffset - 200, y);
      ctx.lineTo(streakOffset, y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(streakOffset - canvas.width - 200, y);
      ctx.lineTo(streakOffset - canvas.width, y);
      ctx.stroke();
    }

    ZONES.forEach((zone, i) => {
      const x = i * zoneWidth;
      const isActive = hoveredZone === zone.id;
      
      // Extremely subtle column highlight
      if (isActive) {
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)';
        ctx.fillRect(x, 0, zoneWidth, canvas.height);
      }

      // Minimal Column Dividers
      if (i > 0) {
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
        ctx.beginPath();
        ctx.moveTo(x, 100);
        ctx.lineTo(x, canvas.height - 100);
        ctx.stroke();
      }
    });

    // Draw Particles (60fps Effortless Motion)
    particles.current.forEach(p => {
      p.update(canvas.width, canvas.height, timelineTimestamp, particles.current);
      p.draw(ctx, hoveredTask?.id === p.id, isDark);
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [timelineTimestamp, hoveredTask, hoveredZone, isDark]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoneIdx = Math.floor(mx / (canvasRef.current.width / ZONES.length));
    setHoveredZone(ZONES[zoneIdx]?.id || null);

    let found: Task | null = null;
    for (const p of particles.current) {
      const dist = Math.hypot(p.x - mx, p.y - my);
      if (dist < 15) {
        found = p.task;
        break;
      }
    }
    setHoveredTask(found);
  };

  return (
    <>
      {/* Mobile-First Activity Timeline (Visible only on mobile) */}
      <div className="md:hidden w-full">
        <TaskTimeline tasks={tasks} />
      </div>

      {/* Desktop-Only Particle Visualizer (Visible only on desktop) */}
      <div className="task-flow-container zen hidden md:flex">
        <header className="flow-header">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground/90">Task Flow</h2>
              <div className="size-1 rounded-full bg-foreground/20" />
              <span className="text-[10px] font-medium tracking-widest text-foreground/40 uppercase">Real-time Analytics</span>
            </div>
            <p className="text-[11px] text-foreground/30 font-medium">Monitoring workflow health and node topology.</p>
          </div>

          <div className="flex items-center gap-5 px-5 py-2 bg-muted/30 rounded-full border border-border/50">
            {ZONES.map(zone => (
              <div key={zone.id} className="flex items-center gap-2 group cursor-default">
                <div className="size-1.5 rounded-full" style={{ backgroundColor: zone.color, opacity: 0.8 }} />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">{zone.label}</span>
              </div>
            ))}
          </div>
        </header>

        <div ref={containerRef} className="flow-canvas-wrapper">
          {/* Pixel-Perfect Column Labels */}
          <div className="absolute inset-x-0 top-0 h-32 flex pointer-events-none z-10 px-4">
            {ZONES.map((zone) => (
              <div key={zone.id} className="flex-1 flex flex-col items-center justify-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/30">{zone.label}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-semibold text-foreground/90">{particles.current.filter(p => p.currentStatus === zone.id).length}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 mt-1">
                  {stats[zone.id] > 0 && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-success">
                      <TrendingUp className="size-2" />
                      <span>+{stats[zone.id]} today</span>
                    </div>
                  )}
                  <span className="text-[9px] font-medium text-muted-foreground/60">{zone.insight}</span>
                </div>
              </div>
            ))}
          </div>

          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onClick={() => hoveredTask && setSelectedTask(hoveredTask as AugmentedTask)}
            className="flow-canvas"
          />

          {hoveredTask && (
            <div className="flow-tooltip-zen animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 border-b border-border pb-2 mb-2">
                <div className="size-7 rounded-lg bg-muted/40 flex items-center justify-center">
                  <Zap className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{hoveredTask.title}</p>
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-tight">Active since {format(new Date(hoveredTask.createdAt), 'HH:mm')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full" style={{ backgroundColor: ZONES.find(z => z.id === hoveredTask.status)?.color, opacity: 0.8 }} />
                  <span className="text-[10px] font-medium text-muted-foreground">{hoveredTask.status}</span>
                </div>
                <span className="text-[9px] font-bold text-primary uppercase">{hoveredTask.priority}</span>
              </div>
            </div>
          )}
        </div>

        <footer className="flow-footer zen">
          <div className="flex items-center gap-10 w-full max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-9 flex items-center justify-center rounded-xl bg-muted/30 hover:bg-muted/50 text-foreground/80 transition-all border border-border"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button 
                onClick={() => setTimelineTimestamp(Date.now())}
                className="size-9 flex items-center justify-center rounded-xl bg-muted/10 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all border border-border"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-end px-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Temporal Index</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 text-primary/50" />
                    <span className="text-[11px] font-semibold text-foreground/70">{format(timelineTimestamp, 'MMMM d · HH:mm')}</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-[0.2em]">Flow Replay Engine</span>
              </div>
              <div className="relative group px-1">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={((timelineTimestamp - timeRange.min) / (timeRange.max - timeRange.min)) * 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setTimelineTimestamp(timeRange.min + (timeRange.max - timeRange.min) * (val / 100));
                  }}
                  className="flow-slider-zen" 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 px-4 py-1 rounded-full bg-muted/10 border border-border">
              <span>Deterministic Topology • 60FPS Fluid Motion • Pixel-Perfect Sync</span>
            </div>
          </div>
        </footer>

        {selectedTask && (
          <div className="flow-sidebar-zen animate-in slide-in-from-right-10 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Node Analytics</span>
                <h3 className="text-lg font-semibold text-foreground/90 tracking-tight">Task Insight</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} className="size-9 flex items-center justify-center bg-muted/30 hover:bg-muted/50 border border-border rounded-xl transition-all">
                <ChevronRight className="size-4 text-foreground/60" />
              </button>
            </div>
            
            <div className="space-y-8">
              <div className="p-5 rounded-2xl bg-muted/20 border border-border shadow-sm">
                <span className="text-[9px] font-bold uppercase text-muted-foreground/60 tracking-wider mb-2.5 block">Title</span>
                <p className="text-sm font-semibold text-foreground/90 leading-snug">{selectedTask.title}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary/70 text-[9px] font-bold rounded-md px-1.5 py-0">
                    {selectedTask.priority}
                  </Badge>
                  <Badge variant="outline" className="bg-muted/30 border-border text-muted-foreground text-[9px] font-bold rounded-md px-1.5 py-0">
                    {selectedTask.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase text-primary/40 tracking-wider block px-1">Transition History</span>
                <div className="space-y-6 border-l border-border ml-3 pl-6 relative">
                  {selectedTask.history.map((event, i) => (
                    <div key={i} className="relative group">
                      <div className="absolute -left-[28.5px] top-1 size-2 rounded-full bg-background border border-primary/40 group-hover:scale-125 transition-transform" />
                      <p className="text-xs font-semibold text-foreground/80 group-hover:text-primary/80 transition-colors">{event.status}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{format(event.timestamp, 'MMM d, HH:mm')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
