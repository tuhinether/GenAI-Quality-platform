import Link from "next/link";
import { Nav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { getActiveProject } from "@/lib/auth";

// All dashboard routes read live DB/session state; force dynamic rendering so
// `next build` never tries to statically prerender them against a database
// that may not exist yet at build time (e.g. in CI).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const active = await getActiveProject();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-6 border-r border-[var(--border)] p-4">
        <Link href="/" className="px-2 text-lg font-semibold tracking-tight">
          Tickmark
        </Link>
        <Nav />
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
          <div className="text-sm text-[var(--text-muted)]">
            {active ? (
              <>
                {active.org.name} / <span className="text-[var(--text)]">{active.project.name}</span>
              </>
            ) : (
              "No project yet"
            )}
          </div>
          {active?.mode === "demo" && <Badge variant="warning">demo mode — no auth configured</Badge>}
        </header>
        <main className="p-6">
          {active ? (
            children
          ) : (
            <div className="card p-8 text-center text-sm text-[var(--text-muted)]">
              No project found. Run <code className="text-[var(--text)]">pnpm db:seed</code> to seed a
              demo org, project, and API key, then <code className="text-[var(--text)]">pnpm demo</code>{" "}
              to populate traces.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
