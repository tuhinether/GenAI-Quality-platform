"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyQualityStat, DailyUsageStat } from "@/lib/monitoring";

const chartProps = {
  margin: { top: 8, right: 16, left: 0, bottom: 0 },
};

export function QualityChart({ data }: { data: DailyQualityStat[] }) {
  const points = data.map((d) => ({ day: d.day, rate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0 }));
  return (
    <ChartCard title="Quality score (evaluator pass rate)">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} {...chartProps}>
          <CartesianGrid stroke="#1c2029" vertical={false} />
          <XAxis dataKey="day" stroke="#8b909c" fontSize={12} />
          <YAxis stroke="#8b909c" fontSize={12} domain={[0, 100]} unit="%" />
          <Tooltip contentStyle={{ background: "#12151c", border: "1px solid #232733" }} />
          <Line type="monotone" dataKey="rate" stroke="#f2b705" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function LatencyChart({ data }: { data: DailyUsageStat[] }) {
  const points = data.map((d) => ({
    day: d.day,
    avg: d.avgLatencyMs != null ? Math.round(d.avgLatencyMs) : 0,
    p95: d.p95LatencyMs != null ? Math.round(d.p95LatencyMs) : 0,
  }));
  return (
    <ChartCard title="Latency (ms)">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} {...chartProps}>
          <CartesianGrid stroke="#1c2029" vertical={false} />
          <XAxis dataKey="day" stroke="#8b909c" fontSize={12} />
          <YAxis stroke="#8b909c" fontSize={12} />
          <Tooltip contentStyle={{ background: "#12151c", border: "1px solid #232733" }} />
          <Line type="monotone" dataKey="avg" name="avg" stroke="#38bdf8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="p95" name="p95" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function CostChart({ data }: { data: DailyUsageStat[] }) {
  const points = data.map((d) => ({ day: d.day, cost: d.totalCostUsd ?? 0 }));
  return (
    <ChartCard title="Cost (USD)">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} {...chartProps}>
          <CartesianGrid stroke="#1c2029" vertical={false} />
          <XAxis dataKey="day" stroke="#8b909c" fontSize={12} />
          <YAxis stroke="#8b909c" fontSize={12} />
          <Tooltip contentStyle={{ background: "#12151c", border: "1px solid #232733" }} />
          <Line type="monotone" dataKey="cost" stroke="#2dd4bf" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="mb-2 text-sm font-medium text-[var(--text-muted)]">{title}</h3>
      {children}
    </div>
  );
}
