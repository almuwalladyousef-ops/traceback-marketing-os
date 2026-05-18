"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";

interface ChartEntry {
  date: string;
  day: number;
  count: number;
}

export function CommentChart({ data, today }: { data: ChartEntry[]; today: string }) {
  const todayDay = parseInt(today.split("-")[2], 10);
  const todayEntry = data.find((d) => d.day === todayDay);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 24, left: -8, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "13px",
          }}
          formatter={(value) => [value, "comments"]}
          labelFormatter={(label) => `Day ${label}`}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "var(--accent)", strokeWidth: 0 }}
        />
        {todayEntry && (
          <ReferenceDot
            x={todayDay}
            y={todayEntry.count}
            r={5}
            fill="var(--accent)"
            stroke="var(--bg)"
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
