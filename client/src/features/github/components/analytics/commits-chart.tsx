"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

interface CommitsChartProps {
  data: any[];
  lines: string[];
  colors: string[];
  mode: "overall" | "compare";
  timeGrouping: "daily" | "weekly" | "monthly";
}

const CustomTooltip = ({ active, payload, label, isDark }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 rounded-card border shadow-xl flex flex-col gap-1.5 min-w-[150px] ${isDark ? 'bg-card/95 border-border/60 text-slate-200' : 'bg-white border-border/40 text-slate-800'}`}>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="space-y-1 mt-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="truncate max-w-[150px]">{entry.name}</span>
              </div>
              <span className="tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const CommitsChart = ({ data, lines, colors, mode, timeGrouping }: CommitsChartProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Grid and text colors for premium dark/light mode
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center border border-dashed border-border/40 rounded-card bg-muted/5">
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No commit data available</span>
      </div>
    );
  }

  // Use Area chart for overall, Line chart for compare
  if (mode === "overall") {
    return (
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridColor} opacity={isDark ? 0.4 : 0.8} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }} 
              dx={-10}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ stroke: gridColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
              type="monotone" 
              dataKey={lines[0]} 
              stroke={colors[0]} 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorTotal)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: colors[0], className: "drop-shadow-md" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridColor} opacity={isDark ? 0.4 : 0.8} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }} 
            dx={-10}
          />
          <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={{ stroke: gridColor, strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} 
            iconType="circle"
          />
          
          {lines.map((line, index) => (
            <Line
              key={line}
              type="monotone"
              dataKey={line}
              name={line}
              stroke={colors[index % colors.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: colors[index % colors.length], className: "drop-shadow-md" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
