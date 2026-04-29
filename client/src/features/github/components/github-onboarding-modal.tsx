"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, 
  GitBranch, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Command,
  Layout
} from "lucide-react";
import { GithubIcon as Github } from "@/components/icons/github-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const GithubOnboardingModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("pms_github_onboarding_v1");
    if (!hasSeenOnboarding) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("pms_github_onboarding_v1", "true");
    setIsOpen(false);
  };

  const steps = [
    {
      icon: Github,
      title: "Connect & Link",
      description: "Authorize your account and link repositories to your workspace with one click.",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      icon: Command,
      title: "Use Task Codes",
      description: "Include IDs like 'PMS-123' in your commits or branches to enable automation.",
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      icon: Zap,
      title: "Auto-Automation",
      description: "Tasks move through 'Done' or 'Review' automatically based on your code activity.",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-background">
        <div className="relative p-6 sm:p-8 space-y-6">
          {/* Header Visual */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Github className="size-48 rotate-12" />
          </div>

          <DialogHeader className="relative z-10 space-y-3 text-left">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary w-fit border border-primary/20">
              <Sparkles className="size-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">New Experience</span>
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
              Developer <br />Control Center
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed max-w-[340px]">
              Your GitHub workflow is now seamlessly integrated with your workspace tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 group">
                <div className={cn(
                  "size-10 rounded-2xl shrink-0 flex items-center justify-center transition-all group-hover:scale-110",
                  step.bg,
                  step.color
                )}>
                  <step.icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground leading-none">{step.title}</h4>
                  <p className="text-[11px] font-medium text-muted-foreground leading-normal">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleClose}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all group"
            >
              Get Started
              <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-center mt-4 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Ready to automate your workflow?
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
