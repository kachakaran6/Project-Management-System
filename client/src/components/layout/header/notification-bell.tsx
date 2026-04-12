"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotificationCenter } from "@/features/notifications/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const filters = useMemo(() => ({ page: 1, limit: 8 }), []);
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetching,
    markRead,
    markAllRead,
  } = useNotificationCenter(filters);

  const handleOpen = async (link?: string, id?: string) => {
    if (id) {
      await markRead(id);
    }
    if (link) {
      router.push(link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-full border-border/70 bg-card shadow-sm"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-88 overflow-hidden rounded-2xl border-border/80 bg-card/95 p-2 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-primary/5 px-3 py-3">
          <div>
            <DropdownMenuLabel className="p-0 text-sm font-semibold text-foreground">
              Notifications
            </DropdownMenuLabel>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread · {notifications.length} loaded
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-3 text-xs"
            onClick={async () => {
              await markAllRead();
            }}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-1.5 size-3.5" />
            Mark all read
          </Button>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div className="max-h-96 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification._id}
                  className={cn(
                    "cursor-pointer rounded-xl px-3 py-3 focus:bg-primary/8",
                    !notification.isRead && "bg-primary/5",
                  )}
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleOpen(notification.link, notification._id);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      {!notification.isRead ? (
                        <span className="size-2 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5">
          <Link href="/settings?section=notifications">
            Notification preferences
          </Link>
        </DropdownMenuItem>
        {isFetching ? (
          <p className="px-3 pb-1 text-[11px] text-muted-foreground">
            Syncing live updates...
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}