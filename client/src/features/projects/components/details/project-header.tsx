
import React from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Maximize2, Minimize2, LayoutDashboard, CheckSquare, Shield, History, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProjectHeaderProps {
  name: string;
  status: string;
  canEdit: boolean;
  onEditClick: () => void;
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ProjectHeader({ 
  name, 
  status, 
  canEdit, 
  onEditClick, 
  isFocusMode, 
  toggleFocusMode,
  activeTab,
  onTabChange
}: ProjectHeaderProps) {
  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "vault", label: "Vault", icon: Shield },
    { id: "activity", label: "Activity", icon: History },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className={cn(
      "relative z-20 border-b border-border/10 transition-all duration-300 ease-in-out bg-background/80 backdrop-blur-md",
      isFocusMode ? "h-14 flex items-center px-4" : "space-y-4 px-4 py-3 md:px-6"
    )}>
      <div className={cn(
        "flex items-center justify-between w-full",
        isFocusMode ? "max-w-none" : ""
      )}>
        <div className="flex items-center gap-4">
          <Link 
            href="/projects" 
            className={cn(
              "group flex items-center justify-center rounded-card bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all",
              isFocusMode ? "size-7" : "size-8"
            )}
          >
            <ArrowLeft className={isFocusMode ? "size-3.5" : "size-4"} />
          </Link>
          
          <div className="flex items-center gap-3">
            <h1 className={cn(
              "font-semibold tracking-tight text-foreground transition-all duration-300",
              isFocusMode ? "text-base" : "text-2xl"
            )}>
              {name}
            </h1>
            <Badge 
              variant="outline" 
              className={cn(
                "rounded-full border-primary/20 bg-primary/5 text-primary font-medium uppercase tracking-wider transition-all",
                isFocusMode ? "h-4 px-1.5 text-[8px]" : "h-5 px-2 text-[10px]"
              )}
            >
              {status.replace(/_/g, ' ')}
            </Badge>

            {/* TAB SWITCHER (Focus Mode Only) */}
            {isFocusMode && (
              <div className="flex items-center ml-2 pl-4 border-l border-border/10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-2 px-2 hover:bg-muted/50 rounded-card">
                      <currentTab.icon className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{currentTab.label}</span>
                      <ChevronDown className="size-3 text-muted-foreground/50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 p-2 rounded-card">
                    {tabs.map((tab) => (
                      <DropdownMenuItem 
                        key={tab.id} 
                        className={cn("text-xs rounded-card gap-2", activeTab === tab.id && "bg-muted font-bold")}
                        onClick={() => onTabChange(tab.id)}
                      >
                        <tab.icon className="size-3.5" />
                        {tab.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* FOCUS TOGGLE */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "rounded-card text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all",
                    isFocusMode ? "size-7" : "size-8"
                  )}
                  onClick={toggleFocusMode}
                >
                  {isFocusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Toggle Focus Mode (F)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {canEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-card text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all",
                isFocusMode ? "size-7" : "size-8"
              )}
              onClick={onEditClick}
            >
              <Settings className={isFocusMode ? "size-3.5" : "size-4"} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
