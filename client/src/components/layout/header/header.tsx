"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeaderOrgSwitcher } from "@/components/layout/header/org-switcher";
import { HeaderUserMenu } from "@/components/layout/header/user-menu";
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

      <div className="ml-auto hidden max-w-xs flex-1 md:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search projects, tasks, users"
            aria-label="Global search"
          />
        </div>
      </div>

      <HeaderOrgSwitcher />
      <HeaderUserMenu />
    </header>
  );
}
