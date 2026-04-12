"use client";

import React, { useEffect } from "react";

import {
  Bug,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  ShieldCheck,
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
    roles: ["ADMIN", "OWNER", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    group: "workspace",
    roles: ["ADMIN", "OWNER", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: SquareCheckBig,
    group: "workspace",
    roles: ["ADMIN", "OWNER", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Pages",
    href: "/pages",
    icon: FileText,
    group: "workspace",
    roles: ["ADMIN", "OWNER", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Organization Members",
    href: "/team",
    icon: Users,
    group: "manage",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER", "MEMBER"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    group: "manage",
    roles: ["ADMIN", "OWNER", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: Shield,
    group: "platform",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Organizations",
    href: "/admin/organizations",
    icon: Users,
    group: "platform",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    group: "platform",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: LineChart,
    group: "platform",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Admin Requests",
    href: "/admin/approvals",
    icon: ShieldCheck,
    group: "operations",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Logs",
    href: "/admin/logs",
    icon: Bug,
    group: "operations",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Platform Settings",
    href: "/admin/system",
    icon: Settings,
    group: "operations",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "API Debug",
    href: "/admin/api-debug",
    icon: FileText,
    group: "operations",
    roles: ["SUPER_ADMIN"],
  },
];

interface SidebarProps {
  pathname: string;
  mobile?: boolean;
}

export function Sidebar({ pathname, mobile = false }: SidebarProps) {
  const { activeOrg, user } = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) {
      setSidebarCollapsed(saved === "true");
    }
  }, [setSidebarCollapsed]);

  const handleToggle = () => {
    const nextValue = !sidebarCollapsed;
    toggleSidebarCollapsed();
    localStorage.setItem("sidebarCollapsed", String(nextValue));
  };

  const resolvedRole =
    user?.role === "SUPER_ADMIN"
      ? "SUPER_ADMIN"
      : activeOrg?.role ?? user?.role ?? "MEMBER";

  const role = resolvedRole as SidebarNavItem["roles"][number];
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const workspaceItems = visibleItems.filter(
    (item) => item.group === "workspace",
  );
  const manageItems = visibleItems.filter((item) => item.group === "manage");
  const platformItems = visibleItems.filter((item) => item.group === "platform");
  const operationsItems = visibleItems.filter((item) => item.group === "operations");

  const sidebarWidth = mobile ? "w-[280px]" : sidebarCollapsed ? "w-[72px]" : "w-[260px]";

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground",
        sidebarWidth,
        "transition-[width] duration-300 ease-in-out",
      )}
    >
      <div
        className={cn(
          "mb-8 flex items-center h-12",
          sidebarCollapsed && !mobile ? "justify-center" : "justify-between px-2",
        )}
      >
        {!(sidebarCollapsed && !mobile) ? (
          <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
            <p className="font-heading text-lg font-bold text-white truncate">
              {role === "SUPER_ADMIN" ? "Platform Control" : "PMS Orbit"}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 truncate">
              {role === "SUPER_ADMIN" ? "Super Admin Console" : activeOrg?.name ?? "Personal Workspace"}
            </p>
          </div>
        ) : null}

        {!mobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white transition-all"
            onClick={handleToggle}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-4.5" />
            ) : (
              <PanelLeftClose className="size-4.5" />
            )}
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto py-2 pr-1 -mr-1 custom-scrollbar">
        <div className="space-y-6">
          <SidebarGroup
            label={role === "SUPER_ADMIN" ? "Platform" : "Workspace"}
            items={role === "SUPER_ADMIN" ? platformItems : workspaceItems}
            currentPath={pathname}
            collapsed={sidebarCollapsed && !mobile}
          />
          <SidebarGroup
            label={role === "SUPER_ADMIN" ? "Operations" : "Management"}
            items={role === "SUPER_ADMIN" ? operationsItems : manageItems}
            currentPath={pathname}
            collapsed={sidebarCollapsed && !mobile}
          />
        </div>
      </div>

      <div className="mt-auto pt-4 space-y-4">
        <div className="border-t border-sidebar-border pt-4">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 px-3 py-2 text-sidebar-foreground/80 hover:bg-red-500/10 hover:text-red-500 transition-colors",
              sidebarCollapsed && !mobile && "justify-center"
            )}
            onClick={() => (window.location.href = "/logout")}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!(sidebarCollapsed && !mobile) && <span className="font-medium">Sign Out</span>}
          </Button>
        </div>

        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2.5">
          <p
            className={cn(
              "text-[10px] uppercase font-bold tracking-tighter text-sidebar-foreground/40",
              sidebarCollapsed && !mobile ? "text-center" : "",
            )}
          >
            Role
          </p>
          <p
            className={cn(
              "text-xs font-semibold text-white mt-0.5",
              sidebarCollapsed && !mobile ? "text-center" : "",
            )}
          >
            {role.replace("_", " ")}
          </p>
        </div>
      </div>
    </aside>
  );
}
