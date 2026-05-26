
import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, CheckSquare, Shield, History, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectTabsList() {
  const tabStyles = "relative h-9 px-0 pb-2 bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-xs font-medium text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground/80 gap-2";

  return (
    <div className="px-4 md:px-6 border-b border-border/10">
      <TabsList className="bg-transparent h-auto p-0 gap-8 rounded-none">
        <TabsTrigger value="overview" className={tabStyles}>
          <LayoutDashboard className="size-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="tasks" className={tabStyles}>
          <CheckSquare className="size-3.5" />
          Tasks
        </TabsTrigger>
        <TabsTrigger value="pages" className={tabStyles}>
          <FileText className="size-3.5" />
          Pages
        </TabsTrigger>
        <TabsTrigger value="vault" className={tabStyles}>
          <Shield className="size-3.5" />
          Vault
        </TabsTrigger>
        <TabsTrigger value="activity" className={tabStyles}>
          <History className="size-3.5" />
          Activity
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
