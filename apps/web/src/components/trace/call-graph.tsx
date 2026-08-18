"use client";

import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { flattenTree, buildSpanTree, type FlatSpan } from "@/lib/span-tree";

const TYPE_COLORS: Record<string, string> = {
  llm: "#a78bfa",
  tool: "#38bdf8",
  agent: "#f2b705",
  chain: "#94a3b8",
  retriever: "#2dd4bf",
};

export function CallGraph({ trace, spans }: { trace: FlatSpan; spans: FlatSpan[] }) {
  const tree = buildSpanTree(trace, spans);
  const rows = flattenTree(tree);

  const depthCounts = new Map<number, number>();
  const nodes: Node[] = rows.map(({ node, depth }) => {
    const yIndex = depthCounts.get(depth) ?? 0;
    depthCounts.set(depth, yIndex + 1);
    const color = node.parentId === null ? "#f2b705" : (TYPE_COLORS[node.type ?? "chain"] ?? "#94a3b8");

    return {
      id: node.id,
      position: { x: depth * 220, y: yIndex * 90 },
      data: {
        label: (
          <div className="text-left">
            <div className="text-xs font-medium">{node.name}</div>
            <div className="text-[10px] opacity-70">
              {node.type ?? "trace"} · {node.latencyMs != null ? `${node.latencyMs}ms` : "—"}
            </div>
          </div>
        ),
      },
      style: {
        background: "#12151c",
        border: `1.5px solid ${node.status === "error" ? "#f87171" : color}`,
        borderRadius: 8,
        color: "#e6e8ee",
        width: 190,
        padding: 8,
      },
    };
  });

  const edges: Edge[] = rows
    .filter(({ node }) => node.parentId !== null)
    .map(({ node }) => ({
      id: `${node.parentId}-${node.id}`,
      source: node.parentId as string,
      target: node.id,
      animated: node.status === "running",
      style: { stroke: "#3a3f4d" },
    }));

  return (
    <div className="card h-[480px] overflow-hidden">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#1c2029" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
