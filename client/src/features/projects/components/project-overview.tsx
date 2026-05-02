
import { useProjectQuery } from "@/features/projects/hooks/use-projects-query";
import { Info, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStats } from "./details/project-stats";

interface ProjectOverviewProps {
  projectId: string;
}

export function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const { data: projectResult, isLoading } = useProjectQuery(projectId);
  const project = projectResult?.data;

  if (isLoading) return <div className="space-y-6">
    <div className="h-32 bg-muted/20 animate-pulse rounded-xl" />
    <div className="grid grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-xl" />)}
    </div>
  </div>;
  
  if (!project) return null;

  const stats = project.taskStats || { total: 0, completed: 0, percent: 0 };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* DESCRIPTION CARD */}
      <Card className="rounded-xl border border-border/10 bg-card/30 backdrop-blur-xl overflow-hidden shadow-none">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Info className="size-3.5 text-primary" />
            Project Description
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className={cn(
            "text-sm leading-relaxed",
            project.description ? "text-foreground/80" : "text-muted-foreground/40 italic"
          )}>
            {project.description || "No description provided yet."}
          </p>
        </CardContent>
      </Card>

      {/* INSIGHTS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="size-3.5 text-primary" />
          <h3 className="text-sm font-medium text-muted-foreground">Insights</h3>
        </div>
        <ProjectStats stats={stats} />
      </div>
    </div>
  );
}
