"use client";

import { useState, useTransition } from "react";
import { addDatasetExample } from "@/lib/actions";

function parseLoose(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function AddExampleForm({ datasetId }: { datasetId: string }) {
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!input.trim()) return;
    startTransition(async () => {
      await addDatasetExample(datasetId, parseLoose(input), parseLoose(expected));
      setInput("");
      setExpected("");
    });
  }

  return (
    <div className="card flex flex-col gap-3 p-4">
      <h3 className="text-sm font-medium">Add example</h3>
      <p className="text-xs text-[var(--text-muted)]">
        Plain text or JSON. Input is required; expected output is used by exact-match / numeric-tolerance
        evaluators.
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Input, e.g. "What was Q3 2025 net revenue?"'
        rows={2}
        className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)]"
      />
      <textarea
        value={expected}
        onChange={(e) => setExpected(e.target.value)}
        placeholder="Expected output (optional), e.g. 128.4"
        rows={2}
        className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)]"
      />
      <button
        disabled={pending || !input.trim()}
        onClick={submit}
        className="w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
      >
        Add example
      </button>
    </div>
  );
}
