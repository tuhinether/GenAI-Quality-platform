"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createDataset } from "@/lib/actions";

export function CreateDatasetForm({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      const dataset = await createDataset(projectId, name.trim(), description.trim());
      setName("");
      setDescription("");
      if (dataset) router.push(`/datasets/${dataset.id}`);
    });
  }

  return (
    <div className="card flex flex-col gap-3 p-4">
      <h3 className="text-sm font-medium">New dataset</h3>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name, e.g. Finance QA — 10-Q grounding"
        className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)]"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--text-muted)]"
      />
      <button
        disabled={pending || !name.trim()}
        onClick={submit}
        className="w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
      >
        Create dataset
      </button>
    </div>
  );
}
