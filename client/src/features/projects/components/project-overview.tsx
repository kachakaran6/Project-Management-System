"use client";

import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { 
  CalendarDays, 
  Layers, 
  Users, 
  Clock, 
  Info,
  CheckCircle2,
  Circle
} from "lucide-react";
import { format } from "date-fns";
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

  if (isLoading) return <p>Loading project details...</p>;
  if (!project) return <p>Project not found.</p>;

  const members = project.members || [];
  const techStack = project.techStack || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-2 space-y-8">
        <Card className="rounded-[2.5rem] border-border/40 shadow-sm bg-card/30 backdrop-blur-xl overflow-hidden border-0 ring-1 ring-border/10">
          <CardHeader className="pb-4 pt-8 px-8">
            <CardTitle className="text-xl font-black flex items-center gap-3 tracking-tight">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <Info className="size-5" />
              </div>
              Project Description
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <p className="text-[15px] leading-relaxed text-muted-foreground/90 font-medium whitespace-pre-wrap">
              {project.description || "No description provided for this project."}
            </p>
          </CardContent>
        </Card>
 
        {techStack.length > 0 && (
          <Card className="rounded-[2.5rem] border-border/40 shadow-sm bg-card/30 backdrop-blur-xl border-0 ring-1 ring-border/10">
            <CardHeader className="pb-4 pt-8 px-8">
              <CardTitle className="text-xl font-black flex items-center gap-3 tracking-tight">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <Layers className="size-5" />
                </div>
                Technology Stack
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-10">
              <div className="flex flex-wrap gap-2.5">
                {techStack.map((tech) => (
                  <Badge key={tech} variant="secondary" className="px-4 py-1.5 rounded-xl bg-muted/20 hover:bg-primary hover:text-white transition-all border-0 font-bold text-[11px] uppercase tracking-wider cursor-default">
                    {tech}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-8">
        <Card className="rounded-[2.5rem] border-border/40 shadow-sm bg-card/30 backdrop-blur-xl border-0 ring-1 ring-border/10">
          <CardHeader className="pb-4 pt-8 px-8">
            <CardTitle className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground/40">
              Key Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-8">
            <div className="space-y-5">
              <div className="flex items-center gap-4 group">
                <div className="p-2 rounded-xl bg-muted/20 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <CalendarDays className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-black text-muted-foreground/30 tracking-widest mb-0.5">Timeline</span>
                  <span className="font-bold text-[13px]">
                    {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "TBD"}
                    {" — "}
                    {project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "TBD"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="p-2 rounded-xl bg-muted/20 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Clock className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-black text-muted-foreground/30 tracking-widest mb-0.5">Created</span>
                  <span className="font-bold text-[13px]">{format(new Date(project.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>

              <div className="flex items-start gap-4 group pt-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="size-4" />
                </div>
                <div className="flex flex-col flex-1 gap-1">
                  <span className="text-[9px] uppercase font-black text-muted-foreground/30 tracking-widest">Progress</span>
                  <div className="flex items-center justify-between gap-4 mt-0.5">
                    <span className="font-bold text-xs">{project.taskStats?.completed || 0} / {project.taskStats?.total || 0} Tasks</span>
                    <span className="font-black text-primary text-sm">{project.taskStats?.percent || 0}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-muted/30 rounded-full overflow-hidden ring-1 ring-border/5">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                      style={{ width: `${project.taskStats?.percent || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-border/10" />

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase font-black text-muted-foreground/40 tracking-[0.2em]">Team Members</h4>
                <Badge variant="outline" className="h-5 text-[9px] font-black bg-muted/10 border-border/20">{members.length}</Badge>
              </div>
              <div className="space-y-4">
                {members.map((member: any) => (
                  <div key={member.user.id || member.user._id} className="flex items-center gap-3.5 group cursor-default">
                    <Avatar className="size-9 ring-1 ring-border/20 shadow-sm transition-all group-hover:ring-primary/40">
                      <AvatarImage src={member.user.avatarUrl} />
                      <AvatarFallback className="text-[10px] font-black bg-primary/5 text-primary">
                        {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[13px] font-bold truncate text-foreground/90 group-hover:text-primary transition-colors">
                        {member.user.firstName} {member.user.lastName}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
