import { FolderKanban, SquareCheckBig } from "lucide-react";

import { ActivityItem } from "@/features/dashboard/api/dashboard.api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityFeedProps {
  data: ActivityItem[];
}

function formatRelativeTime(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed({ data }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent activity available.
          </p>
        ) : (
          <ul className="space-y-4">
            {data.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <Avatar className="size-8">
                  <AvatarFallback>
                    {item.actor.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{item.actor}</span>{" "}
                    {item.action}{" "}
                    <span className="font-medium">{item.entity}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                <span className="rounded-md bg-secondary p-1.5 text-secondary-foreground">
                  {item.type === "project" ? (
                    <FolderKanban className="size-3.5" />
                  ) : (
                    <SquareCheckBig className="size-3.5" />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
