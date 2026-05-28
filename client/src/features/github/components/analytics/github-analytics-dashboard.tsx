"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRepoCommits, useRepoTotalCommits } from "@/features/github/hooks/use-github";
import {
  format, startOfWeek, startOfMonth, parseISO, getDay,
  differenceInDays, eachDayOfInterval, subDays, subMonths, subYears, isValid
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  GitCommit, Activity, ChevronDown, X, Plus, TrendingUp,
  RefreshCw, AlertCircle, Zap, Flame, Calendar, BarChart2,
  ArrowUpRight, ArrowDownRight, Minus, History, Filter, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { useTheme } from "next-themes";
import { RepositoryPerformanceTable } from "./repository-performance-table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Types ───────────────────────────────────────────────────────────────────
interface GithubAnalyticsDashboardProps { repos: any[]; }
interface CommitEntry { date: string; count: number; }
interface RepoData { commits: CommitEntry[]; raw: any[]; }

type TimeRange = "7d" | "30d" | "90d" | "6m" | "1y" | "all";

// ─── Constants ───────────────────────────────────────────────────────────────
const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#84cc16","#8b5cf6"];
const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CHART_TABS = ["activity","compare","heatmap","weekdays"] as const;
type ChartTab = typeof CHART_TABS[number];

// ─── Parse raw commits → daily map ───────────────────────────────────────────
function parseDailyCommits(rawData: any[], startDate?: Date, endDate?: Date): CommitEntry[] {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    if (startDate && endDate) {
       return eachDayOfInterval({ start: startDate, end: endDate }).map(d => ({ date: format(d, "yyyy-MM-dd"), count: 0 }));
    }
    return [];
  }
  
  const map = new Map<string, number>();
  rawData.forEach((item: any) => {
    const dateStr = item?.commit?.author?.date || item?.commit?.committer?.date;
    if (!dateStr) return;
    const day = format(new Date(dateStr), "yyyy-MM-dd");
    map.set(day, (map.get(day) || 0) + 1);
  });
  
  if (map.size === 0) return [];
  
  const dates = Array.from(map.keys()).sort();
  const start = startDate || parseISO(dates[0]);
  const end = endDate || parseISO(dates[dates.length - 1]);
  
  // Ensure we don't crash on invalid intervals
  if (!isValid(start) || !isValid(end) || start > end) return [];

  return eachDayOfInterval({ start, end }).map(d => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, count: map.get(key) || 0 };
  });
}

