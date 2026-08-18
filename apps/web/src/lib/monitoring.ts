import { sql } from "drizzle-orm";
import { getDb } from "./db";

export interface DailyUsageStat {
  day: string;
  traceCount: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  totalCostUsd: number | null;
}

export interface DailyQualityStat {
  day: string;
  total: number;
  passed: number;
}

export async function getDailyUsageStats(projectId: string): Promise<DailyUsageStat[]> {
  const db = getDb();
  const rows = await db.execute<{
    day: string;
    trace_count: number;
    avg_latency: number | null;
    p95_latency: number | null;
    total_cost: number | null;
  }>(sql`
    select
      to_char(date_trunc('day', start_time), 'YYYY-MM-DD') as day,
      count(*)::int as trace_count,
      avg(latency_ms)::float as avg_latency,
      percentile_cont(0.95) within group (order by latency_ms) as p95_latency,
      sum(cost_usd)::float as total_cost
    from traces
    where project_id = ${projectId}
    group by 1
    order by 1
  `);

  return [...rows].map((r) => ({
    day: r.day,
    traceCount: r.trace_count,
    avgLatencyMs: r.avg_latency,
    p95LatencyMs: r.p95_latency,
    totalCostUsd: r.total_cost,
  }));
}

export async function getDailyQualityStats(projectId: string): Promise<DailyQualityStat[]> {
  const db = getDb();
  const rows = await db.execute<{ day: string; total: number; passed: number }>(sql`
    select
      to_char(date_trunc('day', t.start_time), 'YYYY-MM-DD') as day,
      count(*)::int as total,
      count(*) filter (where er.passed)::int as passed
    from evaluator_results er
    join traces t on t.id = er.trace_id
    where t.project_id = ${projectId} and er.trace_id is not null
    group by 1
    order by 1
  `);

  return [...rows].map((r) => ({ day: r.day, total: r.total, passed: r.passed }));
}
