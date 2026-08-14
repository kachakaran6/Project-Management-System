
import React, { useEffect } from "react";

import {
  Bug,
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  LineChart,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  ShieldCheck,
  SquareCheckBig,
  Users,
} from "lucide-react";
import { GithubIcon as Github } from "@/components/icons/github-icon";

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
    title: "Your Work",
    href: "/your-work",
    icon: BriefcaseBusiness,
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
    title: "GitHub",
    href: "/github",
    icon: Github as any,
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
    title: "Activity Logs",
    href: "/activity-logs",
    icon: History,
    group: "manage",
    roles: ["SUPER_ADMIN", "ADMIN", "OWNER"],
  },
  // {
  //   title: "Audit Log",
  //   href: "/audit-log",
  //   icon: SquareCheckBig,
  //   group: "manage",
  //   roles: ["ADMIN", "OWNER", "MANAGER", "MEMBER", "USER"],
  // },

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
  const { activeOrg, user, userRole } = useAuth();
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

  const role = (userRole ?? "MEMBER") as SidebarNavItem["roles"][number];
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const workspaceItems = visibleItems.filter(
    (item) => item.group === "workspace",
  );
  const manageItems = visibleItems.filter((item) => item.group === "manage");
  const platformItems = visibleItems.filter((item) => item.group === "platform");
  const operationsItems = visibleItems.filter((item) => item.group === "operations");

  const sidebarWidth = mobile ? "w-[280px]" : sidebarCollapsed ? "w-[72px]" : "w-[260px]";

  // Extract numeric width value for style attribute
  const widthValue = sidebarWidth.match(/\d+/)?.[0] || "260";

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "transition-all duration-300 ease-in-out",
        // Desktop: standard padding
        "md:px-3 md:py-4",
        // Mobile: reduced padding for compact layout
        mobile && "px-2 py-3"
      )}
      style={{ width: `${widthValue}px` }}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-12 md:mb-8",
          "transition-all duration-300",
          // Desktop: standard margin
          "md:mb-8",
          // Mobile: reduced margin for compact layout
          mobile && "mb-6",
          sidebarCollapsed && !mobile ? "justify-center" : "justify-between px-2",
        )}
      >
        {!(sidebarCollapsed && !mobile) ? (
          <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
            <p className="font-heading text-lg font-bold text-foreground truncate">
              {role === "SUPER_ADMIN" ? "Platform Control" : "PMS Orbit"}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/75 truncate">
              {role === "SUPER_ADMIN" ? "Super Admin Console" : activeOrg?.name ?? "Personal Workspace"}
            </p>
          </div>
        ) : null}

        {!mobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-primary transition-all"
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

      {/* Mobile User Info - Visible only on mobile, positioned at top */}
      {mobile && user && (
        <div className="md:hidden mb-6 px-2 pb-4 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3 animate-in fade-in duration-300">
            {/* User Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="size-10 rounded-button object-cover ring-2 ring-sidebar-accent/50"
              />
            ) : (
              <div className={cn(
                "size-10 rounded-button flex items-center justify-center font-bold text-sm ring-2 ring-sidebar-accent/50",
                role === "SUPER_ADMIN" ? "bg-orange-500/20 text-orange-500" :
                  role === "ADMIN" ? "bg-primary/20 text-primary" :
                    role === "MANAGER" ? "bg-blue-500/20 text-blue-500" :
                      "bg-sidebar-foreground/10 text-sidebar-foreground/60"
              )}>
                {(user.firstName?.[0] ?? "U")}
              </div>
            )}
            {/* User Name & Role */}
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {role.toLowerCase().replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content - Flex-1 fills available space */}
      <div className={cn(
        "flex-1 overflow-hidden",
        "transition-all duration-300",
        // Desktop: standard spacing
        "md:overflow-y-auto md:custom-scrollbar md:py-2 md:pr-1 md:-mr-1",
        // Mobile: no scroll needed, content fits
        mobile && "py-1 pr-1"
      )}>
        <div className={cn(
          "transition-all duration-300",
          // Desktop: standard spacing
          "md:space-y-6",
          // Mobile: reduced spacing for compact layout
          mobile && "space-y-4"
        )}>
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

      {/* Footer - collapsed indicator on desktop */}
      {sidebarCollapsed && !mobile && (
        <div className="mt-auto pt-4 flex justify-center">
          <div
            className={cn(
              "size-8 rounded-button flex items-center justify-center transition-all duration-500 shadow-lg",
              role === "SUPER_ADMIN" ? "bg-orange-500/20 text-orange-500 border border-orange-500/30 ring-1 ring-orange-500/10" :
                role === "ADMIN" ? "bg-primary/20 text-primary border border-primary/30 ring-1 ring-primary/10" :
                  role === "MANAGER" ? "bg-blue-500/20 text-blue-500 border border-blue-500/30 ring-1 ring-blue-500/10" :
                    "bg-sidebar-foreground/10 text-sidebar-foreground/60 border border-sidebar-border/50"
            )}
          >
            <span className="text-[11px] font-black tracking-tighter">
              {role === "SUPER_ADMIN" ? "SA" : role.charAt(0)}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
