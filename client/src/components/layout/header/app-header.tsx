"use client";

import { Bell, Building2, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "@/lib/next-navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/hooks/use-auth";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title = "Dashboard" }: AppHeaderProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/70 bg-background/85 px-6 backdrop-blur-sm">
      <div>
        <h1 className="font-heading text-xl font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">
          Build, ship, and coordinate across teams
        </p>
      </div>

      <div className="ml-auto hidden max-w-xs flex-1 md:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search projects, tasks, members"
            aria-label="Search"
          />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-2">
            <Building2 className="size-4" />
            Apex Labs
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Apex Labs</DropdownMenuItem>
          <DropdownMenuItem>Nova Cloud</DropdownMenuItem>
          <DropdownMenuItem>Orbit Ventures</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
        
      >
        {resolvedTheme === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </Button>

      <Button variant="ghost" size="sm" aria-label="Notifications">
        <Bell className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0"
            aria-label="Open profile menu"
          >
            <Avatar className="size-9">
              <AvatarFallback>KR</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>karan@pms.com</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async (event) => {
              event.preventDefault();
              try {
                await logout();
              } catch (error) {
                console.error("Sign out failed unexpectedly.", error);
              }
              router.push("/login");
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

