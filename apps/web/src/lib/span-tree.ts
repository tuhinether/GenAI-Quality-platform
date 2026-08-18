export interface FlatSpan {
  id: string;
  parentId: string | null;
  name: string;
  type?: string;
  status: string;
  startTime: Date;
  endTime: Date | null;
  latencyMs: number | null;
  error?: string | null;
}

export interface SpanTreeNode extends FlatSpan {
  children: SpanTreeNode[];
}

/** Builds a tree from a flat span list rooted at the trace itself (parentId: null). */
export function buildSpanTree(trace: FlatSpan, spans: FlatSpan[]): SpanTreeNode {
  const byParent = new Map<string, FlatSpan[]>();
  for (const span of spans) {
    const key = span.parentId ?? "root";
    const bucket = byParent.get(key);
    if (bucket) bucket.push(span);
    else byParent.set(key, [span]);
  }

  function attach(node: FlatSpan): SpanTreeNode {
    const children = (byParent.get(node.id) ?? []).sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );
    return { ...node, children: children.map(attach) };
  }

  return attach(trace);
}

export function flattenTree(node: SpanTreeNode, depth = 0): Array<{ node: SpanTreeNode; depth: number }> {
  return [{ node, depth }, ...node.children.flatMap((c) => flattenTree(c, depth + 1))];
}
