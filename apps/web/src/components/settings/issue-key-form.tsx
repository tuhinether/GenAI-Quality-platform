"use client";

import { useState, useTransition } from "react";
import { issueApiKey } from "@/lib/actions";

export function IssueKeyForm({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [issued, setIssued] = useState<{ plaintext: string; prefix: string } | null>(null);

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      const key = await issueApiKey(projectId, name.trim());
      setIssued(key);
      setName("");
    });
  }

  return (
    <div className="card flex flex-col gap-3 p-4">
      <h3 className="text-sm font-medium">Issue a new API key</h3>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name, e.g. demo-agent"
          className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)]"
        />
        <button
          disabled={pending || !name.trim()}
          onClick={submit}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          Issue key
        </button>
      </div>
      {issued && (
        <div className="rounded-md border border-accent/40 bg-accent/5 p-3 text-sm">
          <p className="mb-1 text-[var(--text-muted)]">
            Copy this now — it won&apos;t be shown again. Set it as <code>TICKMARK_API_KEY</code>.
          </p>
          <code className="break-all">{issued.plaintext}</code>
        </div>
      )}
    </div>
  );
}
