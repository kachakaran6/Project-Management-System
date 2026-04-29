"use client";

import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { 
  CalendarDays, 
  Layers, 
  Users, 
  Clock, 
  Info,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface ProjectOverviewProps {
  projectId: string;
}

export function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const { data: projectResult, isLoading } = useProjectQuery(projectId);
  const project = projectResult?.data;

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;
  if (!project) return <p className="text-sm text-muted-foreground py-4">Project not found.</p>;

  const members = project.members || [];
  const techStack = project.techStack || [];
  const stats = project.taskStats || { total: 0, completed: 0, percent: 0 };
  const pending = stats.total - stats.completed;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* LEFT: MAIN CONTENT */}
      <div className="space-y-4">
        {/* DESCRIPTION CARD */}
        <Card className="rounded-xl border-0 ring-1 ring-border/10 bg-card/30 backdrop-blur-xl overflow-hidden hover:ring-primary/15 transition-all duration-300">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-black flex items-center gap-2 tracking-tight text-foreground/80">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Info className="size-3.5" />
              </div>
              Description
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className={cn(
              "text-[13px] leading-relaxed whitespace-pre-wrap",
              project.description ? "text-foreground/75" : "text-muted-foreground/40 italic"
            )}>
              {project.description || "No description provided yet."}
            </p>
          </CardContent>
        </Card>

        {/* INSIGHT CARDS */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-0.5">
            <TrendingUp className="size-3.5 text-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Insights</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <InsightCard label="Total" value={stats.total} icon={<Layers className="size-3.5" />} color="bg-blue-500/10 text-blue-500" />
            <InsightCard label="Done" value={stats.completed} icon={<CheckCircle2 className="size-3.5" />} color="bg-emerald-500/10 text-emerald-500" />
            <InsightCard label="Pending" value={pending} icon={<Clock className="size-3.5" />} color="bg-amber-500/10 text-amber-500" />
            <InsightCard label="Progress" value={`${stats.percent}%`} icon={<TrendingUp className="size-3.5" />} color="bg-primary/10 text-primary" />
          </div>
        </div>

        {/* TECH STACK */}
        {techStack.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-0.5">
              <Layers className="size-3.5 text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Tech Stack</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {techStack.map((tech) => (
                <Badge
                  key={tech}
                  variant="secondary"
                  className="px-3 py-1 rounded-lg bg-card/40 hover:bg-primary hover:text-white transition-all border border-border/10 font-bold text-[10px] uppercase tracking-wide cursor-default"
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: SIDEBAR */}
      <div className="space-y-4">
        <div className="md:sticky md:top-16 space-y-4">
          {/* KEY INFO CARD */}
          <Card className="rounded-xl border-0 ring-1 ring-border/10 bg-card/30 backdrop-blur-xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-5 border-b border-border/5">
              <CardTitle className="text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground/40">
                Key Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-4">
              <InfoItem icon={<CalendarDays className="size-3.5" />} label="Timeline" value={
                `${project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "TBD"} — ${project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "TBD"}`
              } />
              <InfoItem icon={<Clock className="size-3.5" />} label="Created" value={format(new Date(project.createdAt), "MMM d, yyyy")} />

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-black text-muted-foreground/30 tracking-widest">Progress</span>
                  <span className="font-black text-primary text-[11px]">{stats.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden ring-1 ring-border/5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700 rounded-full"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
              </div>

              <Separator className="bg-border/8" />

              {/* TEAM MEMBERS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-widest">Team</h4>
                  <Badge variant="outline" className="h-4 text-[8px] font-black bg-muted/10 border-border/20 px-1.5 rounded-md">
                    {members.length}
                  </Badge>
                </div>
                <div className="space-y-2.5">
                  {members.slice(0, 6).map((member: any) => (
                    <div key={member.user.id || member.user._id} className="flex items-center gap-2.5 group cursor-default">
                      <Avatar className="size-7 ring-1 ring-border/20 transition-all group-hover:ring-primary/30">
                        <AvatarImage src={member.user.avatarUrl} />
                        <AvatarFallback className="text-[9px] font-black bg-primary/5 text-primary">
                          {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold truncate text-foreground/85 group-hover:text-primary transition-colors">
                          {member.user.firstName} {member.user.lastName}
                        </span>
                        <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest opacity-50">{member.role}</span>
                      </div>
                    </div>
                  ))}
                  {members.length > 6 && (
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-muted/20 border border-border/10 flex items-center justify-center text-[9px] font-black text-muted-foreground/50">
                        +{members.length - 6}
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">More</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="rounded-md border-0 ring-1 ring-border/10 bg-card/20 backdrop-blur-md p-3 hover:ring-primary/20 transition-all group overflow-hidden relative">
      <div className={cn("p-1.5 rounded-sm w-fit mb-2", color)}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mb-0.5">{label}</span>
        <span className="text-lg font-black tracking-tight">{value}</span>
      </div>
    </Card>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="p-1.5 rounded-sm bg-muted/20 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] uppercase font-black text-muted-foreground/30 tracking-widest mb-0.5">{label}</span>
        <span className="font-bold text-[12px] text-foreground/85 leading-tight break-words">{value}</span>
      </div>
    </div>
  );
}
