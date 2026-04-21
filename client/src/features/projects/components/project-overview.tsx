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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-3xl border-border/40 shadow-sm bg-card/30 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Info className="size-4 text-primary" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {project.description || "No description provided for this project."}
            </p>
          </CardContent>
        </Card>

        {techStack.length > 0 && (
          <Card className="rounded-3xl border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Tech Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech) => (
                  <Badge key={tech} variant="secondary" className="px-3 py-1 rounded-lg bg-primary/5 hover:bg-primary/10 border-primary/10 font-medium">
                    {tech}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card className="rounded-3xl border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm uppercase tracking-widest font-bold text-muted-foreground/70">
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays className="size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Timeline</span>
                  <span className="font-medium">
                    {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "TBD"}
                    {" — "}
                    {project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "TBD"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Created</span>
                  <span className="font-medium">{format(new Date(project.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/60">Progress</span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-xs">{project.taskStats?.completed || 0} / {project.taskStats?.total || 0} Tasks</span>
                    <span className="font-bold text-primary">{project.taskStats?.percent || 0}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${project.taskStats?.percent || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="opacity-40" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Team Members</h4>
                <Badge variant="outline" className="h-5 text-[10px]">{members.length}</Badge>
              </div>
              <div className="space-y-3">
                {members.map((member: any) => (
                  <div key={member.user.id || member.user._id} className="flex items-center gap-3">
                    <Avatar className="size-8 ring-1 ring-border/20">
                      <AvatarImage src={member.user.avatarUrl} />
                      <AvatarFallback className="text-[10px]">
                        {member.user.firstName?.[0]}{member.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">
                        {member.user.firstName} {member.user.lastName}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase opacity-80">{member.role}</span>
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
