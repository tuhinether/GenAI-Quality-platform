const VARIANTS = {
  success: "bg-[color:rgb(52_211_153/0.12)] text-[var(--success)]",
  danger: "bg-[color:rgb(248_113_113/0.12)] text-[var(--danger)]",
  warning: "bg-[color:rgb(251_191_36/0.12)] text-[var(--warning)]",
  neutral: "bg-white/5 text-[var(--text-muted)]",
} as const;

export function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
}) {
  return <span className={`pill ${VARIANTS[variant]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "success") return <Badge variant="success">success</Badge>;
  if (status === "error") return <Badge variant="danger">error</Badge>;
  return <Badge variant="warning">{status}</Badge>;
}

export function PassFailBadge({ passed, score }: { passed: boolean; score?: number | null }) {
  if (score === null) return <Badge variant="neutral">n/a</Badge>;
  return passed ? <Badge variant="success">pass</Badge> : <Badge variant="danger">fail</Badge>;
}
