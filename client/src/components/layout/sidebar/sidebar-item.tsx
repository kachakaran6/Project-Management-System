import Link from "next/link";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type NavGroup = "workspace" | "manage";

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  group: NavGroup;
  roles: Array<"SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MEMBER" | "USER">;
}

interface SidebarItemProps {
  item: SidebarNavItem;
  isActive: boolean;
  collapsed: boolean;
}

export function SidebarItem({ item, isActive, collapsed }: SidebarItemProps) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-white shadow-sm"
          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-white",
        collapsed && "justify-center px-2",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
    </Link>
  );
}
