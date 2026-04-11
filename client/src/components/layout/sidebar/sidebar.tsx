"use client";

import {
  Bug,
  FileText,
  FolderKanban,
  LayoutDashboard,
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
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    group: "workspace",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: SquareCheckBig,
    group: "workspace",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Pages",
    href: "/pages",
    icon: FileText,
    group: "workspace",
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "MEMBER", "USER"],
  },
  {
    title: "Organization Members",
    href: "/team",
    icon: Users,
    group: "manage",
    roles: ["ADMIN"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    group: "manage",
    roles: ["SUPER_ADMIN", "ADMIN", "USER"],
  },
  {
    title: "Admin",
    href: "/admin/dashboard",
    icon: Shield,
    group: "manage",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    group: "manage",
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Admin Requests",
    href: "/admin/approvals",
    icon: ShieldCheck,
    group: "manage",
    roles: ["SUPER_ADMIN"],
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

      <div className="mt-auto border-t border-sidebar-border pt-4">
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

      <div className="mt-4 rounded-lg border border-sidebar-border bg-sidebar-accent p-3">
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
