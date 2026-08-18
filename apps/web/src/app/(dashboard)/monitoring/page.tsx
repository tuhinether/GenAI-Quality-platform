import { Badge } from "@/components/ui/badge";
import { CostChart, LatencyChart, QualityChart } from "@/components/monitoring/charts";
import { getActiveProject } from "@/lib/auth";
import { getDailyQualityStats, getDailyUsageStats } from "@/lib/monitoring";

const QUALITY_ALERT_THRESHOLD = 0.8;

export default async function MonitoringPage() {
  const active = await getActiveProject();
  if (!active) return null;

  const [usage, quality] = await Promise.all([
    getDailyUsageStats(active.project.id),
    getDailyQualityStats(active.project.id),
  ]);

  const latest = quality.at(-1);
  const latestRate = latest && latest.total > 0 ? latest.passed / latest.total : null;
  const isAlerting = latestRate != null && latestRate < QUALITY_ALERT_THRESHOLD;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Monitoring</h1>

      {isAlerting && (
        <div className="card flex items-center gap-2 border-[var(--danger)]/40 p-4">
          <Badge variant="danger">alert</Badge>
          <span className="text-sm">
            Quality score dropped to {Math.round((latestRate ?? 0) * 100)}% on {latest?.day}, below the{" "}
            {QUALITY_ALERT_THRESHOLD * 100}% threshold.
          </span>
        </div>
      )}

      {usage.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No traces yet. Run <code>pnpm demo</code> to populate the dashboard.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <QualityChart data={quality} />
          <LatencyChart data={usage} />
          <CostChart data={usage} />
        </div>
      )}
    </div>
  );
}
