
import React, { useState, useEffect } from "react";
import { GithubIcon as Github } from "@/components/icons/github-icon";
import { X, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GithubOnboardingBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("github-onboarding-dismissed");
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("github-onboarding-dismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="mx-4 md:mx-6 mt-4 animate-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden rounded-button border border-primary/20 bg-primary/5 px-6 py-5 shadow-2xl shadow-primary/5">
        {/* Background Sparkles */}
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="size-24 text-primary" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="shrink-0 size-14 rounded-button bg-background border border-border/40 shadow-xl flex items-center justify-center text-primary transform -rotate-3">
            <Github className="size-8" />
          </div>

          <div className="flex-1 space-y-1.5 text-center md:text-left">
            <h3 className="text-lg font-black tracking-tight text-foreground">
              Link Your GitHub Workflow 🚀
            </h3>
            <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
              Supercharge your productivity by linking commits, PRs, and branches directly to your tasks. 
              Just include the <span className="text-primary font-black">Task ID</span> (e.g. PMS-123) in your GitHub activity.
            </p>
          </div>

          <div className="flex items-center gap-3">
             <Button 
              className="rounded-button font-black uppercase tracking-widest text-[11px] h-10 px-6 shadow-lg shadow-primary/20"
              onClick={handleDismiss}
            >
              Got it!
            </Button>
            <button 
              onClick={handleDismiss}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
