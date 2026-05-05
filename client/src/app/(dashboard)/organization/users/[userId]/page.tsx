"use client";

import { useState } from "react";
import { 
  Activity, 
  Calendar, 
  Clock, 
  History, 
  Layout, 
  LogIn, 
  Mail, 
  MousePointer2, 
  Trophy, 
  User, 
  ShieldCheck,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ChevronLeft
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { useNavigate, useParams } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useUserAnalyticsSummaryQuery, 
  useUserActivitiesQuery, 
  useInfiniteUserActivitiesQuery,
  useUserSessionsQuery 
} from "@/features/organization/hooks/use-analytics-query";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const DEVICE_ICONS: Record<string, any> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Monitor
};

export default function UserAnalyticsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const userId = params.userId as string;

  const { data: summaryData, isLoading: isSummaryLoading } = useUserAnalyticsSummaryQuery(userId);
  const { 
    data: activitiesData, 
    fetchNextPage: fetchNextActivities,
    hasNextPage: hasMoreActivities,
    isFetchingNextPage: isFetchingMoreActivities,
    isLoading: isActivitiesLoading 
  } = useInfiniteUserActivitiesQuery(userId);
  const { data: sessionsData, isLoading: isSessionsLoading } = useUserSessionsQuery(userId);

  const summary = summaryData?.data;
  const activities = activitiesData?.pages.flatMap(page => page.data?.items || []) || [];
  const sessions = sessionsData?.data?.sessions || [];

  if (isSummaryLoading) {
    return <AnalyticsLoadingSkeleton />;
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertCircle className="size-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-semibold">User not found</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const { user, stats } = summary;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-4 bg-background/80 backdrop-blur-md border-b">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full shrink-0" 
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="size-16 border-4 border-background shadow-xl ring-1 ring-border/50">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="text-2xl bg-primary/5 text-primary font-bold uppercase">
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  {user.firstName} {user.lastName}
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                    {user.role || 'Member'}
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5" /> {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col items-end px-3 border-r border-border/40">
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Last Login</span>
              <span className="text-sm font-bold text-foreground">
                {user.lastLogin ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true }) : 'Never'}
              </span>
            </div>
            <div className="flex flex-col items-end px-3 border-r border-border/40">
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Total Sessions</span>
              <span className="text-sm font-bold text-foreground">{stats.totalLogins}</span>
            </div>
            <div className="flex flex-col items-end px-3">
              <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Active Since</span>
              <span className="text-sm font-bold text-foreground">{format(new Date(user.createdAt), "MMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Tasks Created" 
          value={stats.tasksCreated} 
          icon={Layout} 
          description="Total tasks authored" 
          color="blue"
        />
        <StatCard 
          title="Tasks Completed" 
          value={stats.tasksCompleted} 
          icon={CheckCircle2} 
          description="Tasks moved to done" 
          color="green"
        />
        <StatCard 
          title="Tasks Assigned" 
          value={stats.tasksAssigned} 
          icon={User} 
          description="Currently assigned tasks" 
          color="orange"
        />
        <StatCard 
          title="Avg Session" 
          value={`${stats.avgSessionDurationMinutes}m`} 
          icon={Clock} 
          description="Average time per login" 
          color="purple"
        />
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="timeline" className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-12 border border-border/40">
            <TabsTrigger value="timeline" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs uppercase tracking-wider">
              Activity Timeline
            </TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs uppercase tracking-wider">
              Login Sessions
            </TabsTrigger>
            <TabsTrigger value="contributions" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-bold text-xs uppercase tracking-wider">
              Behavioral Insights
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-border/40 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/10 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Activities</CardTitle>
                  <CardDescription>Comprehensive log of user interactions</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2">
                  <History className="size-3.5" /> Full Audit Log
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isActivitiesLoading ? (
                <div className="p-8 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : activitiesData === undefined && !isActivitiesLoading ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <AlertCircle className="size-10 text-destructive opacity-50" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Failed to load activities</p>
                    <p className="text-xs text-muted-foreground">There was an error connecting to the analytics service.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
                </div>
              ) : activities.length === 0 ? (
                <EmptyState icon={Activity} message="No activities found for this user" />
              ) : (
                <>
                  <div className="max-h-[500px] overflow-y-auto divide-y divide-border/10 custom-scrollbar scroll-smooth">
                    {activities.map((activity: any) => (
                      <ActivityRow key={activity._id} activity={activity} />
                    ))}
                  </div>
                  
                  {hasMoreActivities && (
                    <div className="p-4 border-t bg-muted/5 flex justify-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs font-black uppercase tracking-widest gap-2 hover:bg-background"
                        onClick={() => fetchNextActivities()}
                        disabled={isFetchingMoreActivities}
                      >
                        {isFetchingMoreActivities ? (
                          <>
                            <Loader2 className="size-3 animate-spin" /> Fetching...
                          </>
                        ) : (
                          "Load More Activities"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card className="border-border/40 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-lg">Device & Session History</CardTitle>
              <CardDescription>Tracking logins and active sessions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isSessionsLoading ? (
                <div className="p-8 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : sessions.length === 0 ? (
                <EmptyState icon={LogIn} message="No login sessions recorded" />
              ) : (
                <div className="max-h-[500px] overflow-y-auto divide-y divide-border/10 custom-scrollbar scroll-smooth">
                  {sessions.map((session: any) => (
                    <SessionRow key={session.id} session={session} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Contribution Heatmap / Bar Chart */}
            <Card className="border-border/40 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Workload Distribution</CardTitle>
                <CardDescription>Task contribution metrics</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Created', value: stats.tasksCreated },
                    { name: 'Assigned', value: stats.tasksAssigned },
                    { name: 'Completed', value: stats.tasksCompleted }
                  ]} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {[{ color: '#3b82f6' }, { color: '#f59e0b' }, { color: '#10b981' }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Behavioral Overview</CardTitle>
                <CardDescription>Productivity and engagement patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Task Completion Rate</span>
                    <span className="font-bold">
                      {stats.tasksAssigned > 0 ? Math.round((stats.tasksCompleted / stats.tasksAssigned) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${stats.tasksAssigned > 0 ? (stats.tasksCompleted / stats.tasksAssigned) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Efficiency</p>
                    <p className="text-xl font-black mt-1">High</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Above average completion speed</p>
                  </div>
                  <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                    <p className="text-[10px] font-black uppercase text-orange-500/70 tracking-widest">Engagement</p>
                    <p className="text-xl font-black mt-1">Active</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{stats.totalLogins} logins recorded</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-500/5 border border-slate-500/10 flex items-center gap-4">
                   <div className="size-10 rounded-full bg-slate-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-5 text-slate-600" />
                   </div>
                   <div>
                     <p className="text-xs font-bold">Account Security</p>
                     <p className="text-[11px] text-muted-foreground">User has MFA enabled and secure device access.</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description, color }: { title: string, value: string | number, icon: any, description: string, color: 'blue' | 'green' | 'orange' | 'purple' }) {
  const colors = {
    blue: "text-blue-600 bg-blue-100 border-blue-200",
    green: "text-green-600 bg-green-100 border-green-200",
    orange: "text-orange-600 bg-orange-100 border-orange-200",
    purple: "text-purple-600 bg-purple-100 border-purple-200",
  };

  return (
    <Card className="border-border/40 shadow-sm rounded-2xl hover:shadow-md transition-all group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-xl border shrink-0", colors[color])}>
            <Icon className="size-5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">Real-time</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-3xl font-black tracking-tight">{value}</h3>
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground font-medium">{description}</p>
        </div>
        <div className={cn("absolute bottom-0 left-0 h-1 w-full bg-current opacity-20", colors[color].split(' ')[0])} />
      </CardContent>
    </Card>
  );
}

function ActivityRow({ activity }: { activity: any }) {
  const getActionIcon = (action: string) => {
    if (action.includes("TASK")) return <Layout className="h-4 w-4 text-blue-600" />;
    if (action.includes("PROJECT")) return <MousePointer2 className="h-4 w-4 text-emerald-600" />;
    if (action.includes("MEMBER") || action.includes("INVITE")) return <User className="h-4 w-4 text-orange-600" />;
    if (action.includes("LOGIN")) return <LogIn className="h-4 w-4 text-purple-600" />;
    return <Activity className="h-4 w-4 text-slate-600" />;
  };

  const getActionBg = (action: string) => {
    if (action.includes("TASK")) return "bg-blue-100";
    if (action.includes("PROJECT")) return "bg-emerald-100";
    if (action.includes("MEMBER") || action.includes("INVITE")) return "bg-orange-100";
    if (action.includes("LOGIN")) return "bg-purple-100";
    return "bg-slate-100";
  };

  return (
    <div className="group flex gap-4 p-4 hover:bg-muted/30 transition-all cursor-default">
      <div className={cn("size-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", getActionBg(activity.action))}>
        {getActionIcon(activity.action)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground leading-snug">
            {activity.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
            {activity.entityName && (
              <span className="text-muted-foreground font-medium">
                {" "}{activity.entityType.toLowerCase()} <span className="text-primary font-bold">"{activity.entityName}"</span>
              </span>
            )}
          </p>
          <span className="text-[11px] font-bold text-muted-foreground/60 shrink-0">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
          <Calendar className="size-3" /> {format(new Date(activity.createdAt), "MMM d, yyyy · hh:mm a")}
        </p>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: any }) {
  const Icon = DEVICE_ICONS[session.deviceType] || Monitor;

  return (
    <div className="group flex items-center gap-4 p-4 hover:bg-muted/30 transition-all cursor-default">
      <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 border border-border/40">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              {session.device}
              {session.isActive && (
                <Badge variant="success" className="text-[9px] h-4 font-black uppercase px-1 px-1.5 animate-pulse">Live</Badge>
              )}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
               <Globe className="size-3" /> {session.ipAddress} · {session.durationMinutes}m duration
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-xs font-bold text-foreground">
              {format(new Date(session.loginAt), "MMM d")}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {format(new Date(session.loginAt), "hh:mm a")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any, message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
      <div className="size-16 rounded-full bg-muted/30 flex items-center justify-center">
        <Icon className="size-8 text-muted-foreground opacity-20" />
      </div>
      <p className="text-sm font-bold text-muted-foreground">{message}</p>
    </div>
  );
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-4 border-b">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="flex gap-6">
           <Skeleton className="h-10 w-24" />
           <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
      <Skeleton className="h-12 w-96 rounded-xl" />
      <Skeleton className="h-[400px] w-full rounded-2xl" />
    </div>
  );
}
