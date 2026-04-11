"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusDatum } from "@/features/dashboard/api/dashboard.api";

const colors = ["#3b82f6", "#f59e0b", "#22c55e"];

interface TaskStatusChartProps {
  data: TaskStatusDatum[];
}

export function TaskStatusChart({ data }: TaskStatusChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Task Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.every((item) => item.value === 0) ? (
          <p className="text-sm text-muted-foreground">
            No task data available for current organization.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
