import { StatusBadge } from "@/components/ui/badge";
import { buildSpanTree, flattenTree, type FlatSpan } from "@/lib/span-tree";

const TYPE_COLORS: Record<string, string> = {
  llm: "bg-violet-400",
  tool: "bg-sky-400",
  agent: "bg-accent",
  chain: "bg-slate-400",
  retriever: "bg-teal-400",
};

export function Waterfall({ trace, spans }: { trace: FlatSpan; spans: FlatSpan[] }) {
  const tree = buildSpanTree(trace, spans);
  const rows = flattenTree(tree);
  const traceStart = trace.startTime.getTime();
  const traceEnd = (trace.endTime ?? trace.startTime).getTime();
  const totalMs = Math.max(traceEnd - traceStart, 1);

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-[var(--border)]/60">
        {rows.map(({ node, depth }) => {
          const offsetPct = (Math.max(node.startTime.getTime() - traceStart, 0) / totalMs) * 100;
          const widthPct = node.endTime
            ? Math.max(((node.endTime.getTime() - node.startTime.getTime()) / totalMs) * 100, 0.5)
            : 0.5;

          return (
            <div key={node.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <div className="flex w-64 shrink-0 items-center gap-2" style={{ paddingLeft: depth * 16 }}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${TYPE_COLORS[node.type ?? "chain"] ?? "bg-slate-400"}`} />
                <span className="truncate font-medium">{node.name}</span>
              </div>
              <div className="relative h-4 flex-1 rounded bg-white/5">
                <div
                  className={`absolute top-0 h-4 rounded ${node.status === "error" ? "bg-[var(--danger)]" : "bg-accent/70"}`}
                  style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
                />
              </div>
              <div className="w-20 shrink-0 text-right text-[var(--text-muted)]">
                {node.latencyMs != null ? `${node.latencyMs}ms` : "—"}
              </div>
              <div className="w-20 shrink-0">
                <StatusBadge status={node.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