// ─── Aggregate daily → weekly or monthly ────────────────────────────────────
function aggregate(daily: CommitEntry[], by: "daily" | "weekly" | "monthly"): CommitEntry[] {
  if (by === "daily") return daily;
  const map = new Map<string, number>();
  daily.forEach(({ date, count }) => {
    const d = parseISO(date);
    if (!isValid(d)) return;
    const key = by === "weekly"
      ? format(startOfWeek(d), "yyyy-MM-dd")
      : format(startOfMonth(d), "yyyy-MM");
    map.set(key, (map.get(key) || 0) + count);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

// ─── Custom Premium Tooltip ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, isDark, prevValue }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  const delta = prevValue !== undefined ? total - prevValue : null;
  return (
    <div className={cn(
      "p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md min-w-[170px] z-50",
      isDark ? "bg-slate-900/95 border-white/10 text-slate-100" : "bg-white/95 border-slate-200 text-slate-900"
    )}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground mb-2.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-5 text-xs font-semibold py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
            <span className="truncate max-w-[110px] opacity-80">{entry.name}</span>
          </div>
          <span className="tabular-nums font-black">{entry.value}</span>
        </div>
      ))}
      {delta !== null && (
        <div className={cn(
          "mt-2 pt-2 border-t text-[10px] font-bold flex items-center gap-1",
          isDark ? "border-white/10" : "border-slate-100",
          delta > 0 ? "text-emerald-500" : delta < 0 ? "text-red-400" : "text-muted-foreground"
        )}>
          {delta > 0 ? <ArrowUpRight className="size-3" /> : delta < 0 ? <ArrowDownRight className="size-3" /> : <Minus className="size-3" />}
          {delta > 0 ? `+${delta}` : delta} vs previous period
        </div>
      )}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, isDark, isLoading }: any) => (
  <div className={cn(
    "rounded-2xl border p-5 flex flex-col gap-2 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
    isDark ? "bg-gradient-to-br from-slate-900/90 to-slate-900/40 border-white/10" : "bg-gradient-to-br from-white to-slate-50/50 border-slate-200"
  )}>
    <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at top right, ${color}, transparent 70%)` }} />
    <div className="flex items-center justify-between z-10">
      <div className="p-2 rounded-xl backdrop-blur-sm" style={{ backgroundColor: color + "15", color }}>
        <Icon className="size-4" />
      </div>
      {sub && (
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" 
              style={{ backgroundColor: color + "10", color }}>
          {sub}
        </span>
      )}
    </div>
    <div className="mt-2 z-10">
      {isLoading ? (
         <div className="h-8 w-24 bg-muted/50 animate-pulse rounded-md mt-1" />
      ) : (
         <div className="text-3xl font-black tabular-nums tracking-tight drop-shadow-sm">{value}</div>
      )}
      <div className="text-[12px] text-muted-foreground font-semibold mt-1">{label}</div>
    </div>
  </div>
);

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────
const HeatCell = ({ count, max, color, date, isDark }: any) => {
  const intensity = max > 0 ? count / max : 0;
  const bg = count === 0
    ? isDark ? "#1e293b" : "#f1f5f9"
    : `${color}${Math.round(intensity * 220 + 35).toString(16).padStart(2, "0")}`;
  return (
    <div
      title={`${date}: ${count} commit${count !== 1 ? "s" : ""}`}
      className="rounded-sm cursor-default transition-all hover:ring-2 hover:ring-white/50 hover:scale-125 hover:z-10 relative"
      style={{ width: 14, height: 14, backgroundColor: bg }}
    />
  );
};

// ─── Repo Fetcher ─────────────────────────────────────────────────────────────
interface RepoFetcherProps {
  owner: string; repo: string; since?: string; until?: string;
  onSettled: (repo: string, data: RepoData) => void;
}

const RepoStatsFetcher = ({ owner, repo, since, until, onSettled }: RepoFetcherProps) => {
  const { data, isLoading, isFetching, isError } = useRepoCommits(owner, repo, { since, until, perPage: 100 });
  
  useEffect(() => {
    if (isLoading || isFetching) return;

    if (isError || !data || !Array.isArray(data) || data.length === 0) {
      onSettled(repo, { commits: parseDailyCommits([], since ? new Date(since) : undefined, until ? new Date(until) : undefined), raw: [] });
      return;
    }

    const startDate = since ? new Date(since) : undefined;
    const endDate = until ? new Date(until) : undefined;

    onSettled(repo, {
      commits: parseDailyCommits(data, startDate, endDate),
      raw: data,
    });
  }, [isLoading, isFetching, isError, data, repo, since, until]);

  return null;
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export const GithubAnalyticsDashboard = ({ repos }: GithubAnalyticsDashboardProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [repoData, setRepoData] = useState<Record<string, RepoData | null>>({});
  const [groupBy, setGroupBy] = useState<"daily" | "weekly" | "monthly">("daily");
  const [activeTab, setActiveTab] = useState<ChartTab>("activity");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const axisColor = isDark ? "#64748b" : "#94a3b8";

  // Calculate Date Ranges
  const dateRange = useMemo(() => {
    const end = new Date();
    let start = new Date();
    switch (timeRange) {
      case "7d": start = subDays(end, 7); break;
      case "30d": start = subDays(end, 30); break;
      case "90d": start = subDays(end, 90); break;
      case "6m": start = subMonths(end, 6); break;
      case "1y": start = subYears(end, 1); break;
      case "all": return { since: undefined, until: undefined };
    }
    return { since: start.toISOString(), until: end.toISOString() };
  }, [timeRange]);

  // Auto-select most recently active repo
  useEffect(() => {
    if (repos.length > 0 && selectedRepos.length === 0) {
      const sorted = [...repos].sort((a, b) =>
        new Date(b.pushed_at || b.updated_at).getTime() - new Date(a.pushed_at || a.updated_at).getTime()
      );
      const first = sorted[0].name;
      setSelectedRepos([first]);
      setRepoData({ [first]: null });
    }
  }, [repos]);

  // When timeRange changes, set all active repos to loading state
  useEffect(() => {
    if (selectedRepos.length > 0) {
      setRepoData(prev => {
        const next = { ...prev };
        selectedRepos.forEach(r => next[r] = null);
        return next;
      });
    }
  }, [timeRange]);

  const handleSettled = useCallback((repoName: string, data: RepoData) => {
    setRepoData(prev => ({ ...prev, [repoName]: data }));
  }, []);

  const handleSelectRepo = (repoName: string) => {
    if (selectedRepos.includes(repoName) || selectedRepos.length >= 8) return;
    setSelectedRepos(prev => [...prev, repoName]);
    setRepoData(prev => ({ ...prev, [repoName]: null }));
    setDropdownOpen(false);
    setSearch("");
  };

  const handleRemoveRepo = (repoName: string) => {
    setSelectedRepos(prev => prev.filter(r => r !== repoName));
    setRepoData(prev => { const n = { ...prev }; delete n[repoName]; return n; });
  };

  const filteredRepos = useMemo(() =>
    repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) && !selectedRepos.includes(r.name)),
    [repos, search, selectedRepos]);

  // ─── Derived data ──────────────────────────────────────────────────────────
  const loadingRepos = selectedRepos.filter(r => repoData[r] === null || repoData[r] === undefined);
  const settledRepos = selectedRepos.filter(r => repoData[r] !== null && repoData[r] !== undefined);
  const reposWithData = selectedRepos.filter(r => (repoData[r]?.commits?.length ?? 0) > 0);
  const isStillLoading = selectedRepos.length > 0 && loadingRepos.length === selectedRepos.length;
  
  // ─── Total Repo Commits (All Time) ─────────────────────────────────────────
  const primaryRepoName = selectedRepos[0];
  const primaryRepoObj = repos.find(r => r.name === primaryRepoName);
  const { data: totalRepoCommits, isLoading: isTotalLoading } = useRepoTotalCommits(
    primaryRepoObj?.owner?.login || "", 
    primaryRepoName || ""
  );

  // ─── Activity chart data ──────────────────────────────────────────────────
  const activityChartData = useMemo(() => {
    if (reposWithData.length === 0) return [];
    const map = new Map<string, any>();

    reposWithData.forEach(repoName => {
      const daily = repoData[repoName]?.commits ?? [];
      const agg = aggregate(daily, groupBy);
      agg.forEach(({ date, count }) => {
        const label = groupBy === "daily"
          ? format(parseISO(date), "MMM d")
          : groupBy === "weekly"
            ? format(parseISO(date), "MMM d")
            : format(parseISO(date + "-01"), "MMM yy");
        if (!map.has(date)) map.set(date, { _date: date, date: label });
        map.get(date)![repoName] = count;
      });
    });

    return Array.from(map.values())
      .sort((a, b) => a._date.localeCompare(b._date));
  }, [repoData, reposWithData, groupBy]);

  // ─── Stats for primary repo ────────────────────────────────────────────────
  const primaryCommits = useMemo(() => repoData[primaryRepoName]?.commits ?? [], [repoData, primaryRepoName]);

  const stats = useMemo(() => {
    if (primaryCommits.length === 0) return null;
    const total = primaryCommits.reduce((s, c) => s + c.count, 0);
    const nonZero = primaryCommits.filter(c => c.count > 0);
    const avg = primaryCommits.length > 0 ? (total / primaryCommits.length).toFixed(1) : "0";
    const peak = [...primaryCommits].sort((a, b) => b.count - a.count)[0];
    
    // compute streak
    let streak = 0;
    const commitDays = new Set(nonZero.map(c => c.date));
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (!commitDays.has(d)) break;
      streak++;
    }

    // trend: compare current half of selected range vs previous half
    const half = Math.floor(primaryCommits.length / 2);
    const currentHalf = primaryCommits.slice(-half).reduce((s, c) => s + c.count, 0);
    const prevHalf = primaryCommits.slice(-half * 2, -half).reduce((s, c) => s + c.count, 0);
    const trendPct = prevHalf > 0 ? Math.round(((currentHalf - prevHalf) / prevHalf) * 100) : null;

    return { total, avg, peak, streak, trendPct, activeDays: nonZero.length };
  }, [primaryCommits]);

  // ─── Day-of-week distribution ──────────────────────────────────────────────
  const dowData = useMemo(() => {
    const counts = Array(7).fill(0);
    reposWithData.forEach(r => {
      (repoData[r]?.commits ?? []).forEach(({ date, count }) => {
        counts[getDay(parseISO(date))] += count;
      });
    });
    return DOW_LABELS.map((day, i) => ({ day, commits: counts[i] }));
  }, [repoData, reposWithData]);

  // ─── Heatmap ──────────────────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const allMap = new Map<string, number>();
    reposWithData.forEach(r => {
      (repoData[r]?.commits ?? []).forEach(({ date, count }) => {
        allMap.set(date, (allMap.get(date) || 0) + count);
      });
    });

    const endDay = new Date();
    // Default heatmap shows 20 weeks if timeRange is small, otherwise scales
    const weeksToShow = timeRange === "7d" || timeRange === "30d" ? 12 : 24;
    const startDay = subDays(startOfWeek(endDay), weeksToShow * 7);
    const days = eachDayOfInterval({ start: startDay, end: endDay });
    const maxCount = Math.max(...Array.from(allMap.values()), 1);

    const weeks: { date: string; count: number }[][] = [];
    let week: { date: string; count: number }[] = [];
    days.forEach((d, i) => {
      const key = format(d, "yyyy-MM-dd");
      week.push({ date: key, count: allMap.get(key) || 0 });
      if (week.length === 7 || i === days.length - 1) {
        weeks.push(week);
        week = [];
      }
    });

    return { weeks, maxCount };
  }, [repoData, reposWithData, timeRange]);

  const getPrev = (data: any[], i: number, key: string) =>
    i > 0 ? (data[i - 1][key] || 0) : undefined;

  const primaryColor = COLORS[0];

  const tabConfig: { id: ChartTab; label: string; icon: any }[] = [
    { id: "activity", label: "Velocity", icon: TrendingUp },
    { id: "compare", label: "Comparison", icon: BarChart2 },
    { id: "heatmap", label: "Density", icon: Calendar },
    { id: "weekdays", label: "Patterns", icon: Flame },
  ];

  const timeRangeLabels: Record<TimeRange, string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
    "6m": "Last 6 Months",
    "1y": "Last 1 Year",
    "all": "All Time Activity"
  };

  return (
    <div className="space-y-6">
      {/* Hidden fetchers */}
      {selectedRepos.map(repoName => {
        const ro = repos.find(r => r.name === repoName);
        if (!ro) return null;
        return <RepoStatsFetcher key={`${ro.owner.login}/${repoName}/${timeRange}`} owner={ro.owner.login} repo={repoName} since={dateRange.since} until={dateRange.until} onSettled={handleSettled} />;
      })}

      {/* ── Premium Header & Controls ───────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-5 rounded-3xl border shadow-sm transition-all",
        isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight">Engineering Analytics</h2>
            <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", 
              isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border-indigo-200")}>
              BETA
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Clock className="size-3" />
            {timeRange === "all" ? "Displaying full repository history" : `Showing activity from ${dateRange.since ? format(parseISO(dateRange.since), "MMM d, yyyy") : ''} → Present`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Repository Selector */}
          <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-full h-9 px-4 font-bold text-xs gap-2 border-slate-200/50 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800">
                <GitCommit className="size-3.5" />
                {selectedRepos.length === 1 ? selectedRepos[0] : `${selectedRepos.length} Repositories`}
                <ChevronDown className="size-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 rounded-2xl" align="end">
              <div className="mb-2 px-1">
                <input autoFocus placeholder="Search repositories…"
                  className="w-full h-8 px-3 text-xs font-medium rounded-full bg-muted/50 border-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2 px-1">
                {selectedRepos.map((repoName, i) => (
                  <div key={repoName} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-[10px] font-bold">
                     <div className="size-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                     <span className="truncate max-w-[80px]">{repoName}</span>
                     <button onClick={() => handleRemoveRepo(repoName)} className="opacity-50 hover:opacity-100"><X className="size-2.5" /></button>
                  </div>
                ))}
              </div>

              <div className="max-h-48 overflow-y-auto">
                {filteredRepos.map(r => (
                  <button key={r.name} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-muted/50 rounded-xl transition-colors flex items-center gap-2"
                    onClick={() => handleSelectRepo(r.name)}>
                    <GitCommit className="size-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{r.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Time Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="default" className="rounded-full h-9 px-4 font-bold text-xs gap-2 shadow-sm">
                <Filter className="size-3.5" />
                {timeRangeLabels[timeRange]}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1 rounded-2xl" align="end">
              {(Object.keys(timeRangeLabels) as TimeRange[]).map((tr) => (
                <button key={tr} 
                  className={cn("w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors", timeRange === tr ? "bg-primary/10 text-primary" : "hover:bg-muted/50")}
                  onClick={() => setTimeRange(tr)}>
                  {timeRangeLabels[tr]}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Advanced Stats Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={History} label="All-Time Commits" value={totalRepoCommits?.toLocaleString() || "0"} sub="Lifetime" color={COLORS[4]} isDark={isDark} isLoading={isTotalLoading} />
        
        {!isStillLoading && stats ? (
          <>
            <StatCard icon={GitCommit} label="Filtered Commits" value={stats.total.toLocaleString()} sub={timeRange} color={COLORS[0]} isDark={isDark} />
            <StatCard icon={Activity} label="Avg Commits / Day" value={stats.avg} color={COLORS[1]} isDark={isDark} />
            <StatCard icon={TrendingUp} label="Peak Activity" value={stats.peak?.count ?? 0} sub={stats.peak ? format(parseISO(stats.peak.date), "MMM d") : undefined} color={COLORS[2]} isDark={isDark} />
            <StatCard icon={Flame} label="Active Days" value={stats.activeDays} sub={`${Math.round((stats.activeDays / primaryCommits.length) * 100 || 0)}% of period`} color={COLORS[5]} isDark={isDark} />
          </>
        ) : (
          [...Array(4)].map((_, i) => <StatCard key={i} icon={GitCommit} label="Loading..." value="-" color={COLORS[i]} isDark={isDark} isLoading={true} />)
        )}
      </div>

      {/* ── Dynamic Chart Tabs ───────────────────────────────────────────── */}
      <div className={cn("rounded-3xl border overflow-hidden shadow-sm transition-all",
        isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-200")}>

        {/* Tab bar */}
        <div className={cn("flex flex-wrap items-center justify-between border-b px-2", isDark ? "border-white/5" : "border-slate-100")}>
          <div className="flex items-center">
            {tabConfig.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-2 px-5 py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2",
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}>
                <tab.icon className="size-4" />{tab.label}
              </button>
            ))}
          </div>
          
          {/* Resolution grouping */}
          <div className="hidden sm:flex items-center gap-1 p-1 mr-3 bg-muted/30 rounded-full border border-border/40">
            {(["daily", "weekly", "monthly"] as const).map(g => (
              <button key={g} onClick={() => setGroupBy(g)}
                className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                  groupBy === g
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Loading */}
          {isStillLoading && (
            <div className="h-[380px] flex flex-col items-center justify-center gap-4">
              <RefreshCw className="size-8 text-primary/50 animate-spin" />
              <p className="text-sm font-black text-muted-foreground tracking-widest uppercase">Aggregating Analytics…</p>
            </div>
          )}

          {/* ── Activity Tab ─────────────────────────────────────── */}
          {!isStillLoading && activeTab === "activity" && (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-black text-lg tracking-tight">Repository Velocity</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    {groupBy === "daily" ? "Commits per day" : groupBy === "weekly" ? "Commits per week" : "Commits per month"}
                  </p>
                </div>
                {stats?.trendPct != null && (
                  <div className={cn("flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full border",
                    stats.trendPct > 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : stats.trendPct < 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-muted text-muted-foreground border-border/50"
                  )}>
                    {stats.trendPct > 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    {stats.trendPct > 0 ? "+" : ""}{stats.trendPct}% vs previous {timeRange}
                  </div>
                )}
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g0" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridColor} vertical={false} strokeDasharray="4 4" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false}
                      tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }}
                      interval="preserveStartEnd" minTickGap={30} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} />
                    <Tooltip content={({ active, payload, label }) => (
                      <CustomTooltip active={active} payload={payload} label={label} isDark={isDark}
                        prevValue={payload?.[0] ? getPrev(activityChartData, activityChartData.findIndex(d => d.date === label), primaryRepoName) : undefined} />
                    )} cursor={{ stroke: primaryColor, strokeWidth: 1, strokeOpacity: 0.5, strokeDasharray: "4 4" }} />
                    <Area type="monotoneX" dataKey={primaryRepoName} name="Commits"
                      stroke={primaryColor} strokeWidth={3}
                      fill="url(#g0)" fillOpacity={1}
                      activeDot={{ r: 6, fill: primaryColor, strokeWidth: 3, stroke: isDark ? "#0f172a" : "#ffffff", className: "drop-shadow-xl" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Compare Tab ──────────────────────────────────────── */}
          {!isStillLoading && activeTab === "compare" && (
            <div className="animate-in fade-in duration-500">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="font-black text-lg tracking-tight">Cross-Repository Analysis</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">Compare commit frequency across {reposWithData.length} repositories</p>
                </div>
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} strokeDasharray="4 4" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false}
                      tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }}
                      interval="preserveStartEnd" minTickGap={30} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ stroke: gridColor, strokeWidth: 2 }} />
                    <Legend wrapperStyle={{ paddingTop: 20, fontSize: 12, fontWeight: 800 }} iconType="circle" />
                    {reposWithData.map((repoName, i) => (
                      <Line key={repoName} type="monotoneX" dataKey={repoName} name={repoName}
                        stroke={COLORS[selectedRepos.indexOf(repoName) % COLORS.length]}
                        strokeWidth={3} dot={false}
                        activeDot={{ r: 6, strokeWidth: 3, stroke: isDark ? "#0f172a" : "#ffffff", fill: COLORS[selectedRepos.indexOf(repoName) % COLORS.length] }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Heatmap Tab ───────────────────────────────────────── */}
          {!isStillLoading && activeTab === "heatmap" && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-6">
                <h3 className="font-black text-lg tracking-tight">Contribution Density</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Daily commit activity visualised</p>
              </div>
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="flex gap-1.5 mb-2 pl-2">
                  {heatmapData.weeks.map((week, i) => {
                    if (i % 4 === 0) {
                      const m = format(parseISO(week[0].date), "MMM");
                      return <div key={i} className="flex-1 text-[10px] text-muted-foreground font-black uppercase tracking-wider">{m}</div>;
                    }
                    return <div key={i} className="flex-1" />;
                  })}
                </div>
                <div className="flex gap-1.5 pl-2">
                  {heatmapData.weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1.5">
                      {week.map((day, di) => (
                        <HeatCell key={di} count={day.count} max={heatmapData.maxCount}
                          color={primaryColor} date={day.date} isDark={isDark} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Weekdays Tab ──────────────────────────────────────── */}
          {!isStillLoading && activeTab === "weekdays" && (
            <div className="animate-in fade-in duration-500">
              <div className="mb-6">
                <h3 className="font-black text-lg tracking-tight">Productivity Patterns</h3>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Which days are the most active?</p>
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} strokeDasharray="4 4" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 12, fontWeight: 800 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />}
                      cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                    <Bar dataKey="commits" name="Commits" radius={[8, 8, 0, 0]}>
                      {dowData.map((entry, i) => {
                        const maxVal = Math.max(...dowData.map(d => d.commits));
                        const isPeak = entry.commits === maxVal && maxVal > 0;
                        return <Cell key={i} fill={isPeak ? primaryColor : isDark ? "#334155" : "#e2e8f0"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* ── Repository Performance Table ──────────────────────────────────── */}
      <div className={cn("rounded-3xl border p-6 shadow-sm", isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-200")}>
        <h3 className="text-lg font-black tracking-tight mb-5 flex items-center gap-2">
          <Activity className="size-5 text-emerald-500" /> Repository Performance
        </h3>
        <RepositoryPerformanceTable repos={repos} />
      </div>
    </div>
  );
};
