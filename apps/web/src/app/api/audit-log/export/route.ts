import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auditLog, getDb, verifyAuditChain } from "@/lib/db";

function toCsv(rows: (typeof auditLog.$inferSelect)[]): string {
  const header = ["id", "traceId", "eventType", "payload", "prevHash", "hash", "createdAt"];
  const lines = rows.map((r) =>
    [r.id, r.traceId ?? "", r.eventType, JSON.stringify(r.payload), r.prevHash ?? "", r.hash, r.createdAt.toISOString()]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const db = getDb();
  const rows = await db.select().from(auditLog).where(eq(auditLog.projectId, projectId)).orderBy(asc(auditLog.createdAt));
  const verification = await verifyAuditChain(db, projectId);

  if (format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv",
        "content-disposition": `attachment; filename="tickmark-audit-log-${projectId}.csv"`,
        "x-chain-valid": String(verification.valid),
      },
    });
  }

  return new NextResponse(JSON.stringify({ entries: rows, verification }, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="tickmark-audit-log-${projectId}.json"`,
    },
  });
}
