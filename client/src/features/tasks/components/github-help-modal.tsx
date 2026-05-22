
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GithubIcon as Github } from "@/components/icons/github-icon";
import {
  GitCommit,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  Clock3,
  History,
  Sparkles,
  Zap,
  Info,
  // Badge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GithubHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskCode?: string;
}

export function GithubHelpModal({ open, onOpenChange, taskCode = "PMS-123" }: GithubHelpModalProps) {
  const steps = [
    {
      id: "01",
      title: "Branch Creation",
      status: "IN PROGRESS",
      desc: "Start working by creating a branch with the Task ID.",
      example: `feature/${taskCode}-auth-flow`,
      icon: <GitBranch className="size-4" />,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20"
    },
    {
      id: "02",
      title: "Open Pull Request",
      status: "IN REVIEW",
      desc: "Include the Task ID in your PR title or description.",
      example: `${taskCode} Add login API`,
      icon: <GitPullRequest className="size-4" />,
      color: "bg-purple-500/10 text-purple-500 border-purple-500/20"
    },
    {
      id: "03",
      title: "Merge PR",
      status: "DONE",
      desc: "Merging your PR will automatically complete the task.",
      example: "Merged PR #42",
      icon: <CheckCircle2 className="size-4" />,
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    }
  ];

  const keywords = {
    done: ["fix", "close", "resolve", "done", "finish", "implement"],
    progress: ["start", "working", "feat", "refactor", "chore", "progress"]
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border/40 shadow-2xl rounded-md p-0 overflow-hidden">
        <div className="max-h-[90vh] overflow-y-auto custom-scrollbar relative">
          
          {/* Decorative Header with pattern */}
          <div className="h-32 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden shrink-0">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-6 left-8 flex items-center gap-4">
              <div className="size-12 rounded-md bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl rotate-3">
                <Github className="size-7" />
              </div>
              <div className="text-white">
                <DialogTitle className="text-2xl font-black tracking-tight leading-tight">GitHub Automation Guide</DialogTitle>
                <DialogDescription className="text-sm font-medium text-white/80">Master the professional Task → Code workflow.</DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Step by Step Workflow */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Zap className="size-4" /> The Lifecycle Workflow
              </h4>

              <div className="grid gap-4">
                {steps.map((step) => (
                  <div key={step.id} className="relative group flex gap-5 p-5 rounded-md border border-border/40 bg-card hover:bg-muted/10 transition-colors">
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 font-black text-3xl text-muted-foreground/10 italic pointer-events-none uppercase tracking-tight">
                      {step.id}
                    </div>

                    <div className={cn("size-10 rounded-sm flex items-center justify-center shrink-0 border", step.color)}>
                      {step.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <h5 className="font-bold text-base text-foreground tracking-tight">{step.title}</h5>
                        <Badge variant="outline" className={cn("h-5 px-2 rounded-xs text-[9px] font-black uppercase tracking-widest", step.color)}>
                          {step.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mb-3">{step.desc}</p>

                      <div className="p-2.5 rounded-sm bg-muted/40 border border-border/60 flex items-center justify-between group/code">
                        <code className="text-[11px] font-mono font-bold text-foreground/80 truncate pr-4">
                          {step.example}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-foreground opacity-0 group-hover/code:opacity-100 transition-opacity"
                          onClick={() => {
                            navigator.clipboard.writeText(step.example);
                            toast.success("Example copied!");
                          }}
                        >
                          COPY
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Keyword Magic */}
            <div className="p-6 rounded-md bg-muted/30 border border-border/40 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h4 className="text-sm font-bold tracking-tight text-foreground">Commit Keyword Fallback</h4>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80">To Finish Task</span>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.done.map(kw => (
                      <code key={kw} className="px-2 py-1 rounded-xs bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold border border-emerald-500/20">
                        {kw}
                      </code>
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600/80">To Start Task</span>
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.progress.map(kw => (
                      <code key={kw} className="px-2 py-1 rounded-xs bg-blue-500/10 text-blue-600 font-mono text-[10px] font-bold border border-blue-500/20">
                        {kw}
                      </code>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Rule:</span> Combine keyword + Task ID in any order.
                  <br />Example: <code className="bg-background px-1.5 py-0.5 rounded-sm border border-border/40 text-foreground text-[10px] font-mono ml-1">git commit -m "feat: {taskCode} add stripe integration"</code>
                </p>
              </div>
            </div>

            {/* Pro Tips / Safety */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-md border border-border/40 bg-card space-y-1.5">
                <div className="flex items-center gap-2 text-foreground">
                  <Zap className="size-3.5" />
                  <h6 className="text-[11px] font-bold tracking-tight">Priority Flow</h6>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Merge events have the highest priority, followed by PR status, Branch creation, and then Commit keywords.
                </p>
              </div>
              <div className="p-4 rounded-md border border-border/40 bg-card space-y-1.5">
                <div className="flex items-center gap-2 text-foreground">
                  <Info className="size-3.5" />
                  <h6 className="text-[11px] font-bold tracking-tight">Safety Guard</h6>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The system never downgrades a status (e.g., a branch creation won't move a DONE task back to Progress).
                </p>
              </div>
            </div>

            <Button
              className="w-full rounded-sm font-bold text-sm h-12 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all group"
              onClick={() => onOpenChange(false)}
            >
              Got it, let's build
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
