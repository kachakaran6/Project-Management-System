import Link from "@/lib/next-link";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type NavGroup = "workspace" | "manage" | "platform" | "operations";

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group: NavGroup;
  roles: Array<"SUPER_ADMIN" | "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "USER">;
}

interface SidebarItemProps {
  item: SidebarNavItem;
  isActive: boolean;
  collapsed: boolean;
}

export function SidebarItem({ item, isActive, collapsed }: SidebarItemProps) {
  const content = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-200",
        // Desktop: standard height
        "md:h-10 md:px-3",
        // Mobile: larger touch target (44px minimum)
        "h-11 px-3",
        isActive
          ? "bg-sidebar-accent text-primary shadow-sm ring-1 ring-sidebar-border/50"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-primary",
        collapsed && "justify-center px-0 w-10 mx-auto",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className={cn("size-4.5 shrink-0 transition-transform", !collapsed && "group-hover:scale-110")} aria-hidden="true" />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="font-medium">
            {item.title}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

