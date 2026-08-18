"use client";

import { useState, useTransition } from "react";
import { submitAnnotation } from "@/lib/actions";

const DEMO_REVIEWER_ID = "00000000-0000-0000-0000-000000000001";

export function AnnotateForm({ projectId, traceId }: { projectId: string; traceId: string }) {
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<string | null>(null);

  function submit(verdict: "approve" | "reject" | "needs_review") {
    startTransition(async () => {
      await submitAnnotation(projectId, traceId, DEMO_REVIEWER_ID, verdict, comment || undefined);
      setSubmitted(verdict);
      setComment("");
    });
  }

  return (
    <div className="card flex flex-col gap-3 p-4">
      <h3 className="text-sm font-medium">Human review</h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment for the audit trail…"
        rows={2}
        className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)]"
      />
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => submit("approve")}
          className="rounded-md bg-[var(--success)]/15 px-3 py-1.5 text-sm font-medium text-[var(--success)] hover:bg-[var(--success)]/25 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          disabled={pending}
          onClick={() => submit("needs_review")}
          className="rounded-md bg-[var(--warning)]/15 px-3 py-1.5 text-sm font-medium text-[var(--warning)] hover:bg-[var(--warning)]/25 disabled:opacity-50"
        >
          Needs review
        </button>
        <button
          disabled={pending}
          onClick={() => submit("reject")}
          className="rounded-md bg-[var(--danger)]/15 px-3 py-1.5 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/25 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {submitted && (
        <p className="text-xs text-[var(--text-muted)]">
          Recorded &ldquo;{submitted}&rdquo; and appended to the audit log.
        </p>
      )}
    </div>
  );
}
