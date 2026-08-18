import { desc, eq } from "drizzle-orm";
import { IssueKeyForm } from "@/components/settings/issue-key-form";
import { Badge } from "@/components/ui/badge";
import { getActiveProject } from "@/lib/auth";
import { revokeApiKey } from "@/lib/actions";
import { apiKeys, getDb } from "@/lib/db";

export default async function SettingsPage() {
  const active = await getActiveProject();
  if (!active) return null;

  const db = getDb();
  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.projectId, active.project.id))
    .orderBy(desc(apiKeys.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <IssueKeyForm projectId={active.project.id} />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
              <th className="px-4 py-2 font-normal">Name</th>
              <th className="px-4 py-2 font-normal">Prefix</th>
              <th className="px-4 py-2 font-normal">Status</th>
              <th className="px-4 py-2 font-normal">Last used</th>
              <th className="px-4 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id} className="border-b border-[var(--border)]/60 last:border-0">
                <td className="px-4 py-2.5">{key.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">{key.prefix}…</td>
                <td className="px-4 py-2.5">
                  {key.revokedAt ? <Badge variant="danger">revoked</Badge> : <Badge variant="success">active</Badge>}
                </td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">
                  {key.lastUsedAt ? key.lastUsedAt.toLocaleString() : "never"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!key.revokedAt && (
                    <form action={revokeApiKey.bind(null, key.id)}>
                      <button className="text-xs text-[var(--danger)] hover:underline">Revoke</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--text-muted)]">
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
