
import React from "react";
import { Layers, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/10 bg-card/30 hover:bg-card/50 transition-all">
      <div className={cn("size-7 rounded-lg flex items-center justify-center", color)}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}

interface ProjectStatsProps {
  stats: {
    total: number;
    completed: number;
    percent: number;
  };
}

export function ProjectStats({ stats }: ProjectStatsProps) {
  const pending = stats.total - stats.completed;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard 
        label="Total Tasks" 
        value={stats.total} 
        icon={<Layers className="size-3.5" />} 
        color="bg-blue-500/10 text-blue-500" 
      />
      <StatCard 
        label="Completed" 
        value={stats.completed} 
        icon={<CheckCircle2 className="size-3.5" />} 
        color="bg-emerald-500/10 text-emerald-500" 
      />
      <StatCard 
        label="Pending" 
        value={pending} 
        icon={<Clock className="size-3.5" />} 
        color="bg-amber-500/10 text-amber-500" 
      />
      <StatCard 
        label="Progress" 
        value={`${stats.percent}%`} 
        icon={<TrendingUp className="size-3.5" />} 
        color="bg-primary/10 text-primary" 
      />
    </div>
  );
}
