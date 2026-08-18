"use client";

import { useState } from "react";
import type { FlatSpan } from "@/lib/span-tree";
import { Waterfall } from "./waterfall";
import { CallGraph } from "./call-graph";

const TABS = ["waterfall", "graph"] as const;
type Tab = (typeof TABS)[number];

export function TraceTabs({ trace, spans }: { trace: FlatSpan; spans: FlatSpan[] }) {
  const [tab, setTab] = useState<Tab>("waterfall");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize ${
              tab === t
                ? "border-b-2 border-accent font-medium text-[var(--text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t === "graph" ? "Call graph" : t}
          </button>
        ))}
      </div>
      {tab === "waterfall" ? <Waterfall trace={trace} spans={spans} /> : <CallGraph trace={trace} spans={spans} />}
    </div>
  );
}
