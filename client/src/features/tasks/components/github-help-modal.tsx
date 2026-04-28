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
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GithubHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskCode?: string;
}

export function GithubHelpModal({ open, onOpenChange, taskCode = "PMS-123" }: GithubHelpModalProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const automationRules = [
    {
      title: "Move to DONE",
      keywords: ["fix", "close", "resolve", "done", "finish"],
      icon: <CheckCircle2 className="size-4 text-emerald-500" />,
      bg: "bg-emerald-500/5",
      border: "border-emerald-500/20"
    },
    {
      title: "Move to IN PROGRESS",
      keywords: ["start", "working", "feat", "refactor"],
      icon: <Clock3 className="size-4 text-blue-500" />,
      bg: "bg-blue-500/5",
      border: "border-blue-500/20"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-background border-border/40 shadow-2xl rounded-[32px] p-0 overflow-hidden">
        <div className="p-8 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Github className="size-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">GitHub Smart Linking</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground font-medium">Connect your code to your tasks automatically.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Core Concept */}
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex gap-4">
            <Sparkles className="size-6 text-primary shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-widest text-primary">How it works</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                Include your Task ID (<span className="font-bold text-foreground">{taskCode}</span>) in any GitHub activity. Our system scans your commits, branches, and PRs to link them instantly.
              </p>
            </div>
          </div>

          {/* Automation Rules */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
              <Zap className="size-3" /> Status Automation
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {automationRules.map((rule, idx) => (
                <div key={idx} className={cn("p-4 rounded-2xl border flex flex-col gap-3", rule.bg, rule.border)}>
                  <div className="flex items-center gap-2">
                    {rule.icon}
                    <span className="text-[11px] font-black uppercase tracking-wider">{rule.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rule.keywords.map(kw => (
                      <code key={kw} className="px-1.5 py-0.5 rounded bg-background/50 border border-border/20 text-[9px] font-mono">
                        {kw}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic px-1 flex items-center gap-1.5">
              <Info className="size-3" /> Example: <code className="bg-muted px-1 rounded not-italic">git commit -m "fix {taskCode} bug"</code>
            </p>
          </div>

          {/* Visual Effects */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1 flex items-center gap-2">
              <History className="size-3" /> Effects on Task
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-muted/5 group hover:bg-muted/10 transition-all">
                <div className="size-8 rounded-xl bg-background border border-border/40 flex items-center justify-center text-primary shrink-0 shadow-sm">
                  <Github className="size-4" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold leading-none">Activity Feed</h5>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">Detailed commit logs and PR links appear in the task side panel for full traceability.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-muted/5 group hover:bg-muted/10 transition-all">
                <div className="size-8 rounded-xl bg-background border border-border/40 flex items-center justify-center text-primary shrink-0 shadow-sm">
                  <Clock3 className="size-4" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold leading-none">Automatic Status Transitions</h5>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">Tasks move between "In Progress" and "Done" based on your commit keywords.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button 
              className="flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 shadow-lg shadow-primary/20"
              onClick={() => onOpenChange(false)}
            >
              Got it, let's code!
            </Button>
            <Button 
              variant="outline"
              className="rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-6"
              onClick={() => {
                 onOpenChange(false);
                 toast.info("Opening full guide...");
              }}
            >
              Full Guide
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
