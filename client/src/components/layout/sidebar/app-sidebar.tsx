"use client";

import {
  BarChart3,
  FolderKanban,
  Home,
  LifeBuoy,
  LogOut,
  Settings,
  Users2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SidebarNav,
  type NavRole,
  type SidebarNavItem,
} from "@/components/layout/sidebar/sidebar-nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useRouter } from "next/navigation";

const navItems: SidebarNavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: Home,
    roles: ["admin", "manager", "member"],
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    roles: ["admin", "manager", "member"],
  },
  {
    title: "Members",
    href: "/team",
    icon: Users2,
    roles: ["admin"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "manager"],
  },
  { title: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
  {
    title: "Support",
    href: "/support",
    icon: LifeBuoy,
    roles: ["admin", "manager", "member"],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  role?: NavRole;
  pathname?: string;
}

export function AppSidebar({
  collapsed,
  onToggle,
  role = "manager",
  pathname = "/",
}: AppSidebarProps) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-20" : "w-72",
      )}
    >
      <div
        className={cn(
          "mb-6 flex items-center",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {!collapsed ? (
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">
              PMS Orbit
            </p>
            <p className="text-xs text-sidebar-foreground/70">
              Enterprise Workspace
            </p>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onToggle}
        >
          {collapsed ? ">" : "<"}
        </Button>
      </div>

      <SidebarNav
        items={navItems}
        role={role}
        currentPath={pathname}
        collapsed={collapsed}
      />

      <div className="mt-auto border-t border-sidebar-border pt-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 px-3 py-2 text-sidebar-foreground/80 hover:bg-red-500/10 hover:text-red-500 transition-colors",
            collapsed && "justify-center"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="font-medium">Sign Out</span>}
        </Button>
      </div>

      <div className="mt-4 rounded-lg border border-sidebar-border bg-sidebar-accent p-3">
        <p
          className={cn(
            "text-xs text-sidebar-foreground/85",
            collapsed && "text-center",
          )}
        >
          Usage: 74%
        </p>
        {!collapsed ? (
          <p className="mt-1 text-xs text-sidebar-foreground/70">
            Upgrade for advanced automation and custom workflows.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
