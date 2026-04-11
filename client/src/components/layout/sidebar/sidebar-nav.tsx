import Link from "next/link";
import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type NavRole = "admin" | "manager" | "member";

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: NavRole[];
  badge?: string;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
  currentPath?: string;
  role: NavRole;
  collapsed?: boolean;
}

export function SidebarNav({
  items,
  currentPath = "/",
  role,
  collapsed = false,
}: SidebarNavProps) {
  const visibleItems = items.filter((item) => item.roles.includes(role));

  return (
    <nav className="space-y-1" aria-label="Primary">
      {visibleItems.map((item) => {
        const isActive = currentPath === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-white"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-white",
              collapsed && "justify-center px-2",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed ? <span className="truncate">{item.title}</span> : null}
            {!collapsed && item.badge ? (
              <Badge
                variant="outline"
                className="ml-auto border-sidebar-border text-[10px] text-sidebar-foreground"
              >
                {item.badge}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
