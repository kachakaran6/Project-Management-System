"use client";

import { UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function HeaderUserMenu() {
  const { user } = useAuth();
  const router = useRouter();

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Account";
  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.trim() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 w-11 rounded-full p-0 transition-transform duration-200 hover:scale-105"
          aria-label="Open user menu"
        >
          <Avatar className="size-10 border border-border/70 shadow-sm">
            <AvatarImage src={user?.avatarUrl} alt={fullName} />
            <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-72 overflow-hidden rounded-2xl border-border/80 bg-card/95 p-2 shadow-xl backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
      >
        <div className="rounded-2xl border border-border/60 bg-primary/5 px-3 py-3 shadow-sm">
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

        <DropdownMenuItem
          className="gap-3 rounded-xl px-3 py-2.5 focus:bg-primary/10"
          onSelect={async (event) => {
            event.preventDefault();
            router.push("/settings");
          }}
        >
          <UserCircle2 className="size-4 text-muted-foreground" />
          <div className="flex flex-1 flex-col items-start">
            <span className="text-sm font-medium">Profile</span>
            <span className="text-xs text-muted-foreground">
              View personal information
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
