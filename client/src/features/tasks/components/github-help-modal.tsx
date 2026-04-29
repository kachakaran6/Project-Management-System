"use client";

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
      icon: <GitBranch className="size-4 text-blue-500" />,
      color: "blue"
    },
    {
      id: "02",
      title: "Open Pull Request",
      status: "IN REVIEW",
      desc: "Include the Task ID in your PR title or description.",
      example: `${taskCode} Add login API`,
      icon: <GitPullRequest className="size-4 text-purple-500" />,
      color: "purple"
    },
    {
      id: "03",
      title: "Merge PR",
      status: "DONE",
      desc: "Merging your PR will automatically complete the task.",
      example: "Merged PR #42",
      icon: <CheckCircle2 className="size-4 text-emerald-500" />,
      color: "emerald"
    }
  ];

  const keywords = {
    done: ["fix", "close", "resolve", "done", "finish", "implement"],
    progress: ["start", "working", "feat", "refactor", "chore", "progress"]
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border/40 shadow-2xl rounded-[40px] p-0 overflow-hidden">
        <div className="p-10 space-y-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <div className="flex items-center gap-5 mb-2">
              <div className="p-4 rounded-[20px] bg-primary/10 text-primary shadow-inner rotate-3">
                <Github className="size-8" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tighter">GitHub Automation Guide</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground font-medium">Master the professional Task → Code workflow.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Step by Step Workflow */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/60 px-1 flex items-center gap-2">
              <Zap className="size-4" /> The Lifecycle Workflow
            </h4>

            <div className="grid gap-6">
              {steps.map((step) => (
                <div key={step.id} className="relative group flex gap-6 p-6 rounded-[28px] border border-border/40 bg-muted/5 hover:bg-muted/10 transition-all">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 font-black text-4xl text-muted-foreground/5 italic pointer-events-none uppercase tracking-tighter">
                    {step.id}
                  </div>

                  <div className={cn(
                    "size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                    step.color === 'blue' && "bg-blue-500/10 text-blue-500 shadow-blue-500/10",
                    step.color === 'purple' && "bg-purple-500/10 text-purple-500 shadow-purple-500/10",
                    step.color === 'emerald' && "bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10",
                  )}>
                    {step.icon}
                  </div>

                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h5 className="font-black text-lg tracking-tight">{step.title}</h5>
                      <Badge className={cn(
                        "h-5 px-2 rounded-full border-none text-[9px] font-black text-white",
                        step.color === 'blue' && "bg-blue-500",
                        step.color === 'purple' && "bg-purple-500",
                        step.color === 'emerald' && "bg-emerald-500",
                      )}>
                        → {step.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">{step.desc}</p>

                    <div className="mt-4 p-3 rounded-xl bg-background/80 border border-border/40 flex items-center justify-between group/code">
                      <code className="text-[11px] font-mono font-bold text-primary truncate pr-4">
                        {step.example}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-black opacity-0 group-hover/code:opacity-100 transition-opacity"
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
          <div className="p-8 rounded-[32px] bg-primary/5 border border-primary/10 space-y-6">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary" />
              <h4 className="text-sm font-black uppercase tracking-widest text-primary">Commit Keyword Fallback</h4>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600/70">To Finish Task</span>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.done.map(kw => (
                    <code key={kw} className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold border border-emerald-500/20">
                      {kw}
                    </code>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600/70">To Start Task</span>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.progress.map(kw => (
                    <code key={kw} className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 font-mono text-[10px] font-bold border border-blue-500/20">
                      {kw}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-primary/10">
              <p className="text-[11px] text-muted-foreground font-medium">
                <span className="font-black text-foreground">Rule:</span> Combine keyword + Task ID in any order.
                <br />Example: <code className="bg-background/50 px-1.5 rounded text-foreground italic">git commit -m "feat: {taskCode} add stripe integration"</code>
              </p>
            </div>
          </div>

          {/* Pro Tips / Safety */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-[24px] border border-border/40 bg-muted/5 space-y-2">
              <div className="flex items-center gap-2 text-foreground/80">
                <Zap className="size-3.5" />
                <h6 className="text-[10px] font-black uppercase tracking-widest">Priority Flow</h6>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                Merge events have the highest priority, followed by PR status, Branch creation, and then Commit keywords.
              </p>
            </div>
            <div className="p-5 rounded-[24px] border border-border/40 bg-muted/5 space-y-2">
              <div className="flex items-center gap-2 text-foreground/80">
                <Info className="size-3.5" />
                <h6 className="text-[10px] font-black uppercase tracking-widest">Safety Guard</h6>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                The system never downgrades a status (e.g., a branch creation won't move a DONE task back to Progress).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button
              className="flex-1 rounded-[20px] font-black uppercase tracking-widest text-[11px] h-14 shadow-xl shadow-primary/20"
              onClick={() => onOpenChange(false)}
            >
              Got it, let's build!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
