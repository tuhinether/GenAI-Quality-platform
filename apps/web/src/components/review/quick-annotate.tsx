"use client";

import { useTransition } from "react";
import { submitAnnotation } from "@/lib/actions";

const DEMO_REVIEWER_ID = "00000000-0000-0000-0000-000000000001";

export function QuickAnnotate({ projectId, traceId }: { projectId: string; traceId: string }) {
  const [pending, startTransition] = useTransition();

  function submit(verdict: "approve" | "reject" | "needs_review") {
    startTransition(async () => {
      await submitAnnotation(projectId, traceId, DEMO_REVIEWER_ID, verdict);
    });
  }

  return (
    <div className="flex gap-1.5">
      <button
        disabled={pending}
        onClick={() => submit("approve")}
        className="rounded-md bg-[var(--success)]/15 px-2.5 py-1 text-xs font-medium text-[var(--success)] hover:bg-[var(--success)]/25 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={pending}
        onClick={() => submit("needs_review")}
        className="rounded-md bg-[var(--warning)]/15 px-2.5 py-1 text-xs font-medium text-[var(--warning)] hover:bg-[var(--warning)]/25 disabled:opacity-50"
      >
        Flag
      </button>
      <button
        disabled={pending}
        onClick={() => submit("reject")}
        className="rounded-md bg-[var(--danger)]/15 px-2.5 py-1 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/25 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
