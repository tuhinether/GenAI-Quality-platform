import Link from "next/link";

const COMPARISON: Array<[string, boolean | "partial", boolean]> = [
  ["Tracing, datasets, experiments, LLM-as-judge", true, true],
  ["Multi-agent / tool call-graph visualization", "partial", true],
  ["Finance-specific evaluator pack (numeric grounding, citations, MNPI, disclaimers)", false, true],
  ["Tamper-evident, hash-chained audit log", false, true],
  ["Human review queues with reviewer verdicts", "partial", true],
  ["Self-hostable OSS core", false, true],
];

function Mark({ value }: { value: boolean | "partial" }) {
  if (value === true) return <span className="text-[var(--success)]">✓</span>;
  if (value === "partial") return <span className="text-[var(--warning)]">~</span>;
  return <span className="text-[var(--text-muted)]">—</span>;
}

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-16 px-6 py-20">
      <header className="flex flex-col gap-4">
        <span className="pill w-fit border border-accent/40 text-accent">
          Open source · MIT licensed
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Tickmark</h1>
        <p className="max-w-xl text-lg text-[var(--text-muted)]">
          Every AI answer gets its tickmark. Audit-grade evaluation, observability, and governance
          for multi-agent GenAI systems in regulated finance.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            href="/traces"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90"
          >
            Open dashboard
          </Link>
          <a
            href="https://github.com"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-elevated)]"
          >
            View on GitHub
          </a>
        </div>
      </header>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Tickmark vs. LangSmith
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
              <th className="py-2 font-normal">Capability</th>
              <th className="w-28 py-2 text-center font-normal">LangSmith</th>
              <th className="w-28 py-2 text-center font-normal">Tickmark</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map(([label, ls, tm]) => (
              <tr key={label} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="py-2.5 pr-4">{label}</td>
                <td className="py-2.5 text-center">
                  <Mark value={ls} />
                </td>
                <td className="py-2.5 text-center">
                  <Mark value={tm} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Finance-native evaluators",
            body: "Numeric grounding, citation verification, PII/MNPI leakage, and disclaimer checks — built in, not bolted on.",
          },
          {
            title: "Multi-agent call graphs",
            body: "See every agent-to-agent and agent-to-tool call as a first-class graph, not a flat span list.",
          },
          {
            title: "Audit-grade governance",
            body: "A hash-chained log of every trace, evaluation, and human review — exportable for regulators.",
          },
        ].map((f) => (
          <div key={f.title} className="card p-5">
            <h3 className="mb-2 font-medium">{f.title}</h3>
            <p className="text-sm text-[var(--text-muted)]">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
