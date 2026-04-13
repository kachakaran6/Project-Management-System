"use client";

import { MoonStar, Menu, SunMedium } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { HeaderOrgSwitcher } from "@/components/layout/header/org-switcher";
import { GlobalSearch } from "@/components/layout/header/global-search";
import { NotificationBell } from "@/components/layout/header/notification-bell";
import { HeaderUserMenu } from "@/components/layout/header/user-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useApplyTheme } from "@/providers/theme-provider";
import { useUIStore } from "@/store/ui-store";

function formatSegment(segment: string) {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AppHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const { setMobileSidebarOpen } = useUIStore();
  const { resolvedTheme } = useTheme();
  const { mode, changeMode } = useApplyTheme();
  const effectiveTheme = resolvedTheme ?? (mode === "system" ? "light" : mode);
  const nextMode = effectiveTheme === "dark" ? "light" : "dark";
  const tooltipLabel =
    effectiveTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";

  const handleThemeToggle = () => {
    changeMode(nextMode);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-sm md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Workspace</p>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm"
        >
          <span className="font-medium">Home</span>
          {segments.map((segment, index) => (
            <span
              key={`${segment}-${index}`}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <span>/</span>
              <span
                className={
                  index === segments.length - 1
                    ? "text-foreground font-medium"
                    : ""
                }
              >
                {formatSegment(segment)}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="ml-auto hidden flex-1 md:block">
        <GlobalSearch />
      </div>

      <HeaderOrgSwitcher />

      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleThemeToggle}
              aria-label={tooltipLabel}
              className={cn(
                "relative h-10 w-10 rounded-full border-border/70 bg-card shadow-sm transition-all duration-300",
                "hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <SunMedium
                className={cn(
                  "absolute size-4 transition-all duration-300",
                  effectiveTheme === "dark"
                    ? "rotate-90 scale-0 opacity-0"
                    : "rotate-0 scale-100 opacity-100",
                )}
              />
              <MoonStar
                className={cn(
                  "absolute size-4 transition-all duration-300",
                  effectiveTheme === "dark"
                    ? "rotate-0 scale-100 opacity-100"
                    : "-rotate-90 scale-0 opacity-0",
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <NotificationBell />

      <HeaderUserMenu />
    </header>
  );
}
