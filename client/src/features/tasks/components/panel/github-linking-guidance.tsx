
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GithubIcon as Github } from "@/components/icons/github-icon";
import { Info, Copy, ExternalLink, GitCommit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GithubHelpModal } from "../github-help-modal";
import { cn } from "@/lib/utils";

interface GithubLinkingGuidanceProps {
  taskCode?: string;
  projectId?: string;
  isProjectConnected?: boolean;
}

export function GithubLinkingGuidance({ taskCode, projectId, isProjectConnected = true }: GithubLinkingGuidanceProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const router = useRouter();

  if (!taskCode) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied Task ID: ${text}`);
  };

  return (
    <div className="py-2 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Github className="size-4 opacity-70" />
          <span className="text-[11px] font-black uppercase tracking-widest">GitHub Linking</span>
        </div>
        <button 
          onClick={() => setIsHelpOpen(true)}
          className="p-1 rounded-sm hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
        >
          <Info className="size-3.5" />
        </button>
      </div>

      <div className="relative group">
        <div className="flex items-center justify-between p-3 rounded-md border border-border/40 bg-muted/5 group-hover:bg-muted/10 transition-all border-dashed">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Your Task ID</span>
            <span className="text-sm font-black tracking-tight text-foreground">{taskCode}</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => copyToClipboard(taskCode)}
            className="h-8 rounded-sm border border-border/10 bg-background/50 hover:bg-primary/10 hover:text-primary transition-all px-2.5 gap-1.5 shadow-sm"
          >
            <Copy className="size-3" />
            <span className="text-[10px] font-bold">COPY ID</span>
          </Button>
        </div>
      </div>

      {!isProjectConnected ? (
        <div className="p-2 rounded-sm bg-amber-500/5 border border-amber-500/10 flex items-center justify-between gap-3">
           <p className="text-[9px] text-amber-600 font-medium leading-tight max-w-[200px]">
            GitHub not connected. Activity tracking disabled.
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (projectId) {
                router.push(`/projects/${projectId}?edit=true&tab=github`);
              }
            }}
            className="h-6 w-fit text-[8px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-500/10 p-0 px-1 hover:no-underline border border-amber-500/20"
          >
            Link <ExternalLink className="ml-1 size-2" />
          </Button>
        </div>
      ) : (
        <p className="px-2 text-[10px] text-muted-foreground font-medium leading-relaxed opacity-70">
          Include <span className="font-bold text-foreground">{taskCode}</span> in your commits or PR titles to link activity automatically.
        </p>
      )}

      <GithubHelpModal 
        open={isHelpOpen} 
        onOpenChange={setIsHelpOpen} 
        taskCode={taskCode} 
      />
    </div>
  );
}
