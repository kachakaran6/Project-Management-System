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
  Layout,
  Link2,
  ShieldCheck
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-md bg-background">
        <div className="relative">
          {/* Decorative Header with pattern */}
          <div className="h-28 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute bottom-4 left-6">
              <div className="flex items-center gap-2 px-3 py-1 rounded-xs bg-primary/10 text-primary w-fit border border-primary/20 backdrop-blur-md bg-white/10">
                <Github className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">GitHub Integration</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1 tracking-tight">Welcome to Orbit</h2>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid gap-4">
              {[
                { 
                  icon: <Link2 className="size-5" />, 
                  title: "Link Repositories", 
                  desc: "Connect your GitHub repos to workspace projects effortlessly.",
                  color: "bg-blue-500/10 text-blue-500"
                },
                { 
                  icon: <GitBranch className="size-5" />, 
                  title: "Smart Tracking", 
                  desc: "Tasks move to 'In Progress' automatically when you create a branch.",
                  color: "bg-emerald-500/10 text-emerald-500"
                },
                { 
                  icon: <ShieldCheck className="size-5" />, 
                  title: "Sync History", 
                  desc: "See commit logs and PR activity directly inside your tasks.",
                  color: "bg-purple-500/10 text-purple-500"
                }
              ].map((feature, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className={cn(
                    "size-10 rounded-sm shrink-0 flex items-center justify-center transition-all group-hover:scale-110",
                    feature.color
                  )}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-0.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/30 p-4 rounded-md border border-border/40">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-2">
                <span className="flex size-5 items-center justify-center rounded-xs bg-primary text-primary-foreground text-[10px]">!</span>
                Pro Tip: Task Automation
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Include the Task ID (e.g., <code className="bg-primary/10 text-primary px-1 rounded-xs">PMS-123</code>) in your branch name or commit message to link activity automatically.
              </p>
            </div>

            <Button 
              onClick={handleClose}
              className="w-full h-12 rounded-sm bg-primary text-primary-foreground font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all group"
            >
              Get Started
              <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
