
import { useState } from "react";
import { UserCircle2, Plus, LogOut, Settings, Moon, Sun, Monitor } from "lucide-react";
import { useRouter } from "@/lib/next-navigation";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CreateOrgModal } from "@/features/organization/components/create-org-modal";
import { useApplyTheme } from "@/providers/theme-provider";

export function HeaderUserMenu() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const { mode, changeMode } = useApplyTheme();
  const { resolvedTheme } = useTheme();

  const effectiveTheme = resolvedTheme ?? (mode === "system" ? "light" : mode);
  const nextTheme = effectiveTheme === "dark" ? "light" : "dark";

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Account";
  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.trim() || "U";

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch {
      // ignore
    }
  };

  const themeIcon =
    effectiveTheme === "dark" ? (
      <Sun className="size-4 text-muted-foreground" />
    ) : (
      <Moon className="size-4 text-muted-foreground" />
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 md:h-11 md:w-11 rounded-full p-0 transition-transform duration-200 hover:scale-105 shrink-0"
            aria-label="Open user menu"
          >
            <Avatar className="size-8 md:size-10 border border-border/70 shadow-sm">
              <AvatarImage src={user?.avatarUrl} alt={fullName} />
              <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={12}
          className="w-72 overflow-hidden rounded-dropdown border-border/80 bg-card/95 p-2 shadow-xl backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
        >
          {/* Profile Card */}
          <div className="rounded-dropdown border border-border/60 bg-primary/5 px-3 py-3 shadow-sm">
            <div className="flex items-start gap-3">
              <Avatar className="size-11 border border-border/60 shadow-sm">
                <AvatarImage src={user?.avatarUrl} alt={fullName} />
                <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {fullName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
                <Badge
                  variant="outline"
                  className="mt-2 h-5 rounded-full px-2 text-[10px] tracking-[0.12em]"
                >
                  {user?.role ?? "USER"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-1 mt-2 space-y-0.5">
            {/* Profile Settings */}
            <DropdownMenuItem
              className="gap-3 rounded-dropdown px-3 py-2.5 focus:bg-primary/10 cursor-pointer"
              onSelect={(event) => {
                event.preventDefault();
                router.push("/settings");
              }}
            >
              <UserCircle2 className="size-4 text-muted-foreground" />
              <div className="flex flex-1 flex-col items-start">
                <span className="text-sm font-medium">Profile & Settings</span>
                <span className="text-xs text-muted-foreground">
                  Personal preferences
                </span>
              </div>
            </DropdownMenuItem>

            {/* Theme Toggle */}
            <DropdownMenuItem
              className="gap-3 rounded-dropdown px-3 py-2.5 focus:bg-primary/10 cursor-pointer"
              onSelect={(event) => {
                event.preventDefault();
                changeMode(nextTheme);
              }}
            >
              {themeIcon}
              <div className="flex flex-1 flex-col items-start">
                <span className="text-sm font-medium">
                  Switch to {nextTheme === "dark" ? "Dark" : "Light"} Mode
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  Currently {resolvedTheme} mode
                </span>
              </div>
            </DropdownMenuItem>

            {/* Create Organisation (Admin only) */}
            {isAdmin && (
              <DropdownMenuItem
                className="gap-3 rounded-dropdown px-3 py-2.5 text-primary border border-transparent hover:border-primary/20 focus:bg-primary/10 cursor-pointer"
                onSelect={(event) => {
                  event.preventDefault();
                  setCreateOrgOpen(true);
                }}
              >
                <Plus className="size-4" />
                <div className="flex flex-1 flex-col items-start">
                  <span className="text-sm font-medium">Create Organization</span>
                  <span className="text-xs text-muted-foreground">
                    Start a new team
                  </span>
                </div>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="my-1" />

            {/* Logout */}
            <DropdownMenuItem
              className="gap-3 rounded-dropdown px-3 py-2.5 focus:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer"
              onSelect={(event) => {
                event.preventDefault();
                handleLogout();
              }}
            >
              <LogOut className="size-4" />
              <div className="flex flex-1 flex-col items-start">
                <span className="text-sm font-medium">Sign Out</span>
                <span className="text-xs opacity-70">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgModal open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
    </>
  );
}
