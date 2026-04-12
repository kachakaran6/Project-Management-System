"use client";

import { Activity, Building2, CheckCircle2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyticsQuery } from "@/features/admin/hooks/use-admin";

export default function AdminAnalyticsPage() {
  const analyticsQuery = useAnalyticsQuery();
  const analytics = analyticsQuery.data;

  const counts = analytics?.counts;
  const userTrend = analytics?.trends.users ?? [];
  const orgTrend = analytics?.trends.organizations ?? [];
  const maxTrend = Math.max(
    1,
    ...userTrend.map((item) => item.value),
    ...orgTrend.map((item) => item.value),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Platform Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Growth, activity, and operational health for the full SaaS platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total Organizations" value={counts?.totalOrganizations ?? 0} icon={Building2} />
        <MetricCard title="Active Organizations" value={counts?.activeOrganizations ?? 0} icon={CheckCircle2} />
        <MetricCard title="Total Users" value={counts?.totalUsers ?? 0} icon={Users} />
        <MetricCard title="Active Users" value={counts?.activeUsers ?? 0} icon={Activity} />
        <MetricCard title="Tasks (Active)" value={counts?.totalTasks ?? 0} icon={Activity} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendCard title="User Growth" points={userTrend} maxValue={maxTrend} color="bg-blue-500" />
        <TrendCard title="Organization Growth" points={orgTrend} maxValue={maxTrend} color="bg-emerald-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(analytics?.summaries.activityDistribution ?? []).map((item) => (
            <div key={item.level} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <Badge variant="outline" className="uppercase">{item.level}</Badge>
                <span className="font-medium tabular-nums">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max(4, Math.round((item.count / Math.max(1, (analytics?.summaries.activityDistribution ?? []).reduce((acc, cur) => Math.max(acc, cur.count), 0))) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
          {!analyticsQuery.isLoading && (analytics?.summaries.activityDistribution?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No activity data available.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <Card className="border-none bg-surface/50 backdrop-blur-sm shadow-sm ring-1 ring-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <Icon className="h-4 w-4 text-primary" />
      </CardContent>
    </Card>
  );
}

function TrendCard({
  title,
  points,
  maxValue,
  color,
}: {
  title: string;
  points: Array<{ label: string; value: number }>;
  maxValue: number;
  color: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {points.map((point) => (
          <div key={point.label} className="grid grid-cols-[76px_1fr_auto] items-center gap-3">
            <span className="text-xs text-muted-foreground">{point.label}</span>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${Math.max(4, Math.round((point.value / maxValue) * 100))}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums">{point.value}</span>
          </div>
        ))}
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trend points available.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
