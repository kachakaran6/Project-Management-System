"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Activity, 
  Search, 
  Filter, 
  User as UserIcon, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  List,
  Terminal,
  Building2,
  ChevronRight,
  RefreshCw,
  Globe,
  Zap,
  Shield,
  FileCode,
  XCircle,
  ChevronLeft,
  History,
} from "lucide-react";
import { format } from "date-fns";

import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLogsQuery, useAdminOrganizationsQuery, useAdminUsersQuery } from "@/features/admin/hooks/use-admin";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { cn } from "@/lib/utils";
import { AuditLogEntry } from "@/features/admin/api/admin.api";

type ViewMode = "table" | "timeline";

export default function SystemLogsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  // Filter & Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isLive, setIsLive] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Query Params
  const queryParams = useMemo(() => ({
    page,
    limit,
    query: debouncedSearch || undefined,
    level: levelFilter === "ALL" ? undefined : levelFilter.toLowerCase(),
    status: statusFilter === "ALL" ? undefined : statusFilter,
    module: moduleFilter === "ALL" ? undefined : moduleFilter,
    action: actionFilter === "ALL" ? undefined : actionFilter,
    organizationId: organizationFilter === "ALL" ? undefined : organizationFilter,
    userId: userFilter === "ALL" ? undefined : userFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [page, limit, debouncedSearch, levelFilter, statusFilter, moduleFilter, actionFilter, organizationFilter, userFilter, startDate, endDate]);

  const { data, isLoading, isRefetching, refetch } = useAuditLogsQuery(queryParams);
  const organizationsQuery = useAdminOrganizationsQuery();
  const usersQuery = useAdminUsersQuery();
  
  const logs = data?.items || [];
  const pagination = {
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 1,
    limit: data?.limit ?? limit,
  };
  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = pagination.total === 0 ? 0 : Math.min(rangeStart + logs.length - 1, pagination.total);

  // Auto-refresh for "Live" mode
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => refetch(), 15000); // 15s poll
    return () => clearInterval(interval);
  }, [isLive, refetch]);

  if (!isSuperAdmin) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <div className="bg-destructive/10 text-destructive flex h-20 w-20 items-center justify-center rounded-full">
          <AlertCircle size={40} />
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          You don&apos;t have the permissions required to view system audit logs. This area is reserved for Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Audit Logs</h1>
            {isLive && (
              <Badge variant="outline" className="h-5 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            High-fidelity audit tracking and administrative forensics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsLive(!isLive)}
            className={cn("h-9", isLive && "border-primary text-primary bg-primary/5")}
          >
            <Zap className={cn("mr-2 h-4 w-4", isLive && "fill-primary")} />
            {isLive ? "Live Sync On" : "Enable Live Sync"}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isRefetching}
            className="h-9"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefetching && "animate-spin")} />
            {isRefetching ? "Syncing..." : "Refresh"}
          </Button>
          <div className="bg-muted inline-flex rounded-lg p-1">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-7 px-3 text-xs"
            >
              <List className="mr-2 h-3 w-3" />
              Table
            </Button>
            <Button
              variant={viewMode === "timeline" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="h-7 px-3 text-xs"
            >
              <History className="mr-2 h-3 w-3" />
              Timeline
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-none bg-surface/50 backdrop-blur-sm shadow-sm ring-1 ring-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input 
                  placeholder="Search by action, user, module or message..." 
                  className="pl-9 bg-background/50 border-white/5"
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(limit)}
                  onValueChange={(value) => {
                    setPage(1);
                    setLimit(Number(value));
                  }}
                >
                  <SelectTrigger className="h-10 w-25 bg-background/50 border-white/5 text-xs">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={moduleFilter} onValueChange={(value) => { setPage(1); setModuleFilter(value); }}>
                  <SelectTrigger className="h-10 w-35 bg-background/50 border-white/5 text-xs">
                    <Layers className="mr-2 h-3 w-3 opacity-50" />
                    <SelectValue placeholder="Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Modules</SelectItem>
                    <SelectItem value="AUTH">Auth</SelectItem>
                    <SelectItem value="USER_MANAGEMENT">User Mgmt</SelectItem>
                    <SelectItem value="ORGANIZATION">Organization</SelectItem>
                    <SelectItem value="PROJECT">Project</SelectItem>
                    <SelectItem value="TASK">Task</SelectItem>
                    <SelectItem value="SYSTEM">System</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={levelFilter} onValueChange={(value) => { setPage(1); setLevelFilter(value); }}>
                  <SelectTrigger className="h-10 w-30 bg-background/50 border-white/5 text-xs">
                    <Filter className="mr-2 h-3 w-3 opacity-50" />
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Levels</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARN">Warning</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value) => { setPage(1); setStatusFilter(value); }}>
                  <SelectTrigger className="h-10 w-30 bg-background/50 border-white/5 text-xs">
                    <Shield className="mr-2 h-3 w-3 opacity-50" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="SUCCESS">Success</SelectItem>
                    <SelectItem value="FAILURE">Failure</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={organizationFilter} onValueChange={(value) => { setPage(1); setOrganizationFilter(value); }}>
                  <SelectTrigger className="h-10 w-42.5 bg-background/50 border-white/5 text-xs">
                    <Building2 className="mr-2 h-3 w-3 opacity-50" />
                    <SelectValue placeholder="Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Orgs</SelectItem>
                    {(organizationsQuery.data ?? []).map((org) => (
                      <SelectItem key={org._id} value={org._id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={userFilter} onValueChange={(value) => { setPage(1); setUserFilter(value); }}>
                  <SelectTrigger className="h-10 w-42.5 bg-background/50 border-white/5 text-xs">
                    <UserIcon className="mr-2 h-3 w-3 opacity-50" />
                    <SelectValue placeholder="User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Users</SelectItem>
                    {(usersQuery.data ?? []).slice(0, 100).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {[item.firstName, item.lastName].filter(Boolean).join(" ") || item.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={actionFilter} onValueChange={(value) => { setPage(1); setActionFilter(value); }}>
                  <SelectTrigger className="h-10 w-40 bg-background/50 border-white/5 text-xs">
                    <Activity className="mr-2 h-3 w-3 opacity-50" />
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Actions</SelectItem>
                    {Array.from(new Set((logs ?? []).map((log) => log.action))).slice(0, 40).map((action) => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-white/5">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date Range</span>
                <div className="flex items-center gap-2">
                  <Input 
                    type="date" 
                    className="h-8 text-[11px] w-35 bg-background/30 border-white/5" 
                    value={startDate}
                    onChange={(e) => {
                      setPage(1);
                      setStartDate(e.target.value);
                    }}
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input 
                    type="date" 
                    className="h-8 text-[11px] w-35 bg-background/30 border-white/5" 
                    value={endDate}
                    onChange={(e) => {
                      setPage(1);
                      setEndDate(e.target.value);
                    }}
                  />
                  {(startDate || endDate) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setPage(1);
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="h-8 text-[10px] text-destructive hover:bg-destructive/10"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium">
                Showing {rangeStart} - {rangeEnd} of {pagination.total} audit events
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="relative min-h-0 flex-1 flex flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
        {viewMode === "table" ? (
          <Card className="flex h-full min-h-0 flex-col overflow-hidden border-none shadow-premium ring-1 ring-border">
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              <Table className="w-full">
                <TableHeader className="bg-muted/50 sticky top-0 z-20 backdrop-blur supports-backdrop-filter:bg-muted/30">
                  <TableRow className="border-border">
                    <TableHead className="w-45">Timestamp</TableHead>
                    <TableHead className="w-20">Level</TableHead>
                    <TableHead className="w-37.5">Actor</TableHead>
                    <TableHead className="w-45">Action</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-15 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} className="border-border/50">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><div className="h-5 w-full animate-pulse bg-muted/40 rounded-md" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-72 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <Layers className="text-muted-foreground/20 h-12 w-12" />
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium">No audit logs found</p>
                            <p className="text-xs text-muted-foreground/60">Try clearing filters or search terminology.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className={cn(
                          "group transition-colors border-border/50 cursor-pointer hover:bg-muted/30", 
                          log.level === "error" && "bg-destructive/2 hover:bg-destructive/5"
                        )}
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="text-muted-foreground text-[11px] tabular-nums font-medium">
                          {format(new Date(log.createdAt), "MMM dd, HH:mm:ss.SS")}
                        </TableCell>
                        <TableCell>
                          <LevelBadge level={log.level} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 ring-1 ring-border">
                              <AvatarImage src={log.actor?.avatarUrl} />
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary uppercase">
                                {log.actor?.firstName?.[0] || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-medium truncate">
                                {log.actor?.firstName || "System"}
                              </span>
                              <span className="text-[9px] text-muted-foreground truncate opacity-70">
                                {log.actor?.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {log.status === "FAILURE" && <AlertCircle className="h-3 w-3 text-destructive shrink-0" />}
                            <span className="text-xs font-medium line-clamp-1">{log.message}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <TimelineView logs={logs} onSelect={setSelectedLog} />
          </div>
        )}
        </div>

        {/* Pagination Console */}
        {!isLoading && pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Page <span className="font-bold text-foreground">{page}</span> of {pagination.pages} 
              <span className="mx-2 opacity-30">|</span> 
              Total {pagination.total} records
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-8 px-2"
              >
                <ChevronLeft size={16} />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
                  let pageNum = i + 1;
                  // Window logic if many pages
                  if (pagination.pages > 5 && page > 3) {
                    pageNum = page - 3 + i;
                    if (pageNum + (5 - i) > pagination.pages) {
                      pageNum = pagination.pages - (4 - i);
                    }
                  }
                  
                  if (pageNum <= 0 || pageNum > pagination.pages) return null;

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={cn("h-8 w-8 text-xs", page === pageNum && "bg-primary/20 text-primary ring-1 ring-primary/30")}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === pagination.pages}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                className="h-8 px-2"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Side Drawer for Details */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="sm:max-w-xl bg-surface border-l-border/50">
          <SheetHeader className="border-b border-white/5 pb-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg",
                  selectedLog?.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
                )}>
                  {selectedLog?.status === "SUCCESS" ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold tracking-tight">Audit Inspector</SheetTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-muted-foreground font-mono">
                      {selectedLog?.requestId || "NULL_REQUEST_ID"}
                    </code>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase">
                      {selectedLog?.level}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </SheetHeader>

          {selectedLog && (
            <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-180px)] pr-2 scrollbar-premium">
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                 <p className="text-sm font-medium leading-relaxed italic text-primary/90">
                  &quot;{selectedLog.message}&quot;
                </p>
              </div>

              <section>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actor context</span>
                    <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg ring-1 ring-border/50">
                       <Avatar className="h-8 w-8 ring-1 ring-background">
                        <AvatarImage src={selectedLog.actor?.avatarUrl} />
                        <AvatarFallback>{selectedLog.actor?.firstName?.[0] || 'S'}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">{selectedLog.actor?.firstName || "System"}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-30">{selectedLog.actor?.email || "internal@system"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Network Origin</span>
                    <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg ring-1 ring-border/50">
                      <Globe size={14} className="text-muted-foreground" />
                      <span className="text-xs font-mono">{selectedLog.ip || "127.0.0.1"}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Core Context</h4>
                <div className="grid grid-cols-3 gap-3">
                  <MetricItem 
                    icon={<Activity size={12} />} 
                    label="Module" 
                    value={selectedLog.module || "GENERAL"} 
                  />
                  <MetricItem 
                    icon={<Terminal size={12} />} 
                    label="Method" 
                    value={selectedLog.method || "N/A"} 
                  />
                  <MetricItem 
                    icon={<Shield size={12} />} 
                    label="Status" 
                    value={selectedLog.status} 
                  />
                </div>
              </section>

              {selectedLog.endpoint && (
                <section>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Endpoint Trail</h4>
                  <div className="bg-[#0b0e14] border border-white/5 p-3 rounded-lg flex items-center gap-3 font-mono text-xs">
                    <span className="text-primary font-bold">{selectedLog.method}</span>
                    <span className="text-emerald-400 opacity-80">{selectedLog.endpoint}</span>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Structured Metadata</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                  }}>
                    Copy JSON
                  </Button>
                </div>
                
                {selectedLog.stack && (
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-destructive">
                      <FileCode size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Stack Trace</span>
                    </div>
                    <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl overflow-x-auto">
                      <pre className="text-[10px] font-mono text-destructive tracking-tight leading-relaxed">
                        {selectedLog.stack}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="bg-[#0D1117] p-4 rounded-xl border border-white/5 shadow-inner overflow-hidden">
                   <pre className="text-[11px] font-mono text-blue-300 leading-normal overflow-x-auto scrollbar-hide">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </section>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>Created: {format(new Date(selectedLog.createdAt), "yyyy-MM-dd HH:mm:ss.SS")}</span>
                <span>UUID: {selectedLog.id.slice(0, 8)}...</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const normalized = level.toUpperCase();
  
  const styles: Record<string, string> = {
    INFO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    WARN: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    ERROR: "bg-red-500/10 text-red-500 border-red-500/20",
    DEBUG: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };
  
  return (
    <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 h-4.5 rounded uppercase tracking-tighter", styles[normalized] || styles.INFO)}>
      {normalized}
    </Badge>
  );
}

function ActionBadge({ action }: { action: string }) {
  const norm = action.toUpperCase();
  
  if (norm.includes("CREATE")) return <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-1.5 h-5 text-[10px] font-bold uppercase">Create</Badge>;
  if (norm.includes("UPDATE")) return <Badge className="bg-blue-500/10 text-blue-500 border-none px-1.5 h-5 text-[10px] font-bold uppercase">Update</Badge>;
  if (norm.includes("DELETE")) return <Badge className="bg-red-500/10 text-red-500 border-none px-1.5 h-5 text-[10px] font-bold uppercase">Delete</Badge>;
  if (norm.includes("AUTH") || norm.includes("LOGIN") || norm.includes("REGISTER")) 
    return <Badge className="bg-indigo-500/10 text-indigo-500 border-none px-1.5 h-5 text-[10px] font-bold uppercase">Auth</Badge>;
  
  return <Badge variant="secondary" className="bg-muted text-muted-foreground px-1.5 h-5 text-[10px] font-bold uppercase truncate max-w-30">{norm}</Badge>;
}

function MetricItem({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color?: string }) {
  return (
    <div className="bg-muted/20 p-3 rounded-xl ring-1 ring-border/50 flex flex-col gap-1 hover:bg-muted/30 transition-colors text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <span className={cn("text-xs font-bold font-mono truncate", color || "text-foreground")}>{value}</span>
    </div>
  );
}

function TimelineView({ logs, onSelect }: { logs: AuditLogEntry[], onSelect: (l: AuditLogEntry) => void }) {
  return (
    <div className="relative space-y-8 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-white/5 lg:before:left-6 px-4">
      {logs.map((log) => (
        <div key={log.id} className="relative pl-10 lg:pl-16 group">
          <div className={cn(
            "absolute left-2.5 lg:left-4.5 top-0.5 z-10 h-3 w-3 rounded-full border-2 border-background ring-4 ring-background transition-transform group-hover:scale-125 duration-300 shadow-md",
            log.level === "error" ? "bg-red-500 shadow-red-500/20" : 
            log.level === "warn" ? "bg-amber-500 shadow-amber-500/20" :
            "bg-blue-500 shadow-blue-500/20"
          )} />
          <div className="flex flex-col space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] tabular-nums bg-white/5 px-2 py-0.5 rounded-full">
                {format(new Date(log.createdAt), "HH:mm:ss · MMM dd, yyyy")}
              </span>
              <div className="flex items-center gap-2">
                <ActionBadge action={log.action} />
                <span className="text-xs text-muted-foreground opacity-50">by</span>
                <span className="text-xs font-bold text-primary/80">{log.actor?.firstName || "System"}</span>
              </div>
            </div>
            <div 
              className="bg-surface/30 backdrop-blur-sm border border-white/5 p-5 rounded-2xl hover:bg-surface/60 transition-all cursor-pointer shadow-sm group-hover:shadow-xl group-hover:ring-1 group-hover:ring-primary/20"
              onClick={() => onSelect(log)}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-2">
                  <p className="text-base leading-relaxed text-foreground/90 font-medium">{log.message}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <Badge variant="outline" className="text-[9px] uppercase border-white/10 opacity-70">
                      Module: {log.module || "SYSTEM"}
                    </Badge>
                    {log.endpoint && (
                      <div className="flex items-center gap-2 font-mono text-[9px] opacity-40">
                        <span className="uppercase font-bold text-primary">{log.method}</span>
                        <span>{log.endpoint}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/20 mt-1 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
