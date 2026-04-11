"use client";

import {
  Bug,
  FolderKanban,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  SquareCheckBig,
  Users,
} from "lucide-react";

import { SidebarGroup } from "@/components/layout/sidebar/sidebar-group";
import { SidebarNavItem } from "@/components/layout/sidebar/sidebar-item";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

const navItems: SidebarNavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "workspace",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    group: "workspace",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: SquareCheckBig,
    group: "workspace",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER"],
  },
  {
    title: "Team",
    href: "/team",
    icon: Users,
    group: "manage",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    group: "manage",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "Admin",
    href: "/admin/dashboard",
    icon: Shield,
    group: "manage",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "Dev Logs",
    href: "/admin/logs",
    icon: Bug,
    group: "manage",
    roles: ["SUPER_ADMIN"],
  },
];

interface SidebarProps {
  pathname: string;
  mobile?: boolean;
}

export function Sidebar({ pathname, mobile = false }: SidebarProps) {
  const { activeOrg, user } = useAuth();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  const role = (activeOrg?.role ?? user?.role ?? "MEMBER") as SidebarNavItem["roles"][number];
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const workspaceItems = visibleItems.filter(
    (item) => item.group === "workspace",
  );
  const manageItems = visibleItems.filter((item) => item.group === "manage");

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground",
        mobile ? "w-72" : sidebarCollapsed ? "w-20" : "w-72",
        "transition-[width] duration-300",
      )}
    >
      <div
        className={cn(
          "mb-6 flex items-center",
          sidebarCollapsed && !mobile ? "justify-center" : "justify-between",
        )}
      >
        {!(sidebarCollapsed && !mobile) ? (
          <div>
            <p className="font-heading text-lg font-semibold text-white">
              PMS Orbit
            </p>
            <p className="text-xs text-sidebar-foreground/70">
              {activeOrg?.name ?? "Organization"}
            </p>
          </div>
        ) : null}

        {!mobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={toggleSidebarCollapsed}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        ) : null}
      </div>

      <div className="space-y-4">
        <SidebarGroup
          label="Workspace"
          items={workspaceItems}
          currentPath={pathname}
          collapsed={sidebarCollapsed && !mobile}
        />
        <SidebarGroup
          label="Management"
          items={manageItems}
          currentPath={pathname}
          collapsed={sidebarCollapsed && !mobile}
        />
      </div>

      <div className="mt-auto rounded-lg border border-sidebar-border bg-sidebar-accent p-3">
        <p
          className={cn(
            "text-xs text-sidebar-foreground/85",
            sidebarCollapsed && !mobile ? "text-center" : "",
          )}
        >
          Role: {role}
        </p>
      </div>
    </aside>
  );
}
