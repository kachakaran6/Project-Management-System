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
        "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-white shadow-sm"
          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-white",
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

