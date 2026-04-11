"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductivityDatum } from "@/features/dashboard/api/dashboard.api";

interface ProductivityChartProps {
  data: ProductivityDatum[];
}

export function ProductivityChart({ data }: ProductivityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Productivity Overview</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.every((item) => item.count === 0) ? (
          <p className="text-sm text-muted-foreground">
            No productivity data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="priority" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                fill="var(--primary)"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
